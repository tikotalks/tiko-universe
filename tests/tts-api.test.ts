import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker, { internals } from '../workers/tts-api/src/index'

// ── In-memory D1 fake ────────────────────────────────────────

type Row = Record<string, unknown>

class MemoryResult {
  constructor(private rows: Row[] = []) {}

  async first<T = Row>(): Promise<T | null> {
    return (this.rows[0] as T | undefined) ?? null
  }

  async run() {
    return { success: true }
  }
}

class MemoryStatement {
  private values: unknown[] = []

  constructor(private db: MemoryD1, private sql: string) {}

  bind(...values: unknown[]): MemoryStatement {
    this.values = values
    return this
  }

  first<T = Row>(): Promise<T | null> {
    return this.db.execute(this.sql, this.values).first<T>()
  }

  run() {
    return this.db.execute(this.sql, this.values).run()
  }

  async all() {
    return { results: [] }
  }
}

interface AudioRecord {
  id: string
  text_hash: string
  text: string
  language: string
  provider: string
  voice: string
  model: string
  speed: number
  pitch: number
  audio_url: string
  r2_key: string
  file_size_bytes: number
  generated_at: string
}

class MemoryD1 {
  byHash = new Map<string, Row>()
  usageWindows = new Map<string, { request_count: number; unit_count: number }>()
  apiKeys = new Map<string, Row>()
  records: AudioRecord[] = []
  conflictOnInsert: AudioRecord | null = null

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql)
  }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.startsWith('SELECT') && normalized.includes('WHERE text_hash')) {
      const hash = values[0] as string
      const row = this.byHash.get(hash)
      return new MemoryResult(row ? [row] : [])
    }
    if (normalized.startsWith('SELECT') && normalized.includes('FROM identity_api_keys')) {
      const hash = values[0] as string
      const row = this.apiKeys.get(hash)
      return new MemoryResult(row ? [row] : [])
    }
    if (normalized.startsWith('SELECT') && normalized.includes('FROM tts_usage_windows')) {
      const key = values.slice(0, 4).map(String).join('|')
      const row = this.usageWindows.get(key)
      return new MemoryResult(row ? [row] : [])
    }

    if (normalized.startsWith('INSERT INTO tts_usage_windows')) {
      const key = values.slice(0, 4).map(String).join('|')
      const current = this.usageWindows.get(key) ?? { request_count: 0, unit_count: 0 }
      current.request_count += Number(values[4])
      current.unit_count += Number(values[5])
      this.usageWindows.set(key, current)
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE identity_api_keys SET last_used_at')) {
      return new MemoryResult()
    }
    if (normalized.startsWith('INSERT INTO tts_audio') || normalized.startsWith('INSERT OR IGNORE INTO tts_audio')) {
      if (this.conflictOnInsert) {
        this.byHash.set(this.conflictOnInsert.text_hash, this.conflictOnInsert as unknown as Row)
        this.records.push(this.conflictOnInsert)
        this.conflictOnInsert = null
        return new MemoryResult()
      }
      const record: AudioRecord = {
        id: values[0] as string,
        text_hash: values[1] as string,
        text: values[2] as string,
        language: values[3] as string,
        provider: values[4] as string,
        voice: values[5] as string,
        model: values[6] as string,
        speed: values[7] as number,
        pitch: values[8] as number,
        audio_url: values[9] as string,
        r2_key: values[10] as string,
        file_size_bytes: values[11] as number,
        generated_at: values[12] as string,
      }
      if (normalized.startsWith('INSERT OR IGNORE') && this.byHash.has(record.text_hash)) {
        return new MemoryResult()
      }
      this.records.push(record)
      this.byHash.set(record.text_hash, record as unknown as Row)
      return new MemoryResult()
    }

    throw new Error(`Unhandled SQL in test fake: ${normalized}`)
  }
}

// ── In-memory R2 fake ───────────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────

