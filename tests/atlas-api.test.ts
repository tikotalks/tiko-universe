import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker from '../workers/atlas-api/src/index'
import type { Env } from '../workers/atlas-api/src/types'
import { createAtlasClient, AtlasClientError } from '../packages/atlas/src/index'
import { sha256Hex } from '../workers/atlas-api/src/cache'

type Row = Record<string, unknown>

class MemoryD1 {
  assets = new Map<string, Row>()
  assetsByHash = new Map<string, Row>()
  requests: Row[] = []
  providerStatuses = new Map<string, Row>()
  serviceConfigs = new Map<string, Row>()
  conflictAssetOnInsert: Row | null = null

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async <T>() => {
          if (sql.includes('FROM atlas_cached_assets') && sql.includes('request_hash')) return (this.assetsByHash.get(String(values[0])) ?? null) as T | null
          if (sql.includes('FROM atlas_cached_assets') && sql.includes('WHERE id')) return (this.assets.get(String(values[0])) ?? null) as T | null
          if (sql.includes('FROM atlas_service_config')) return (this.serviceConfigs.get(String(values[0])) ?? null) as T | null
          if (sql.includes('FROM atlas_requests') && sql.includes('WHERE id')) return (this.requests.find((row) => row.id === values[0]) ?? null) as T | null
          return null
        },
        all: async <T>() => {
          if (sql.includes('FROM atlas_provider_status')) return { results: Array.from(this.providerStatuses.values()) as T[] }
          if (sql.includes('GROUP BY provider')) {
            const grouped = new Map<string, Row>()
            for (const row of this.requests) {
              const provider = String(row.provider)
              const current = grouped.get(provider) ?? { provider, requests: 0, errors: 0, estimated_cost_usd: 0, average_duration_ms: 0 }
              current.requests = Number(current.requests) + 1
              current.errors = Number(current.errors) + (row.status === 'error' ? 1 : 0)
              current.estimated_cost_usd = Number(current.estimated_cost_usd) + Number(row.estimated_cost_usd ?? 0)
              current.average_duration_ms = Number(row.duration_ms ?? 0)
              grouped.set(provider, current)
            }
            return { results: Array.from(grouped.values()) as T[] }
          }
          if (sql.includes('FROM atlas_requests')) return { results: this.requests.slice().reverse() as T[] }
          return { results: [] as T[] }
        },
        run: async () => {
          if (sql.includes('INSERT') && sql.includes('atlas_cached_assets')) {
            const row = {
              id: values[0], capability: values[1], request_hash: values[2], provider: values[3], model: values[4],
              r2_key: values[5], public_url: values[6], content_type: values[7], byte_size: values[8], metadata_json: values[9], created_at: values[10], expires_at: values[11],
            }
            if (sql.includes('INSERT OR IGNORE') && this.conflictAssetOnInsert) {
              this.assets.set(String(this.conflictAssetOnInsert.id), this.conflictAssetOnInsert)
              this.assetsByHash.set(String(this.conflictAssetOnInsert.request_hash), this.conflictAssetOnInsert)
              this.conflictAssetOnInsert = null
              return { success: true, meta: { changes: 0 } }
            }
            if (sql.includes('INSERT OR IGNORE') && this.assetsByHash.has(String(row.request_hash))) {
              return { success: true, meta: { changes: 0 } }
            }
            this.assets.set(String(row.id), row)
            this.assetsByHash.set(String(row.request_hash), row)
          }
          if (sql.includes('INSERT INTO atlas_requests')) {
            this.requests.push({
              id: values[0], capability: values[1], app: values[2], purpose: values[3], subject_id: values[4], provider: values[5], model: values[6],
              status: values[7], cache_status: values[8], request_hash: values[9], input_redacted_json: values[10], output_redacted_json: values[11],
              error_code: values[12], error_message: values[13], input_units: values[14], output_units: values[15], estimated_cost_usd: values[16],
              duration_ms: values[17], provider_duration_ms: values[18], created_at: values[19],
            })
          }
          if (sql.includes('INSERT INTO atlas_provider_status')) {
            this.providerStatuses.set(String(values[0]), { provider: values[0], enabled: 1, status: values[1], last_checked_at: values[2], last_error: values[3], metadata_json: values[4] })
          }
          if (sql.includes('INSERT INTO atlas_service_config')) {
            this.serviceConfigs.set(String(values[0]), { service: values[0], data_json: values[1], updated_at: values[2], version: values[3] })
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
    NARAKEET_API_KEY: 'narakeet-key',
    AI: { run: vi.fn(async () => ({ response: 'Workers AI answer' })) },
    ...overrides,
  }
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, any>>
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
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
    const env = makeEnv({ ELEVENLABS_API_KEY: undefined, NARAKEET_API_KEY: undefined })
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

  it('returns the winning cache row when speech asset insert loses a request-hash race', async () => {
    const env = makeEnv({ ELEVENLABS_API_KEY: undefined, NARAKEET_API_KEY: undefined })
    const requestHash = await sha256Hex({
      capability: 'speech.synthesize',
      text: 'Race',
      locale: 'en',
      provider: 'openai',
      model: 'tts-1',
      voice: 'nova',
      speed: 1,
      format: 'mp3',
    })
    env.db.conflictAssetOnInsert = {
      id: 'winner',
      capability: 'speech.synthesize',
      request_hash: requestHash,
      provider: 'openai',
      model: 'tts-1',
      r2_key: 'speech/winner.mp3',
      public_url: '/v1/atlas/assets/winner',
      content_type: 'audio/mpeg',
      byte_size: 3,
      metadata_json: '{}',
      created_at: '2026-01-01T00:00:00.000Z',
      expires_at: null,
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))

    const response = await worker.fetch(new Request('https://api.test/v1/atlas/speech', {
      method: 'POST',
      body: JSON.stringify({ text: 'Race', locale: 'en', app: 'yes-no', purpose: 'child-button', provider: 'openai' }),
    }), env)

    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toMatchObject({
      data: { id: 'winner', audioUrl: '/v1/atlas/assets/winner', cached: true },
      meta: { cached: true },
    })
  })

