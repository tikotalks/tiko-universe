import type {
  Category,
  GrammarRules,
  PackTemplate,
  PackWord,
  SavedPhrase,
  SentenceNextRequest,
  SentenceNextResponse,
  SentenceStartResponse,
  StripState,
  Template,
  WordTile,
} from '@tiko/talk-types'

type D1Value = string | number | boolean | null

interface D1Result<T = unknown> {
  results?: T[]
  success: boolean
  meta: Record<string, unknown>
}

interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null> | T | null
  all<T = unknown>(): Promise<D1Result<T>> | D1Result<T>
  run(): Promise<D1Result> | D1Result
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement
}

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

interface ServiceBinding {
  fetch(request: Request): Promise<Response>
}

export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  IDENTITY_SERVICE: ServiceBinding
  GENERATION_SERVICE: ServiceBinding
  ALLOWED_ORIGINS?: string
  TIKO_ENVIRONMENT?: string
}

interface LanguagePackRow {
  id: string
  locale: string
  version: number
  grammar_json: string
}

interface WordRow {
  id: string
  text: string
  pos: string
  category: string
  icon: string | null
  image: string | null
  frequency: number
  inflections_json?: string | null
}

interface TemplateRow {
  id: string
  pattern: string
  category: string
  icon: string | null
  slots_json: string
}

interface PhraseRow {
  id: string
  sentence: string
  word_ids_json: string
  is_auto: number
  usage_count: number
  label: string | null
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://talk.tikoapps.org',
  'https://dev.talk.tikoapps.org',
  'http://localhost:3066',
  'http://localhost:5173',
  'http://localhost:4173',
  'capacitor://localhost',
  'ionic://localhost',
  'tiko://native',
].join(',')

const START_CACHE_TTL = 900
const NEXT_CACHE_TTL = 3600
const STARTER_POS = ['pronoun', 'question', 'social']
const COMPLETABLE_POS = new Set(['noun', 'adjective', 'social'])
const CONTEXTUAL_SUGGESTION_RANKS: Record<string, string[]> = {
  want: ['water', 'toilet', 'food', 'help-please', 'break', 'hug', 'quiet-time', 'space'],
  need: ['help-please', 'water', 'toilet', 'medicine', 'break', 'quiet-time'],
  feel: ['happy', 'sad', 'angry', 'scared', 'tired', 'sick'],
  go: ['home', 'school', 'outside', 'bathroom', 'bed'],
}

export default {
  fetch(request: Request, env: Env, _ctx?: unknown): Promise<Response> {
    return handleRequest(request, env)
  }
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env)

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, '')

    if (path === '/health' || path === '/v1/sentence/health') {
      if (request.method !== 'GET') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(json({ data: { ok: true, service: 'sentence-api', environment: env.TIKO_ENVIRONMENT ?? 'unknown' } }), cors)
    }

    if (path === '/v1/sentence/start') {
      if (request.method !== 'GET') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await startSentence(request, env, url), cors)
    }

    if (path === '/v1/sentence/next') {
      if (request.method !== 'POST') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await nextSentence(request, env), cors)
    }

    return withCors(jsonError('not_found', 'Route not found.', 404), cors)
  } catch (error) {
    if (error instanceof HttpError) {
      return withCors(jsonError(error.code, error.message, error.status, error.field), cors)
    }
    return withCors(jsonError('internal_error', 'Unexpected server error.', 500), cors)
  }
}

