import { describe, expect, it, vi } from 'vitest'
import worker from '../workers/media-api/src/index'

type Row = Record<string, unknown>

class MemoryResult {
  constructor(private rows: Row[] = []) {}

  async first<T = Row>(): Promise<T | null> {
    return (this.rows[0] as T | undefined) ?? null
  }

  async all<T = Row>(): Promise<{ results: T[] }> {
    return { results: this.rows as T[] }
  }

  async run(): Promise<{ meta: { changes: number } }> {
    return { meta: { changes: 1 } }
  }
}

class MemoryStatement {
  private values: unknown[] = []

  constructor(private db: MemoryD1, private sql: string) {}

  bind(...values: unknown[]): MemoryStatement {
    this.values = values
    return this
  }

  first<T = Row>() { return this.db.execute(this.sql, this.values).first<T>() }
  all<T = Row>() { return this.db.execute(this.sql, this.values).all<T>() }
  run() { return this.db.execute(this.sql, this.values).run() }
}

class MemoryD1 {
  media: Row[] = []
  assets: Row[] = []

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql)
  }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.includes('FROM media')) {
      if (normalized.includes('COUNT(*)')) return new MemoryResult([{ count: this.media.filter(row => row.is_private === 0).length }])
      if (normalized.includes('WHERE id = ?')) {
        const id = String(values[0])
        return new MemoryResult(this.media.filter(row => row.id === id))
      }
      return new MemoryResult(this.media.filter(row => row.is_private === 0))
    }

    if (normalized.includes('FROM assets')) {
      if (normalized.includes('COUNT(*)')) return new MemoryResult([{ count: this.assets.length }])
      if (normalized.includes('WHERE id = ?')) {
        const id = String(values[0])
        return new MemoryResult(this.assets.filter(row => row.id === id))
      }
      return new MemoryResult(this.assets)
    }

    if (normalized.startsWith('INSERT INTO assets')) return new MemoryResult()
    throw new Error(`Unhandled SQL in media-api test fake: ${normalized}`)
  }
}

class MemoryR2 {
  objects = new Map<string, { body: BodyInit; httpMetadata?: { contentType?: string } }>()
  deleted: string[] = []

  async get(key: string) { return this.objects.get(key) ?? null }
  async put(key: string, value: BodyInit, options?: Record<string, unknown>) {
    this.objects.set(key, { body: value, httpMetadata: options?.httpMetadata as { contentType?: string } | undefined })
  }
  async delete(key: string) { this.deleted.push(key); this.objects.delete(key) }
}

function mediaRow(overrides: Row = {}): Row {
  return {
    id: 'media_1',
    file_name: 'hello.png',
    file_size: 12,
    mime_type: 'image/png',
    width: 2,
    height: 3,
    alt_text: 'Hello image',
    title: 'Hello',
    description: 'A test image',
    folder: 'cards',
    tags: JSON.stringify(['test', 'cards']),
    is_private: 0,
    original_url: 'https://data.tikocdn.org/uploads/hello.png',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

function assetRow(overrides: Row = {}): Row {
  return {
    id: 'asset_1',
    title: 'Card Cat',
    description: 'A cat card',
    filename: 'cat.png',
    original_filename: 'cat.png',
    file_path: 'assets/cat.png',
    file_size: 10,
    mime_type: 'image/png',
    file_extension: '.png',
    categories: JSON.stringify(['animals']),
    tags: JSON.stringify(['cat']),
    width: 4,
    height: 5,
    duration: null,
    is_public: 1,
    user_id: 'usr_1',
    created_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeEnv() {
  const mediaDb = new MemoryD1()
  mediaDb.media.push(mediaRow())
  const assetsDb = new MemoryD1()
  assetsDb.assets.push(assetRow())
  return {
    MEDIA_DB: mediaDb,
    ASSETS_DB: assetsDb,
    MEDIA_BUCKET: new MemoryR2(),
    ASSETS_BUCKET: new MemoryR2(),
    USER_MEDIA_BUCKET: new MemoryR2(),
    API_KEYS: 'test-api-key',
  }
}

async function parseJson(response: Response) {
  return response.json() as Promise<Record<string, any>>
}

describe('media-api worker', () => {
  it('handles CORS preflight', async () => {
    const response = await worker.fetch(new Request('https://media.test/v1/media', { method: 'OPTIONS' }), makeEnv() as never)

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  it('returns 404 for unknown versions/routes', async () => {
    const response = await worker.fetch(new Request('https://media.test/v2/media'), makeEnv() as never)
    const body = await parseJson(response)

    expect(response.status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Not found')
  })

  it('lists public media with pagination metadata', async () => {
    const response = await worker.fetch(new Request('https://media.test/v1/media?page=1&limit=10'), makeEnv() as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({ id: 'media_1', file_name: 'hello.png', tags: ['test', 'cards'], is_private: false })
    expect(body.meta).toMatchObject({ total: 1, page: 1, limit: 10, totalPages: 1 })
  })

  it('returns one media record and 404s missing media', async () => {
    const env = makeEnv()
    const found = await worker.fetch(new Request('https://media.test/v1/media/media_1'), env as never)
    const missing = await worker.fetch(new Request('https://media.test/v1/media/missing'), env as never)

    expect(found.status).toBe(200)
    expect((await parseJson(found)).data.title).toBe('Hello')
    expect(missing.status).toBe(404)
    expect((await parseJson(missing)).error).toBe('Media not found')
  })

  it('downloads media from R2 before falling back to redirect', async () => {
    const env = makeEnv()
    env.MEDIA_BUCKET.objects.set('uploads/hello.png', {
      body: new Uint8Array([1, 2, 3]).buffer,
      httpMetadata: { contentType: 'image/png' },
    })

    const response = await worker.fetch(new Request('https://media.test/v1/media/media_1/download'), env as never)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Content-Disposition')).toContain('hello.png')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('requires auth for media uploads', async () => {
    const form = new FormData()
    form.set('file', new File(['hello'], 'hello.png', { type: 'image/png' }))

    const response = await worker.fetch(new Request('https://media.test/v1/media/upload', { method: 'POST', body: form }), makeEnv() as never)
    const body = await parseJson(response)

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
  })

  it('uploads media with API key auth and skips Vision when no OpenAI key is configured', async () => {
    const env = makeEnv()
    const form = new FormData()
    form.set('file', new Blob(['hello'], { type: 'image/jpeg' }), 'Family Photo.JPG')

    const response = await worker.fetch(new Request('https://media.test/v1/media/upload', {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key' },
      body: form,
    }), env as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.filename).toMatch(/^uploads\/\d+-blob$/)
    expect(body.title).toBe('Blob')
    expect(body._meta.visionAttempted).toBe(false)
    expect(env.MEDIA_BUCKET.objects.size).toBe(1)
  })

  it('lists and reads assets', async () => {
    const env = makeEnv()
    const list = await worker.fetch(new Request('https://media.test/v1/assets?public=true'), env as never)
    const get = await worker.fetch(new Request('https://media.test/v1/assets/asset_1'), env as never)

    expect(list.status).toBe(200)
    expect((await parseJson(list)).assets[0]).toMatchObject({ id: 'asset_1', categories: ['animals'], tags: ['cat'] })
    expect(get.status).toBe(200)
    expect((await parseJson(get)).asset.title).toBe('Card Cat')
  })
})
