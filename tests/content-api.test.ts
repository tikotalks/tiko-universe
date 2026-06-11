import { afterEach, describe, expect, it, vi } from 'vitest'
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
  appItems: Row[] = [
    {
      id: '__default_animals', app_id: 'cards', type: 'collection', parent_id: null, title: 'Animals',
      subtitle: null, body: null, speech: 'Animals', color_token: 'green', color_hex: null,
      icon: null, image_ref: null, sort_order: 1, is_default: 1, is_published: 1,
      owner_user_id: null, owner_child_id: null, source_item_id: null, metadata_json: '{"mediaCategories":["animals"]}',
    },
    {
      id: '__default_animals_dog', app_id: 'cards', type: 'card', parent_id: '__default_animals', title: 'Dog',
      subtitle: null, body: null, speech: 'Dog', color_token: 'green', color_hex: null,
      icon: null, image_ref: null, sort_order: 1, is_default: 1, is_published: 1,
      owner_user_id: null, owner_child_id: null, source_item_id: null, metadata_json: '{"collectionId":"__default_animals"}',
    },
    {
      id: 'yes-no-set-yes-no', app_id: 'yes-no', type: 'answer_set', parent_id: null, title: 'Yes / No',
      subtitle: 'Simple yes and no answers.', body: null, speech: null, color_token: 'green', color_hex: null,
      icon: null, image_ref: null, sort_order: 0, is_default: 1, is_published: 1,
      owner_user_id: null, owner_child_id: null, source_item_id: null, metadata_json: '{}',
    },
    {
      id: 'yes-no-answer-yes', app_id: 'yes-no', type: 'answer_tile', parent_id: 'yes-no-set-yes-no', title: 'Yes',
      subtitle: null, body: null, speech: 'Yes', color_token: 'green', color_hex: null,
      icon: 'ui/check-fat', image_ref: null, sort_order: 0, is_default: 1, is_published: 1,
      owner_user_id: null, owner_child_id: null, source_item_id: null, metadata_json: '{"answerId":"yes"}',
    },
    {
      id: 'yes-no-answer-no', app_id: 'yes-no', type: 'answer_tile', parent_id: 'yes-no-set-yes-no', title: 'No',
      subtitle: null, body: null, speech: 'No', color_token: 'red', color_hex: null,
      icon: 'wayfinding/cross', image_ref: null, sort_order: 1, is_default: 1, is_published: 1,
      owner_user_id: null, owner_child_id: null, source_item_id: null, metadata_json: '{"answerId":"no"}',
    },
    {
      id: 'sequence_counting-apples', app_id: 'sequence', type: 'sequence', parent_id: null, title: 'Counting Apples',
      subtitle: null, body: null, speech: 'Counting Apples', color_token: 'learning', color_hex: null,
      icon: null, image_ref: 'media-sequence', sort_order: 0, is_default: 1, is_published: 1,
      owner_user_id: null, owner_child_id: null, source_item_id: null, metadata_json: '{"category":"learning"}',
    },
    {
      id: 'sequence_counting-apples_two-apples', app_id: 'sequence', type: 'sequence_step', parent_id: 'sequence_counting-apples', title: '2 apples',
      subtitle: null, body: null, speech: '2 apples', color_token: null, color_hex: null,
      icon: null, image_ref: 'media-apple', sort_order: 0, is_default: 1, is_published: 1,
      owner_user_id: null, owner_child_id: null, source_item_id: null, metadata_json: '{"imagePrompt":"two red apples","imageRefs":["media-apple","media-apple"]}',
    },
  ]
  appTranslations: Row[] = [
    { item_id: '__default_animals', locale: 'mt', title: 'Annimali', subtitle: null, body: null, speech: null, metadata_json: null },
    { item_id: '__default_animals_dog', locale: 'mt', title: 'Kelb', subtitle: null, body: null, speech: 'Kelb', metadata_json: null },
    { item_id: 'yes-no-set-yes-no', locale: 'mt', title: 'Iva / Le', subtitle: 'Tweġibiet sempliċi iva u le.', body: null, speech: null, metadata_json: null },
    { item_id: 'yes-no-answer-yes', locale: 'mt', title: 'Iva', subtitle: null, body: null, speech: 'Iva', metadata_json: null },
    { item_id: 'yes-no-answer-no', locale: 'mt', title: 'Le', subtitle: null, body: null, speech: 'Le', metadata_json: null },
    { item_id: 'sequence_counting-apples', locale: 'mt', title: 'Ngħoddu t-Tuffieħ', subtitle: null, body: null, speech: null, metadata_json: null },
    { item_id: 'sequence_counting-apples_two-apples', locale: 'mt', title: '2 tuffiħiet', subtitle: null, body: null, speech: '2 tuffiħiet', metadata_json: null },
  ]

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
    if (normalized.includes('FROM user_images')) return new MemoryResult([])
    if (normalized.includes('FROM content_item_translations')) {
      return new MemoryResult(this.appTranslations.filter(row => row.locale === values[0]))
    }
    if (normalized.includes('FROM content_items')) {
      if (normalized.includes('app_id = ?')) return new MemoryResult(this.appItems.filter(row => row.app_id === values[0]))
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
  async delete(key: string) { this.values.delete(key) }
}