async function startSentence(request: Request, env: Env, url: URL): Promise<Response> {
  const locale = readLocale(url)
  const subjectId = await resolveSubjectId(request, env, url.searchParams.get('userId'))
  const cacheKey = `sentence:start:${locale}:${subjectId ?? 'anon'}`
  const cached = await readCache<SentenceStartResponse>(env, cacheKey)
  if (cached) return json(cached)

  const pack = await loadActivePack(env.DB, locale)
  const [words, templates, savedPhrases] = await Promise.all([
    loadWords(env.DB, pack.id),
    loadTemplates(env.DB, pack.id),
    subjectId ? loadSavedPhrases(env.DB, locale, subjectId) : Promise.resolve([]),
  ])

  const categories = buildCategories(words)
  const initialWords = words
    .filter((word) => STARTER_POS.includes(word.pos))
    .sort((a, b) => b.frequency - a.frequency || a.text.localeCompare(b.text))
    .slice(0, 24)
    .map(toWordTile)

  const response: SentenceStartResponse = {
    templates: templates.map(toTemplate),
    initialCategories: categories,
    initialWords,
    savedPhrases,
    stripState: {
      words: [],
      validNext: STARTER_POS,
      canComplete: false,
    },
  }

  await writeCache(env, cacheKey, response, START_CACHE_TTL)
  return json(response)
}

async function nextSentence(request: Request, env: Env): Promise<Response> {
  const body = await readJson<SentenceNextRequest>(request)
  const locale = normalizeLocale(body.locale)
  const currentWords = Array.isArray(body.currentWords) ? body.currentWords : []
  if (currentWords.some((wordId) => typeof wordId !== 'string' || !wordId.trim())) {
    throw new HttpError(400, 'invalid_current_words', 'currentWords must contain only word id strings.', 'currentWords')
  }

  const subjectId = await resolveSubjectId(request, env, body.userId)
  const cacheKey = `sentence:next:${locale}:${subjectId ?? 'anon'}:${currentWords.join(',')}`
  const cached = await readCache<SentenceNextResponse>(env, cacheKey)
  if (cached) return json(cached)

  const pack = await loadActivePack(env.DB, locale)
  const selectedWords = currentWords.length ? await loadWordsByIds(env.DB, pack.id, currentWords) : []
  const selectedById = new Map(selectedWords.map((word) => [word.id, word]))
  const orderedSelected = currentWords.map((wordId) => selectedById.get(wordId)).filter((word): word is PackWord => Boolean(word))
  if (orderedSelected.length !== currentWords.length) {
    throw new HttpError(404, 'unknown_word', 'One or more word ids are not in the active language pack.', 'currentWords')
  }

  const validNext = validNextFor(pack.grammar, orderedSelected)
  const suggestions = rankSuggestions(await loadSuggestedWords(env.DB, pack.id, validNext), validNext, orderedSelected)
  const categories = buildCategories(suggestions)
  const words = groupWords(suggestions)
  const stripState: StripState = {
    display: orderedSelected.map((word) => word.text).join(' '),
    validNext,
    canComplete: orderedSelected.length > 0 && COMPLETABLE_POS.has(orderedSelected[orderedSelected.length - 1].pos),
  }

  const response: SentenceNextResponse = {
    suggestions: suggestions.slice(0, 12).map(toWordTile),
    categories,
    words,
    stripState,
  }

  await writeCache(env, cacheKey, response, NEXT_CACHE_TTL)
  return json(response)
}

async function loadActivePack(db: D1Database, locale: string): Promise<LanguagePackRow & { grammar: GrammarRules }> {
  const row = await first<LanguagePackRow>(db.prepare(`
    SELECT id, locale, version, grammar_json
    FROM language_packs
    WHERE locale = ? AND status = 'active'
    ORDER BY version DESC
    LIMIT 1
  `).bind(locale))

  if (!row) throw new HttpError(404, 'language_pack_not_found', 'No active language pack exists for this locale.', 'locale')
  return { ...row, grammar: parseJson<GrammarRules>(row.grammar_json, 'grammar_json') }
}

async function loadWords(db: D1Database, packId: string): Promise<PackWord[]> {
  const rows = await all<WordRow>(db.prepare(`
    SELECT id, text, pos, category, icon, image, frequency, inflections_json
    FROM word_inventory
    WHERE pack_id = ?
    ORDER BY category ASC, frequency DESC, text ASC
  `).bind(packId))
  return rows.map(toPackWord)
}