function makeEnv(overrides: Record<string, unknown> = {}) {
  const db = new MemoryD1()
  const bucket = new MemoryR2()
  db.apiKeys.set('sha256:92a285b165e21319c4fd750e257dea110e52f1b31183da3cc2d5689be31b7f7d', {
    id: 'key_tts',
    subject_id: 'svc_tts',
    product: 'tiko',
    name: 'TTS test key',
    key_hash: 'sha256:92a285b165e21319c4fd750e257dea110e52f1b31183da3cc2d5689be31b7f7d',
    scopes_json: JSON.stringify(['tts.generate']),
    expires_at: null,
    revoked_at: null,
  })
  return {
    TTS_DB: db,
    AUTH_DB: db,
    AUDIO_BUCKET: bucket,
    ATLAS_SERVICE: { fetch: vi.fn(async (_input: Request | string) => atlasSpeechResponse()) },
    ATLAS_API_KEY: 'test-atlas-key',
    TOKEN_PEPPER: 'test-pepper',
    db,
    bucket,
    ...overrides,
  }
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, any>>
}

function ttsGenerate(body: unknown, init: RequestInit = {}) {
  return new Request('https://tts.test/generate', {
    ...init,
    method: 'POST',
    headers: { authorization: 'Bearer test-api-key', 'content-type': 'application/json', ...(init.headers ?? {}) },
    body: init.body ?? JSON.stringify(body),
  })
}

function atlasSpeechResponse(overrides: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({
    data: {
      id: 'atlas-audio-1',
      audioUrl: '/v1/atlas/assets/atlas-audio-1',
      contentType: 'audio/mpeg',
      cached: false,
      provider: { name: 'elevenlabs', model: 'eleven_multilingual_v2', voice: 'voice-1' },
      ...(overrides.data as Record<string, unknown> | undefined),
    },
    meta: { cached: false, schemaVersion: 1, requestId: 'atlas-req-1', ...(overrides.meta as Record<string, unknown> | undefined) },
    ...(overrides.error ? { error: overrides.error } : {}),
  }), { status: Number(overrides.status ?? 200), headers: { 'content-type': 'application/json' } })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

// ── Internal function tests ─────────────────────────────────

describe('tts-api internals', () => {
  it('normalizes requests with defaults and clamping', () => {
    const result = internals.normalizeRequest({
      text: '  Hello  ',
      language: 'EN',
    })
    expect(result).toEqual({
      text: 'Hello',
      language: 'en',
      provider: 'auto',
      voice: 'nova',
      model: 'tts-1',
      speed: 1,
      pitch: 0,
    })
  })

  it('normalizes openai provider and valid voice', () => {
    const result = internals.normalizeRequest({
      text: 'Hi',
      language: 'nl',
      provider: 'openai',
      voice: 'alloy',
      model: 'tts-1-hd',
      speed: 1.5,
      pitch: -5,
    })
    expect(result.provider).toBe('openai')
    expect(result.voice).toBe('alloy')
    expect(result.model).toBe('tts-1-hd')
    expect(result.speed).toBe(1.5)
    expect(result.pitch).toBe(-5)
  })

  it('normalizes azure provider and falls back unknown voice to nova', () => {
    const result = internals.normalizeRequest({
      text: 'Test',
      language: 'fr',
      provider: 'azure',
      voice: 'unknown-voice',
    })
    expect(result.provider).toBe('azure')
    expect(result.voice).toBe('nova')
  })

  it('clamps speed and pitch to valid ranges', () => {
    const max = internals.normalizeRequest({ text: 'T', language: 'en', speed: 100, pitch: 50 })
    expect(max.speed).toBe(4)
    expect(max.pitch).toBe(20)

    const min = internals.normalizeRequest({ text: 'T', language: 'en', speed: 0, pitch: -30 })
    expect(min.speed).toBe(0.25)
    expect(min.pitch).toBe(-20)
  })

  it('validates missing required fields', () => {
    expect(internals.validate({} as any)).toBe('missing_text')
    expect(internals.validate({ text: 'hello', language: '' } as any)).toBe('missing_language')
    expect(internals.validate({ text: '  ', language: 'en' } as any)).toBe('missing_text')
  })

  it('validates text length limit', () => {
    expect(internals.validate({ text: 'a'.repeat(501), language: 'en' } as any)).toBe('text_too_long')
    expect(internals.validate({ text: 'a'.repeat(500), language: 'en' } as any)).toBeNull()
  })

  it('validates speed and pitch types', () => {
    expect(internals.validate({ text: 'hi', language: 'en', speed: 'fast' } as any)).toBe('invalid_speed')
    expect(internals.validate({ text: 'hi', language: 'en', pitch: NaN } as any)).toBe('invalid_pitch')
    expect(internals.validate({ text: 'hi', language: 'en', speed: 1.0, pitch: 0 } as any)).toBeNull()
  })

  it('generates consistent text hashes for normalized input', async () => {
    const input = { text: 'Hello', language: 'en', provider: 'auto' as const, voice: 'nova', model: 'tts-1', speed: 1, pitch: 0 }
    const hash1 = await internals.generateTextHash(input)
    const hash2 = await internals.generateTextHash(input)
    expect(hash1).toHaveLength(32)
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[a-f0-9]+$/)
  })
})