  it('uses Narakeet by default and stores phrase lookup metadata before serving cached audio', async () => {
    const env = makeEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([4, 5, 6]), { status: 200, headers: { 'x-duration-seconds': '2' } }))

    const body = { text: 'Ik wil drinken', locale: 'nl-NL', app: 'yes-no', purpose: 'child-button' }
    const first = await worker.fetch(new Request('https://api.test/v1/atlas/speech', {
      method: 'POST',
      body: JSON.stringify(body),
    }), env)

    expect(first.status).toBe(201)
    await expect(json(first)).resolves.toMatchObject({
      data: { cached: false, provider: { name: 'narakeet', model: 'narakeet-mp3', voice: 'famke' } },
      meta: { capability: 'speech.synthesize', provider: 'narakeet', cached: false },
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.narakeet.com/text-to-speech/mp3?voice=famke',
      expect.objectContaining({
        method: 'POST',
        body: 'Ik wil drinken',
        headers: expect.objectContaining({ 'x-api-key': 'narakeet-key', 'Content-Type': 'text/plain' }),
      }),
    )

    const cachedAsset = Array.from(env.db.assets.values())[0]
    expect(JSON.parse(String(cachedAsset.metadata_json))).toMatchObject({
      phrase: 'Ik wil drinken',
      locale: 'nl-nl',
      language: 'nl-nl',
      provider: 'narakeet',
      voice: 'famke',
      model: 'narakeet-mp3',
      speed: 1,
      format: 'mp3',
      durationSeconds: 2,
      settings: {
        provider: 'narakeet',
        voice: 'famke',
        model: 'narakeet-mp3',
        speed: 1,
        format: 'mp3',
      },
    })

    const second = await worker.fetch(new Request('https://api.test/v1/atlas/speech', {
      method: 'POST',
      body: JSON.stringify(body),
    }), env)
    expect(second.status).toBe(200)
    await expect(json(second)).resolves.toMatchObject({ data: { cached: true, provider: { name: 'narakeet', voice: 'famke' } }, meta: { cached: true } })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('selects a native Narakeet voice for each supported Tiko language', async () => {
    const cases = [
      ['en', 'raymond'],
      ['de', 'andreas'],
      ['es', 'alejandra'],
      ['fr', 'marion'],
      ['nl', 'famke'],
      ['pt', 'lurdes'],
      ['ja', 'hideaki'],
      ['zh', 'yifei'],
      ['ko', 'dong-min'],
      ['mt', 'corazon'],
      ['it', 'vittorio'],
      ['ar', 'farah'],
      ['hy', 'nune'],
    ] as const

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(new Uint8Array([4, 5, 6]), { status: 200 }))

    for (const [locale, voice] of cases) {
      const env = makeEnv()
      const response = await worker.fetch(new Request('https://api.test/v1/atlas/speech', {
        method: 'POST',
        body: JSON.stringify({ text: `Phrase ${locale}`, locale, app: 'yes-no', purpose: 'child-button' }),
      }), env)

      expect(response.status).toBe(201)
      await expect(json(response)).resolves.toMatchObject({
        data: { provider: { name: 'narakeet', model: 'narakeet-mp3', voice } },
      })
      expect(fetchSpy).toHaveBeenLastCalledWith(
        `https://api.narakeet.com/text-to-speech/mp3?voice=${encodeURIComponent(voice)}`,
        expect.objectContaining({
          method: 'POST',
          body: `Phrase ${locale}`,
          headers: expect.objectContaining({ 'x-api-key': 'narakeet-key', 'Content-Type': 'text/plain' }),
        }),
      )
    }
  })

