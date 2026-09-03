// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker from '../workers/media-api/src/index'

type Row = Record<string, unknown>

// SQLite LIKE with ESCAPE '\': `%` and `_` are wildcards unless backslash-escaped.
function likeMatches(subject: string, pattern: string): boolean {
  let regex = ''
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]
    if (character === '\\') {
      index += 1
      regex += pattern[index]?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') ?? ''
    } else if (character === '%') {
      regex += '.*'
    } else if (character === '_') {
      regex += '.'
    } else {
      regex += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${regex}$`, 'i').test(subject)
}

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
  audioTrackQueryCount = 0

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

    for (const column of ['tags', 'categories'] as const) {
      if (!normalized.includes(`json_each(media.${column})`)) continue
      const rows = this.facetRows(column)
      // COUNT(DISTINCT …) backs the truncation meta; the list query takes LIMIT ?.
      if (normalized.includes('COUNT(DISTINCT')) return new MemoryResult([{ count: rows.length }])
      const limit = normalized.includes('LIMIT ?') ? Number(values.at(-1)) : rows.length
      return new MemoryResult(rows.slice(0, limit))
    }
    if (normalized.includes('substr(mime_type')) {
      const counts = new Map<string, number>()
      for (const row of this.media) {
        const kind = String(row.mime_type ?? '').split('/')[0]
        if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1)
      }
      return new MemoryResult([...counts].map(([value, count]) => ({ value, count })))
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
      this.audioTrackQueryCount += 1
      const albumIds = new Set(values.map(String))
      return new MemoryResult(this.audioTracks.filter(row => albumIds.has(String(row.album_id))).map(track => {
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

  // Stands in for `json_each` over a JSON array column.
  private facetRows(column: 'tags' | 'categories'): Row[] {
    const counts = new Map<string, number>()
    for (const row of this.media) {
      let parsed: unknown
      try { parsed = JSON.parse(String(row[column] ?? '[]')) } catch { continue }
      if (!Array.isArray(parsed)) continue
      for (const value of parsed) {
        if (typeof value !== 'string') continue
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
    }
    return [...counts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count }))
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
      valueIndex += 1
      filtered = filtered.filter(row => row.user_id === userId)
    }
    if (normalized.includes('title LIKE ? ESCAPE') && normalized.includes('description LIKE ? ESCAPE')) {
      // Prose columns take `%term%`; tags/categories take `%"term%`. Apply each
      // bound pattern to its own column so the anchoring is actually tested.
      const searchClause = normalized.slice(normalized.indexOf('(title LIKE ?'))
      const patternCount = (searchClause.slice(0, searchClause.indexOf(')')).match(/LIKE \?/g) ?? []).length
      const patterns = values.slice(valueIndex, valueIndex + patternCount).map(String)
      valueIndex += patternCount
      const columns = ['title', 'description', 'name', 'filename', 'tags', 'categories']
      filtered = filtered.filter(row => columns.some((column, index) =>
        likeMatches(String(row[column] ?? ''), patterns[index] ?? '')))
    }

    if (normalized.includes('categories LIKE ?')) {
      const categoryPatterns = values
        .slice(valueIndex)
        .filter((value): value is string => typeof value === 'string' && value.startsWith('%"') && value.endsWith('"%'))
        .map(value => value.slice(2, -2))
      if (categoryPatterns.length > 0) {
        filtered = filtered.filter(row => {
          const raw = String(row.folder ?? row.categories ?? '')
          return categoryPatterns.some(category => raw.includes(`"${category}"`) || raw === category)
        })
      }
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

class MemoryAuthDb {
  private readonly testApiKeyHash = 'sha256:92a285b165e21319c4fd750e257dea110e52f1b31183da3cc2d5689be31b7f7d'

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async () => {
          if (!sql.includes('FROM identity_api_keys')) return null
          if (values[0] !== this.testApiKeyHash) return null
          return {
            id: 'key_1',
            subject_id: 'svc_media',
            product: 'tiko',
            name: 'media test key',
            key_hash: values[0],
            scopes_json: JSON.stringify(['*']),
            expires_at: null,
            revoked_at: null,
          }
        },
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 1 } }),
      }),
    }
  }
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
    folder: JSON.stringify(['cards']),
    categories: JSON.stringify(['cards']),
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
    AUTH_DB: new MemoryAuthDb(),
    TOKEN_PEPPER: 'test-pepper',
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

  it('filters public media by multiple categories in one request', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({ id: 'media_2', file_name: 'dog.png', folder: JSON.stringify(['animals']), categories: JSON.stringify(['animals']) }))
    env.MEDIA_DB.media.push(mediaRow({ id: 'media_3', file_name: 'food.png', folder: JSON.stringify(['food']), categories: JSON.stringify(['food']) }))

    const response = await worker.fetch(new Request('https://media.test/v1/media?type=image&category=cards,animals&limit=10'), env as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.data.map((item: { id: string }) => item.id)).toEqual(['media_1', 'media_2'])
    expect(body.meta).toMatchObject({ total: 2, page: 1, limit: 10 })
  })

  it('searches media by tag, not just by title and description', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({
      id: 'media_cat',
      filename: 'img_2847.png',
      title: 'Untitled upload',
      description: null,
      tags: JSON.stringify(['cat', 'pet']),
      categories: JSON.stringify(['animals']),
      folder: JSON.stringify(['animals']),
    }))

    const response = await worker.fetch(new Request('https://media.test/v1/media?search=cat&limit=10'), env as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.data.map((item: { id: string }) => item.id)).toContain('media_cat')
  })

  it('searches media by category', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({
      id: 'media_food',
      title: 'Untitled upload',
      description: null,
      tags: JSON.stringify([]),
      categories: JSON.stringify(['food']),
      folder: JSON.stringify(['food']),
    }))

    const response = await worker.fetch(new Request('https://media.test/v1/media?search=food&limit=10'), env as never)
    const body = await parseJson(response)

    expect(body.data.map((item: { id: string }) => item.id)).toEqual(['media_food'])
  })

  it('exposes the full category list on each media item', async () => {
    const response = await worker.fetch(new Request('https://media.test/v1/media?limit=10'), makeEnv() as never)
    const body = await parseJson(response)

    expect(body.data[0]).toMatchObject({ folder: 'cards', categories: ['cards'] })
  })

  it('anchors tag and category search to the start of a value, so "pet" does not match "carpet"', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({
      id: 'media_pets',
      title: 'Untitled upload',
      description: null,
      tags: JSON.stringify(['pets', 'shop']),
      categories: JSON.stringify(['places']),
    }))
    env.MEDIA_DB.media.push(mediaRow({
      id: 'media_vacuum',
      title: 'Untitled upload',
      description: null,
      tags: JSON.stringify(['carpet', 'home']),
      categories: JSON.stringify(['tools']),
    }))

    const response = await worker.fetch(new Request('https://media.test/v1/media?search=pet&limit=10'), env as never)
    const ids = (await parseJson(response)).data.map((item: { id: string }) => item.id)

    expect(ids).toContain('media_pets')
    expect(ids).not.toContain('media_vacuum')
  })

  it('still matches a partially typed tag', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({
      id: 'media_cat',
      title: 'Untitled upload',
      description: null,
      tags: JSON.stringify(['cat']),
      categories: JSON.stringify(['animals']),
    }))

    const response = await worker.fetch(new Request('https://media.test/v1/media?search=ca&limit=10'), env as never)
    const ids = (await parseJson(response)).data.map((item: { id: string }) => item.id)

    expect(ids).toContain('media_cat')
  })

  it('treats LIKE wildcards in a search term as literal characters', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({ id: 'media_pct', title: '100% Juice', description: null, tags: JSON.stringify([]) }))

    const wildcard = await worker.fetch(new Request('https://media.test/v1/media?search=%25&limit=10'), env as never)
    const literal = await worker.fetch(new Request('https://media.test/v1/media?search=100%25&limit=10'), env as never)

    // A bare "%" must not behave as "match everything".
    expect((await parseJson(wildcard)).data.map((item: { id: string }) => item.id)).toEqual(['media_pct'])
    expect((await parseJson(literal)).data.map((item: { id: string }) => item.id)).toEqual(['media_pct'])
  })

  it('reports how much of each facet list it left out', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({ id: 'media_2', tags: JSON.stringify(['alpha', 'beta', 'gamma']) }))

    const response = await worker.fetch(new Request('https://media.test/v1/media/facets?limit=2'), env as never)
    const body = await parseJson(response)

    expect(body.data.tags).toHaveLength(2)
    expect(body.meta.limit).toBe(2)
    expect(body.meta.tags).toMatchObject({ returned: 2, truncated: true })
    expect(body.meta.tags.total).toBeGreaterThan(2)
  })

  it('does not claim truncation when the whole facet list fits', async () => {
    const response = await worker.fetch(new Request('https://media.test/v1/media/facets'), makeEnv() as never)
    const body = await parseJson(response)

    expect(body.meta.tags.truncated).toBe(false)
    expect(body.meta.categories.truncated).toBe(false)
    expect(body.meta.tags.total).toBe(body.data.tags.length)
  })

  it('reports the categories, tags and types that media actually uses', async () => {
    const env = makeEnv()
    env.MEDIA_DB.media.push(mediaRow({
      id: 'media_cat',
      mime_type: 'audio/mpeg',
      tags: JSON.stringify(['cat', 'test']),
      categories: JSON.stringify(['animals']),
    }))

    const response = await worker.fetch(new Request('https://media.test/v1/media/facets'), env as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.data.categories).toEqual(expect.arrayContaining([
      { value: 'animals', count: 1 },
      { value: 'cards', count: 1 },
    ]))
    // 'test' appears on both rows, so it must outrank the single-use tags.
    expect(body.data.tags[0]).toEqual({ value: 'test', count: 2 })
    expect(body.data.types).toEqual(expect.arrayContaining([
      { value: 'image', count: 1 },
      { value: 'audio', count: 1 },
    ]))
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

  it('rejects unsupported media upload MIME types', async () => {
    const env = makeEnv()
    const form = new FormData()
    form.set('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }))

    const response = await worker.fetch(new Request('https://media.test/v1/media/upload', {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key' },
      body: form,
    }), env as never)
    const body = await parseJson(response)

    expect(response.status).toBe(415)
    expect(body.error).toBe('Unsupported media type')
    expect(env.MEDIA_BUCKET.objects.size).toBe(0)
  })

  it('rejects private uploads without a session owner', async () => {
    const env = makeEnv()
    const form = new FormData()
    form.set('file', new File(['secret'], 'secret.png', { type: 'image/png' }))
    form.set('isPrivate', 'true')

    const response = await worker.fetch(new Request('https://media.test/v1/media/upload', {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key' },
      body: form,
    }), env as never)
    const body = await parseJson(response)

    expect(response.status).toBe(403)
    expect(body.error).toBe('Private uploads require a user session')
    expect(env.USER_MEDIA_BUCKET.objects.size).toBe(0)
  })

  it('rejects arbitrary media analysis URLs before provider calls', async () => {
    const env = makeEnv()

    const response = await worker.fetch(new Request('https://media.test/v1/media/analyze', {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key', 'content-type': 'application/json' },
      body: JSON.stringify({ imageUrl: 'https://evil.example/cat.png', title: 'Cat' }),
    }), env as never)
    const body = await parseJson(response)

    expect(response.status).toBe(403)
    expect(body.error).toBe('Image URL must be a readable Tiko media or CDN URL')
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
    env.MEDIA_DB.media.push(mediaRow({ id: 'audio_2', file_name: 'song.mp3', filename: 'song.mp3', mime_type: 'audio/mpeg', title: 'Wake Up Song', original_url: 'https://data.tikocdn.org/uploads/song.mp3' }))

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

    const createMusicAlbum = await worker.fetch(new Request('https://media.test/v1/audio/albums', {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key', 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Songs', description: 'Generated songs', visibility: 'public', radioEnabled: true, sortMode: 'manual', settings: { autoplay: true } }),
    }), env as never)
    const musicAlbumBody = await parseJson(createMusicAlbum)

    expect(createMusicAlbum.status).toBe(201)

    const addMusicTrack = await worker.fetch(new Request(`https://media.test/v1/audio/albums/${musicAlbumBody.data.id}/tracks`, {
      method: 'POST',
      headers: { authorization: 'Bearer test-api-key', 'content-type': 'application/json' },
      body: JSON.stringify({ mediaId: 'audio_2', title: 'Morning', artist: 'Tiko Music Creator', durationSeconds: 64 }),
    }), env as never)

    expect(addMusicTrack.status).toBe(201)

    const publicList = await worker.fetch(new Request('https://media.test/v1/audio/albums?radioEnabled=true'), env as never)
    const publicBody = await parseJson(publicList)
    const storiesAlbum = publicBody.data.find((album: Row) => album.id === albumBody.data.id)
    const musicAlbum = publicBody.data.find((album: Row) => album.id === musicAlbumBody.data.id)

    expect(publicList.status).toBe(200)
    expect(publicBody.data).toHaveLength(2)
    expect(storiesAlbum).toMatchObject({ id: albumBody.data.id, title: 'Stories', tracks: [expect.objectContaining({ title: 'Chapter 1', mediaId: 'audio_1', audioUrl: 'https://data.tikocdn.org/uploads/story.mp3' })] })
    expect(musicAlbum).toMatchObject({ id: musicAlbumBody.data.id, title: 'Songs', tracks: [expect.objectContaining({ title: 'Morning', mediaId: 'audio_2', audioUrl: 'https://data.tikocdn.org/uploads/song.mp3' })] })
    expect(env.MEDIA_DB.audioTrackQueryCount).toBe(1)
  })

  describe('external audio for Radio', () => {
    it('searches YouTube with strict safe search and attaches durations', async () => {
      const calls: string[] = []
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        calls.push(url)
        if (url.includes('/youtube/v3/search')) {
          return new Response(JSON.stringify({
            items: [
              {
                id: { videoId: 'abcdefghijk' },
                snippet: {
                  title: 'Sleepy lullaby',
                  channelTitle: 'Tiko Songs',
                  publishedAt: '2026-01-01T00:00:00Z',
                  thumbnails: { medium: { url: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg' } },
                },
              },
              { id: {}, snippet: { title: 'A playlist, not a video' } },
            ],
          }), { status: 200, headers: { 'content-type': 'application/json' } })
        }
        if (url.includes('/youtube/v3/videos')) {
          return new Response(JSON.stringify({
            items: [{ id: 'abcdefghijk', contentDetails: { duration: 'PT3M25S' } }],
          }), { status: 200, headers: { 'content-type': 'application/json' } })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })

      const env = { ...makeEnv(), YOUTUBE_API_KEY: 'yt-test-key' }
      const response = await worker.fetch(new Request('https://media.test/v1/youtube/search?q=lullaby&limit=5'), env as never)
      const body = await parseJson(response)

      expect(response.status).toBe(200)
      expect(body.data).toEqual([{
        videoId: 'abcdefghijk',
        title: 'Sleepy lullaby',
        channelTitle: 'Tiko Songs',
        thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
        publishedAt: '2026-01-01T00:00:00Z',
        durationSeconds: 205,
      }])
      expect(body.meta).toMatchObject({ total: 1, schemaVersion: 1 })
      expect(calls[0]).toContain('safeSearch=strict')
      expect(calls[0]).toContain('videoEmbeddable=true')
      expect(calls[0]).toContain('maxResults=5')
      expect(calls[0]).toContain('q=lullaby')
    })

    it('lists a channel newest-first when no query is given', async () => {
      const calls: string[] = []
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        calls.push(String(input))
        return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
      })

      const env = { ...makeEnv(), YOUTUBE_API_KEY: 'yt-test-key' }
      const response = await worker.fetch(new Request('https://media.test/v1/youtube/search?channelId=UC123'), env as never)

      expect(response.status).toBe(200)
      expect((await parseJson(response)).data).toEqual([])
      expect(calls[0]).toContain('channelId=UC123')
      expect(calls[0]).toContain('order=date')
      // No durations lookup when the search came back empty.
      expect(calls).toHaveLength(1)
    })

    it('reports a structured error when no YouTube key is configured', async () => {
      const response = await worker.fetch(new Request('https://media.test/v1/youtube/search?q=lullaby'), makeEnv() as never)
      const body = await parseJson(response)

      expect(response.status).toBe(503)
      expect(body.error).toMatchObject({ code: 'youtube_not_configured' })
    })

    it('rejects a YouTube search with neither query nor channel', async () => {
      const env = { ...makeEnv(), YOUTUBE_API_KEY: 'yt-test-key' }
      const response = await worker.fetch(new Request('https://media.test/v1/youtube/search'), env as never)

      expect(response.status).toBe(400)
      expect((await parseJson(response)).error).toMatchObject({ code: 'invalid_request' })
    })

    it('resolves a Spotify track link into a song', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        expect(String(input)).toContain('open.spotify.com/oembed')
        return new Response(JSON.stringify({
          title: 'Twinkle Twinkle Little Star',
          thumbnail_url: 'https://i.scdn.co/image/twinkle',
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      })

      const link = 'https://open.spotify.com/intl-nl/track/4uLU6hMCjMI75M1A2tKUQC?si=abc'
      const response = await worker.fetch(
        new Request(`https://media.test/v1/music/resolve?url=${encodeURIComponent(link)}`),
        makeEnv() as never,
      )
      const body = await parseJson(response)

      expect(response.status).toBe(200)
      expect(body.data).toMatchObject({
        provider: 'spotify',
        externalId: '4uLU6hMCjMI75M1A2tKUQC',
        externalUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
        title: 'Twinkle Twinkle Little Star',
        thumbnailUrl: 'https://i.scdn.co/image/twinkle',
      })
    })

    it('resolves an Apple Music song link with artist and duration', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        expect(String(input)).toContain('itunes.apple.com/lookup?id=1440857781')
        return new Response(JSON.stringify({
          results: [{
            trackName: 'Lullaby',
            artistName: 'Tiko Songs',
            artworkUrl100: 'https://is1-ssl.mzstatic.com/image/100x100bb.jpg',
            trackTimeMillis: 185000,
            trackViewUrl: 'https://music.apple.com/us/album/lullaby/1440857775?i=1440857781',
          }],
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      })

      const link = 'https://music.apple.com/us/album/lullaby/1440857775?i=1440857781'
      const response = await worker.fetch(
        new Request(`https://media.test/v1/music/resolve?url=${encodeURIComponent(link)}`),
        makeEnv() as never,
      )
      const body = await parseJson(response)

      expect(response.status).toBe(200)
      expect(body.data).toMatchObject({
        provider: 'apple-music',
        externalId: '1440857781',
        title: 'Lullaby',
        artist: 'Tiko Songs',
        thumbnailUrl: 'https://is1-ssl.mzstatic.com/image/300x300bb.jpg',
        durationSeconds: 185,
      })
    })

    it('rejects links from services Radio cannot play', async () => {
      const response = await worker.fetch(
        new Request(`https://media.test/v1/music/resolve?url=${encodeURIComponent('https://example.com/song/1')}`),
        makeEnv() as never,
      )

      expect(response.status).toBe(400)
      expect((await parseJson(response)).error).toMatchObject({ code: 'unsupported_music_link' })
    })
  })
})
