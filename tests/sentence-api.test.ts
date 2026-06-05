import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import worker, { type Env } from '../workers/sentence-api/src/index'
import type { LanguagePack, PackTemplate, PackWord } from '@tiko/talk-types'

type Row = Record<string, unknown>
type JsonBody = Record<string, any>

const pack = JSON.parse(readFileSync('workers/sentence-api/data/en-v1.json', 'utf8')) as LanguagePack

class MemoryResult {
  constructor(private rows: Row[] = []) {}
  first<T = Row>(): T | null { return (this.rows[0] as T | undefined) ?? null }
  all<T = Row>(): { results: T[]; success: true; meta: Record<string, unknown> } { return { results: this.rows as T[], success: true, meta: {} } }
  run(): { success: true; meta: Record<string, unknown> } { return { success: true, meta: {} } }
}

class MemoryStatement {
  private values: unknown[] = []
  constructor(private db: MemoryD1Database, private sql: string) {}
  bind(...values: unknown[]): MemoryStatement { this.values = values; return this }
  first<T = Row>(): T | null { return this.db.execute(this.sql, this.values).first<T>() }
  all<T = Row>() { return this.db.execute(this.sql, this.values).all<T>() }
  run() { return this.db.execute(this.sql, this.values).run() }
}

class MemoryD1Database {
  phrases: Row[] = []
  prepare(sql: string): MemoryStatement { return new MemoryStatement(this, sql) }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.startsWith('SELECT id, locale, version, grammar_json FROM language_packs')) {
      const locale = String(values[0])
      if (locale !== pack.locale) return new MemoryResult()
      return new MemoryResult([{ id: 'en-v1', locale: 'en', version: 1, grammar_json: JSON.stringify(pack.grammar) }])
    }

    if (normalized.startsWith('SELECT id, text, pos, category, icon, image, frequency, inflections_json FROM word_inventory WHERE pack_id = ? AND id IN')) {
      const ids = new Set(values.slice(1).map(String))
      return new MemoryResult(pack.words.filter((word) => ids.has(word.id)).map(wordRow))
    }

    if (normalized.startsWith('SELECT id, text, pos, category, icon, image, frequency, inflections_json FROM word_inventory WHERE pack_id = ? AND pos IN')) {
      const pos = new Set(values.slice(1).map(String))
      return new MemoryResult(pack.words.filter((word) => pos.has(word.pos)).sort((a, b) => b.frequency - a.frequency || a.text.localeCompare(b.text)).map(wordRow))
    }

    if (normalized.startsWith('SELECT id, text, pos, category, icon, image, frequency, inflections_json FROM word_inventory WHERE pack_id = ?')) {
      return new MemoryResult([...pack.words].sort((a, b) => a.category.localeCompare(b.category) || b.frequency - a.frequency || a.text.localeCompare(b.text)).map(wordRow))
    }

    if (normalized.startsWith('SELECT id, pattern, category, icon, slots_json FROM templates')) {
      return new MemoryResult(pack.templates.map(templateRow))
    }

    if (normalized.startsWith('SELECT id, sentence, word_ids_json, is_auto, usage_count, label FROM user_phrases')) {
      const [subjectId, locale] = values.map(String)
      return new MemoryResult(this.phrases.filter((phrase) => phrase.subject_id === subjectId && phrase.locale === locale))
    }

    throw new Error(`Unhandled SQL in test fake: ${normalized}`)
  }
}

class MemoryKVNamespace {
  reads: string[] = []
  writes: string[] = []
  values = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    this.reads.push(key)
    return this.values.get(key) ?? null
  }
  async put(key: string, value: string): Promise<void> {
    this.writes.push(key)
    this.values.set(key, value)
  }
  async delete(key: string): Promise<void> { this.values.delete(key) }
}

const service = { fetch: async () => new Response(JSON.stringify({ subject: { id: 'sub_from_service' } }), { headers: { 'content-type': 'application/json' } }) }

function wordRow(word: PackWord): Row {
  return {
    id: word.id,
    text: word.text,
    pos: word.pos,
    category: word.category,
    icon: word.icon ?? null,
    image: null,
    frequency: word.frequency,
    inflections_json: JSON.stringify(word.inflections ?? {}),
  }
}

function templateRow(template: PackTemplate): Row {
  return {
    id: template.id,
    pattern: template.pattern,
    category: template.category,
    icon: template.icon ?? null,
    slots_json: JSON.stringify(template.slots),
  }
}

