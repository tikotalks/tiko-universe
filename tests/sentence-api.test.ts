import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import worker, { type Env } from '../workers/sentence-api/src/index'
import type { LanguagePack, PackTemplate, PackWord } from '@tiko/talk-types'

type Row = Record<string, unknown>
type JsonBody = Record<string, any>
const auth = { authorization: 'Bearer user-token' }

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
  usage: Row[] = []
  talk_transitions: Row[] = [
    { id: 'en-v1:pronoun:verb', pack_id: 'en-v1', locale: 'en', from_pos: 'pronoun', to_pos: 'verb', weight: 10, source: 'curated' },
    { id: 'en-v1:verb:noun', pack_id: 'en-v1', locale: 'en', from_pos: 'verb', to_pos: 'noun', weight: 9, source: 'curated' },
  ]
  word_predictions: Row[] = []
  prepare(sql: string): MemoryStatement { return new MemoryStatement(this, sql) }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.startsWith('SELECT id, locale, version, grammar_json FROM talk_language_packs')) {
      const locale = String(values[0])
      if (locale !== pack.locale) return new MemoryResult()
      return new MemoryResult([{ id: 'en-v1', locale: 'en', version: 1, grammar_json: JSON.stringify(pack.grammar) }])
    }

    if (normalized.startsWith('SELECT id, text, pos, category, icon, image, frequency, inflections_json FROM talk_word_inventory WHERE pack_id = ? AND id IN')) {
      const ids = new Set(values.slice(1).map(String))
      return new MemoryResult(pack.words.filter((word) => ids.has(word.id)).map(wordRow))
    }

    if (normalized.startsWith('SELECT id, text, pos, category, icon, image, frequency, inflections_json FROM talk_word_inventory WHERE pack_id = ? AND pos IN')) {
      const pos = new Set(values.slice(1).map(String))
      return new MemoryResult(pack.words.filter((word) => pos.has(word.pos)).sort((a, b) => b.frequency - a.frequency || a.text.localeCompare(b.text)).map(wordRow))
    }

    if (normalized.startsWith('SELECT id, text, pos, category, icon, image, frequency, inflections_json FROM talk_word_inventory WHERE pack_id = ?')) {
      let words = [...pack.words]
      if (normalized.includes('category = ?')) words = words.filter((word) => word.category === String(values[1]))
      if (normalized.includes('pos = ?')) words = words.filter((word) => word.pos === String(values[normalized.includes('category = ?') ? 2 : 1]))
      return new MemoryResult(words.sort((a, b) => a.category.localeCompare(b.category) || b.frequency - a.frequency || a.text.localeCompare(b.text)).map(wordRow))
    }

    if (normalized.startsWith('SELECT id, pattern, category, icon, slots_json FROM talk_templates')) {
      return new MemoryResult(pack.templates.map(templateRow))
    }

    if (normalized.startsWith('SELECT id, sentence, word_ids_json, is_auto, usage_count, label FROM talk_user_phrases')) {
      const [subjectId, locale] = values.map(String)
      return new MemoryResult(this.phrases.filter((phrase) => phrase.subject_id === subjectId && phrase.locale === locale))
    }


    if (normalized.startsWith('INSERT INTO talk_sentence_usage')) {
      const [id, locale, packId, posSequenceJson, wordSequenceHash, wordCount] = values
      const existing = this.usage.find((row) => row.locale === locale && row.word_sequence_hash === wordSequenceHash)
      if (existing) existing.usage_count = Number(existing.usage_count) + 1
      else this.usage.push({ id, locale, pack_id: packId, pos_sequence_json: posSequenceJson, word_sequence_hash: wordSequenceHash, word_count: wordCount, usage_count: 1 })
      return new MemoryResult()
    }

    if (normalized.startsWith('SELECT id, locale, pack_id, pos_sequence_json, usage_count FROM talk_sentence_usage')) {
      return new MemoryResult(this.usage)
    }

    if (normalized.startsWith('SELECT from_pos, to_pos, weight FROM talk_transitions')) {
      const [packId] = values
      return new MemoryResult(this.talk_transitions.filter((row) => row.pack_id === packId && row.source === 'curated'))
    }

    if (normalized.startsWith('INSERT INTO talk_transitions')) {
      const [id, packId, locale, fromPos, toPos, weight] = values
      const existing = this.talk_transitions.find((row) => row.pack_id === packId && row.from_pos === fromPos && row.to_pos === toPos && row.source === 'learned')
      if (existing) existing.weight = Number(weight)
      else this.talk_transitions.push({ id, pack_id: packId, locale, from_pos: fromPos, to_pos: toPos, weight, source: 'learned' })
      return new MemoryResult()
    }

    if (normalized.startsWith('INSERT INTO talk_user_phrases')) {
      const [id, subjectId, locale, sentence, wordIdsJson, label] = values
      this.phrases.push({ id, subject_id: subjectId, locale, sentence, word_ids_json: wordIdsJson, label, is_auto: 0, usage_count: 1 })
      return new MemoryResult()
    }

    if (normalized.startsWith('DELETE FROM talk_user_phrases')) {
      const [id, subjectId, locale] = values
      this.phrases = this.phrases.filter((phrase) => !(phrase.id === id && phrase.subject_id === subjectId && phrase.locale === locale))
      return new MemoryResult()
    }

    if (normalized.startsWith('SELECT w.id, w.text, w.pos, w.category, w.icon, w.image, w.frequency, w.inflections_json, p.final_score FROM talk_word_predictions p JOIN talk_word_inventory w')) {
      // No stored predictions in tests — always return empty so AI/fallback path runs
      return new MemoryResult()
    }

    if (normalized.startsWith('INSERT INTO talk_word_predictions')) {
      const [id, packId, locale, seqHash, seqText, wordId, aiScore, finalScore] = values
      const existing = this.word_predictions.find((r) => r.pack_id === packId && r.sequence_hash === seqHash && r.word_id === wordId)
      if (!existing) this.word_predictions.push({ id, pack_id: packId, locale, sequence_hash: seqHash, sequence_text: seqText, word_id: wordId, ai_score: aiScore, click_count: 0, final_score: finalScore })
      return new MemoryResult()
    }

    if (normalized.startsWith('UPDATE talk_word_predictions SET click_count')) {
      const [packId, seqHash, wordId] = values
      const row = this.word_predictions.find((r) => r.pack_id === packId && r.sequence_hash === seqHash && r.word_id === wordId)
      if (row) row.click_count = Number(row.click_count) + 1
      return new MemoryResult()
    }

    if (normalized.startsWith('SELECT pack_id, sequence_hash, SUM(click_count) as total_clicks FROM talk_word_predictions')) {
      const groups = new Map<string, number>()
      for (const r of this.word_predictions) {
        const key = `${String(r.pack_id)}|${String(r.sequence_hash)}`
        groups.set(key, (groups.get(key) ?? 0) + Number(r.click_count))
      }
      return new MemoryResult(Array.from(groups.entries()).map(([key, total_clicks]) => {
        const [pack_id, sequence_hash] = key.split('|')
        return { pack_id, sequence_hash, total_clicks }
      }).filter((r) => r.total_clicks > 0))
    }

    if (normalized.startsWith('SELECT word_id, ai_score, click_count, final_score FROM talk_word_predictions WHERE pack_id = ? AND sequence_hash = ?')) {
      const [packId, seqHash] = values.map(String)
      return new MemoryResult(this.word_predictions.filter((r) => r.pack_id === packId && r.sequence_hash === seqHash))
    }

    if (normalized.startsWith('UPDATE talk_word_predictions SET final_score')) {
      const [finalScore, packId, seqHash, wordId] = values
      const row = this.word_predictions.find((r) => r.pack_id === packId && r.sequence_hash === seqHash && r.word_id === wordId)
      if (row) row.final_score = Number(finalScore)
      return new MemoryResult()
    }

    throw new Error(`Unhandled SQL in test fake: ${normalized}`)
  }
}

