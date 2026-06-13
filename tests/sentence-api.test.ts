import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import worker, { type Env } from '../workers/sentence-api/src/index'
import type { LanguagePack, PackTemplate, PackWord } from '@tiko/talk-types'

type Row = Record<string, unknown>
type JsonBody = Record<string, any>

const pack = JSON.parse(readFileSync('workers/sentence-api/data/en-v1.json', 'utf8')) as LanguagePack

class MemoryResult {
  constructor(private rows: Row[] = [], private metaValues: Record<string, unknown> = {}) {}
  first<T = Row>(): T | null { return (this.rows[0] as T | undefined) ?? null }
  all<T = Row>(): { results: T[]; success: true; meta: Record<string, unknown> } { return { results: this.rows as T[], success: true, meta: this.metaValues } }
  run(): { success: true; meta: Record<string, unknown> } { return { success: true, meta: this.metaValues } }
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
  user_words: Row[] = []
  user_affinity: Row[] = []
  prepare(sql: string): MemoryStatement { return new MemoryStatement(this, sql) }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.startsWith('SELECT id, locale, version, grammar_json FROM talk_language_packs')) {
      const locale = String(values[0])
      if (locale !== pack.locale) return new MemoryResult()
      return new MemoryResult([{ id: 'en-v1', locale: 'en', version: 1, grammar_json: JSON.stringify(pack.grammar) }])
    }

    if (normalized.startsWith('SELECT id FROM talk_language_packs')) {
      const locale = String(values[0])
      if (locale !== pack.locale) return new MemoryResult()
      return new MemoryResult([{ id: 'en-v1' }])
    }

    if (normalized.startsWith('SELECT concept_id, image_url FROM talk_media_map')) {
      return new MemoryResult([])
    }

    // ── talk_user_words ──────────────────────────────────────────────
    if (normalized.startsWith('SELECT id, text, pos, category, icon, usage_count FROM talk_user_words WHERE subject_id = ? AND locale = ? AND id IN')) {
      const [subjectId, locale] = values.map(String)
      const ids = new Set(values.slice(2).map(String))
      return new MemoryResult(this.user_words.filter((w) => w.subject_id === subjectId && w.locale === locale && ids.has(String(w.id))).map((w) => ({ ...w })))
    }
    if (normalized.startsWith('SELECT id, text, pos, category, icon, usage_count FROM talk_user_words WHERE subject_id = ? AND locale = ? AND normalized_text = ?')) {
      const [subjectId, locale, normalizedText] = values.map(String)
      const found = this.user_words.find((w) => w.subject_id === subjectId && w.locale === locale && w.normalized_text === normalizedText)
      return new MemoryResult(found ? [{ ...found }] : [])
    }
    if (normalized.startsWith('SELECT id, text, pos, category, icon, usage_count FROM talk_user_words WHERE subject_id = ? AND locale = ?')) {
      const [subjectId, locale] = values.map(String)
      return new MemoryResult(this.user_words.filter((w) => w.subject_id === subjectId && w.locale === locale).map((w) => ({ ...w })))
    }
    if (normalized.startsWith('INSERT INTO talk_user_words')) {
      const [id, subjectId, locale, text, normalizedText, pos, category, icon] = values
      this.user_words.push({ id, subject_id: subjectId, locale, text, normalized_text: normalizedText, pos, category, icon: icon ?? null, usage_count: 1 })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE talk_user_words SET usage_count = usage_count + 1')) {
      const [text, id] = values
      const row = this.user_words.find((w) => w.id === id)
      if (row) { row.usage_count = Number(row.usage_count) + 1; row.text = text }
      return new MemoryResult([], { changes: row ? 1 : 0 })
    }
    if (normalized.startsWith('DELETE FROM talk_user_words')) {
      const [id, subjectId, locale] = values
      const before = this.user_words.length
      this.user_words = this.user_words.filter((w) => !(w.id === id && w.subject_id === subjectId && w.locale === locale))
      return new MemoryResult([], { changes: before - this.user_words.length })
    }

    // ── talk_user_affinity ───────────────────────────────────────────
    if (normalized.startsWith('SELECT word_id, click_count FROM talk_user_affinity WHERE subject_id = ? AND sequence_hash = ?')) {
      const [subjectId, seqHash] = values.map(String)
      return new MemoryResult(this.user_affinity.filter((a) => a.subject_id === subjectId && a.sequence_hash === seqHash).map((a) => ({ ...a })))
    }
    if (normalized.startsWith('INSERT INTO talk_user_affinity')) {
      const [subjectId, locale, seqHash, wordId] = values
      const existing = this.user_affinity.find((a) => a.subject_id === subjectId && a.sequence_hash === seqHash && a.word_id === wordId)
      if (existing) existing.click_count = Number(existing.click_count) + 1
      else this.user_affinity.push({ subject_id: subjectId, locale, sequence_hash: seqHash, word_id: wordId, click_count: 1 })
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM talk_user_affinity')) {
      const [subjectId, wordId] = values
      this.user_affinity = this.user_affinity.filter((a) => !(a.subject_id === subjectId && a.word_id === wordId))
      return new MemoryResult()
    }

    if (normalized.startsWith('SELECT from_pos, to_pos, weight, source FROM talk_transitions WHERE pack_id = ?')) {
      const packId = String(values[0])
      return new MemoryResult(this.talk_transitions.filter((row) => row.pack_id === packId))
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

    if (normalized.startsWith('SELECT id, is_auto, usage_count, label FROM talk_user_phrases WHERE subject_id = ? AND locale = ? AND sentence = ?')) {
      const [subjectId, locale, sentence] = values.map(String)
      const found = this.phrases.find((phrase) => phrase.subject_id === subjectId && phrase.locale === locale && phrase.sentence === sentence)
      // D1 returns a value snapshot, not a live row reference: copy so a later
      // UPDATE to the stored row does not retroactively mutate this result.
      return new MemoryResult(found ? [{ ...found }] : [])
    }

    if (normalized.startsWith('UPDATE talk_user_phrases SET usage_count = usage_count + 1')) {
      const [label, id] = values
      const row = this.phrases.find((phrase) => phrase.id === id)
      if (row) {
        row.usage_count = Number(row.usage_count) + 1
        if (label != null) row.label = label
      }
      return new MemoryResult([], { changes: row ? 1 : 0 })
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
      const before = this.phrases.length
      this.phrases = this.phrases.filter((phrase) => !(phrase.id === id && phrase.subject_id === subjectId && phrase.locale === locale))
      return new MemoryResult([], { changes: before - this.phrases.length })
    }

    if (normalized.startsWith('SELECT w.id, w.text, w.pos, w.category, w.icon, w.image, w.frequency, w.inflections_json, p.final_score FROM talk_word_predictions p JOIN talk_word_inventory w')) {
      const [packId, seqHash] = values.map(String)
      const rows = this.word_predictions
        .filter((r) => r.pack_id === packId && r.sequence_hash === seqHash)
        .sort((a, b) => Number(b.final_score) - Number(a.final_score))
        .slice(0, 200)
        .flatMap((r) => {
          const word = pack.words.find((w) => w.id === r.word_id)
          return word ? [{ ...wordRow(word), final_score: r.final_score }] : []
        })
      return new MemoryResult(rows)
    }

    if (normalized.startsWith('INSERT INTO talk_word_predictions') && normalized.includes('DO UPDATE')) {
      // Click-tracking upsert: binds (id, pack_id, locale, sequence_hash, word_id).
      const [id, packId, locale, seqHash, wordId] = values
      const existing = this.word_predictions.find((r) => r.pack_id === packId && r.sequence_hash === seqHash && r.word_id === wordId)
      if (existing) existing.click_count = Number(existing.click_count) + 1
      else this.word_predictions.push({ id, pack_id: packId, locale, sequence_hash: seqHash, sequence_text: '', word_id: wordId, ai_score: 0.01, click_count: 1, final_score: 0.01 })
      return new MemoryResult()
    }

    if (normalized.startsWith('INSERT INTO talk_word_predictions')) {
      // Bulk prediction insert: flat values in chunks of 8 per row.
      for (let offset = 0; offset < values.length; offset += 8) {
        const [id, packId, locale, seqHash, seqText, wordId, aiScore, finalScore] = values.slice(offset, offset + 8)
        const existing = this.word_predictions.find((r) => r.pack_id === packId && r.sequence_hash === seqHash && r.word_id === wordId)
        if (!existing) this.word_predictions.push({ id, pack_id: packId, locale, sequence_hash: seqHash, sequence_text: seqText, word_id: wordId, ai_score: aiScore, click_count: 0, final_score: finalScore })
      }
      return new MemoryResult()
    }

    if (normalized.startsWith('SELECT pack_id, locale, sequence_hash, SUM(click_count) as total_clicks FROM talk_word_predictions')) {
      const groups = new Map<string, number>()
      for (const r of this.word_predictions) {
        const key = `${String(r.pack_id)}|${String(r.locale)}|${String(r.sequence_hash)}`
        groups.set(key, (groups.get(key) ?? 0) + Number(r.click_count))
      }
      return new MemoryResult(Array.from(groups.entries()).map(([key, total_clicks]) => {
        const [pack_id, locale, sequence_hash] = key.split('|')
        return { pack_id, locale, sequence_hash, total_clicks }
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

const SUBJECT = 'sub_from_service'
const AUTH = { authorization: 'Bearer session-token' }

function service(options: { ttsOk?: boolean, roles?: string[] } = {}) {
  return {
    fetch: async (request: Request) => {
      const url = new URL(request.url)
      if (url.pathname === '/v1/generation/tts') {
        if (options.ttsOk === false) return new Response(JSON.stringify({ error: { code: 'provider_unavailable' } }), { status: 503, headers: { 'content-type': 'application/json' } })
        return new Response(JSON.stringify({ data: { audioUrl: '/v1/generation/audio/test-audio' }, meta: { cached: true } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ subject: { id: SUBJECT }, roles: options.roles ?? ['user'] }), { headers: { 'content-type': 'application/json' } })
    }
  }
}

function atlasService(output: string, capture?: { prompt?: string }) {
  return {
    fetch: async (request: Request) => {
      const body = await request.json() as { input?: string }
      if (capture) capture.prompt = body.input
      return new Response(JSON.stringify({ data: { output } }), { status: 200, headers: { 'content-type': 'application/json' } })
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
    subject_id: SUBJECT,
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
    ATLAS_API_KEY: 'test-atlas-key',
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
    const first = await fetchJson('/v1/sentence/start?locale=en', {
      headers: { origin: 'https://talk.tiko.test', ...AUTH },
    }, testEnv)
    const second = await fetchJson('/v1/sentence/start?locale=en', { headers: AUTH }, testEnv)

    expect(first.response.status).toBe(200)
    expect(first.response.headers.get('access-control-allow-origin')).toBe('https://talk.tiko.test')
    expect(first.body.templates.length).toBeGreaterThanOrEqual(20)
    expect(first.body.initialWords.some((word: JsonBody) => word.id === 'i')).toBe(true)
    expect(first.body.savedPhrases[0]).toMatchObject({ id: 'phrase_1', sentence: 'I want water.' })
    expect(first.body.stripState).toEqual({ words: [], validNext: ['pronoun', 'question', 'social'], canComplete: false })
    expect(second.body).toEqual(first.body)
    expect(cache.writes).toContain(`sentence:start:en:${SUBJECT}`)
    expect(cache.reads.filter((key) => key === `sentence:start:en:${SUBJECT}`).length).toBe(2)
  })

  it('ranks /next suggestions by transition weights and does not cache the fallback', async () => {
    const { testEnv, cache } = env()
    // No ATLAS_SERVICE -> grammar/frequency fallback path.
    const request = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: ['i', 'want'] }),
    }
    const first = await fetchJson('/v1/sentence/next', request, testEnv)
    const second = await fetchJson('/v1/sentence/next', request, testEnv)

    expect(first.response.status).toBe(200)
    expect(first.body.stripState.display).toBe('I want')
    // verb→noun has curated weight 9, so noun outranks the grammar-order default.
    expect(first.body.stripState.validNext).toEqual(['noun', 'determiner', 'adjective', 'preposition', 'social'])
    expect(first.body.suggestions.length).toBeLessThanOrEqual(50)
    expect(first.body.suggestions.some((word: JsonBody) => word.id === 'water')).toBe(true)
    // Deterministic fallback -> both calls equal even though neither is cached.
    expect(second.body).toEqual(first.body)
    // The fallback must NOT be cached, so the next request retries the AI.
    expect(cache.writes.some((key) => key.startsWith('sentence:next:'))).toBe(false)
  })

  it('rejects oversized currentWords lists before touching the database', async () => {
    const { response, body } = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: Array(25).fill('i') }),
    })

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('too_many_words')
  })

  it('returns the full 50 AI-scored suggestions from compact pair output and stores every candidate score', async () => {
    const { testEnv, db, cache } = env()
    const capture: { prompt?: string } = {}
    testEnv.ATLAS_SERVICE = atlasService('[["want",0.95],["eat",0.9],["water",0.85]]', capture)

    const { response, body } = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: ['i'] }),
    }, testEnv)

    expect(response.status).toBe(200)
    expect(body.suggestions.length).toBe(50)
    expect(body.suggestions[0].id).toBe('want')
    expect(body.suggestions[1].id).toBe('eat')
    expect(body.suggestions[2].id).toBe('water')
    // Prompt uses the compact pair format and asks for exactly 50 entries.
    expect(capture.prompt).toContain('[wordId, probability] pairs')
    expect(capture.prompt).toContain('exactly 50 entries')
    // Every candidate gets a stored score (AI-mentioned + 0.01 fillers).
    expect(db.word_predictions.length).toBeGreaterThan(50)
    const want = db.word_predictions.find((r) => r.word_id === 'want')
    expect(want).toMatchObject({ ai_score: 0.95, final_score: 0.95 })
    // AI-backed results ARE cached (unlike the fallback).
    expect(cache.writes.some((key) => key.startsWith('sentence:next:'))).toBe(true)
  })

  it('salvages truncated AI output instead of discarding the paid response', async () => {
    const { testEnv } = env()
    testEnv.ATLAS_SERVICE = atlasService('[["want",0.95],["eat",0.9],["wat')

    const { response, body } = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: ['i'] }),
    }, testEnv)

    expect(response.status).toBe(200)
    expect(body.suggestions[0].id).toBe('want')
    expect(body.suggestions[1].id).toBe('eat')
  })

  it('serves stored predictions from D1 without re-consulting the AI', async () => {
    const { testEnv, db, cache } = env()
    let atlasCalls = 0
    testEnv.ATLAS_SERVICE = {
      fetch: async () => {
        atlasCalls += 1
        return new Response(JSON.stringify({ data: { output: '[["want",0.95]]' } }), { headers: { 'content-type': 'application/json' } })
      },
    }
    const request = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: ['i'] }),
    }

    await fetchJson('/v1/sentence/next', request, testEnv)
    expect(atlasCalls).toBe(1)
    expect(db.word_predictions.length).toBeGreaterThan(0)

    // Drop the KV cache: the second request must come from stored D1 predictions, not the LLM.
    cache.values.clear()
    const second = await fetchJson('/v1/sentence/next', request, testEnv)
    expect(second.response.status).toBe(200)
    expect(second.body.suggestions[0].id).toBe('want')
    expect(atlasCalls).toBe(1)
  })

  it('records click signal for any pack word via upsert, including unpredicted words', async () => {
    const { testEnv, db } = env()
    const request = (selectedWordId: string) => ({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWordIds: ['i'], selectedWordId }),
    })

    const first = await fetchJson('/v1/sentence/select', request('want'), testEnv)
    expect(first.response.status).toBe(200)
    expect(db.word_predictions.find((r) => r.word_id === 'want')?.click_count).toBe(1)

    await fetchJson('/v1/sentence/select', request('want'), testEnv)
    expect(db.word_predictions.find((r) => r.word_id === 'want')?.click_count).toBe(2)

    const unknown = await fetchJson('/v1/sentence/select', request('not-a-word'), testEnv)
    expect(unknown.response.status).toBe(404)
  })

  it('completes a sentence, calls TTS, logs aggregate usage, and dedupes auto-saved phrases', async () => {
    const { testEnv, db } = env()
    const { response, body } = await fetchJson('/v1/sentence/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ locale: 'en', wordIds: ['i', 'want', 'water'], autoSave: true }),
    }, testEnv)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ sentence: 'I want water.', audioUrl: '/v1/generation/audio/test-audio', audioCached: true })
    // "I want water." already exists for this subject — auto-save dedupes onto it.
    expect(body.savedPhraseId).toBe('phrase_1')
    expect(db.phrases.filter((phrase) => phrase.sentence === 'I want water.').length).toBe(1)
    expect(db.phrases[0].usage_count).toBe(5)
    expect(db.usage).toHaveLength(1)
    expect(db.usage[0]).toMatchObject({ locale: 'en', pack_id: 'en-v1', word_count: 3, usage_count: 1 })
    expect(String(db.usage[0].word_sequence_hash)).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(db.usage)).not.toContain('I want water')
  })

  it('allows sentences ending on a verb to complete', async () => {
    const { testEnv } = env()
    const { response, body } = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: ['i', 'want'] }),
    }, testEnv)

    expect(response.status).toBe(200)
    expect(body.stripState.canComplete).toBe(true)
  })

  it('returns a child-safe TTS error without storing raw sentence text in usage rows', async () => {
    const { testEnv, db } = env()
    testEnv.GENERATION_SERVICE = service({ ttsOk: false })
    const { response, body } = await fetchJson('/v1/sentence/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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

  it('never trusts a caller-supplied userId without a matching session', async () => {
    const { testEnv } = env()

    // userId alone (no session) must not unlock another subject's phrases.
    const noAuth = await fetchJson(`/v1/sentence/phrases?locale=en&userId=${SUBJECT}`, {}, testEnv)
    expect(noAuth.response.status).toBe(401)
    expect(noAuth.body.error.code).toBe('identity_required')

    // A session with a mismatched explicit userId is rejected outright.
    const mismatch = await fetchJson('/v1/sentence/phrases?locale=en&userId=sub_victim', { headers: AUTH }, testEnv)
    expect(mismatch.response.status).toBe(403)
    expect(mismatch.body.error.code).toBe('subject_mismatch')

    // A matching explicit userId (legacy clients) still works.
    const matching = await fetchJson(`/v1/sentence/phrases?locale=en&userId=${SUBJECT}`, { headers: AUTH }, testEnv)
    expect(matching.response.status).toBe(200)
  })

  it('requires identity for phrases and enforces ownership on save/delete', async () => {
    const { testEnv, db } = env()
    const anonymous = await fetchJson('/v1/sentence/phrases?locale=en', {}, testEnv)
    expect(anonymous.response.status).toBe(401)

    const listed = await fetchJson('/v1/sentence/phrases?locale=en', { headers: AUTH }, testEnv)
    expect(listed.response.status).toBe(200)
    expect(listed.body.phrases[0]).toMatchObject({ id: 'phrase_1', sentence: 'I want water.' })

    const saved = await fetchJson('/v1/sentence/phrases', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ locale: 'en', wordIds: ['i', 'want', 'juice'], label: 'Juice' }),
    }, testEnv)
    expect(saved.response.status).toBe(201)
    expect(saved.body.phrase).toMatchObject({ sentence: 'I want juice.', label: 'Juice', usageCount: 1 })
    expect(db.phrases.some((phrase) => phrase.id === saved.body.phrase.id && phrase.subject_id === SUBJECT)).toBe(true)

    const deleted = await fetchJson(`/v1/sentence/phrases/${saved.body.phrase.id}?locale=en`, { method: 'DELETE', headers: AUTH }, testEnv)
    expect(deleted.response.status).toBe(200)
    expect(deleted.body).toEqual({ deleted: true })
    expect(db.phrases.some((phrase) => phrase.id === saved.body.phrase.id)).toBe(false)
  })

  it('deduplicates saved phrases and 404s deletes of unknown phrases', async () => {
    const { testEnv, db } = env()
    const save = () => fetchJson('/v1/sentence/phrases', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ locale: 'en', wordIds: ['i', 'want', 'juice'] }),
    }, testEnv)

    const first = await save()
    const second = await save()
    expect(second.body.phrase.id).toBe(first.body.phrase.id)
    expect(second.body.phrase.usageCount).toBe(2)
    expect(db.phrases.filter((phrase) => phrase.sentence === 'I want juice.').length).toBe(1)

    const missing = await fetchJson('/v1/sentence/phrases/phrase_nope?locale=en', { method: 'DELETE', headers: AUTH }, testEnv)
    expect(missing.response.status).toBe(404)
    expect(missing.body.error.code).toBe('phrase_not_found')
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

  it('scheduled recalculation merges pack and learned transition weights and only flushes affected next caches', async () => {
    const { testEnv, db, cache } = env()
    db.usage.push(
      { id: 'u1', locale: 'en', pack_id: 'en-v1', pos_sequence_json: JSON.stringify(['pronoun', 'verb', 'noun']), usage_count: 10 },
      { id: 'u2', locale: 'en', pack_id: 'en-v1', pos_sequence_json: JSON.stringify(['pronoun', 'verb']), usage_count: 2 },
    )
    cache.values.set('sentence:next:v2:en:abc123', '{}')
    cache.values.set('sentence:start:en:anon', '{}')

    await (worker as any).scheduled({ cron: '0 3 * * *' }, testEnv, {} as never)

    const learned = db.talk_transitions.filter((row) => row.source === 'learned')
    expect(learned.find((row) => row.from_pos === 'pronoun' && row.to_pos === 'verb')?.weight).toBeCloseTo(10)
    expect(learned.find((row) => row.from_pos === 'verb' && row.to_pos === 'noun')?.weight).toBeCloseTo(9.7)
    expect(cache.deletes).toEqual(['sentence:next:v2:en:abc123'])
    expect(cache.values.has('sentence:start:en:anon')).toBe(true)
  })

  it('blends click counts into final scores with a capped learned weight', async () => {
    const { testEnv, db } = env()
    db.word_predictions.push(
      { id: 'p1', pack_id: 'en-v1', locale: 'en', sequence_hash: 'seq1', sequence_text: '', word_id: 'want', ai_score: 0.9, click_count: 0, final_score: 0.9 },
      { id: 'p2', pack_id: 'en-v1', locale: 'en', sequence_hash: 'seq1', sequence_text: '', word_id: 'eat', ai_score: 0.1, click_count: 200, final_score: 0.1 },
    )

    await (worker as any).scheduled({ cron: '0 3 * * *' }, testEnv, {} as never)

    // learnedWeight = min(0.8, 200/200) = 0.8 — the clicked word dominates but
    // the AI prior survives: eat = 0.1*0.2 + 1.0*0.8 = 0.82; want = 0.9*0.2 = 0.18.
    expect(db.word_predictions.find((r) => r.word_id === 'eat')?.final_score).toBeCloseTo(0.82)
    expect(db.word_predictions.find((r) => r.word_id === 'want')?.final_score).toBeCloseTo(0.18)
  })

  it('learned transition weights reorder validNext on subsequent requests', async () => {
    const { testEnv, db } = env()
    // Simulate the nightly job having learned that verbs are followed by social words.
    db.talk_transitions.push({ id: 'learned:en-v1:verb:social', pack_id: 'en-v1', locale: 'en', from_pos: 'verb', to_pos: 'social', weight: 9.9, source: 'learned' })

    const { body } = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: ['i', 'want'] }),
    }, testEnv)

    expect(body.stripState.validNext).toEqual(['social', 'noun', 'determiner', 'adjective', 'preposition'])
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

