import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker, { internals } from '../workers/generation-api/src/index'
import type { Env } from '../workers/generation-api/src/index'

interface StoredAudioRecord {
  id: string
  request_hash: string
  text: string
  language: string
  provider: string
  voice: string
  model: string
  speed: number
  pitch: number
  audio_url: string
  r2_key: string
  content_type: string
  file_size_bytes?: number
  duration_seconds?: number
  generated_at: string
}

class MemoryD1 {
  byHash = new Map<string, StoredAudioRecord>()
  byId = new Map<string, StoredAudioRecord>()

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async <T>() => {
          if (sql.includes('WHERE request_hash')) return (this.byHash.get(values[0] as string) ?? null) as T | null
          if (sql.includes('WHERE id')) return (this.byId.get(values[0] as string) ?? null) as T | null
          return null
        },
        run: async () => {
          const record: StoredAudioRecord = {
            id: values[0] as string,
            request_hash: values[1] as string,
            text: values[2] as string,
            language: values[3] as string,
            provider: values[4] as string,
            voice: values[5] as string,
            model: values[6] as string,
            speed: values[7] as number,
            pitch: values[8] as number,
            audio_url: values[9] as string,
            r2_key: values[10] as string,
            content_type: values[11] as string,
            file_size_bytes: values[12] as number,
            generated_at: values[13] as string,
          }
          this.byHash.set(record.request_hash, record)
          this.byId.set(record.id, record)
          return { success: true }
        }
      })
    }
  }
}

class MemoryR2 {
  objects = new Map<string, { body: BodyInit; httpMetadata?: { contentType?: string } }>()

  async get(key: string) {
    return this.objects.get(key) ?? null
  }

  async put(key: string, value: ArrayBuffer | Uint8Array, options?: Record<string, unknown>) {
    this.objects.set(key, {
      body: value instanceof ArrayBuffer ? value : value.slice().buffer,
      httpMetadata: (options?.httpMetadata as { contentType?: string } | undefined) ?? { contentType: 'audio/mpeg' }
    })
  }
}

function makeEnv(overrides: Partial<Env> = {}): Env & { db: MemoryD1; bucket: MemoryR2 } {
  const db = new MemoryD1()
  const bucket = new MemoryR2()
  return {
    db,
    bucket,
    GENERATION_DB: db,
    GENERATED_MEDIA_BUCKET: bucket,
    OPENAI_API_KEY: 'test-key',
    ...overrides,
  }
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, any>>
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('generation-api TTS contract', () => {
  it('returns explicit validation errors for invalid TTS requests', async () => {
    const env = makeEnv()
    const response = await worker.fetch(new Request('https://api.test/v1/generation/tts', {
      method: 'POST',
      body: JSON.stringify({ language: 'en' }),
    }), env)

    expect(response.status).toBe(400)
    await expect(json(response)).resolves.toMatchObject({
      error: { code: 'missing_text', field: 'text' }
    })
  })

  it('returns a D1-backed cache hit without calling the provider', async () => {
    const normalized = internals.normalizeTtsRequest({ text: ' Yes ', language: 'EN', provider: 'auto' })
    const requestHash = await internals.generateRequestHash(normalized)
    const env = makeEnv({ OPENAI_API_KEY: undefined })
    env.db.byHash.set(requestHash, {
      id: 'cached-audio',
      request_hash: requestHash,
      text: 'Yes',
      language: 'en',
      provider: 'openai',
      voice: 'nova',
      model: 'tts-1',
      speed: 1,
      pitch: 0,
      audio_url: '/v1/generation/audio/cached-audio',
      r2_key: `audio/${requestHash}.mp3`,
      content_type: 'audio/mpeg',
      file_size_bytes: 3,
      generated_at: '2026-05-27T00:00:00.000Z',
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await worker.fetch(new Request('https://api.test/v1/generation/tts', {
      method: 'POST',
      body: JSON.stringify({ text: ' Yes ', language: 'EN', provider: 'auto' }),
    }), env)

    expect(response.status).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
    await expect(json(response)).resolves.toMatchObject({
      data: { id: 'cached-audio', audioUrl: '/v1/generation/audio/cached-audio' },
      meta: { cached: true, schemaVersion: 1 }
    })
  })

  it('returns a safe missing-provider-key error on cache miss', async () => {
    const env = makeEnv({ OPENAI_API_KEY: undefined })
    const response = await worker.fetch(new Request('https://api.test/v1/generation/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', language: 'en' }),
    }), env)

    expect(response.status).toBe(503)
    await expect(json(response)).resolves.toMatchObject({
      error: { code: 'tts_generation_not_configured', message: 'TTS generation is not configured.' }
    })
  })

  it('stores generated audio metadata and retrieves safe R2 keys by audio id', async () => {
    const env = makeEnv()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))

    const generateResponse = await worker.fetch(new Request('https://api.test/v1/generation/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', language: 'en' }),
    }), env)
    const generated = await json(generateResponse)

    expect(generateResponse.status).toBe(201)
    expect(generated.data.audioUrl).toMatch(/^\/v1\/generation\/audio\//)
    expect(Array.from(env.bucket.objects.keys())[0]).toMatch(/^audio\/[a-f0-9]{32}\.mp3$/)

    const audioResponse = await worker.fetch(new Request(`https://api.test${generated.data.audioUrl}`), env)
    expect(audioResponse.status).toBe(200)
    expect(audioResponse.headers.get('Content-Type')).toBe('audio/mpeg')
    expect(new Uint8Array(await audioResponse.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))

    expect(internals.isSafeAudioKey('audio/../../secret.mp3')).toBe(false)
    env.db.byId.set('bad-key', { ...env.db.byId.values().next().value!, id: 'bad-key', r2_key: '../secret' })
    const unsafeResponse = await worker.fetch(new Request('https://api.test/v1/generation/audio/bad-key'), env)
    expect(unsafeResponse.status).toBe(404)
  })
})