function makeEnv() {
  return {
    CONTENT_DB: new MemoryD1(),
    CONTENT_CACHE: new MemoryKV(),
    ALLOWED_ORIGINS: 'https://cards.tikoapps.org,http://localhost:5173',
    TRANSLATIONS_API_URL: 'https://translations.test/v1',
  }
}

async function parseJson(response: Response) {
  return response.json() as Promise<Record<string, any>>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

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
    expect((await parseJson(first)).data).toEqual([{ id: 'proj_1', name: 'Cards', slug: 'cards', description: 'Cards content', is_active: true, created_at: '2026-05-01T00:00:00.000Z', updated_at: '2026-05-01T00:00:00.000Z' }])
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

  it('localizes default cards collections from content item translations', async () => {
    const response = await worker.fetch(new Request('https://content.test/v1/cards/collections?language=mt'), makeEnv() as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.data.collections[0].title).toBe('Annimali')
    expect(body.data.collections[0].cards[0]).toMatchObject({ title: 'Kelb', speech: 'Kelb' })
  })

  it('serves localized Yes No default content from generic content items', async () => {
    const response = await worker.fetch(new Request('https://content.test/v1/yes-no/content?language=mt'), makeEnv() as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.data.selectedSetId).toBe('yes-no-set-yes-no')
    expect(body.data.answerSets[0]).toMatchObject({ title: 'Iva / Le', description: 'Tweġibiet sempliċi iva u le.' })
    expect(body.data.answerSets[0].answers).toEqual([
      expect.objectContaining({ id: 'yes', label: 'Iva', speech: 'Iva', color: 'green' }),
      expect.objectContaining({ id: 'no', label: 'Le', speech: 'Le', color: 'red' }),
    ])
  })

  it('serves localized Sequence defaults and resolves media ID image refs', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (request) => {
      const url = typeof request === 'string' ? request : request instanceof URL ? request.toString() : request.url
      const id = url.split('/').pop()
      return new Response(JSON.stringify({ original_url: `https://data.tikocdn.org/uploads/${id}.png` }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    const response = await worker.fetch(new Request('https://content.test/v1/sequence/content?language=mt'), makeEnv() as never)
    const body = await parseJson(response)

    expect(response.status).toBe(200)
    expect(body.data.sequences[0]).toMatchObject({
      id: 'sequence_counting-apples',
      name: 'Ngħoddu t-Tuffieħ',
      category: 'learning',
      imageRef: 'media-sequence',
      imageURL: 'https://data.tikocdn.org/uploads/media-sequence.png',
    })
    expect(body.data.sequences[0].steps[0]).toMatchObject({
      label: '2 tuffiħiet',
      text: '2 tuffiħiet',
      imageRef: 'media-apple',
      imageURL: 'https://data.tikocdn.org/uploads/media-apple.png',
      imageURLs: [
        'https://data.tikocdn.org/uploads/media-apple.png',
        'https://data.tikocdn.org/uploads/media-apple.png',
      ],
    })
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
