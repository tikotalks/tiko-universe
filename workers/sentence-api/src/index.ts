import type {
  Category,
  GrammarRules,
  PackTemplate,
  PackWord,
  DeleteSentencePhraseResponse,
  SavedPhrase,
  SaveSentencePhraseRequest,
  SaveSentencePhraseResponse,
  SentenceCompleteRequest,
  SentenceCompleteResponse,
  SentenceNextRequest,
  SentenceNextResponse,
  SentencePhrasesResponse,
  SentenceStartResponse,
  SentenceVocabularyResponse,
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
  list?(options?: { prefix?: string, cursor?: string }): Promise<{ keys: Array<{ name: string }>, cursor?: string, list_complete?: boolean }>
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
  },

  async scheduled(event: { cron: string }, env: Env, _ctx?: unknown): Promise<void> {
    await handleScheduled(event, env)
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

    if (path === '/v1/sentence/complete') {
      if (request.method !== 'POST') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await completeSentence(request, env), cors)
    }

    if (path === '/v1/sentence/vocabulary') {
      if (request.method !== 'GET') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await vocabulary(env, url), cors)
    }

    if (path === '/v1/sentence/phrases') {
      if (request.method === 'GET') return withCors(await listPhrases(request, env, url), cors)
      if (request.method === 'POST') return withCors(await savePhrase(request, env), cors)
      return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
    }

    if (path.startsWith('/v1/sentence/phrases/')) {
      if (request.method !== 'DELETE') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await deletePhrase(request, env, url, path), cors)
    }

    if (path === '/v1/sentence-admin/generate-pack') {
      if (request.method !== 'POST') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await generatePackShell(request, env), cors)
    }

    return withCors(jsonError('not_found', 'Route not found.', 404), cors)
  } catch (error) {
    if (error instanceof HttpError) {
      return withCors(jsonError(error.code, error.message, error.status, error.field), cors)
    }
    return withCors(jsonError('internal_error', 'Unexpected server error.', 500), cors)
  }
}

async function handleScheduled(_event: { cron: string }, env: Env): Promise<void> {
  await recalculateLearnedTransitions(env)
  await discoverTemplateCandidates(env)
}

async function recalculateLearnedTransitions(env: Env): Promise<void> {
  const usageRows = await all<{ id: string, locale: string, pack_id: string | null, pos_sequence_json: string, usage_count: number }>(env.DB.prepare(`
    SELECT id, locale, pack_id, pos_sequence_json, usage_count
    FROM talk_sentence_usage
    WHERE pack_id IS NOT NULL
    ORDER BY locale ASC, pack_id ASC
  `))
  const countsByPack = new Map<string, { locale: string, counts: Map<string, number> }>()

  for (const row of usageRows) {
    if (!row.pack_id) continue
    const sequence = parseJson<string[]>(row.pos_sequence_json, 'pos_sequence_json')
    const bucket = countsByPack.get(row.pack_id) ?? { locale: row.locale, counts: new Map<string, number>() }
    for (let index = 0; index < sequence.length - 1; index += 1) {
      const from = sequence[index]
      const to = sequence[index + 1]
      if (!from || !to) continue
      const key = `${from}\u0000${to}`
      bucket.counts.set(key, (bucket.counts.get(key) ?? 0) + Number(row.usage_count))
    }
    countsByPack.set(row.pack_id, bucket)
  }

  for (const [packId, bucket] of Array.from(countsByPack.entries())) {
    await mergePackTransitions(env.DB, packId, bucket.locale, bucket.counts)
    await deleteCachePrefix(env.CACHE, `sentence:next:${bucket.locale}:`)
  }
}

