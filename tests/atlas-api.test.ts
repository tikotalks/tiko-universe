import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker from '../workers/atlas-api/src/index'
import type { Env } from '../workers/atlas-api/src/types'
import { createAtlasClient, AtlasClientError } from '../packages/atlas/src/index'

type Row = Record<string, unknown>

class MemoryD1 {
  assets = new Map<string, Row>()
  assetsByHash = new Map<string, Row>()
  requests: Row[] = []

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async <T>() => {
          if (sql.includes('FROM atlas_cached_assets') && sql.includes('request_hash')) return (this.assetsByHash.get(String(values[0])) ?? null) as T | null
          if (sql.includes('FROM atlas_cached_assets') && sql.includes('WHERE id')) return (this.assets.get(String(values[0])) ?? null) as T | null
          return null
        },
        all: async <T>() => ({ results: [] as T[] }),
        run: async () => {
          if (sql.includes('INSERT INTO atlas_cached_assets')) {
            const row = {
              id: values[0],
              capability: values[1],
              request_hash: values[2],
              provider: values[3],
              model: values[4],
              r2_key: values[5],
              public_url: values[6],
              content_type: values[7],
              byte_size: values[8],
              metadata_json: values[9],
              created_at: values[10],
              expires_at: values[11],
            }
            this.assets.set(String(row.id), row)
            this.assetsByHash.set(String(row.request_hash), row)
          }
          if (sql.includes('INSERT INTO atlas_requests')) {
            this.requests.push({ id: values[0], capability: values[1], app: values[2], purpose: values[3], provider: values[5], status: values[7] })
          }
          return { success: true }
        },
      }),
    }
  }
}

class MemoryR2 {
  objects = new Map<string, { body: BodyInit; httpMetadata?: { contentType?: string } }>()

  async get(key: string) { return this.objects.get(key) ?? null }
  async put(key: string, value: ArrayBuffer | Uint8Array, options?: Record<string, unknown>) {
    this.objects.set(key, {
      body: value instanceof ArrayBuffer ? value : value.slice().buffer,
      httpMetadata: (options?.httpMetadata as { contentType?: string } | undefined) ?? { contentType: 'application/octet-stream' },
    })
  }
  async delete(key: string) { this.objects.delete(key) }
}

class MemoryKV {
  values = new Map<string, string>()
  async get(key: string) { return this.values.get(key) ?? null }
  async put(key: string, value: string) { this.values.set(key, value) }
  async delete(key: string) { this.values.delete(key) }
}

function makeEnv(overrides: Partial<Env> = {}): Env & { db: MemoryD1; bucket: MemoryR2; kv: MemoryKV } {
  const db = new MemoryD1()
  const bucket = new MemoryR2()
  const kv = new MemoryKV()
  return {
    db,
    bucket,
    kv,
    ATLAS_DB: db,
    ATLAS_CACHE: kv,
    ATLAS_ASSETS_BUCKET: bucket,
    OPENAI_API_KEY: 'openai-key',
    ELEVENLABS_API_KEY: 'eleven-key',
    AI: { run: vi.fn(async () => ({ response: 'Workers AI answer' })) },
    ...overrides,
  }
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, any>>
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('atlas-api', () => {
  it('exposes health and enabled capabilities', async () => {
    const response = await worker.fetch(new Request('https://api.test/v1/atlas/health'), makeEnv())
    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toMatchObject({
      data: { service: 'atlas-api', status: 'ok', capabilities: expect.arrayContaining([expect.objectContaining({ capability: 'speech.synthesize', enabled: true })]) },
      meta: { schemaVersion: 1 },
    })
  })

  it('synthesizes speech, stores it in R2, then serves the cached asset', async () => {
    const env = makeEnv({ ELEVENLABS_API_KEY: undefined })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))

    const response = await worker.fetch(new Request('https://api.test/v1/atlas/speech', {
      method: 'POST',
      body: JSON.stringify({ text: ' Yes ', locale: 'EN', app: 'yes-no', purpose: 'child-button', provider: 'openai' }),
    }), env)

    expect(response.status).toBe(201)
    const generated = await json(response)
    expect(generated.data.audioUrl).toMatch(/^\/v1\/atlas\/assets\//)
    expect(generated.meta).toMatchObject({ capability: 'speech.synthesize', provider: 'openai', cached: false })
    expect(Array.from(env.bucket.objects.keys())[0]).toMatch(/^speech\/[a-f0-9]{32}\.mp3$/)

    const cached = await worker.fetch(new Request('https://api.test/v1/atlas/speech', {
      method: 'POST',
      body: JSON.stringify({ text: ' Yes ', locale: 'EN', app: 'yes-no', purpose: 'child-button', provider: 'openai' }),
    }), env)
    expect(cached.status).toBe(200)
    expect(await json(cached)).toMatchObject({ data: { cached: true }, meta: { cached: true } })

    const asset = await worker.fetch(new Request(`https://api.test${generated.data.audioUrl}`), env)
    expect(asset.status).toBe(200)
    expect(new Uint8Array(await asset.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('routes text generation to Workers AI by default', async () => {
    const env = makeEnv()
    const response = await worker.fetch(new Request('https://api.test/v1/atlas/text', {
      method: 'POST',
      body: JSON.stringify({ input: 'Summarize this', app: 'admin', purpose: 'internal-summary' }),
    }), env)

    expect(response.status).toBe(200)
    expect(env.AI?.run).toHaveBeenCalled()
    await expect(json(response)).resolves.toMatchObject({
      data: { output: 'Workers AI answer', provider: { name: 'cloudflare-workers-ai' } },
      meta: { capability: 'text.generate', provider: 'cloudflare-workers-ai' },
    })
  })

  it('fetches and caches YouTube metadata through Atlas data fetch', async () => {
    const env = makeEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ title: 'Song', author_name: 'Artist' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const body = { source: 'youtube', operation: 'video.metadata', app: 'radio', purpose: 'add-track', input: { url: 'https://www.youtube.com/watch?v=test' } }

    const first = await worker.fetch(new Request('https://api.test/v1/atlas/data/fetch', { method: 'POST', body: JSON.stringify(body) }), env)
    expect(first.status).toBe(200)
    await expect(json(first)).resolves.toMatchObject({ meta: { provider: 'youtube', cached: false } })

    const second = await worker.fetch(new Request('https://api.test/v1/atlas/data/fetch', { method: 'POST', body: JSON.stringify(body) }), env)
    expect(second.status).toBe(200)
    await expect(json(second)).resolves.toMatchObject({ meta: { provider: 'youtube', cached: true } })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('client typed helpers throw normalized Atlas errors', async () => {
    const client = createAtlasClient({
      baseUrl: 'https://api.test/v1/atlas',
      fetcher: async () => new Response(JSON.stringify({ error: { code: 'missing_text', message: 'Text is required.' }, meta: { schemaVersion: 1, requestId: 'req_1' } }), { status: 400 }),
    })

    await expect(client.speech.synthesize({ text: '', app: 'yes-no', purpose: 'child-button' })).rejects.toMatchObject({
      name: 'AtlasClientError',
      code: 'missing_text',
      status: 400,
      requestId: 'req_1',
    } satisfies Partial<AtlasClientError>)
  })
})