class MemoryKVNamespace {
  reads: string[] = []
  writes: string[] = []
  deletes: string[] = []
  values = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    this.reads.push(key)
    return this.values.get(key) ?? null
  }
  async put(key: string, value: string): Promise<void> {
    this.writes.push(key)
    this.values.set(key, value)
  }
  async delete(key: string): Promise<void> { this.deletes.push(key); this.values.delete(key) }
  async list(options: { prefix?: string } = {}): Promise<{ keys: Array<{ name: string }>, list_complete: true }> {
    const keys = Array.from(this.values.keys())
      .filter((name) => !options.prefix || name.startsWith(options.prefix))
      .map((name) => ({ name }))
    return { keys, list_complete: true }
  }
}

function service(options: { ttsOk?: boolean, roles?: string[], subjectId?: string, childAccounts?: Array<{ id: string, subjectId?: string }> } = {}) {
  return {
    fetch: async (request: Request) => {
      const url = new URL(request.url)
      if (url.pathname === '/v1/generation/tts') {
        if (options.ttsOk === false) return new Response(JSON.stringify({ error: { code: 'provider_unavailable' } }), { status: 503, headers: { 'content-type': 'application/json' } })
        return new Response(JSON.stringify({ data: { audioUrl: '/v1/generation/audio/test-audio' }, meta: { cached: true } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (url.pathname === '/v1/identity/child-accounts') {
        return new Response(JSON.stringify({ childAccounts: options.childAccounts ?? [] }), { headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ subject: { id: options.subjectId ?? 'sub_1' }, roles: options.roles ?? ['user'] }), { headers: { 'content-type': 'application/json' } })
    }
  }
}

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
    IDENTITY_SERVICE: service(),
    GENERATION_SERVICE: service(),
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

function sentenceHashCacheKey(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
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
      headers: { origin: 'https://talk.tiko.test', ...auth },
    }, testEnv)
    const second = await fetchJson('/v1/sentence/start?locale=en&userId=sub_1', { headers: auth }, testEnv)

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
      headers: { 'content-type': 'application/json', ...auth },
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
    expect(cache.writes).toContain('sentence:next:en:sub_1:i,want')
  })

  it('requires identity for paid next and complete sentence endpoints', async () => {
    const next = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: ['i'] }),
    })
    const complete = await fetchJson('/v1/sentence/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', wordIds: ['i'] }),
    })

    expect(next.response.status).toBe(401)
    expect(complete.response.status).toBe(401)
  })

  it('enforces sentence prediction rate limits and completion daily budgets', async () => {
    const { testEnv, cache } = env()
    const subjectHash = sentenceHashCacheKey('sub_1')
    const minuteStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString()
    const dayStart = new Date().toISOString().slice(0, 10)
    cache.values.set(`sentence:usage:sentence.next:${subjectHash}:minute:${minuteStart}`, JSON.stringify({ requests: 120, units: 120 }))
    cache.values.set(`sentence:usage:sentence.complete:${subjectHash}:day:${dayStart}`, JSON.stringify({ requests: 1, units: 2000 }))

    const next = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ locale: 'en', currentWords: ['i'] }),
    }, testEnv)
    const complete = await fetchJson('/v1/sentence/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ locale: 'en', wordIds: ['i'] }),
    }, testEnv)

    expect(next.response.status).toBe(429)
    expect(next.body.error.code).toBe('rate_limited')
    expect(complete.response.status).toBe(429)
    expect(complete.body.error.code).toBe('budget_exceeded')
  })


  it('completes a sentence, calls TTS, logs aggregate usage, and can auto-save', async () => {
    const { testEnv, db } = env()
    const { response, body } = await fetchJson('/v1/sentence/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ locale: 'en', userId: 'sub_1', wordIds: ['i', 'want', 'water'], autoSave: true }),
    }, testEnv)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ sentence: 'I want water.', audioUrl: '/v1/generation/audio/test-audio', audioCached: true })
    expect(body.savedPhraseId).toMatch(/^phrase_/)
    expect(db.usage).toHaveLength(1)
    expect(db.usage[0]).toMatchObject({ locale: 'en', pack_id: 'en-v1', word_count: 3, usage_count: 1 })
    expect(String(db.usage[0].word_sequence_hash)).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(db.usage)).not.toContain('I want water')
  })

  it('returns a child-safe TTS error without storing raw sentence text in usage rows', async () => {
    const { testEnv, db } = env()
    testEnv.GENERATION_SERVICE = service({ ttsOk: false })
    const { response, body } = await fetchJson('/v1/sentence/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ locale: 'en', wordIds: ['i', 'want', 'juice'] }),
    }, testEnv)

    expect(response.status).toBe(502)
    expect(body.error.code).toBe('tts_generation_failed')
    expect(db.usage).toHaveLength(1)
    expect(JSON.stringify(db.usage)).not.toContain('juice')
  })

  it('returns vocabulary filtered by category and POS with KV caching', async () => {
    const { testEnv, cache } = env()
    const first = await fetchJson('/v1/sentence/vocabulary?locale=en&category=drinks&pos=noun', {}, testEnv)
    const second = await fetchJson('/v1/sentence/vocabulary?locale=en&category=drinks&pos=noun', {}, testEnv)

    expect(first.response.status).toBe(200)
    expect(first.body.totalWords).toBeGreaterThan(0)
    expect(first.body.words.every((word: JsonBody) => word.category === 'drinks' && word.pos === 'noun')).toBe(true)
    expect(second.body).toEqual(first.body)
    expect(cache.writes).toContain('sentence:vocabulary:en:drinks:noun')
  })

  it('requires identity for phrases and enforces ownership on save/delete', async () => {
    const { testEnv, db } = env()
    const anonymous = await fetchJson('/v1/sentence/phrases?locale=en', {}, testEnv)
    expect(anonymous.response.status).toBe(401)

    const listed = await fetchJson('/v1/sentence/phrases?locale=en&userId=sub_1', { headers: auth }, testEnv)
    expect(listed.response.status).toBe(200)
    expect(listed.body.phrases[0]).toMatchObject({ id: 'phrase_1', sentence: 'I want water.' })

    const saved = await fetchJson('/v1/sentence/phrases', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ locale: 'en', userId: 'sub_1', wordIds: ['i', 'want', 'juice'], label: 'Juice' }),
    }, testEnv)
    expect(saved.response.status).toBe(201)
    expect(saved.body.phrase).toMatchObject({ sentence: 'I want juice.', label: 'Juice', usageCount: 1 })
    expect(db.phrases.some((phrase) => phrase.id === saved.body.phrase.id && phrase.subject_id === 'sub_1')).toBe(true)

    const deleted = await fetchJson(`/v1/sentence/phrases/${saved.body.phrase.id}?locale=en&userId=sub_1`, { method: 'DELETE', headers: auth }, testEnv)
    expect(deleted.response.status).toBe(200)
    expect(deleted.body).toEqual({ deleted: true })
    expect(db.phrases.some((phrase) => phrase.id === saved.body.phrase.id)).toBe(false)
  })

  it('rejects caller-supplied user ids that do not belong to the session', async () => {
    const { testEnv, db } = env()
    db.phrases.push({
      id: 'phrase_other',
      subject_id: 'sub_other',
      locale: 'en',
      sentence: 'Other phrase.',
      word_ids_json: JSON.stringify(['i']),
      is_auto: 0,
      usage_count: 1,
      label: null,
    })

    const listed = await fetchJson('/v1/sentence/phrases?locale=en&userId=sub_other', { headers: auth }, testEnv)
    const saved = await fetchJson('/v1/sentence/phrases', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ locale: 'en', userId: 'sub_other', wordIds: ['i'] }),
    }, testEnv)
    const completed = await fetchJson('/v1/sentence/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ locale: 'en', userId: 'sub_other', wordIds: ['i'], autoSave: true }),
    }, testEnv)
    const deleted = await fetchJson('/v1/sentence/phrases/phrase_other?locale=en&userId=sub_other', { method: 'DELETE', headers: auth }, testEnv)

    expect(listed.response.status).toBe(403)
    expect(saved.response.status).toBe(403)
    expect(completed.response.status).toBe(403)
    expect(deleted.response.status).toBe(403)
    expect(db.phrases.some((phrase) => phrase.id === 'phrase_other')).toBe(true)
  })

  it('allows a profile manager session to access managed child phrases', async () => {
    const { testEnv, db } = env()
    testEnv.IDENTITY_SERVICE = service({ subjectId: 'manager_1', childAccounts: [{ id: 'child_1', subjectId: 'child_1' }] })
    db.phrases.push({
      id: 'phrase_child',
      subject_id: 'child_1',
      locale: 'en',
      sentence: 'Child phrase.',
      word_ids_json: JSON.stringify(['i']),
      is_auto: 0,
      usage_count: 1,
      label: null,
    })

    const listed = await fetchJson('/v1/sentence/phrases?locale=en&userId=child_1', { headers: auth }, testEnv)

    expect(listed.response.status).toBe(200)
    expect(listed.body.phrases[0]).toMatchObject({ id: 'phrase_child', sentence: 'Child phrase.' })
  })

  it('rejects unknown words and returns JSON 404/method errors', async () => {
    const unknown = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
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

  it('scheduled recalculation merges pack and learned transition weights and only flushes affected next caches', async () => {
    const { testEnv, db, cache } = env()
    db.usage.push(
      { id: 'u1', locale: 'en', pack_id: 'en-v1', pos_sequence_json: JSON.stringify(['pronoun', 'verb', 'noun']), usage_count: 10 },
      { id: 'u2', locale: 'en', pack_id: 'en-v1', pos_sequence_json: JSON.stringify(['pronoun', 'verb']), usage_count: 2 },
    )
    cache.values.set('sentence:next:en:anon:i,want', '{}')
    cache.values.set('sentence:start:en:anon', '{}')

    await (worker as any).scheduled({ cron: '0 2 * * *' }, testEnv, {} as never)

    const learned = db.talk_transitions.filter((row) => row.source === 'learned')
    expect(learned.find((row) => row.from_pos === 'pronoun' && row.to_pos === 'verb')?.weight).toBeCloseTo(10)
    expect(learned.find((row) => row.from_pos === 'verb' && row.to_pos === 'noun')?.weight).toBeCloseTo(9.7)
    expect(cache.deletes).toEqual(['sentence:next:en:anon:i,want'])
    expect(cache.values.has('sentence:start:en:anon')).toBe(true)
  })

  it('keeps admin pack generation shell behind an admin role gate', async () => {
    const userEnv = env().testEnv
    const forbidden = await fetchJson('/v1/sentence-admin/generate-pack', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer user-token' },
      body: JSON.stringify({ locale: 'en' }),
    }, userEnv)

    const { testEnv: adminEnv } = env()
    adminEnv.IDENTITY_SERVICE = service({ roles: ['admin'] })
    const accepted = await fetchJson('/v1/sentence-admin/generate-pack', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer admin-token' },
      body: JSON.stringify({ locale: 'en' }),
    }, adminEnv)

    expect(forbidden.response.status).toBe(403)
    expect(forbidden.body.error.code).toBe('admin_required')
    expect(accepted.response.status).toBe(501)
    expect(accepted.body.error.code).toBe('pack_generation_provider_unconfigured')
  })
})