async function mergePackTransitions(db: D1Database, packId: string, locale: string, counts: Map<string, number>): Promise<void> {
  if (counts.size === 0) return
  const curatedRows = await all<{ from_pos: string, to_pos: string, weight: number }>(db.prepare(`
    SELECT from_pos, to_pos, weight
    FROM talk_transitions
    WHERE pack_id = ? AND source = 'curated'
  `).bind(packId))
  const curatedWeights = new Map(curatedRows.map((row) => [`${row.from_pos}\u0000${row.to_pos}`, Number(row.weight)]))
  const maxByFrom = new Map<string, number>()
  for (const [key, count] of Array.from(counts.entries())) {
    const [from] = key.split('\u0000')
    maxByFrom.set(from, Math.max(maxByFrom.get(from) ?? 0, count))
  }

  for (const [key, count] of Array.from(counts.entries())) {
    const [from, to] = key.split('\u0000')
    const maxForFrom = maxByFrom.get(from) ?? count
    const learnedWeight = maxForFrom > 0 ? (count / maxForFrom) * 10 : 0
    const packWeight = curatedWeights.get(key) ?? learnedWeight
    const mergedWeight = (packWeight * 0.3) + (learnedWeight * 0.7)
    await run(db.prepare(`
      INSERT INTO talk_transitions (id, pack_id, locale, from_pos, to_pos, weight, source, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'learned', CURRENT_TIMESTAMP)
      ON CONFLICT(pack_id, from_pos, to_pos, source) DO UPDATE SET
        weight = excluded.weight,
        updated_at = CURRENT_TIMESTAMP
    `).bind(`learned:${packId}:${from}:${to}`, packId, locale, from, to, Number(mergedWeight.toFixed(4))))
  }
}

async function deleteCachePrefix(cache: KVNamespace, prefix: string): Promise<void> {
  if (!cache.list) return
  let cursor: string | undefined
  do {
    const page = await cache.list({ prefix, cursor })
    await Promise.all(page.keys.map((key) => cache.delete(key.name)))
    cursor = page.cursor
    if (page.list_complete !== false) break
  } while (cursor)
}

async function discoverTemplateCandidates(_env: Env): Promise<void> {
  // Weekly template discovery is intentionally a shell for v1c: it can be safely
  // scheduled without child-facing LLM/runtime generation until the admin provider
  // and review workflow are explicitly configured.
}

