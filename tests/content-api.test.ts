import { describe, expect, it } from 'vitest'
import worker from '../workers/content-api/src/index'

type Row = Record<string, unknown>

class MemoryResult {
  constructor(private rows: Row[] = []) {}
  async first<T = Row>(): Promise<T | null> { return (this.rows[0] as T | undefined) ?? null }
  async all<T = Row>(): Promise<{ results: T[] }> { return { results: this.rows as T[] } }
}

class MemoryStatement {
  private values: unknown[] = []
  constructor(private db: MemoryD1, private sql: string) {}
  bind(...values: unknown[]) { this.values = values; return this }
  first<T = Row>() { return this.db.execute(this.sql, this.values).first<T>() }
  all<T = Row>() { return this.db.execute(this.sql, this.values).all<T>() }
}

class MemoryD1 {
  projects: Row[] = [{
    id: 'proj_1', name: 'Cards', slug: 'cards', description: 'Cards content', is_active: 1,
    created_at: '2026-05-01T00:00:00.000Z', updated_at: '2026-05-01T00:00:00.000Z',
  }]
  pages: Row[] = [{
    id: 'page_1', project_id: 'proj_1', project_slug: 'cards', title: 'Animals', slug: 'animals',
    status: 'published', is_published: 1, language_code: 'en', navigation_order: 1,
    metadata: '{"level":"easy"}', created_at: '2026-05-01T00:00:00.000Z', updated_at: '2026-05-01T00:00:00.000Z',
  }]
  sections: Row[] = [{
    id: 'section_link_1', page_id: 'page_1', section_id: 'section_1', section_template_id: 'template_1',
    order_index: 1, sort_order: 1, name: 'Animal choices', slug: 'animal-choices', template_id: 'choice-grid',
  }]
  languages: Row[] = [{ code: 'en', name: 'English', is_active: 1 }]
  items: Row[] = [{
    id: 'item_1', template_id: 'card', title: 'Cat', slug: 'cat', status: 'published', language_code: 'en',
    tags: '["animal"]', categories: '["cards"]', data: '{"emoji":"🐱"}',
  }]

  prepare(sql: string) { return new MemoryStatement(this, sql) }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()
    if (normalized.includes('FROM content_projects')) {
      if (normalized.includes('slug = ?')) return new MemoryResult(this.projects.filter(row => row.slug === values[0]))
      if (normalized.includes('id = ?')) return new MemoryResult(this.projects.filter(row => row.id === values[0]))
      return new MemoryResult(this.projects)
    }
    if (normalized.includes('FROM content_pages')) {
      if (normalized.includes('p.id = ?')) return new MemoryResult(this.pages.filter(row => row.id === values[0]))
      if (normalized.includes('p.slug = ?')) return new MemoryResult(this.pages.filter(row => row.slug === values[0]))
      return new MemoryResult(this.pages)
    }
    if (normalized.includes('FROM content_page_sections')) return new MemoryResult(this.sections.filter(row => row.page_id === values[0]))
    if (normalized.includes('FROM languages')) return new MemoryResult(this.languages)
    if (normalized.includes('FROM content_items')) {
      if (normalized.includes('id = ?')) return new MemoryResult(this.items.filter(row => row.id === values[0]))
      if (normalized.includes('slug = ?')) return new MemoryResult(this.items.filter(row => row.slug === values[0]))
      return new MemoryResult(this.items)
    }
    throw new Error(`Unhandled SQL in content-api fake: ${normalized}`)
  }
}

class MemoryKV {
  values = new Map<string, string>()
  async get(key: string) { return this.values.get(key) ?? null }
  async put(key: string, value: string) { this.values.set(key, value) }
}

function makeEnv() {
  return {
    CONTENT_DB: new MemoryD1(),
    CONTENT_CACHE: new MemoryKV(),
    ALLOWED_ORIGINS: 'https://cards.tikoapps.org,http://localhost:5173',
  }
}

async function parseJson(response: Response) {
  return response.json() as Promise<Record<string, any>>
}

describe('content-api worker', () => {
  it('serves health without cache', async () => {
    const response = await worker.fetch(new Request('https://content.test/health'), makeEnv() as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body).toEqual({ ok: true, service: 'content-api' })
  })

  it('handles CORS for allowed origins and omits denied origins', async () => {
    const env = makeEnv()
    const allowed = await worker.fetch(new Request('https://content.test/v1/projects', {
      method: 'OPTIONS', headers: { Origin: 'https://cards.tikoapps.org' },
    }), env as never)
    const denied = await worker.fetch(new Request('https://content.test/v1/projects', {
      method: 'OPTIONS', headers: { Origin: 'https://evil.example' },
    }), env as never)

    expect(allowed.status).toBe(204)
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://cards.tikoapps.org')
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('lists projects and caches published read models', async () => {
    const env = makeEnv()
    const first = await worker.fetch(new Request('https://content.test/v1/projects'), env as never)
    const second = await worker.fetch(new Request('https://content.test/v1/projects'), env as never)

    expect(first.status).toBe(200)
    expect((await parseJson(first)).data).toEqual([{ id: 'proj_1', name: 'Cards', slug: 'cards', description: 'Cards content', created_at: '2026-05-01T00:00:00.000Z', updated_at: '2026-05-01T00:00:00.000Z' }])
    expect(second.status).toBe(200)
    expect(env.CONTENT_CACHE.values.size).toBe(1)
  })

  it('reads a project by slug and returns 404 for missing projects', async () => {
    const env = makeEnv()
    const found = await worker.fetch(new Request('https://content.test/v1/projects/cards'), env as never)
    const missing = await worker.fetch(new Request('https://content.test/v1/projects/missing'), env as never)

    expect(found.status).toBe(200)
    expect((await parseJson(found)).data.slug).toBe('cards')
    expect(missing.status).toBe(404)
    expect((await parseJson(missing)).error.code).toBe('not_found')
  })

  it('returns a page with sections via REST route', async () => {
    const response = await worker.fetch(new Request('https://content.test/v1/pages/animals?projectSlug=cards&languageCode=en'), makeEnv() as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({ id: 'page_1', slug: 'animals', metadata: { level: 'easy' } })
    expect(body.data.sections).toHaveLength(1)
    expect(body.data.sections[0]).toMatchObject({ id: 'section_link_1', name: 'Animal choices' })
  })

  it('supports legacy POST /query methods', async () => {
    const response = await worker.fetch(new Request('https://content.test/query?no-cache=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'getItemBySlug', params: { slug: 'cat' } }),
    }), makeEnv() as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({ id: 'item_1', slug: 'cat', tags: ['animal'], data: { emoji: '🐱' } })
  })

  it('rejects malformed query requests', async () => {
    const invalidJson = await worker.fetch(new Request('https://content.test/v1/query', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    }), makeEnv() as never)
    const unknownMethod = await worker.fetch(new Request('https://content.test/v1/query', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'explode' }),
    }), makeEnv() as never)

    expect(invalidJson.status).toBe(400)
    expect((await parseJson(invalidJson)).error.code).toBe('bad_request')
    expect(unknownMethod.status).toBe(400)
    expect((await parseJson(unknownMethod)).error.message).toContain('Unknown method')
  })
})
