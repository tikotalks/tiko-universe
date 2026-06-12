// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  audioAlbums: Row[] = []
  audioTracks: Row[] = []

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql)
  }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.startsWith('INSERT INTO media')) {
      const row = {
        id: values[0],
        name: values[1],
        filename: values[2],
        file_name: values[2],
        file_size: values[3],
        mime_type: values[4],
        width: values[5],
        height: values[6],
        title: values[7],
        description: values[8],
        categories: values[9],
        folder: values[9],
        tags: values[10],
        is_private: values[11],
        owner_user_id: values[12],
        original_url: values[13],
        thumbnail_url: values[14],
        medium_url: values[15],
        created_at: values[16],
        updated_at: values[17],
      }
      this.media.push(row)
      return new MemoryResult()
    }

    if (normalized.includes('FROM media')) {
      const rows = this.filterRows(this.media, normalized, values)
      if (normalized.includes('COUNT(*)')) return new MemoryResult([{ count: rows.length }])
      if (normalized.includes('WHERE id = ?')) {
        const id = String(values[0])
        return new MemoryResult(this.media.filter(row => row.id === id))
      }
      return new MemoryResult(rows)
    }

    if (normalized.startsWith('INSERT INTO audio_albums')) {
      const row = {
        id: values[0],
        title: values[1],
        description: values[2],
        cover_media_id: values[3],
        visibility: values[4],
        radio_enabled: values[5],
        sort_mode: values[6],
        settings: values[7],
        created_at: values[8],
        updated_at: values[9],
      }
      this.audioAlbums.push(row)
      return new MemoryResult()
    }

    if (normalized.startsWith('INSERT INTO audio_tracks')) {
      const row = {
        id: values[0],
        album_id: values[1],
        media_id: values[2],
        title: values[3],
        artist: values[4],
        duration_seconds: values[5],
        position: values[6],
        created_at: values[7],
        updated_at: values[8],
      }
      this.audioTracks.push(row)
      return new MemoryResult()
    }

    if (normalized.includes('FROM audio_albums')) {
      if (normalized.includes('COUNT(*)')) return new MemoryResult([{ count: this.audioAlbums.filter(row => row.visibility === 'public' && row.radio_enabled === 1).length }])
      if (normalized.includes('WHERE id = ?')) return new MemoryResult(this.audioAlbums.filter(row => row.id === values[0]))
      return new MemoryResult(this.audioAlbums.filter(row => row.visibility === 'public' && row.radio_enabled === 1))
    }

    if (normalized.includes('FROM audio_tracks')) {
      return new MemoryResult(this.audioTracks.filter(row => row.album_id === values[0]).map(track => {
        const media = this.media.find(row => row.id === track.media_id) ?? {}
        return { ...media, ...track, track_id: track.id, media_id: track.media_id, media_title: media.title }
      }))
    }

    if (normalized.includes('FROM assets')) {
      const rows = this.filterRows(this.assets, normalized, values)
      if (normalized.includes('COUNT(*)')) return new MemoryResult([{ count: rows.length }])
      if (normalized.includes('WHERE id = ?')) {
        const id = String(values[0])
        return new MemoryResult(this.assets.filter(row => row.id === id))
      }
      return new MemoryResult(rows)
    }

    if (normalized.startsWith('INSERT INTO assets')) return new MemoryResult()
    throw new Error(`Unhandled SQL in media-api test fake: ${normalized}`)
  }

  private filterRows(rows: Row[], normalized: string, values: unknown[]): Row[] {
    let filtered = rows
    let valueIndex = 0
    if (normalized.includes('(is_private = 0 OR owner_user_id = ?)')) {
      const owner = String(values[valueIndex])
      valueIndex += 1
      filtered = filtered.filter(row => Number(row.is_private) === 0 || row.owner_user_id === owner)
    } else if (normalized.includes('is_private = 0')) {
      filtered = filtered.filter(row => Number(row.is_private) === 0)
    }

    if (normalized.includes('(is_public = 1 OR user_id = ?)')) {
      const userId = String(values[valueIndex])
      valueIndex += 1
      filtered = filtered.filter(row => Number(row.is_public) === 1 || row.user_id === userId)
    } else if (normalized.includes('is_public = 1')) {
      filtered = filtered.filter(row => Number(row.is_public) === 1)
    }

    if (normalized.includes('user_id = ?') && !normalized.includes('(is_public = 1 OR user_id = ?)')) {
      const userId = String(values[valueIndex])
      filtered = filtered.filter(row => row.user_id === userId)
    }
    return filtered
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
    owner_user_id: null,
    original_url: 'https://data.tikocdn.org/uploads/hello.png',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

function authFetch(userId = 'usr_1') {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({
    subject: { id: userId },
    session: { token: 'session-token', expiresAt: '2099-01-01T00:00:00.000Z' },
  }), { status: 200, headers: { 'content-type': 'application/json' } }))
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
  beforeEach(() => {
    vi.restoreAllMocks()
  })

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

  it('requires owner session or service key for private media records', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({
      id: 'media_private',
      is_private: 1,
      owner_user_id: 'usr_1',
      original_url: '/v1/media/media_private/download',
    }))

    const unauthenticated = await worker.fetch(new Request('https://media.test/v1/media/media_private'), env as never)
    expect(unauthenticated.status).toBe(401)

    authFetch('usr_2')
    const otherUser = await worker.fetch(new Request('https://media.test/v1/media/media_private', {
      headers: { authorization: 'Bearer session-token' },
    }), env as never)
    expect(otherUser.status).toBe(403)

    vi.restoreAllMocks()
    authFetch('usr_1')
    const owner = await worker.fetch(new Request('https://media.test/v1/media/media_private', {
      headers: { authorization: 'Bearer session-token' },
    }), env as never)
    expect(owner.status).toBe(200)
    expect((await parseJson(owner)).data.id).toBe('media_private')

    const service = await worker.fetch(new Request('https://media.test/v1/media/media_private', {
      headers: { authorization: 'Bearer test-api-key' },
    }), env as never)
    expect(service.status).toBe(200)
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

  it('serves private downloads only from the user media bucket to authorized callers', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({
      id: 'media_private',
      file_name: 'uploads/private.png',
      filename: 'uploads/private.png',
      is_private: 1,
      owner_user_id: 'usr_1',
      original_url: '/v1/media/media_private/download',
    }))
    env.USER_MEDIA_BUCKET.objects.set('uploads/private.png', {
      body: new Uint8Array([9, 8, 7]).buffer,
      httpMetadata: { contentType: 'image/png' },
    })

    const unauthenticated = await worker.fetch(new Request('https://media.test/v1/media/media_private/download'), env as never)
    expect(unauthenticated.status).toBe(401)

    authFetch('usr_1')
    const owner = await worker.fetch(new Request('https://media.test/v1/media/media_private/download', {
      headers: { authorization: 'Bearer session-token' },
    }), env as never)
    expect(owner.status).toBe(200)
    expect(owner.headers.get('Location')).toBeNull()
    expect(new Uint8Array(await owner.arrayBuffer())).toEqual(new Uint8Array([9, 8, 7]))
  })

  it('requires auth for media uploads', async () => {
    const form = new FormData()
    form.set('file', new File(['hello'], 'hello.png', { type: 'image/png' }))

    const response = await worker.fetch(new Request('https://media.test/v1/media/upload', { method: 'POST', body: form }), makeEnv() as never)
    const body = await parseJson(response)

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
  })

  it('uploads media with API key auth, persists catalog metadata, and skips Vision when no OpenAI key is configured', async () => {
    const env = makeEnv()
    const form = new FormData()
    form.set('file', new File(['hello'], 'blob', { type: 'image/jpeg' }))

    const response = await worker.fetch(new Request('https://media.test/v1/media/upload', {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key' },
      body: form,
    }), env as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.id).toEqual(expect.any(String))
    expect(body.filename).toMatch(/^uploads\/\d+-blob$/)
    expect(body.title).toBe('Blob')
    expect(body._meta.visionAttempted).toBe(false)
    expect(env.MEDIA_BUCKET.objects.size).toBe(1)
    expect(env.MEDIA_DB.media).toHaveLength(2)
    expect(env.MEDIA_DB.media[1]).toMatchObject({
      id: body.id,
      mime_type: 'image/jpeg',
      title: 'Blob',
      original_url: body.url,
      is_private: 0,
      owner_user_id: null,
    })
  })

  it('stores private session media in the user bucket with the session owner', async () => {
    const env = makeEnv()
    authFetch('usr_1')
    const form = new FormData()
    form.set('file', new File(['secret'], 'secret.png', { type: 'image/png' }))
    form.set('isPrivate', 'true')

    const response = await worker.fetch(new Request('https://media.test/v1/media/upload', {
      method: 'POST',
      headers: { authorization: 'Bearer session-token' },
      body: form,
    }), env as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.url).toBe(`/v1/media/${body.id}/download`)
    expect(env.MEDIA_BUCKET.objects.size).toBe(0)
    expect(env.USER_MEDIA_BUCKET.objects.size).toBe(1)
    expect(env.MEDIA_DB.media[1]).toMatchObject({
      id: body.id,
      is_private: 1,
      owner_user_id: 'usr_1',
      original_url: `/v1/media/${body.id}/download`,
    })
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

  it('defaults asset reads to public and protects private owner assets', async () => {
    const env = makeEnv()
    env.ASSETS_DB.assets.push(assetRow({ id: 'asset_private', is_public: 0, user_id: 'usr_1', title: 'Private Cat' }))

    const list = await worker.fetch(new Request('https://media.test/v1/assets'), env as never)
    const listBody = await parseJson(list)
    expect(list.status).toBe(200)
    expect(listBody.assets.map((asset: Row) => asset.id)).toEqual(['asset_1'])

    const unauthenticated = await worker.fetch(new Request('https://media.test/v1/assets/asset_private'), env as never)
    expect(unauthenticated.status).toBe(401)

    authFetch('usr_2')
    const otherUser = await worker.fetch(new Request('https://media.test/v1/assets/asset_private', {
      headers: { authorization: 'Bearer session-token' },
    }), env as never)
    expect(otherUser.status).toBe(403)

    vi.restoreAllMocks()
    authFetch('usr_1')
    const owner = await worker.fetch(new Request('https://media.test/v1/assets/asset_private', {
      headers: { authorization: 'Bearer session-token' },
    }), env as never)
    expect(owner.status).toBe(200)
    expect((await parseJson(owner)).asset.title).toBe('Private Cat')
  })

  it('creates audio albums and exposes radio-enabled public albums with tracks', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({ id: 'audio_1', file_name: 'story.mp3', filename: 'story.mp3', mime_type: 'audio/mpeg', title: 'Bedtime Story', original_url: 'https://data.tikocdn.org/uploads/story.mp3' }))

    const createAlbum = await worker.fetch(new Request('https://media.test/v1/audio/albums', {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key', 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Stories', description: 'Generated stories', visibility: 'public', radioEnabled: true, sortMode: 'manual', settings: { autoplay: false } }),
    }), env as never)
    const albumBody = await parseJson(createAlbum)

    expect(createAlbum.status).toBe(201)
    expect(albumBody.data).toMatchObject({ title: 'Stories', visibility: 'public', radioEnabled: true })

    const addTrack = await worker.fetch(new Request(`https://media.test/v1/audio/albums/${albumBody.data.id}/tracks`, {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key', 'content-type': 'application/json' },
      body: JSON.stringify({ mediaId: 'audio_1', title: 'Chapter 1', artist: 'Tiko Story Creator', durationSeconds: 42 }),
    }), env as never)

    expect(addTrack.status).toBe(201)
    expect((await parseJson(addTrack)).data).toMatchObject({ albumId: albumBody.data.id, mediaId: 'audio_1', title: 'Chapter 1' })

    const publicList = await worker.fetch(new Request('https://media.test/v1/audio/albums?radioEnabled=true'), env as never)
    const publicBody = await parseJson(publicList)

    expect(publicList.status).toBe(200)
    expect(publicBody.data).toHaveLength(1)
    expect(publicBody.data[0]).toMatchObject({ id: albumBody.data.id, title: 'Stories', tracks: [expect.objectContaining({ title: 'Chapter 1', mediaId: 'audio_1', audioUrl: 'https://data.tikocdn.org/uploads/story.mp3' })] })
  })
})