  it('prefers exact Narakeet locale voices over language fallbacks', async () => {
    const cases = [
      ['en-GB', 'beatrice'],
      ['en-AU', 'graham'],
      ['nl-BE', 'koen'],
      ['fr-CA', 'audrey'],
      ['de-AT', 'fritzi'],
      ['pt-BR', 'gisele'],
      ['es-MX', 'ramona'],
      ['cmn-TW', 'yili'],
      ['zh-TW', 'yili'],
      ['zh_HK', 'man-chi'],
      ['ssw-ZA', 'nomcebo'],
      ['ven-ZA', 'mulalo'],
    ] as const

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(new Uint8Array([4, 5, 6]), { status: 200 }))

    for (const [locale, voice] of cases) {
      const env = makeEnv()
      const response = await worker.fetch(new Request('https://api.test/v1/atlas/speech', {
        method: 'POST',
        body: JSON.stringify({ text: `Phrase ${locale}`, locale, app: 'yes-no', purpose: 'child-button' }),
      }), env)

      expect(response.status).toBe(201)
      await expect(json(response)).resolves.toMatchObject({
        data: { provider: { name: 'narakeet', model: 'narakeet-mp3', voice } },
      })
      expect(fetchSpy).toHaveBeenLastCalledWith(
        `https://api.narakeet.com/text-to-speech/mp3?voice=${encodeURIComponent(voice)}`,
        expect.objectContaining({
          method: 'POST',
          body: `Phrase ${locale}`,
          headers: expect.objectContaining({ 'x-api-key': 'narakeet-key', 'Content-Type': 'text/plain' }),
        }),
      )
    }
  })

  it('uses managed speech service config for default provider and voices', async () => {
    const env = makeEnv()
    env.db.serviceConfigs.set('speech', {
      service: 'speech',
      data_json: JSON.stringify({
        defaultProvider: 'openai',
        models: { openai: 'tts-1' },
        voices: { openai: { 'nl-nl': 'alloy' } },
      }),
      updated_at: '2026-06-11T00:00:00.000Z',
      version: 1,
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }))

    const response = await worker.fetch(new Request('https://api.test/v1/atlas/speech', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hoe gaat het?', locale: 'nl-NL', app: 'yes-no', purpose: 'speech-playback' }),
    }), env)

    expect(response.status).toBe(201)
    await expect(json(response)).resolves.toMatchObject({
      data: { provider: { name: 'openai', model: 'tts-1', voice: 'alloy' } },
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/speech',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ model: 'tts-1', voice: 'alloy', input: 'Hoe gaat het?', response_format: 'mp3', speed: 1 }),
      }),
    )
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

  it('normalizes URL-shaped data fetch requests instead of throwing internal errors', async () => {
    const env = makeEnv()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html><title>Example</title></html>', { status: 200, headers: { 'Content-Type': 'text/html' } }))
    const body = { source: 'https://example.com', operation: 'fetch', app: 'atlas-test', purpose: 'metadata' }

    const response = await worker.fetch(new Request('https://api.test/v1/atlas/data/fetch', { method: 'POST', body: JSON.stringify(body) }), env)

    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toMatchObject({
      data: { source: 'url-metadata', operation: 'url.metadata', metadata: { title: 'Example' } },
      meta: { provider: 'url-metadata', cached: false },
    })
  })


  it('records redacted usage rows and exposes admin observability endpoints', async () => {
    const env = makeEnv({ ELEVENLABS_API_KEY: undefined, NARAKEET_API_KEY: undefined, SERVICE_API_KEYS: 'service-token' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))

    const generated = await worker.fetch(new Request('https://api.test/v1/atlas/speech', {
      method: 'POST',
      body: JSON.stringify({ text: 'A'.repeat(160), locale: 'en', app: 'yes-no', purpose: 'child-button', provider: 'openai', apiKey: 'do-not-log' }),
    }), env)
    expect(generated.status).toBe(201)
    expect(env.db.requests[0]).toMatchObject({ capability: 'speech.synthesize', provider: 'openai', status: 'success', cache_status: 'miss' })
    expect(env.db.requests[0].request_hash).toMatch(/^[a-f0-9]{32}$/)
    expect(env.db.requests[0].input_units).toBe(160)
    expect(String(env.db.requests[0].input_redacted_json)).toContain('[REDACTED]')
    expect(String(env.db.requests[0].input_redacted_json)).toContain('preview')

    const usage = await worker.fetch(new Request('https://api.test/v1/atlas/admin/usage?limit=5', { headers: { Authorization: 'Bearer service-token' } }), env)
    expect(usage.status).toBe(200)
    await expect(json(usage)).resolves.toMatchObject({ data: { requests: [expect.objectContaining({ provider: 'openai', inputUnits: 160 })] } })

    const byProvider = await worker.fetch(new Request('https://api.test/v1/atlas/admin/usage/by-provider', { headers: { Authorization: 'Bearer service-token' } }), env)
    expect(byProvider.status).toBe(200)
    await expect(json(byProvider)).resolves.toMatchObject({ data: { providers: [expect.objectContaining({ provider: 'openai', requests: 1 })] } })

    const status = await worker.fetch(new Request('https://api.test/v1/atlas/admin/provider-status', { headers: { Authorization: 'Bearer service-token' } }), env)
    expect(status.status).toBe(200)
    await expect(json(status)).resolves.toMatchObject({ data: { providers: [expect.objectContaining({ provider: 'openai', status: 'ok' })] } })
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