describe('sentence-api custom words and per-user learning', () => {
  function addWord(testEnv: Env, payload: Record<string, unknown>) {
    return fetchJson('/v1/sentence/words', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ locale: 'en', ...payload }),
    }, testEnv)
  }

  it('requires a session to add a custom word', async () => {
    const { testEnv } = env()
    const { response, body } = await fetchJson('/v1/sentence/words', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', text: 'Sil' }),
    }, testEnv)
    expect(response.status).toBe(401)
    expect(body.error.code).toBe('identity_required')
  })

  it('adds a custom word, lists it, and rejects oversized text', async () => {
    const { testEnv, db } = env()
    const added = await addWord(testEnv, { text: 'Sil', pos: 'noun', icon: 'user' })
    expect(added.response.status).toBe(201)
    expect(added.body.word).toMatchObject({ text: 'Sil', pos: 'noun', category: 'mine', usageCount: 1, icon: 'user' })
    expect(added.body.word.id.startsWith('uword_')).toBe(true)
    expect(db.user_words.length).toBe(1)

    const listed = await fetchJson('/v1/sentence/words?locale=en', { headers: AUTH }, testEnv)
    expect(listed.response.status).toBe(200)
    expect(listed.body.words).toHaveLength(1)
    expect(listed.body.words[0].text).toBe('Sil')

    const tooLong = await addWord(testEnv, { text: 'x'.repeat(60) })
    expect(tooLong.response.status).toBe(400)
    expect(tooLong.body.error.code).toBe('text_too_long')

    const empty = await addWord(testEnv, { text: '   ' })
    expect(empty.response.status).toBe(400)
    expect(empty.body.error.code).toBe('missing_text')
  })

  it('re-adding the same word bumps usage instead of duplicating', async () => {
    const { testEnv, db } = env()
    await addWord(testEnv, { text: 'Sil' })
    const again = await addWord(testEnv, { text: 'sil' }) // same normalized text
    expect(again.body.word.usageCount).toBe(2)
    expect(db.user_words.length).toBe(1)
    // Latest casing wins.
    expect(db.user_words[0].text).toBe('sil')
  })

  it('surfaces a custom word at the top of /next for the position it was added (the "name" flow)', async () => {
    const { testEnv } = env()
    // A child building "I want ___" finds their name is missing and adds it.
    const added = await addWord(testEnv, { text: 'Sil', pos: 'noun', afterWordIds: ['i', 'want'] })
    const customId = added.body.word.id

    const next = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ locale: 'en', currentWords: ['i', 'want'] }),
    }, testEnv)

    expect(next.response.status).toBe(200)
    // Affinity seeded by afterWordIds boosts the custom word to the very top.
    expect(next.body.suggestions[0].id).toBe(customId)
    expect(next.body.suggestions[0].text).toBe('Sil')
    expect(next.body.suggestions[0].isCustom).toBe(true)
    // It is grouped under its own "mine" category for browsing.
    expect(next.body.words.mine?.some((w: JsonBody) => w.id === customId)).toBe(true)
  })

  it('anonymous /next never sees another user\'s custom words', async () => {
    const { testEnv } = env()
    await addWord(testEnv, { text: 'Sil', pos: 'noun', afterWordIds: ['i', 'want'] })
    const anon = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currentWords: ['i', 'want'] }),
    }, testEnv)
    expect(anon.response.status).toBe(200)
    expect(anon.body.suggestions.every((w: JsonBody) => !w.isCustom)).toBe(true)
  })

  it('records per-user affinity on select and reorders the next request', async () => {
    const { testEnv, db } = env()
    const select = await fetchJson('/v1/sentence/select', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ locale: 'en', currentWordIds: ['i', 'want'], selectedWordId: 'water' }),
    }, testEnv)
    expect(select.response.status).toBe(200)
    // Per-user affinity recorded (no userId leakage — derived from the session).
    expect(db.user_affinity.find((a) => a.word_id === 'water' && a.subject_id === SUBJECT)?.click_count).toBe(1)
    // Pack words also feed the global model.
    expect(db.word_predictions.find((r) => r.word_id === 'water')?.click_count).toBe(1)

    const next = await fetchJson('/v1/sentence/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ locale: 'en', currentWords: ['i', 'want'] }),
    }, testEnv)
    expect(next.body.suggestions[0].id).toBe('water')
  })

  it('completes and saves a sentence that contains a custom word', async () => {
    const { testEnv, db } = env()
    const added = await addWord(testEnv, { text: 'Sil', pos: 'noun' })
    const customId = added.body.word.id

    const { response, body } = await fetchJson('/v1/sentence/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ locale: 'en', wordIds: ['i', 'want', customId], autoSave: true }),
    }, testEnv)

    expect(response.status).toBe(200)
    expect(body.sentence).toBe('I want Sil.')
    expect(body.savedPhraseId).toMatch(/^phrase_/)
    const saved = db.phrases.find((p) => p.id === body.savedPhraseId)
    expect(JSON.parse(String(saved?.word_ids_json))).toEqual(['i', 'want', customId])
  })

  it('filters vocabulary by free text and merges the user\'s custom words', async () => {
    const { testEnv } = env()
    await addWord(testEnv, { text: 'Sil', pos: 'noun' })

    // Free-text filter over pack words.
    const filtered = await fetchJson('/v1/sentence/vocabulary?locale=en&q=wat', {}, testEnv)
    expect(filtered.response.status).toBe(200)
    expect(filtered.body.words.length).toBeGreaterThan(0)
    expect(filtered.body.words.every((w: JsonBody) => w.text.toLowerCase().includes('wat'))).toBe(true)

    // With a session, the custom word is browsable and findable by filter.
    const mine = await fetchJson('/v1/sentence/vocabulary?locale=en&q=sil', { headers: AUTH }, testEnv)
    expect(mine.body.words.some((w: JsonBody) => w.text === 'Sil' && w.isCustom)).toBe(true)
  })

  it('deletes a custom word and clears its learning', async () => {
    const { testEnv, db } = env()
    const added = await addWord(testEnv, { text: 'Sil', pos: 'noun', afterWordIds: ['i', 'want'] })
    const customId = added.body.word.id
    expect(db.user_affinity.length).toBe(1)

    const del = await fetchJson(`/v1/sentence/words/${customId}?locale=en`, { method: 'DELETE', headers: AUTH }, testEnv)
    expect(del.response.status).toBe(200)
    expect(del.body).toEqual({ deleted: true })
    expect(db.user_words.length).toBe(0)
    expect(db.user_affinity.length).toBe(0)

    const missing = await fetchJson('/v1/sentence/words/uword_nope?locale=en', { method: 'DELETE', headers: AUTH }, testEnv)
    expect(missing.response.status).toBe(404)
    expect(missing.body.error.code).toBe('word_not_found')
  })
})
