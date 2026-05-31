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
  records: AudioRecord[] = []

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

    if (normalized.startsWith('INSERT INTO tts_audio')) {
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
  return {
    TTS_DB: db,
    AUDIO_BUCKET: bucket,
    OPENAI_API_KEY: 'test-key',
    db,
    bucket,
    ...overrides,
  }
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, any>>
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
    it('rejects invalid JSON', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        new Request('https://tts.test/generate', {
          method: 'POST',
          body: 'not-json',
        }),
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
        new Request('https://tts.test/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ language: 'en' }),
        }),
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
        new Request('https://tts.test/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: 'Hello' }),
        }),
        env
      )
      expect(response.status).toBe(400)
      const body = await json(response)
      expect(body.error).toBe('missing_language')
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
        new Request('https://tts.test/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: '  Cached  ', language: 'EN' }),
        }),
        env
      )

      expect(response.status).toBe(200)
      expect(fetchSpy).not.toHaveBeenCalled()
      const body = await json(response)
      expect(body.success).toBe(true)
      expect(body.cached).toBe(true)
      expect(body.audioUrl).toBe(`/audio?key=audio%2F${textHash}.mp3`)
    })

    it('returns 503 when no API key and no cache hit', async () => {
      const env = makeEnv({ OPENAI_API_KEY: undefined })
      const response = await worker.fetch(
        new Request('https://tts.test/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: 'Hello', language: 'en' }),
        }),
        env
      )
      expect(response.status).toBe(503)
      const body = await json(response)
      expect(body.success).toBe(false)
      expect(body.error).toBe('tts_generation_not_configured')
    })

    it('returns 501 for azure provider', async () => {
      const env = makeEnv()
      const response = await worker.fetch(
        new Request('https://tts.test/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: 'Hello', language: 'en', provider: 'azure' }),
        }),
        env
      )
      expect(response.status).toBe(501)
      const body = await json(response)
      expect(body.success).toBe(false)
      expect(body.error).toBe('azure_tts_not_configured')
    })

    it('generates audio, stores in R2 and D1, and returns URL', async () => {
      const env = makeEnv()
      const audioBytes = new Uint8Array([0x49, 0x44, 0x33]) // fake MP3 header
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(audioBytes, { status: 200 }))

      const response = await worker.fetch(
        new Request('https://tts.test/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: 'Hello world', language: 'en' }),
        }),
        env
      )

      expect(response.status).toBe(200)
      const body = await json(response)
      expect(body.success).toBe(true)
      expect(body.cached).toBe(false)
      expect(body.audioUrl).toMatch(/^\/audio\?key=/)

      // Verify R2 storage
      expect(env.bucket.objects.size).toBe(1)
      const r2Key = Array.from(env.bucket.objects.keys())[0]
      expect(r2Key).toMatch(/^audio\/[a-f0-9]{32}\.mp3$/)

      // Verify D1 record
      expect(env.db.records.length).toBe(1)
      expect(env.db.records[0].text).toBe('Hello world')
      expect(env.db.records[0].language).toBe('en')
      expect(env.db.records[0].file_size_bytes).toBe(3)
    })

    it('handles OpenAI API error gracefully', async () => {
      const env = makeEnv()
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Rate limit exceeded', { status: 429 })
      )

      const response = await worker.fetch(
        new Request('https://tts.test/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: 'Hello', language: 'en' }),
        }),
        env
      )

      expect(response.status).toBe(502)
      const body = await json(response)
      expect(body.success).toBe(false)
      expect(body.error).toContain('openai_tts_failed')
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