function env() {
  const db = new MemoryD1Database()
  const cache = new MemoryKVNamespace()
  db.phrases.push({
    id: 'phrase_1',
    subject_id: 'sub_1',
    locale: 'en',
    sentence: 'I want water.',
    word_ids_json: JSON.stringify(['i', 'want', 'water']),
    is_auto: 0,
    usage_count: 4,
    label: 'Water',
  })

  const testEnv: Env = {
    DB: db,
    CACHE: cache,
    IDENTITY_SERVICE: service,
    GENERATION_SERVICE: service,
    ALLOWED_ORIGINS: 'https://talk.tiko.test',
    TIKO_ENVIRONMENT: 'test',
  }
  return { testEnv, db, cache }
}

async function fetchJson(path: string, init: RequestInit = {}, testEnv = env().testEnv) {
  const request = new Request(`https://sentence-api.test${path}`, init)
  const response = await worker.fetch(request, testEnv, {} as never)
  const body = response.status === 204 ? {} : await response.json() as JsonBody
  return { response, body }
}

describe('sentence-api foundation', () => {
  it('allows only configured origins in CORS preflight responses', async () => {
    const allowed = await fetchJson('/v1/sentence/start?locale=en', {
      method: 'OPTIONS',
      headers: { origin: 'https://talk.tiko.test' },
    })
    const denied = await fetchJson('/v1/sentence/start?locale=en', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    })

    expect(allowed.response.status).toBe(204)
    expect(allowed.response.headers.get('access-control-allow-origin')).toBe('https://talk.tiko.test')
    expect(denied.response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('returns health metadata', async () => {
    const { response, body } = await fetchJson('/v1/sentence/health')

    expect(response.status).toBe(200)
    expect(body.data).toEqual({ ok: true, service: 'sentence-api', environment: 'test' })
  })

  it('requires locale for the start endpoint', async () => {
    const { response, body } = await fetchJson('/v1/sentence/start')

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('missing_locale')
  })

  it('returns a D1-backed start payload with saved phrases and caches it', async () => {
    const { testEnv, cache } = env()
    const first = await fetchJson('/v1/sentence/start?locale=en&userId=sub_1', {
      headers: { origin: 'https://talk.tiko.test' },
    }, testEnv)
    const second = await fetchJson('/v1/sentence/start?locale=en&userId=sub_1', {}, testEnv)

    expect(first.response.status).toBe(200)
    expect(first.response.headers.get('access-control-allow-origin')).toBe('https://talk.tiko.test')
    expect(first.body.templates.length).toBeGreaterThanOrEqual(20)
    expect(first.body.initialWords.some((word: JsonBody) => word.id === 'i')).toBe(true)
    expect(first.body.savedPhrases[0]).toMatchObject({ id: 'phrase_1', sentence: 'I want water.' })
    expect(first.body.stripState).toEqual({ words: [], validNext: ['pronoun', 'question', 'social'], canComplete: false })
    expect(second.body).toEqual(first.body)
    expect(cache.writes).toContain('sentence:start:en:sub_1')
    expect(cache.reads.filter((key) => key === 'sentence:start:en:sub_1').length).toBe(2)
  })

  it('returns ranked /next suggestions and reuses the KV cache', async () => {
    const { testEnv, cache } = env()
    const request = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: ['i', 'want'] }),
    }
    const first = await fetchJson('/v1/sentence/next', request, testEnv)
    const second = await fetchJson('/v1/sentence/next', request, testEnv)

    expect(first.response.status).toBe(200)
    expect(first.body.stripState.display).toBe('I want')
    expect(first.body.stripState.validNext).toEqual(['determiner', 'noun', 'adjective', 'preposition', 'social'])
    expect(first.body.suggestions.some((word: JsonBody) => word.id === 'water')).toBe(true)
    expect(first.body.categories.length).toBeGreaterThan(0)
    expect(Object.keys(first.body.words).length).toBeGreaterThan(0)
    expect(second.body).toEqual(first.body)
    expect(cache.writes).toContain('sentence:next:en:anon:i,want')
  })

  it('rejects unknown words and returns JSON 404/method errors', async () => {
    const unknown = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: ['missing-word'] }),
    })
    const missing = await fetchJson('/v1/nope')
    const wrongMethod = await fetchJson('/v1/sentence/start?locale=en', { method: 'POST' })

    expect(unknown.response.status).toBe(404)
    expect(unknown.body.error.code).toBe('unknown_word')
    expect(missing.response.status).toBe(404)
    expect(missing.body.error.code).toBe('not_found')
    expect(wrongMethod.response.status).toBe(405)
    expect(wrongMethod.body.error.code).toBe('method_not_allowed')
  })
})