// ── Worker contract tests ───────────────────────────────────

describe('tts-api worker', () => {
  it('returns 404 for unknown routes', async () => {
    const env = makeEnv()
    const response = await worker.fetch(
      new Request('https://tts.test/unknown'),
      env
    )
    expect(response.status).toBe(404)
    const body = await json(response)
    expect(body.success).toBe(false)
    expect(body.error).toBe('not_found')
  })

  it('handles CORS preflight', async () => {
    const env = makeEnv()
    const response = await worker.fetch(
      new Request('https://tts.test/generate', { method: 'OPTIONS' }),
      env
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  describe('POST /generate', () => {
    it('requires a service token', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        new Request('https://tts.test/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: 'Hello', language: 'en' }),
        }),
        env
      )
      expect(response.status).toBe(401)
      const body = await json(response)
      expect(body.success).toBe(false)
      expect(body.error).toBe('unauthorized')
    })

    it('rejects invalid JSON', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        ttsGenerate({}, { body: 'not-json' }),
        env
      )
      expect(response.status).toBe(400)
      const body = await json(response)
      expect(body.success).toBe(false)
      expect(body.error).toBe('invalid_json')
    })

    it('rejects missing text', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        ttsGenerate({ language: 'en' }),
        env
      )
      expect(response.status).toBe(400)
      const body = await json(response)
      expect(body.success).toBe(false)
      expect(body.error).toBe('missing_text')
    })

    it('rejects missing language', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        ttsGenerate({ text: 'Hello' }),
        env
      )
      expect(response.status).toBe(400)
      const body = await json(response)
      expect(body.error).toBe('missing_language')
    })

    it('enforces per-key rate limits and daily character budgets', async () => {
      const env = makeEnv()
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(new Uint8Array([0x49, 0x44, 0x33]), { status: 200 }))

      for (let index = 0; index < 60; index += 1) {
        const response = await worker.fetch(ttsGenerate({ text: `Hello ${index}`, language: 'en' }), env)
        expect(response.status).toBe(200)
      }

      const limited = await worker.fetch(ttsGenerate({ text: 'Too many', language: 'en' }), env)
      expect(limited.status).toBe(429)
      await expect(json(limited)).resolves.toMatchObject({ success: false, error: 'rate_limited' })

      const budgetEnv = makeEnv()
      const dayStart = new Date().toISOString().slice(0, 10)
      const subjectKey = 'api_key:svc_tts'
      budgetEnv.db.usageWindows.set(`${subjectKey}|tts.generate|day|${dayStart}`, { request_count: 1, unit_count: 11999 })
      const overBudget = await worker.fetch(ttsGenerate({ text: 'No', language: 'en' }), budgetEnv)
      expect(overBudget.status).toBe(429)
      await expect(json(overBudget)).resolves.toMatchObject({ success: false, error: 'budget_exceeded' })
    })

    it('routes cache misses through Atlas without provider hints', async () => {
      const env = makeEnv()
      const atlasFetch = vi.fn(async (input: Request | string) => {
        const request = input instanceof Request ? input : new Request(input)
        expect(new URL(request.url).pathname).toBe('/v1/atlas/speech')
        expect(request.headers.get('authorization')).toBe('Bearer test-atlas-key')
        const body = await request.json() as Record<string, unknown>
        expect(body).toMatchObject({
          app: 'tts-api',
          purpose: 'compatibility-tts',
          text: 'Route me',
          language: 'en',
        })
        expect(body).not.toHaveProperty('provider')
        expect(body).not.toHaveProperty('voice')
        expect(body).not.toHaveProperty('model')
        return atlasSpeechResponse()
      })
      env.ATLAS_SERVICE = { fetch: atlasFetch }

      const response = await worker.fetch(ttsGenerate({ text: 'Route me', language: 'en', provider: 'openai', voice: 'nova', model: 'tts-1' }), env)

      expect(response.status).toBe(200)
      expect(atlasFetch).toHaveBeenCalledTimes(1)
      expect(env.db.records).toHaveLength(0)
      expect(env.bucket.objects.size).toBe(0)
      await expect(json(response)).resolves.toMatchObject({
        success: true,
        cached: false,
        audioUrl: '/v1/atlas/assets/atlas-audio-1',
        metadata: { id: 'atlas-audio-1', provider: 'elevenlabs', requestId: 'atlas-req-1' },
      })
    })

    it('returns cached audio on D1 cache hit without calling the provider', async () => {
      const env = makeEnv()
      const normalized = internals.normalizeRequest({ text: 'Cached', language: 'en' })
      const textHash = await internals.generateTextHash(normalized)
      env.db.byHash.set(textHash, {
        id: 'cached-1',
        text_hash: textHash,
        text: 'Cached',
        language: 'en',
        provider: 'openai',
        voice: 'nova',
        model: 'tts-1',
        speed: 1,
        pitch: 0,
        audio_url: '/audio?key=audio%2F' + textHash + '.mp3',
        r2_key: `audio/${textHash}.mp3`,
        file_size_bytes: 1024,
        generated_at: '2026-05-01T00:00:00.000Z',
      })

      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const response = await worker.fetch(
        ttsGenerate({ text: '  Cached  ', language: 'EN' }),
        env
      )

      expect(response.status).toBe(200)
      expect(fetchSpy).not.toHaveBeenCalled()
      const body = await json(response)
      expect(body.success).toBe(true)
      expect(body.cached).toBe(true)
      expect(body.audioUrl).toBe(`/audio?key=audio%2F${textHash}.mp3`)
    })

    it('returns 503 when Atlas is not configured and there is no cache hit', async () => {
      const env = makeEnv({ ATLAS_SERVICE: undefined, ATLAS_API_KEY: undefined })
      const response = await worker.fetch(
        ttsGenerate({ text: 'Hello', language: 'en' }),
        env
      )
      expect(response.status).toBe(503)
      const body = await json(response)
      expect(body.success).toBe(false)
      expect(body.error).toBe('atlas_tts_not_configured')
    })

    it('lets Atlas handle legacy azure provider requests', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        ttsGenerate({ text: 'Hello', language: 'en', provider: 'azure' }),
        env
      )
      expect(response.status).toBe(200)
      const body = await json(response)
      expect(body.success).toBe(true)
      expect(body.audioUrl).toBe('/v1/atlas/assets/atlas-audio-1')
    })

    it('returns the Atlas audio URL without storing duplicate audio', async () => {
      const env = makeEnv()

      const response = await worker.fetch(
        ttsGenerate({ text: 'Hello world', language: 'en' }),
        env
      )

      expect(response.status).toBe(200)
      const body = await json(response)
      expect(body.success).toBe(true)
      expect(body.cached).toBe(false)
      expect(body.audioUrl).toBe('/v1/atlas/assets/atlas-audio-1')
      expect(env.bucket.objects.size).toBe(0)
      expect(env.db.records.length).toBe(0)
    })

    it('returns existing legacy cache rows before calling Atlas', async () => {
      const env = makeEnv()
      const atlasFetch = vi.fn(async () => atlasSpeechResponse())
      env.ATLAS_SERVICE = { fetch: atlasFetch }
      const normalized = internals.normalizeRequest({ text: 'Hello race', language: 'en' })
      const textHash = await internals.generateTextHash(normalized)
      env.db.byHash.set(textHash, {
        id: 'winner',
        text_hash: textHash,
        text: normalized.text,
        language: normalized.language,
        provider: normalized.provider,
        voice: normalized.voice,
        model: normalized.model,
        speed: normalized.speed,
        pitch: normalized.pitch,
        audio_url: '/audio?key=audio%2Fwinner.mp3',
        r2_key: 'audio/winner.mp3',
        file_size_bytes: 3,
        generated_at: '2026-01-01T00:00:00.000Z',
      })

      const response = await worker.fetch(
        ttsGenerate({ text: 'Hello race', language: 'en' }),
        env,
      )

      expect(response.status).toBe(200)
      expect(atlasFetch).not.toHaveBeenCalled()
      await expect(json(response)).resolves.toMatchObject({
        success: true,
        cached: true,
        audioUrl: '/audio?key=audio%2Fwinner.mp3',
        metadata: { id: 'winner' },
      })
    })

    it('returns Atlas errors without calling providers locally', async () => {
      const env = makeEnv({
        ATLAS_SERVICE: { fetch: vi.fn(async () => atlasSpeechResponse({ status: 429, error: { code: 'rate_limited' } })) },
      })
      const providerFetch = vi.spyOn(globalThis, 'fetch')

      const response = await worker.fetch(
        ttsGenerate({ text: 'Hello', language: 'en' }),
        env
      )

      expect(response.status).toBe(429)
      expect(providerFetch).not.toHaveBeenCalled()
      const body = await json(response)
      expect(body.success).toBe(false)
      expect(body.error).toBe('rate_limited')
    })
  })

  describe('GET /audio', () => {
    it('rejects missing key parameter', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        new Request('https://tts.test/audio'),
        env
      )
      expect(response.status).toBe(400)
      expect(await response.text()).toContain('Missing or invalid key')
    })

    it('rejects path traversal in key parameter', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        new Request('https://tts.test/audio?key=audio/../../secret.mp3'),
        env
      )
      expect(response.status).toBe(400)
    })

    it('rejects key without audio/ prefix', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        new Request('https://tts.test/audio?key=other/file.mp3'),
        env
      )
      expect(response.status).toBe(400)
    })

    it('returns 404 when R2 object not found', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        new Request('https://tts.test/audio?key=audio/nonexistent.mp3'),
        env
      )
      expect(response.status).toBe(404)
    })

    it('returns stored audio with correct content type and cache headers', async () => {
      const env = makeEnv()
      const audioData = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00])
      env.bucket.objects.set('audio/test123.mp3', {
        body: audioData.buffer,
        httpMetadata: { contentType: 'audio/mpeg' },
      })

      const response = await worker.fetch(
        new Request('https://tts.test/audio?key=audio/test123.mp3'),
        env
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('audio/mpeg')
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      const body = new Uint8Array(await response.arrayBuffer())
      expect(body).toEqual(audioData)
    })
  })
})
