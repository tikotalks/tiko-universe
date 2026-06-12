import { readFileSync } from 'node:fs'
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
  storyDrafts = new Map<string, Record<string, unknown>>()
  usageWindows = new Map<string, { request_count: number; unit_count: number }>()
  conflictAudioOnInsert: StoredAudioRecord | null = null

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async <T>() => {
          if (sql.includes('FROM generation_usage_windows')) {
            const key = values.slice(0, 4).map(String).join('|')
            return (this.usageWindows.get(key) ?? null) as T | null
          }
          if (sql.includes('WHERE request_hash')) return (this.byHash.get(values[0] as string) ?? null) as T | null
          if (sql.includes('FROM story_drafts') && sql.includes('WHERE id')) return (this.storyDrafts.get(values[0] as string) ?? null) as T | null
          if (sql.includes('WHERE id')) return (this.byId.get(values[0] as string) ?? null) as T | null
          return null
        },
        all: async <T>() => {
          if (sql.includes('FROM story_drafts')) return { results: Array.from(this.storyDrafts.values()) as T[] }
          return { results: [] as T[] }
        },
        run: async () => {
          if (sql.includes('INSERT INTO story_drafts')) {
            const record = {
              id: values[0],
              title: values[1],
              description: values[2],
              cover_media_id: values[3],
              default_voice: values[4],
              default_speed: values[5],
              target_album_id: values[6],
              status: values[7],
              chapters: values[8],
              settings: values[9],
              created_at: values[10],
              updated_at: values[11],
            }
            this.storyDrafts.set(record.id as string, record)
            return { success: true, meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO generation_usage_windows')) {
            const key = values.slice(0, 4).map(String).join('|')
            const current = this.usageWindows.get(key) ?? { request_count: 0, unit_count: 0 }
            current.request_count += Number(values[4])
            current.unit_count += Number(values[5])
            this.usageWindows.set(key, current)
            return { success: true, meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO generated_images')) {
            return { success: true, meta: { changes: 1 } }
          }
          if (sql.includes('INSERT OR IGNORE INTO generated_audio') && this.conflictAudioOnInsert) {
            this.byHash.set(this.conflictAudioOnInsert.request_hash, this.conflictAudioOnInsert)
            this.byId.set(this.conflictAudioOnInsert.id, this.conflictAudioOnInsert)
            this.conflictAudioOnInsert = null
            return { success: true, meta: { changes: 0 } }
          }
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
          if (sql.includes('INSERT OR IGNORE') && this.byHash.has(record.request_hash)) {
            return { success: true, meta: { changes: 0 } }
          }
          this.byHash.set(record.request_hash, record)
          this.byId.set(record.id, record)
          return { success: true, meta: { changes: 1 } }
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

  async delete(key: string) {
    this.objects.delete(key)
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
    ELEVENLABS_API_KEY: 'test-eleven-key',
    API_KEYS: 'test-api-key',
    IDENTITY_BASE_URL: 'https://identity.test/v1',
    ...overrides,
  }
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, any>>
}

function authHeaders(extra: HeadersInit = {}) {
  return { authorization: 'Bearer test-api-key', ...extra }
}

function generationPost(path: string, body: unknown): Request {
  return new Request(`https://api.test${path}`, {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(body),
  })
}

async function sha256HexForTest(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('generation-api TTS contract', () => {
  it('requires auth for paid TTS and voice catalog endpoints', async () => {
    const env = makeEnv()
    const tts = await worker.fetch(new Request('https://api.test/v1/generation/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', language: 'en' }),
    }), env)
    const voices = await worker.fetch(new Request('https://api.test/v1/generation/voices'), env)

    expect(tts.status).toBe(401)
    expect(voices.status).toBe(401)
  })

  it('returns explicit validation errors for invalid TTS requests', async () => {
    const env = makeEnv()
    const response = await worker.fetch(generationPost('/v1/generation/tts', { language: 'en' }), env)

    expect(response.status).toBe(400)
    await expect(json(response)).resolves.toMatchObject({
      error: { code: 'missing_text', field: 'text' }
    })
  })

  it('enforces per-caller TTS rate and daily character budgets', async () => {
    const env = makeEnv()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }))

    for (let index = 0; index < 60; index += 1) {
      const response = await worker.fetch(generationPost('/v1/generation/tts', { text: `Hello ${index}`, language: 'en' }), env)
      expect([200, 201]).toContain(response.status)
    }

    const limited = await worker.fetch(generationPost('/v1/generation/tts', { text: 'Too many', language: 'en' }), env)
    expect(limited.status).toBe(429)
    await expect(json(limited)).resolves.toMatchObject({ error: { code: 'rate_limited' } })

    const budgetEnv = makeEnv()
    const dayStart = new Date().toISOString().slice(0, 10)
    const subjectKey = `key:${await sha256HexForTest('test-api-key')}`
    budgetEnv.db.usageWindows.set(`${subjectKey}|tts.generate|day|${dayStart}`, { request_count: 1, unit_count: 11999 })
    const overBudget = await worker.fetch(generationPost('/v1/generation/tts', { text: 'No', language: 'en' }), budgetEnv)
    expect(overBudget.status).toBe(429)
    await expect(json(overBudget)).resolves.toMatchObject({ error: { code: 'budget_exceeded' } })
  })

  it('returns a D1-backed cache hit without calling the provider', async () => {
    const normalized = internals.normalizeTtsRequest({ text: ' Yes ', language: 'EN', provider: 'auto' })
    const requestHash = await internals.generateRequestHash(normalized)
    const env = makeEnv({ OPENAI_API_KEY: undefined, ELEVENLABS_API_KEY: undefined })
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
    const response = await worker.fetch(generationPost('/v1/generation/tts', { text: ' Yes ', language: 'EN', provider: 'auto' }), env)

    expect(response.status).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
    await expect(json(response)).resolves.toMatchObject({
      data: { id: 'cached-audio', audioUrl: '/v1/generation/audio/cached-audio' },
      meta: { cached: true, schemaVersion: 1 }
    })
  })


  it('routes compatibility TTS generation through Atlas instead of calling providers directly', async () => {
    const atlasFetch = vi.fn(async (input: Request | string) => {
      const request = input instanceof Request ? input : new Request(input)
      expect(new URL(request.url).pathname).toBe('/v1/atlas/speech')
      const atlasBody = await request.json() as Record<string, unknown>
      expect(atlasBody).toMatchObject({
        app: 'generation-api',
        purpose: 'compatibility-tts',
        text: 'Hello',
        language: 'en',
        provider: 'auto',
      })
      expect(atlasBody).not.toHaveProperty('voice')
      expect(atlasBody).not.toHaveProperty('model')
      return new Response(JSON.stringify({
        data: {
          id: 'atlas-audio-1',
          audioUrl: '/v1/atlas/assets/atlas-audio-1',
          contentType: 'audio/mpeg',
          cached: false,
          provider: { name: 'openai', model: 'tts-1', voice: 'nova' },
        },
        meta: { cached: false, schemaVersion: 1, requestId: 'atlas-req-1' },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    const providerFetch = vi.spyOn(globalThis, 'fetch')
    const env = makeEnv({
      ATLAS_SERVICE: { fetch: atlasFetch },
      OPENAI_API_KEY: undefined,
      ELEVENLABS_API_KEY: undefined,
    } as Partial<Env> & Record<string, unknown>)

    const response = await worker.fetch(generationPost('/v1/generation/tts', { text: 'Hello', language: 'en', provider: 'auto' }), env)
    const generated = await json(response)

    expect(response.status).toBe(201)
    expect(atlasFetch).toHaveBeenCalledTimes(1)
    expect(providerFetch).not.toHaveBeenCalled()
    expect(generated).toMatchObject({
      data: {
        id: 'atlas-audio-1',
        audioUrl: '/v1/atlas/assets/atlas-audio-1',
        provider: 'openai',
        voice: 'nova',
        model: 'tts-1',
      },
      meta: { cached: false, schemaVersion: 1, atlasRequestId: 'atlas-req-1' },
    })
  })

  it('returns a safe missing-provider-key error on cache miss', async () => {
    const env = makeEnv({ OPENAI_API_KEY: undefined, ELEVENLABS_API_KEY: undefined })
    const response = await worker.fetch(generationPost('/v1/generation/tts', { text: 'Hello', language: 'en' }), env)

    expect(response.status).toBe(503)
    await expect(json(response)).resolves.toMatchObject({
      error: { code: 'elevenlabs_tts_not_configured', message: 'ElevenLabs TTS is not configured.' }
    })
  })

  it('stores generated audio metadata and retrieves safe R2 keys by audio id', async () => {
    const env = makeEnv()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))

    const generateResponse = await worker.fetch(generationPost('/v1/generation/tts', { text: 'Hello', language: 'en' }), env)
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

  it('returns the winning cache row when generated audio insert loses a request-hash race', async () => {
    const env = makeEnv()
    const normalized = internals.normalizeTtsRequest({ text: 'Hello race', language: 'en' })
    const requestHash = await internals.generateRequestHash(normalized)
    env.db.conflictAudioOnInsert = {
      id: 'winner',
      request_hash: requestHash,
      text: normalized.text,
      language: normalized.language,
      provider: normalized.provider === 'auto' ? 'openai' : normalized.provider,
      voice: normalized.voice,
      model: normalized.model,
      speed: normalized.speed,
      pitch: normalized.pitch,
      audio_url: '/v1/generation/audio/winner',
      r2_key: 'audio/winner.mp3',
      content_type: 'audio/mpeg',
      file_size_bytes: 3,
      generated_at: '2026-01-01T00:00:00.000Z',
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))

    const response = await worker.fetch(generationPost('/v1/generation/tts', { text: 'Hello race', language: 'en' }), env)

    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toMatchObject({
      data: { id: 'winner', audioUrl: '/v1/generation/audio/winner' },
      meta: { cached: true },
    })
  })

  it('exposes health and sampled voice catalog for the story creator', async () => {
    const env = makeEnv()
    const health = await worker.fetch(new Request('https://api.test/v1/generation/health'), env)
    const voices = await worker.fetch(new Request('https://api.test/v1/generation/voices', { headers: authHeaders() }), env)

    expect(health.status).toBe(200)
    await expect(json(health)).resolves.toMatchObject({ data: { service: 'generation-api', status: 'ok' } })
    expect(voices.status).toBe(200)
    const voiceBody = await json(voices)
    expect(voiceBody.data.voices).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'nova', sampleUrl: expect.stringContaining('/voice-samples/nova') })]))
  })

  it('requires auth for story render mutations but allows authenticated story drafts with chapters and cover assignment', async () => {
    const env = makeEnv()

    const unauthenticated = await worker.fetch(new Request('https://api.test/v1/generation/stories/render', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nope', segments: [] }),
    }), env)
    expect(unauthenticated.status).toBe(401)

    const createDraft = await worker.fetch(new Request('https://api.test/v1/generation/story-drafts', {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key', 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'The Mountain',
        description: 'A bedtime story',
        coverMediaId: 'cover_1',
        targetAlbumId: 'album_1',
        defaultVoice: '21m00Tcm4TlvDq8ikWAM',
        chapters: [
          { title: 'Climb', text: 'Up we go', voice: 'nova', position: 1 },
          { title: 'Home', text: 'Back we go', voice: 'fable', position: 2 },
        ],
      }),
    }), env)
    const draftBody = await json(createDraft)

    expect(createDraft.status).toBe(201)
    expect(draftBody.data).toMatchObject({ title: 'The Mountain', coverMediaId: 'cover_1', targetAlbumId: 'album_1', defaultVoice: '21m00Tcm4TlvDq8ikWAM' })
    expect(draftBody.data.chapters).toHaveLength(2)
  })

  it('routes image generation through Atlas and stores the returned asset locally', async () => {
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
    const atlasFetch = vi.fn(async (input: Request | string) => {
      const request = input instanceof Request ? input : new Request(input)
      const url = new URL(request.url)
      if (url.pathname === '/v1/atlas/run') {
        const payload = await request.json() as Record<string, unknown>
        if (payload.capability === 'text.generate') {
          return new Response(JSON.stringify({
            data: { output: 'An art-directed prompt for a friendly robot' },
            meta: { requestId: 'atlas-req-text' },
          }), { status: 200, headers: { 'content-type': 'application/json' } })
        }
        if (payload.capability === 'image.generate') {
          return new Response(JSON.stringify({
            data: {
              images: [{ id: 'atlas-image-1', mediaUrl: '/v1/atlas/assets/atlas-image-1', contentType: 'image/png', revisedPrompt: 'A friendly robot', provider: { name: 'openai', model: 'gpt-image-1' } }]
            },
            meta: { requestId: 'atlas-req-image' },
          }), { status: 200, headers: { 'content-type': 'application/json' } })
        }
      }
      if (url.pathname === '/v1/atlas/assets/atlas-image-1') return new Response(png, { status: 200, headers: { 'content-type': 'image/png' } })
      return new Response('not found', { status: 404 })
    })
    const providerFetch = vi.spyOn(globalThis, 'fetch')
    const env = makeEnv({ ATLAS_SERVICE: { fetch: atlasFetch } } as Partial<Env>)

    const response = await worker.fetch(new Request('https://api.test/v1/generation/image', {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key', 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'A friendly robot', style: 'natural', size: '1024x1792', quality: 'hd' }),
    }), env)
    const generated = await json(response)

    expect(response.status).toBe(201)
    expect(atlasFetch).toHaveBeenCalledTimes(3) // text boost + image generate + asset fetch
    expect(providerFetch).not.toHaveBeenCalled()
    expect(generated.data).toMatchObject({ revisedPrompt: 'A friendly robot', size: '1024x1792', quality: 'hd', style: 'natural', width: 1024, height: 1792, fileSizeBytes: 8 })
    expect(generated.data.imageUrl).toMatch(/^\/v1\/generation\/images\/.+\/binary$/)
    expect(generated.meta).toMatchObject({ atlasRequestId: 'atlas-req-image' })
  })

  it('uses the identity service binding for session-authenticated mutations', async () => {
    const identityFetch = vi.fn(async (input: Request | string) => {
      expect(String(input)).toBe('https://identity.test/v1/identity/session')
      return new Response(JSON.stringify({ subject: { id: 'sub_admin' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    const env = makeEnv({
      API_KEYS: undefined,
      OPENAI_API_KEY: undefined,
      IDENTITY_SERVICE: { fetch: identityFetch },
    } as Partial<Env>)

    const response = await worker.fetch(new Request('https://api.test/v1/generation/image', {
      method: 'POST',
      headers: { authorization: 'Bearer session-token', 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'A friendly robot' }),
    }), env)

    expect(identityFetch).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(503)
    await expect(json(response)).resolves.toMatchObject({
      error: { code: 'atlas_not_available' }
    })
  })

  it('declares identity service bindings for generation-api deployments', () => {
    const wrangler = readFileSync('workers/generation-api/wrangler.toml', 'utf8')

    expect(wrangler).toContain('binding = "ATLAS_SERVICE"')
    expect(wrangler).toContain('service = "tiko-atlas-api-dev"')
    expect(wrangler).toContain('service = "tiko-atlas-api"')
    expect(wrangler).toContain('binding = "IDENTITY_SERVICE"')
    expect(wrangler).toContain('service = "tiko-identity-api-dev"')
    expect(wrangler).toContain('service = "tiko-identity-api"')
    expect(wrangler).toContain('IDENTITY_BASE_URL = "https://api.tikotalks.com/v1"')
    expect(wrangler).toContain('IDENTITY_BASE_URL = "https://identity.tikoapi.org/v1"')
  })
})
