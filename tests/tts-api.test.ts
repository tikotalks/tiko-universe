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

class MemoryD1 {
  apiKeys = new Map<string, Row>()

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql)
  }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.startsWith('SELECT') && normalized.includes('FROM identity_api_keys')) {
      const hash = values[0] as string
      const row = this.apiKeys.get(hash)
      return new MemoryResult(row ? [row] : [])
    }
    if (normalized.startsWith('UPDATE identity_api_keys SET last_used_at')) {
      return new MemoryResult()
    }

    throw new Error(`Unhandled SQL in test fake: ${normalized}`)
  }
}

// ── Helpers ─────────────────────────────────────────────────

function makeEnv(overrides: Record<string, unknown> = {}) {
  const db = new MemoryD1()
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
    AUTH_DB: db,
    ATLAS_SERVICE: { fetch: vi.fn(async (_input: Request | string) => atlasSpeechResponse()) },
    ATLAS_API_KEY: 'test-atlas-key',
    TOKEN_PEPPER: 'test-pepper',
    db,
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

    it('routes every valid request through Atlas without provider hints', async () => {
      const env = makeEnv()
      const atlasFetch = vi.fn(async (input: Request | string) => {
        const request = input instanceof Request ? input : new Request(input)
        expect(new URL(request.url).pathname).toBe('/v1/atlas/speech')
        expect(request.headers.get('authorization')).toBe('Bearer test-atlas-key')
        const body = await request.json() as Record<string, unknown>
        expect(body).toMatchObject({
          app: 'tts-api',
          purpose: 'speech-playback',
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
      await expect(json(response)).resolves.toMatchObject({
        success: true,
        cached: false,
        audioUrl: '/v1/atlas/assets/atlas-audio-1',
        metadata: { id: 'atlas-audio-1', provider: 'elevenlabs', requestId: 'atlas-req-1' },
      })
    })

    it('returns 503 when Atlas is not configured', async () => {
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

    it('lets Atlas handle old provider fields', async () => {
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

    it('returns the Atlas audio URL without storing local audio', async () => {
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
    it('is not served by this worker', async () => {
      const env = makeEnv()
      const response = await worker.fetch(new Request('https://tts.test/audio?key=audio/test.mp3'), env)
      expect(response.status).toBe(404)
      await expect(json(response)).resolves.toMatchObject({ success: false, error: 'not_found' })
    })
  })
})