async function generatePackShell(request: Request, env: Env): Promise<Response> {
  await requireAdmin(request, env)
  const body = await readJson<{ locale?: string }>(request)
  normalizeLocale(body.locale ?? '')
  throw new HttpError(501, 'pack_generation_provider_unconfigured', 'Admin pack generation needs a configured provider and review workflow before it can run.')
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


async function completeSentence(request: Request, env: Env): Promise<Response> {
  const body = await readJson<SentenceCompleteRequest>(request)
  const locale = normalizeLocale(body.locale)
  const wordIds = validateWordIds(body.wordIds, 'wordIds')
  const subjectId = await resolveSubjectId(request, env, body.userId)
  const pack = await loadActivePack(env.DB, locale)
  const selectedWords = await loadWordsByIds(env.DB, pack.id, wordIds)
  const orderedWords = orderWordsOrThrow(wordIds, selectedWords)
  const sentence = formatSentence(orderedWords)

  await logUsageAggregate(env.DB, locale, pack.id, orderedWords)

  let savedPhraseId: string | undefined
  if (body.autoSave && subjectId) {
    const phrase = await persistPhrase(env.DB, locale, subjectId, orderedWords)
    savedPhraseId = phrase.id
  }

  const audio = await generateSpeech(env, sentence, locale)
  const response: SentenceCompleteResponse = {
    sentence,
    audioUrl: audio.audioUrl,
    audioCached: audio.cached,
    ...(savedPhraseId ? { savedPhraseId } : {}),
  }
  return json(response)
}

async function vocabulary(env: Env, url: URL): Promise<Response> {
  const locale = readLocale(url)
  const category = url.searchParams.get('category')?.trim() || null
  const pos = url.searchParams.get('pos')?.trim() || null
  const cacheKey = `sentence:vocabulary:${locale}:${category ?? 'all'}:${pos ?? 'all'}`
  const cached = await readCache<SentenceVocabularyResponse>(env, cacheKey)
  if (cached) return json(cached)

  const pack = await loadActivePack(env.DB, locale)
  const words = await loadVocabularyWords(env.DB, pack.id, category, pos)
  const response: SentenceVocabularyResponse = {
    words: words.map(toWordTile),
    categories: buildCategories(words),
    totalWords: words.length,
  }
  await writeCache(env, cacheKey, response, 21600)
  return json(response)
}

async function listPhrases(request: Request, env: Env, url: URL): Promise<Response> {
  const locale = readLocale(url)
  const subjectId = await requireSubjectId(request, env, url.searchParams.get('userId'))
  const cacheKey = `sentence:phrases:${locale}:${hashCacheKey(subjectId)}`
  const cached = await readCache<SentencePhrasesResponse>(env, cacheKey)
  if (cached) return json(cached)

  const response: SentencePhrasesResponse = { phrases: await loadSavedPhrases(env.DB, locale, subjectId) }
  await writeCache(env, cacheKey, response, 900)
  return json(response)
}

async function savePhrase(request: Request, env: Env): Promise<Response> {
  const body = await readJson<SaveSentencePhraseRequest>(request)
  const locale = normalizeLocale(body.locale)
  const subjectId = await requireSubjectId(request, env, body.userId)
  const wordIds = validateWordIds(body.wordIds, 'wordIds')
  const pack = await loadActivePack(env.DB, locale)
  const words = await loadWordsByIds(env.DB, pack.id, wordIds)
  const phrase = await persistPhrase(env.DB, locale, subjectId, orderWordsOrThrow(wordIds, words), body.label)
  await env.CACHE.delete(`sentence:phrases:${locale}:${hashCacheKey(subjectId)}`)
  const response: SaveSentencePhraseResponse = { phrase }
  return json(response, 201)
}

async function deletePhrase(request: Request, env: Env, url: URL, path: string): Promise<Response> {
  const phraseId = decodeURIComponent(path.replace('/v1/sentence/phrases/', ''))
  if (!phraseId) throw new HttpError(400, 'missing_phrase_id', 'Phrase id is required.', 'phraseId')
  const locale = readLocale(url)
  const subjectId = await requireSubjectId(request, env, url.searchParams.get('userId'))
  await run(env.DB.prepare(`
    DELETE FROM talk_user_phrases
    WHERE id = ? AND subject_id = ? AND locale = ?
  `).bind(phraseId, subjectId, locale))
  await env.CACHE.delete(`sentence:phrases:${locale}:${hashCacheKey(subjectId)}`)
  const response: DeleteSentencePhraseResponse = { deleted: true }
  return json(response)
}

async function loadActivePack(db: D1Database, locale: string): Promise<LanguagePackRow & { grammar: GrammarRules }> {
  const row = await first<LanguagePackRow>(db.prepare(`
    SELECT id, locale, version, grammar_json
    FROM talk_language_packs
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
    FROM talk_word_inventory
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
    FROM talk_word_inventory
    WHERE pack_id = ? AND id IN (${placeholders})
  `).bind(packId, ...ids))
  return rows.map(toPackWord)
}

async function loadSuggestedWords(db: D1Database, packId: string, posTypes: string[]): Promise<PackWord[]> {
  if (posTypes.length === 0) return []
  const placeholders = posTypes.map(() => '?').join(', ')
  const rows = await all<WordRow>(db.prepare(`
    SELECT id, text, pos, category, icon, image, frequency, inflections_json
    FROM talk_word_inventory
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


async function loadVocabularyWords(db: D1Database, packId: string, category: string | null, pos: string | null): Promise<PackWord[]> {
  const clauses = ['pack_id = ?']
  const values: D1Value[] = [packId]
  if (category) {
    clauses.push('category = ?')
    values.push(category)
  }
  if (pos) {
    clauses.push('pos = ?')
    values.push(pos)
  }
  const rows = await all<WordRow>(db.prepare(`
    SELECT id, text, pos, category, icon, image, frequency, inflections_json
    FROM talk_word_inventory
    WHERE ${clauses.join(' AND ')}
    ORDER BY category ASC, frequency DESC, text ASC
  `).bind(...values))
  return rows.map(toPackWord)
}

async function loadTemplates(db: D1Database, packId: string): Promise<PackTemplate[]> {
  const rows = await all<TemplateRow>(db.prepare(`
    SELECT id, pattern, category, icon, slots_json
    FROM talk_templates
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
    FROM talk_user_phrases
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


function validateWordIds(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, 'missing_word_ids', 'At least one word id is required.', field)
  }
  if (value.some((wordId) => typeof wordId !== 'string' || !wordId.trim())) {
    throw new HttpError(400, 'invalid_word_ids', 'Word ids must be non-empty strings.', field)
  }
  return value.map((wordId) => wordId.trim())
}

function orderWordsOrThrow(wordIds: string[], words: PackWord[]): PackWord[] {
  const byId = new Map(words.map((word) => [word.id, word]))
  const ordered = wordIds.map((wordId) => byId.get(wordId)).filter((word): word is PackWord => Boolean(word))
  if (ordered.length !== wordIds.length) {
    throw new HttpError(404, 'unknown_word', 'One or more word ids are not in the active language pack.', 'wordIds')
  }
  return ordered
}

function formatSentence(words: PackWord[]): string {
  const text = words.map((word) => word.text).join(' ').replace(/\s+/g, ' ').trim()
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1)
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`
}

async function generateSpeech(env: Env, sentence: string, locale: string): Promise<{ audioUrl: string, cached: boolean }> {
  const response = await env.GENERATION_SERVICE.fetch(new Request('https://generation.internal/v1/generation/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sentence, language: locale, provider: 'auto' }),
  }))
  if (!response.ok) throw new HttpError(502, 'tts_generation_failed', 'Could not generate speech audio yet.')
  const body = await response.json() as { data?: { audioUrl?: string }, meta?: { cached?: boolean }, audioUrl?: string, cached?: boolean }
  const audioUrl = body.data?.audioUrl ?? body.audioUrl
  if (!audioUrl) throw new HttpError(502, 'tts_generation_failed', 'Generation service did not return audio.')
  return { audioUrl, cached: body.meta?.cached ?? body.cached ?? false }
}

async function logUsageAggregate(db: D1Database, locale: string, packId: string, words: PackWord[]): Promise<void> {
  const hash = await hashText(`${locale} ${words.map((word) => word.id).join(' ')}`)
  const id = `usage_${hash.slice(0, 24)}`
  await run(db.prepare(`
    INSERT INTO talk_sentence_usage (id, locale, pack_id, pos_sequence_json, word_sequence_hash, word_count, usage_count, first_seen_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(locale, word_sequence_hash) DO UPDATE SET
      usage_count = usage_count + 1,
      last_seen_at = CURRENT_TIMESTAMP
  `).bind(id, locale, packId, JSON.stringify(words.map((word) => word.pos)), hash, words.length))
}

async function persistPhrase(db: D1Database, locale: string, subjectId: string, words: PackWord[], label?: string): Promise<SavedPhrase> {
  const sentence = formatSentence(words)
  const wordIds = words.map((word) => word.id)
  const id = `phrase_${crypto.randomUUID()}`
  await run(db.prepare(`
    INSERT INTO talk_user_phrases (id, subject_id, locale, sentence, word_ids_json, label, is_auto, usage_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(id, subjectId, locale, sentence, JSON.stringify(wordIds), label?.trim() || null))
  return { id, sentence, wordIds, isAuto: false, usageCount: 1, ...(label?.trim() ? { label: label.trim() } : {}) }
}

async function requireSubjectId(request: Request, env: Env, explicitSubjectId?: string | null): Promise<string> {
  const subjectId = await resolveSubjectId(request, env, explicitSubjectId)
  if (!subjectId) throw new HttpError(401, 'identity_required', 'A Tiko identity session is required for saved phrases.', 'Authorization')
  return subjectId
}

async function requireAdmin(request: Request, env: Env): Promise<void> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) throw new HttpError(401, 'identity_required', 'An admin identity session is required.', 'Authorization')
  try {
    const response = await env.IDENTITY_SERVICE.fetch(new Request('https://identity.internal/v1/identity/me', {
      headers: { Authorization: auth },
    }))
    if (!response.ok) throw new HttpError(403, 'admin_required', 'An admin role is required.', 'Authorization')
    const body = await response.json() as { roles?: string[], data?: { roles?: string[] }, subject?: { roles?: string[] } }
    const roles = body.roles ?? body.data?.roles ?? body.subject?.roles ?? []
    if (!roles.includes('admin')) throw new HttpError(403, 'admin_required', 'An admin role is required.', 'Authorization')
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(403, 'admin_required', 'An admin role is required.', 'Authorization')
  }
}

function hashCacheKey(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

async function hashText(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function run(statement: D1PreparedStatement): Promise<D1Result> {
  return await statement.run()
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