async function loadWordsByIds(db: D1Database, packId: string, ids: string[]): Promise<PackWord[]> {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(', ')
  const rows = await all<WordRow>(db.prepare(`
    SELECT id, text, pos, category, icon, image, frequency, inflections_json
    FROM word_inventory
    WHERE pack_id = ? AND id IN (${placeholders})
  `).bind(packId, ...ids))
  return rows.map(toPackWord)
}

async function loadSuggestedWords(db: D1Database, packId: string, posTypes: string[]): Promise<PackWord[]> {
  if (posTypes.length === 0) return []
  const placeholders = posTypes.map(() => '?').join(', ')
  const rows = await all<WordRow>(db.prepare(`
    SELECT id, text, pos, category, icon, image, frequency, inflections_json
    FROM word_inventory
    WHERE pack_id = ? AND pos IN (${placeholders})
    ORDER BY frequency DESC, text ASC
  `).bind(packId, ...posTypes))
  return rows.map(toPackWord)
}

function rankSuggestions(words: PackWord[], posTypes: string[], selected: PackWord[]): PackWord[] {
  const posRank = new Map(posTypes.map((pos, index) => [pos, index]))
  const contextualRank = new Map<string, number>()
  for (const selectedWord of selected) {
    const rankedIds = CONTEXTUAL_SUGGESTION_RANKS[selectedWord.id] ?? []
    rankedIds.forEach((wordId, index) => {
      contextualRank.set(wordId, Math.min(contextualRank.get(wordId) ?? Number.POSITIVE_INFINITY, index))
    })
  }

  return [...words].sort((a, b) => {
    const aContext = contextualRank.get(a.id) ?? Number.POSITIVE_INFINITY
    const bContext = contextualRank.get(b.id) ?? Number.POSITIVE_INFINITY
    return aContext - bContext
      || (posRank.get(a.pos) ?? 99) - (posRank.get(b.pos) ?? 99)
      || b.frequency - a.frequency
      || a.text.localeCompare(b.text)
  })
}

async function loadTemplates(db: D1Database, packId: string): Promise<PackTemplate[]> {
  const rows = await all<TemplateRow>(db.prepare(`
    SELECT id, pattern, category, icon, slots_json
    FROM templates
    WHERE pack_id = ?
    ORDER BY priority DESC, id ASC
  `).bind(packId))
  return rows.map((row) => ({
    id: row.id,
    pattern: row.pattern,
    category: row.category,
    ...(row.icon ? { icon: row.icon } : {}),
    slots: parseJson<PackTemplate['slots']>(row.slots_json, 'slots_json'),
  }))
}

async function loadSavedPhrases(db: D1Database, locale: string, subjectId: string): Promise<SavedPhrase[]> {
  const rows = await all<PhraseRow>(db.prepare(`
    SELECT id, sentence, word_ids_json, is_auto, usage_count, label
    FROM user_phrases
    WHERE subject_id = ? AND locale = ?
    ORDER BY usage_count DESC, updated_at DESC
    LIMIT 12
  `).bind(subjectId, locale))
  return rows.map((row) => ({
    id: row.id,
    sentence: row.sentence,
    wordIds: parseJson<string[]>(row.word_ids_json, 'word_ids_json'),
    isAuto: row.is_auto === 1,
    usageCount: row.usage_count,
    ...(row.label ? { label: row.label } : {}),
  }))
}

function toPackWord(row: WordRow): PackWord {
  return {
    id: row.id,
    text: row.text,
    pos: row.pos,
    category: row.category,
    frequency: Number(row.frequency),
    ...(row.icon ? { icon: row.icon } : {}),
    ...(row.inflections_json ? { inflections: parseJson<Record<string, string>>(row.inflections_json, 'inflections_json') } : {}),
  }
}

function toWordTile(word: PackWord): WordTile {
  return {
    id: word.id,
    text: word.text,
    pos: word.pos,
    category: word.category,
    ...(word.icon ? { icon: word.icon } : {}),
  }
}

function toTemplate(template: PackTemplate): Template {
  return {
    id: template.id,
    pattern: template.pattern,
    category: template.category,
    ...(template.icon ? { icon: template.icon } : {}),
    slotCount: template.slots.length,
  }
}

function buildCategories(words: PackWord[]): Category[] {
  const categories = new Map<string, { posTypes: Set<string>, wordCount: number }>()
  for (const word of words) {
    const category = categories.get(word.category) ?? { posTypes: new Set<string>(), wordCount: 0 }
    category.posTypes.add(word.pos)
    category.wordCount += 1
    categories.set(word.category, category)
  }

  return Array.from(categories.entries()).map(([id, value]) => ({
    id,
    label: titleCase(id),
    posTypes: Array.from(value.posTypes).sort(),
    wordCount: value.wordCount,
  })).sort((a, b) => a.label.localeCompare(b.label))
}

function groupWords(words: PackWord[]): Record<string, WordTile[]> {
  return words.reduce<Record<string, WordTile[]>>((grouped, word) => {
    grouped[word.category] = grouped[word.category] ?? []
    grouped[word.category].push(toWordTile(word))
    return grouped
  }, {})
}

function validNextFor(grammar: GrammarRules, selected: PackWord[]): string[] {
  if (selected.length === 0) return STARTER_POS
  const last = selected[selected.length - 1]
  return grammar.validTransitions[last.pos] ?? []
}

async function resolveSubjectId(request: Request, env: Env, explicitSubjectId?: string | null): Promise<string | null> {
  if (explicitSubjectId?.trim()) return explicitSubjectId.trim()
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null

  // Identity improves saved-phrase personalization, but Talk must not have a login wall.
  // If the service binding is unavailable or returns an unexpected shape, continue anonymous.
  try {
    const response = await env.IDENTITY_SERVICE.fetch(new Request('https://identity.internal/v1/identity/me', {
      headers: { Authorization: auth },
    }))
    if (!response.ok) return null
    const body = await response.json() as { subject?: { id?: string }, data?: { userId?: string, subjectId?: string } }
    return body.subject?.id ?? body.data?.subjectId ?? body.data?.userId ?? null
  } catch {
    return null
  }
}

async function readCache<T>(env: Env, key: string): Promise<T | null> {
  const value = await env.CACHE.get(key)
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    await env.CACHE.delete(key)
    return null
  }
}

async function writeCache(env: Env, key: string, body: unknown, ttl: number): Promise<void> {
  await env.CACHE.put(key, JSON.stringify(body), { expirationTtl: ttl })
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON.')
  }
}

function readLocale(url: URL): string {
  return normalizeLocale(url.searchParams.get('locale') ?? '')
}

function normalizeLocale(raw: string): string {
  const locale = raw.trim()
  if (!locale) throw new HttpError(400, 'missing_locale', 'Locale is required.', 'locale')
  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale)) {
    throw new HttpError(400, 'invalid_locale', 'Locale must use a language tag like "en" or "en-US".', 'locale')
  }
  return locale
}

function parseJson<T>(raw: string, field: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new HttpError(500, 'invalid_stored_json', `Stored ${field} is not valid JSON.`)
  }
}

async function first<T>(statement: D1PreparedStatement): Promise<T | null> {
  return await statement.first<T>()
}

async function all<T>(statement: D1PreparedStatement): Promise<T[]> {
  const result = await statement.all<T>()
  return result.results ?? []
}

function titleCase(value: string): string {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers()
  const origin = request.headers.get('Origin')
  const allowed = allowedOrigins(env)

  if (origin && allowed.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}

function allowedOrigins(env: Env): Set<string> {
  return new Set((env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS).split(',').map((origin) => origin.trim()).filter(Boolean))
}

function withCors(response: Response, cors: Headers): Response {
  const headers = new Headers(response.headers)
  cors.forEach((value, key) => headers.set(key, value))
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function jsonError(code: string, message: string, status: number, field?: string): Response {
  return json({ error: { code, message, ...(field ? { field } : {}) } }, status)
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public field?: string) {
    super(message)
  }
}
