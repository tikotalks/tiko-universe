import type {
  AddUserWordRequest,
  AddUserWordResponse,
  Category,
  DeleteUserWordResponse,
  GrammarRules,
  ListUserWordsResponse,
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
  UserWord,
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
  ATLAS_SERVICE?: ServiceBinding
  ALLOWED_ORIGINS?: string
  TIKO_ENVIRONMENT?: string
  // Optional service key accepted by atlas-api's SERVICE_API_KEYS, used for
  // server-to-server AI prediction calls when no caller session is available.
  ATLAS_API_KEY?: string
}

interface PredictionRow {
  word_id: string
  ai_score: number
  click_count: number
  final_score: number
}

interface LanguagePackRow {
  id: string
  locale: string
  version: number
  grammar_json: string
}

type TransitionMap = Map<string, Map<string, number>>

interface ActivePack extends LanguagePackRow {
  grammar: GrammarRules
  transitions: TransitionMap
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
const COMPLETABLE_POS = new Set(['noun', 'adjective', 'social', 'verb', 'adverb', 'pronoun'])
// Hard cap so word-id lists never exceed D1 bound-parameter limits or KV key limits.
const MAX_SENTENCE_WORDS = 24
const SUGGESTION_LIMIT = 50
// Above this, usage data dominates the AI prior — but never erases it entirely.
const LEARNED_WEIGHT_CAP = 0.8
const LEARNED_CLICK_SATURATION = 200
// Locales whose sentences concatenate without spaces.
const NO_SPACE_LOCALES = new Set(['ja', 'zh'])
// User-added words live under a reserved id prefix so they never collide with
// curated pack ids and can be routed to the per-user table for resolution.
const USER_WORD_PREFIX = 'uword_'
const CUSTOM_WORD_CATEGORY = 'mine'
const CUSTOM_WORD_DEFAULT_FREQUENCY = 6
// A single personal selection outranks the AI's base ordering for that prefix.
const AFFINITY_BOOST = 10_000
const KNOWN_POS = new Set(['pronoun', 'determiner', 'verb', 'noun', 'adjective', 'adverb', 'question', 'preposition', 'conjunction', 'social'])
const MAX_CUSTOM_WORD_LENGTH = 40
const LOCALE_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', nl: 'Dutch', fr: 'French', de: 'German', es: 'Spanish',
  it: 'Italian', pt: 'Portuguese', sv: 'Swedish', no: 'Norwegian', da: 'Danish',
  fi: 'Finnish', pl: 'Polish', tr: 'Turkish', ar: 'Arabic', ja: 'Japanese', zh: 'Chinese',
  ko: 'Korean', mt: 'Maltese', hy: 'Armenian',
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

    if (path === '/v1/sentence/select') {
      if (request.method !== 'POST') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await selectWord(request, env), cors)
    }

    if (path === '/v1/sentence/complete') {
      if (request.method !== 'POST') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await completeSentence(request, env), cors)
    }

    if (path === '/v1/sentence/vocabulary') {
      if (request.method !== 'GET') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await vocabulary(request, env, url), cors)
    }

    if (path === '/v1/sentence/words') {
      if (request.method === 'GET') return withCors(await listUserWords(request, env, url), cors)
      if (request.method === 'POST') return withCors(await addUserWord(request, env), cors)
      return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
    }

    if (path.startsWith('/v1/sentence/words/')) {
      if (request.method !== 'DELETE') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await deleteUserWord(request, env, url, path), cors)
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
  await recalculatePredictionScores(env)
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
      const key = `${from} ${to}`
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
  const curatedWeights = new Map(curatedRows.map((row) => [`${row.from_pos} ${row.to_pos}`, Number(row.weight)]))
  const maxByFrom = new Map<string, number>()
  for (const [key, count] of Array.from(counts.entries())) {
    const [from] = key.split(' ')
    maxByFrom.set(from, Math.max(maxByFrom.get(from) ?? 0, count))
  }

  for (const [key, count] of Array.from(counts.entries())) {
    const [from, to] = key.split(' ')
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
  const [packWords, templates, savedPhrases, userWords] = await Promise.all([
    loadWords(env.DB, pack.id),
    loadTemplates(env.DB, pack.id),
    subjectId ? loadSavedPhrases(env.DB, locale, subjectId) : Promise.resolve([]),
    subjectId ? loadUserWords(env.DB, subjectId, locale) : Promise.resolve<PackWord[]>([]),
  ])

  // The user's own words join the board so they're browsable from the start.
  const words = [...packWords, ...userWords]
  const categories = buildCategories(words)
  const initialWords = words
    .filter((word) => STARTER_POS.includes(word.pos))
    .sort((a, b) => b.frequency - a.frequency || a.text.localeCompare(b.text))
    .slice(0, SUGGESTION_LIMIT)
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
  if (currentWords.length > MAX_SENTENCE_WORDS) {
    throw new HttpError(400, 'too_many_words', `currentWords supports at most ${MAX_SENTENCE_WORDS} words.`, 'currentWords')
  }

  const subjectId = await resolveSubjectId(request, env, body.userId)
  const sequenceHash = await hashText(currentWords.join(','))
  // The global base suggestions are subject-independent (custom-word ids are
  // globally unique, so a sequence containing one is effectively owner-scoped).
  const baseCacheKey = `sentence:next:${locale}:${sequenceHash.slice(0, 32)}`
  let base = await readCache<SentenceNextResponse>(env, baseCacheKey)

  if (!base) {
    const pack = await loadActivePack(env.DB, locale)
    const selectedWords = currentWords.length ? await resolveWords(env, pack.id, subjectId, locale, currentWords) : []
    const selectedById = new Map(selectedWords.map((word) => [word.id, word]))
    const orderedSelected = currentWords.map((wordId) => selectedById.get(wordId)).filter((word): word is PackWord => Boolean(word))
    if (orderedSelected.length !== currentWords.length) {
      throw new HttpError(404, 'unknown_word', 'One or more word ids are not in the active language pack.', 'currentWords')
    }

    const validNext = validNextFor(pack, orderedSelected)
    const sequenceText = joinWords(orderedSelected, locale)

    // Serve stored predictions first; the LLM is consulted once per sequence, ever.
    let suggestions = await loadPredictedWords(env.DB, pack.id, sequenceHash, validNext)
    if (suggestions.length < 10) {
      suggestions = await generateAndStorePredictions(env, pack, locale, sequenceHash, sequenceText, orderedSelected, validNext, atlasAuthHeader(request, env))
    }
    suggestions = suggestions.slice(0, SUGGESTION_LIMIT)

    const stripState: StripState = {
      display: sequenceText,
      validNext,
      canComplete: orderedSelected.length > 0 && COMPLETABLE_POS.has(orderedSelected[orderedSelected.length - 1].pos),
    }

    base = {
      suggestions: suggestions.map(toWordTile),
      categories: buildCategories(suggestions),
      words: groupWords(suggestions),
      stripState,
    }
    await writeCache(env, baseCacheKey, base, NEXT_CACHE_TTL)
  }

  if (subjectId) {
    // Personalized results are not cached: a user's affinity changes as they tap.
    return json(await personalizeNext(env, locale, subjectId, sequenceHash, base))
  }
  return json(base)
}

async function selectWord(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ locale: string, currentWordIds?: unknown, selectedWordId?: unknown, userId?: string }>(request)
  const locale = normalizeLocale(body.locale)
  const currentWordIds = Array.isArray(body.currentWordIds) ? body.currentWordIds.filter((id): id is string => typeof id === 'string') : []
  const selectedWordId = typeof body.selectedWordId === 'string' ? body.selectedWordId.trim() : ''
  if (!selectedWordId) throw new HttpError(400, 'missing_selected_word', 'selectedWordId is required.', 'selectedWordId')
  if (currentWordIds.length > MAX_SENTENCE_WORDS) {
    throw new HttpError(400, 'too_many_words', `currentWordIds supports at most ${MAX_SENTENCE_WORDS} words.`, 'currentWordIds')
  }

  const subjectId = await resolveSubjectId(request, env, body.userId)
  const pack = await loadActivePack(env.DB, locale)
  // The selected word must be a real pack word or one of the caller's own words.
  const known = await resolveWords(env, pack.id, subjectId, locale, [selectedWordId])
  if (known.length === 0) throw new HttpError(404, 'unknown_word', 'selectedWordId is not in the active language pack.', 'selectedWordId')

  const sequenceHash = await hashText(currentWordIds.join(','))
  // Global learning only applies to pack words (custom words have no global row).
  if (!selectedWordId.startsWith(USER_WORD_PREFIX)) {
    await trackWordSelection(env.DB, pack.id, locale, sequenceHash, selectedWordId)
  }
  // Per-user learning applies to every selection, pack or custom.
  if (subjectId) {
    await recordUserAffinity(env.DB, subjectId, locale, sequenceHash, selectedWordId)
  }
  return json({ ok: true })
}


async function completeSentence(request: Request, env: Env): Promise<Response> {
  const body = await readJson<SentenceCompleteRequest>(request)
  const locale = normalizeLocale(body.locale)
  const wordIds = validateWordIds(body.wordIds, 'wordIds')
  const subjectId = await resolveSubjectId(request, env, body.userId)
  const pack = await loadActivePack(env.DB, locale)
  const selectedWords = await resolveWords(env, pack.id, subjectId, locale, wordIds)
  const orderedWords = orderWordsOrThrow(wordIds, selectedWords)
  const sentence = formatSentence(orderedWords, locale)

  await logUsageAggregate(env.DB, locale, pack.id, orderedWords)

  let savedPhraseId: string | undefined
  if (body.autoSave && subjectId) {
    const phrase = await persistPhrase(env.DB, locale, subjectId, orderedWords)
    savedPhraseId = phrase.id
    await invalidatePhraseCaches(env, locale, subjectId)
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

async function vocabulary(request: Request, env: Env, url: URL): Promise<Response> {
  const locale = readLocale(url)
  const category = url.searchParams.get('category')?.trim() || null
  const pos = url.searchParams.get('pos')?.trim() || null
  const query = url.searchParams.get('q')?.trim().toLowerCase() || null
  const subjectId = await resolveSubjectId(request, env, url.searchParams.get('userId'))

  // Only the plain global slice is cacheable; filtered/personalized views are not.
  const canCache = !query && !subjectId
  const cacheKey = `sentence:vocabulary:${locale}:${category ?? 'all'}:${pos ?? 'all'}`
  if (canCache) {
    const cached = await readCache<SentenceVocabularyResponse>(env, cacheKey)
    if (cached) return json(cached)
  }

  const pack = await loadActivePack(env.DB, locale)
  let words = await loadVocabularyWords(env.DB, pack.id, category, pos)

  if (subjectId) {
    const userWords = (await loadUserWords(env.DB, subjectId, locale))
      .filter((word) => (!category || word.category === category) && (!pos || word.pos === pos))
    words = [...words, ...userWords]
  }

  if (query) {
    words = words.filter((word) => word.text.toLowerCase().includes(query))
  }

  const response: SentenceVocabularyResponse = {
    words: words.map(toWordTile),
    categories: buildCategories(words),
    totalWords: words.length,
  }
  if (canCache) await writeCache(env, cacheKey, response, 21600)
  return json(response)
}

async function listUserWords(request: Request, env: Env, url: URL): Promise<Response> {
  const locale = readLocale(url)
  const subjectId = await requireSubjectId(request, env, url.searchParams.get('userId'))
  const rows = await all<UserWordRow>(env.DB.prepare(`
    SELECT id, text, pos, category, icon, usage_count
    FROM talk_user_words
    WHERE subject_id = ? AND locale = ?
    ORDER BY usage_count DESC, updated_at DESC
  `).bind(subjectId, locale))
  const response: ListUserWordsResponse = { words: rows.map(toUserWord) }
  return json(response)
}

async function addUserWord(request: Request, env: Env): Promise<Response> {
  const body = await readJson<AddUserWordRequest>(request)
  const locale = normalizeLocale(body.locale)
  const subjectId = await requireSubjectId(request, env, body.userId)

  const text = typeof body.text === 'string' ? body.text.trim().replace(/\s+/g, ' ') : ''
  if (!text) throw new HttpError(400, 'missing_text', 'Word text is required.', 'text')
  if (text.length > MAX_CUSTOM_WORD_LENGTH) throw new HttpError(400, 'text_too_long', `Word text must be at most ${MAX_CUSTOM_WORD_LENGTH} characters.`, 'text')
  const pos = typeof body.pos === 'string' && KNOWN_POS.has(body.pos) ? body.pos : 'noun'
  const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim().toLowerCase() : CUSTOM_WORD_CATEGORY
  const icon = typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim() : null
  const normalized = text.toLowerCase()

  const existing = await first<UserWordRow>(env.DB.prepare(`
    SELECT id, text, pos, category, icon, usage_count
    FROM talk_user_words
    WHERE subject_id = ? AND locale = ? AND normalized_text = ?
  `).bind(subjectId, locale, normalized))

  let word: UserWord
  if (existing) {
    // Re-adding an existing word bumps usage and refreshes its display text.
    await run(env.DB.prepare(`
      UPDATE talk_user_words
      SET usage_count = usage_count + 1, text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(text, existing.id))
    word = toUserWord({ ...existing, text, usage_count: Number(existing.usage_count) + 1 })
  } else {
    const id = `${USER_WORD_PREFIX}${crypto.randomUUID()}`
    await run(env.DB.prepare(`
      INSERT INTO talk_user_words (id, subject_id, locale, text, normalized_text, pos, category, icon, usage_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(id, subjectId, locale, text, normalized, pos, category, icon))
    word = { id, text, pos, category, usageCount: 1, ...(icon ? { icon } : {}) }
  }

  // Learn the word for the position it was added at, so it surfaces next time the
  // same prefix is built (the "My name is" -> "Sil" case).
  if (Array.isArray(body.afterWordIds)) {
    const context = body.afterWordIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (context.length <= MAX_SENTENCE_WORDS) {
      const sequenceHash = await hashText(context.join(','))
      await recordUserAffinity(env.DB, subjectId, locale, sequenceHash, word.id)
    }
  }

  // Custom words appear on the start board, so its per-user cache must drop.
  await env.CACHE.delete(`sentence:start:${locale}:${subjectId}`)
  const response: AddUserWordResponse = { word }
  return json(response, 201)
}

async function deleteUserWord(request: Request, env: Env, url: URL, path: string): Promise<Response> {
  const wordId = decodeURIComponent(path.replace('/v1/sentence/words/', ''))
  if (!wordId) throw new HttpError(400, 'missing_word_id', 'Word id is required.', 'wordId')
  const locale = readLocale(url)
  const subjectId = await requireSubjectId(request, env, url.searchParams.get('userId'))

  const result = await run(env.DB.prepare(`
    DELETE FROM talk_user_words
    WHERE id = ? AND subject_id = ? AND locale = ?
  `).bind(wordId, subjectId, locale))
  const changes = Number((result.meta as { changes?: number } | undefined)?.changes ?? NaN)
  if (changes === 0) {
    throw new HttpError(404, 'word_not_found', 'No custom word with this id exists for this user.', 'wordId')
  }
  // Remove the word's per-user learning so it stops being suggested.
  await run(env.DB.prepare(`
    DELETE FROM talk_user_affinity WHERE subject_id = ? AND word_id = ?
  `).bind(subjectId, wordId))
  await env.CACHE.delete(`sentence:start:${locale}:${subjectId}`)

  const response: DeleteUserWordResponse = { deleted: true }
  return json(response)
}

async function listPhrases(request: Request, env: Env, url: URL): Promise<Response> {
  const locale = readLocale(url)
  const subjectId = await requireSubjectId(request, env, url.searchParams.get('userId'))
  const cacheKey = `sentence:phrases:${locale}:${await subjectCacheKey(subjectId)}`
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
  const words = await resolveWords(env, pack.id, subjectId, locale, wordIds)
  const phrase = await persistPhrase(env.DB, locale, subjectId, orderWordsOrThrow(wordIds, words), body.label)
  await invalidatePhraseCaches(env, locale, subjectId)
  const response: SaveSentencePhraseResponse = { phrase }
  return json(response, 201)
}

async function deletePhrase(request: Request, env: Env, url: URL, path: string): Promise<Response> {
  const phraseId = decodeURIComponent(path.replace('/v1/sentence/phrases/', ''))
  if (!phraseId) throw new HttpError(400, 'missing_phrase_id', 'Phrase id is required.', 'phraseId')
  const locale = readLocale(url)
  const subjectId = await requireSubjectId(request, env, url.searchParams.get('userId'))
  const result = await run(env.DB.prepare(`
    DELETE FROM talk_user_phrases
    WHERE id = ? AND subject_id = ? AND locale = ?
  `).bind(phraseId, subjectId, locale))
  const changes = Number((result.meta as { changes?: number } | undefined)?.changes ?? NaN)
  if (changes === 0) {
    throw new HttpError(404, 'phrase_not_found', 'No phrase with this id exists for this user.', 'phraseId')
  }
  await invalidatePhraseCaches(env, locale, subjectId)
  const response: DeleteSentencePhraseResponse = { deleted: true }
  return json(response)
}

async function invalidatePhraseCaches(env: Env, locale: string, subjectId: string): Promise<void> {
  // The start payload embeds savedPhrases, so it must drop together with them.
  await Promise.all([
    env.CACHE.delete(`sentence:phrases:${locale}:${await subjectCacheKey(subjectId)}`),
    env.CACHE.delete(`sentence:start:${locale}:${subjectId}`),
  ])
}

async function loadActivePack(db: D1Database, locale: string): Promise<ActivePack> {
  const row = await first<LanguagePackRow>(db.prepare(`
    SELECT id, locale, version, grammar_json
    FROM talk_language_packs
    WHERE locale = ? AND status = 'active'
    ORDER BY version DESC
    LIMIT 1
  `).bind(locale))

  if (!row) throw new HttpError(404, 'language_pack_not_found', 'No active language pack exists for this locale.', 'locale')

  const transitionRows = await all<{ from_pos: string, to_pos: string, weight: number, source: string }>(db.prepare(`
    SELECT from_pos, to_pos, weight, source
    FROM talk_transitions
    WHERE pack_id = ?
  `).bind(row.id))

  // Learned weights override curated ones for the same edge: curated is the
  // starting prior; the nightly cron folds real usage into 'learned' rows.
  const transitions: TransitionMap = new Map()
  for (const source of ['curated', 'generated', 'learned']) {
    for (const transition of transitionRows) {
      if (transition.source !== source) continue
      const fromMap = transitions.get(transition.from_pos) ?? new Map<string, number>()
      fromMap.set(transition.to_pos, Number(transition.weight))
      transitions.set(transition.from_pos, fromMap)
    }
  }

  return { ...row, grammar: parseJson<GrammarRules>(row.grammar_json, 'grammar_json'), transitions }
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

function rankSuggestions(words: PackWord[], posTypes: string[], _selected: PackWord[]): PackWord[] {
  const posRank = new Map(posTypes.map((pos, index) => [pos, index]))
  return [...words].sort((a, b) =>
    (posRank.get(a.pos) ?? 99) - (posRank.get(b.pos) ?? 99)
    || b.frequency - a.frequency
    || a.text.localeCompare(b.text),
  )
}

async function loadPredictedWords(db: D1Database, packId: string, sequenceHash: string, validNext: string[]): Promise<PackWord[]> {
  try {
    const rows = await all<WordRow & { final_score: number }>(db.prepare(`
      SELECT w.id, w.text, w.pos, w.category, w.icon, w.image, w.frequency, w.inflections_json,
             p.final_score
      FROM talk_word_predictions p
      JOIN talk_word_inventory w ON w.id = p.word_id AND w.pack_id = p.pack_id
      WHERE p.pack_id = ? AND p.sequence_hash = ?
      ORDER BY p.final_score DESC
      LIMIT 200
    `).bind(packId, sequenceHash))

    const validPosSet = new Set(validNext)
    return rows
      .filter((row) => validPosSet.size === 0 || validPosSet.has(row.pos))
      .slice(0, SUGGESTION_LIMIT)
      .map((row) => toPackWord(row))
  } catch {
    return []
  }
}

async function generateAndStorePredictions(
  env: Env,
  pack: ActivePack,
  locale: string,
  sequenceHash: string,
  sequenceText: string,
  orderedSelected: PackWord[],
  validNext: string[],
  atlasAuth: string | null,
): Promise<PackWord[]> {
  const candidatePosTypes = validNext.length ? validNext : STARTER_POS
  const candidateWords = await loadSuggestedWords(env.DB, pack.id, candidatePosTypes)

  const aiPredictions = await fetchAiPredictions(env, candidateWords, sequenceText, locale, atlasAuth)

  if (aiPredictions && aiPredictions.length > 0) {
    const wordMap = new Map(candidateWords.map((w) => [w.id, w]))
    const scored: Array<{ word: PackWord, score: number }> = []
    const aiWordIds = new Set<string>()

    for (const { wordId, probability } of aiPredictions) {
      const word = wordMap.get(wordId)
      if (!word) continue
      aiWordIds.add(wordId)
      scored.push({ word, score: Math.max(0, Math.min(1, probability)) })
    }
    // Fill in any valid words the AI didn't mention with a minimal score
    for (const word of candidateWords) {
      if (!aiWordIds.has(word.id)) scored.push({ word, score: 0.01 })
    }
    scored.sort((a, b) => b.score - a.score)

    await storePredictions(env.DB, pack.id, locale, sequenceHash, sequenceText,
      scored.map((s) => ({ wordId: s.word.id, probability: s.score })))

    return scored.slice(0, SUGGESTION_LIMIT).map((s) => s.word)
  }

  // AI unavailable — store grammar-ranked order with descending scores
  const fallback = rankSuggestions(candidateWords, validNext, orderedSelected)
  const count = fallback.length
  await storePredictions(env.DB, pack.id, locale, sequenceHash, sequenceText,
    fallback.map((w, i) => ({ wordId: w.id, probability: Math.max(0.01, 1 - i / count) })))

  return fallback.slice(0, SUGGESTION_LIMIT)
}

// Atlas capability routes require a Bearer credential. Prefer a configured
// server-to-server service key; otherwise forward the caller's session token.
function atlasAuthHeader(request: Request, env: Env): string | null {
  if (env.ATLAS_API_KEY) return `Bearer ${env.ATLAS_API_KEY}`
  return request.headers.get('Authorization')
}

async function fetchAiPredictions(
  env: Env,
  candidateWords: PackWord[],
  sequenceText: string,
  locale: string,
  atlasAuth: string | null,
): Promise<Array<{ wordId: string, probability: number }> | null> {
  if (!env.ATLAS_SERVICE || !atlasAuth) return null

  const language = LOCALE_LANGUAGE_NAMES[locale.split('-')[0].toLowerCase()] ?? locale
  const context = sequenceText.trim() ? `"${sequenceText}"` : 'the start of a sentence'
  const candidates = candidateWords.slice(0, 120)
  const target = Math.min(SUGGESTION_LIMIT, candidates.length)
  const wordList = candidates.map((w) => `${w.id}|${w.text}|${w.pos}`).join('\n')

  const prompt = `You are an AAC (Augmentative and Alternative Communication) vocabulary assistant for children.

Language: ${language}
Sentence so far: ${context}

From the vocabulary list below, select the ${target} most likely next words a child would say in ${language} to continue their sentence, most likely first. Assign each a probability from 0.0 to 1.0 (1.0 = almost certain next word).

Vocabulary (id|text|part-of-speech):
${wordList}

Return ONLY a JSON array of [wordId, probability] pairs with exactly ${target} entries, no explanation, no markdown:
[["id-here",0.95],["id-2",0.9]]`

  try {
    const response = await env.ATLAS_SERVICE.fetch(new Request('https://atlas.internal/v1/atlas/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: atlasAuth },
      body: JSON.stringify({
        input: prompt,
        app: 'talk',
        purpose: 'word-prediction',
        provider: 'openai',
        outputFormat: 'json',
        temperature: 0.2,
        maxTokens: 3000,
      }),
    }))

    if (!response.ok) return null
    const result = await response.json() as { data?: { output?: string } }
    const rawText = (result.data?.output ?? '').trim()
    const entries = parsePredictionEntries(rawText)
    return entries.length > 0 ? entries : null
  } catch {
    return null
  }
}

function parsePredictionEntries(rawText: string): Array<{ wordId: string, probability: number }> {
  const entries: Array<{ wordId: string, probability: number }> = []
  const push = (wordId: unknown, probability: unknown) => {
    if (typeof wordId === 'string' && typeof probability === 'number' && Number.isFinite(probability)) {
      entries.push({ wordId, probability })
    }
  }

  const match = rawText.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as unknown
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (Array.isArray(item)) push(item[0], item[1])
          else if (item && typeof item === 'object') push((item as Record<string, unknown>).wordId, (item as Record<string, unknown>).probability)
        }
        return entries
      }
    } catch {
      // Fall through to truncation salvage below.
    }
  }

  // The model response may be truncated mid-array; salvage every complete pair
  // so a long answer still yields usable (already paid-for) predictions.
  for (const pair of rawText.matchAll(/\[\s*"([^"\\]+)"\s*,\s*([0-9]*\.?[0-9]+)\s*\]/g)) {
    push(pair[1], Number(pair[2]))
  }
  return entries
}

async function storePredictions(
  db: D1Database,
  packId: string,
  locale: string,
  sequenceHash: string,
  sequenceText: string,
  predictions: Array<{ wordId: string, probability: number }>,
): Promise<void> {
  // 8 bound params per row; chunks stay well under D1's statement parameter limit.
  const ROWS_PER_STATEMENT = 12
  for (let offset = 0; offset < predictions.length; offset += ROWS_PER_STATEMENT) {
    const chunk = predictions.slice(offset, offset + ROWS_PER_STATEMENT)
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values: D1Value[] = []
    for (const { wordId, probability } of chunk) {
      values.push(`pred:${packId}:${sequenceHash.slice(0, 16)}:${wordId}`, packId, locale, sequenceHash, sequenceText, wordId, probability, probability)
    }
    try {
      await run(db.prepare(`
        INSERT INTO talk_word_predictions
          (id, pack_id, locale, sequence_hash, sequence_text, word_id, ai_score, final_score)
        VALUES ${placeholders}
        ON CONFLICT(pack_id, sequence_hash, word_id) DO NOTHING
      `).bind(...values))
    } catch {
      // Ignore chunk insert failures (e.g. FK constraints); suggestions are still served from memory.
    }
  }
}

async function trackWordSelection(db: D1Database, packId: string, locale: string, sequenceHash: string, wordId: string): Promise<void> {
  try {
    // Upsert so selections made outside the predicted set (vocabulary browser)
    // still become learning signal instead of being dropped.
    await run(db.prepare(`
      INSERT INTO talk_word_predictions
        (id, pack_id, locale, sequence_hash, sequence_text, word_id, ai_score, click_count, final_score)
      VALUES (?, ?, ?, ?, '', ?, 0.01, 1, 0.01)
      ON CONFLICT(pack_id, sequence_hash, word_id) DO UPDATE SET
        click_count = click_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `).bind(`pred:${packId}:${sequenceHash.slice(0, 16)}:${wordId}`, packId, locale, sequenceHash, wordId))
  } catch {
    // Click tracking is best-effort
  }
}

async function recalculatePredictionScores(env: Env): Promise<void> {
  const sequences = await all<{ pack_id: string, locale: string, sequence_hash: string, total_clicks: number }>(env.DB.prepare(`
    SELECT pack_id, locale, sequence_hash, SUM(click_count) as total_clicks
    FROM talk_word_predictions
    WHERE click_count > 0
    GROUP BY pack_id, locale, sequence_hash
  `))

  const touchedLocales = new Set<string>()
  for (const { pack_id, locale, sequence_hash, total_clicks } of sequences) {
    if (!total_clicks) continue

    const predictions = await all<PredictionRow>(env.DB.prepare(`
      SELECT word_id, ai_score, click_count, final_score
      FROM talk_word_predictions
      WHERE pack_id = ? AND sequence_hash = ?
    `).bind(pack_id, sequence_hash))

    // Learned weight grows with clicks but is capped: usage dominates while the
    // AI prior never fully disappears (also limits ranking-poisoning blast radius).
    const learnedWeight = Math.min(LEARNED_WEIGHT_CAP, total_clicks / LEARNED_CLICK_SATURATION)
    const maxClicks = Math.max(1, ...predictions.map((p) => p.click_count))

    for (const pred of predictions) {
      const learnedScore = pred.click_count / maxClicks
      const finalScore = Number((pred.ai_score * (1 - learnedWeight) + learnedScore * learnedWeight).toFixed(4))
      await run(env.DB.prepare(`
        UPDATE talk_word_predictions
        SET final_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE pack_id = ? AND sequence_hash = ? AND word_id = ?
      `).bind(finalScore, pack_id, sequence_hash, pred.word_id))
    }

    touchedLocales.add(locale)
  }

  for (const locale of Array.from(touchedLocales)) {
    await deleteCachePrefix(env.CACHE, `sentence:next:${locale}:`)
  }
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
    ...(word.id.startsWith(USER_WORD_PREFIX) ? { isCustom: true } : {}),
  }
}

interface UserWordRow {
  id: string
  text: string
  pos: string
  category: string
  icon: string | null
  usage_count: number
}

function userWordToPackWord(row: UserWordRow): PackWord {
  return {
    id: row.id,
    text: row.text,
    pos: row.pos,
    category: row.category,
    frequency: CUSTOM_WORD_DEFAULT_FREQUENCY,
    ...(row.icon ? { icon: row.icon } : {}),
  }
}

function toUserWord(row: UserWordRow): UserWord {
  return {
    id: row.id,
    text: row.text,
    pos: row.pos,
    category: row.category,
    usageCount: Number(row.usage_count),
    ...(row.icon ? { icon: row.icon } : {}),
  }
}

async function loadUserWords(db: D1Database, subjectId: string, locale: string, posFilter?: string[]): Promise<PackWord[]> {
  const rows = await all<UserWordRow>(db.prepare(`
    SELECT id, text, pos, category, icon, usage_count
    FROM talk_user_words
    WHERE subject_id = ? AND locale = ?
    ORDER BY usage_count DESC, updated_at DESC
  `).bind(subjectId, locale))
  const allowed = posFilter && posFilter.length ? new Set(posFilter) : null
  return rows
    .filter((row) => !allowed || allowed.has(row.pos))
    .map(userWordToPackWord)
}

async function loadUserWordsByIds(db: D1Database, subjectId: string, locale: string, ids: string[]): Promise<PackWord[]> {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(', ')
  const rows = await all<UserWordRow>(db.prepare(`
    SELECT id, text, pos, category, icon, usage_count
    FROM talk_user_words
    WHERE subject_id = ? AND locale = ? AND id IN (${placeholders})
  `).bind(subjectId, locale, ...ids))
  return rows.map(userWordToPackWord)
}

// Resolves a mix of curated pack ids and user-word ids (uword_*) to PackWords.
// User-word ids only resolve for the owning subject, so another user's id never
// loads — the caller then sees an unknown_word error, which is the IDOR guard.
async function resolveWords(env: Env, packId: string, subjectId: string | null, locale: string, ids: string[]): Promise<PackWord[]> {
  const packIds = ids.filter((id) => !id.startsWith(USER_WORD_PREFIX))
  const userIds = ids.filter((id) => id.startsWith(USER_WORD_PREFIX))
  const [packWords, userWords] = await Promise.all([
    packIds.length ? loadWordsByIds(env.DB, packId, packIds) : Promise.resolve<PackWord[]>([]),
    userIds.length && subjectId ? loadUserWordsByIds(env.DB, subjectId, locale, userIds) : Promise.resolve<PackWord[]>([]),
  ])
  return [...packWords, ...userWords]
}

async function loadUserAffinity(db: D1Database, subjectId: string, sequenceHash: string): Promise<Map<string, number>> {
  const rows = await all<{ word_id: string, click_count: number }>(db.prepare(`
    SELECT word_id, click_count
    FROM talk_user_affinity
    WHERE subject_id = ? AND sequence_hash = ?
  `).bind(subjectId, sequenceHash))
  return new Map(rows.map((row) => [row.word_id, Number(row.click_count)]))
}

async function recordUserAffinity(db: D1Database, subjectId: string, locale: string, sequenceHash: string, wordId: string): Promise<void> {
  try {
    await run(db.prepare(`
      INSERT INTO talk_user_affinity (subject_id, locale, sequence_hash, word_id, click_count, updated_at)
      VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(subject_id, sequence_hash, word_id) DO UPDATE SET
        click_count = click_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `).bind(subjectId, locale, sequenceHash, wordId))
  } catch {
    // Per-user learning is best-effort and must never break a child's request.
  }
}

function categoriesFromTiles(tiles: WordTile[]): Category[] {
  const categories = new Map<string, { posTypes: Set<string>, wordCount: number }>()
  for (const tile of tiles) {
    const category = categories.get(tile.category) ?? { posTypes: new Set<string>(), wordCount: 0 }
    category.posTypes.add(tile.pos)
    category.wordCount += 1
    categories.set(tile.category, category)
  }
  return Array.from(categories.entries()).map(([id, value]) => ({
    id,
    label: titleCase(id),
    posTypes: Array.from(value.posTypes).sort(),
    wordCount: value.wordCount,
  })).sort((a, b) => a.label.localeCompare(b.label))
}

function groupTiles(tiles: WordTile[]): Record<string, WordTile[]> {
  return tiles.reduce<Record<string, WordTile[]>>((grouped, tile) => {
    grouped[tile.category] = grouped[tile.category] ?? []
    grouped[tile.category].push(tile)
    return grouped
  }, {})
}

// Overlays a subject's own vocabulary and click history onto the global base
// suggestions: custom words become visible, and words the user has personally
// picked after this exact prefix rise to the top (e.g. "My name is" -> "Sil").
async function personalizeNext(
  env: Env,
  locale: string,
  subjectId: string,
  sequenceHash: string,
  base: SentenceNextResponse,
): Promise<SentenceNextResponse> {
  const validNext = base.stripState.validNext
  const [userWords, affinity] = await Promise.all([
    loadUserWords(env.DB, subjectId, locale, validNext),
    loadUserAffinity(env.DB, subjectId, sequenceHash),
  ])
  if (userWords.length === 0 && affinity.size === 0) return base

  const scored = new Map<string, { tile: WordTile, score: number }>()
  base.suggestions.forEach((tile, index) => scored.set(tile.id, { tile, score: base.suggestions.length - index }))

  // Custom words that aren't already suggested appear mid-list so they're findable.
  const midScore = Math.ceil(base.suggestions.length / 2)
  for (const word of userWords) {
    if (!scored.has(word.id)) scored.set(word.id, { tile: toWordTile(word), score: midScore })
  }

  // Pull in any favored word that the global top list didn't include.
  const missing = Array.from(affinity.keys()).filter((id) => !scored.has(id))
  if (missing.length > 0) {
    const validPos = new Set(validNext)
    const missingUserIds = missing.filter((id) => id.startsWith(USER_WORD_PREFIX))
    const missingPackIds = missing.filter((id) => !id.startsWith(USER_WORD_PREFIX))
    const [extraUser, extraPack] = await Promise.all([
      missingUserIds.length ? loadUserWordsByIds(env.DB, subjectId, locale, missingUserIds) : Promise.resolve<PackWord[]>([]),
      missingPackIds.length ? loadWordsByIds(env.DB, await loadActivePackId(env.DB, locale), missingPackIds) : Promise.resolve<PackWord[]>([]),
    ])
    for (const word of [...extraUser, ...extraPack]) {
      if ((validPos.size === 0 || validPos.has(word.pos)) && !scored.has(word.id)) {
        scored.set(word.id, { tile: toWordTile(word), score: midScore })
      }
    }
  }

  for (const [wordId, clicks] of affinity) {
    const entry = scored.get(wordId)
    if (entry) entry.score += clicks * AFFINITY_BOOST
  }

  const merged = Array.from(scored.values())
    .sort((a, b) => b.score - a.score || a.tile.text.localeCompare(b.tile.text))
    .slice(0, SUGGESTION_LIMIT)
    .map((entry) => entry.tile)

  return {
    suggestions: merged,
    categories: categoriesFromTiles(merged),
    words: groupTiles(merged),
    stripState: base.stripState,
  }
}

async function loadActivePackId(db: D1Database, locale: string): Promise<string> {
  const row = await first<{ id: string }>(db.prepare(`
    SELECT id FROM talk_language_packs
    WHERE locale = ? AND status = 'active'
    ORDER BY version DESC
    LIMIT 1
  `).bind(locale))
  if (!row) throw new HttpError(404, 'language_pack_not_found', 'No active language pack exists for this locale.', 'locale')
  return row.id
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

function validNextFor(pack: ActivePack, selected: PackWord[]): string[] {
  if (selected.length === 0) return STARTER_POS
  const last = selected[selected.length - 1]
  const valid = pack.grammar.validTransitions[last.pos] ?? []
  // Grammar defines validity; transition weights (curated prior, overridden by
  // nightly learned weights) define the order suggestions are ranked in.
  const weights = pack.transitions.get(last.pos)
  if (!weights || weights.size === 0) return valid
  return [...valid].sort((a, b) => (weights.get(b) ?? 0) - (weights.get(a) ?? 0))
}


function validateWordIds(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, 'missing_word_ids', 'At least one word id is required.', field)
  }
  if (value.some((wordId) => typeof wordId !== 'string' || !wordId.trim())) {
    throw new HttpError(400, 'invalid_word_ids', 'Word ids must be non-empty strings.', field)
  }
  if (value.length > MAX_SENTENCE_WORDS) {
    throw new HttpError(400, 'too_many_words', `${field} supports at most ${MAX_SENTENCE_WORDS} words.`, field)
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

function joinWords(words: PackWord[], locale: string): string {
  const base = locale.split('-')[0].toLowerCase()
  if (NO_SPACE_LOCALES.has(base)) return words.map((word) => word.text).join('')
  return words.map((word) => word.text).join(' ').replace(/\s+/g, ' ').trim()
}

function formatSentence(words: PackWord[], locale: string): string {
  const base = locale.split('-')[0].toLowerCase()
  const text = joinWords(words, locale)
  if (NO_SPACE_LOCALES.has(base)) {
    return /[。！？.!?]$/.test(text) ? text : `${text}。`
  }
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
  const hash = await hashText(`${locale} ${words.map((word) => word.id).join(' ')}`)
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
  const sentence = formatSentence(words, locale)
  const wordIds = words.map((word) => word.id)
  const trimmedLabel = label?.trim() || null

  // Saving the same sentence again bumps its usage instead of duplicating rows,
  // so repeated auto-saves rank favorites up rather than flooding the list.
  const existing = await first<{ id: string, is_auto: number, usage_count: number, label: string | null }>(db.prepare(`
    SELECT id, is_auto, usage_count, label
    FROM talk_user_phrases
    WHERE subject_id = ? AND locale = ? AND sentence = ?
  `).bind(subjectId, locale, sentence))

  if (existing) {
    await run(db.prepare(`
      UPDATE talk_user_phrases
      SET usage_count = usage_count + 1, label = COALESCE(?, label), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(trimmedLabel, existing.id))
    const finalLabel = trimmedLabel ?? existing.label
    return {
      id: existing.id,
      sentence,
      wordIds,
      isAuto: existing.is_auto === 1,
      usageCount: Number(existing.usage_count) + 1,
      ...(finalLabel ? { label: finalLabel } : {}),
    }
  }

  const id = `phrase_${crypto.randomUUID()}`
  await run(db.prepare(`
    INSERT INTO talk_user_phrases (id, subject_id, locale, sentence, word_ids_json, label, is_auto, usage_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(id, subjectId, locale, sentence, JSON.stringify(wordIds), trimmedLabel))
  return { id, sentence, wordIds, isAuto: false, usageCount: 1, ...(trimmedLabel ? { label: trimmedLabel } : {}) }
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

async function subjectCacheKey(subjectId: string): Promise<string> {
  return (await hashText(subjectId)).slice(0, 32)
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
  const explicit = explicitSubjectId?.trim() || null
  const auth = request.headers.get('Authorization')
  // Subjects come from the session only. An explicit userId is never trusted on
  // its own (IDOR guard) — without a session the request continues anonymous,
  // because Talk must not have a login wall.
  if (!auth?.startsWith('Bearer ')) return null

  try {
    const response = await env.IDENTITY_SERVICE.fetch(new Request('https://identity.internal/v1/identity/me', {
      headers: { Authorization: auth },
    }))
    if (!response.ok) return null
    const body = await response.json() as { subject?: { id?: string }, data?: { userId?: string, subjectId?: string } }
    const sessionSubject = body.subject?.id ?? body.data?.subjectId ?? body.data?.userId ?? null
    if (explicit && sessionSubject && explicit !== sessionSubject) {
      throw new HttpError(403, 'subject_mismatch', 'userId does not match the authenticated session.', 'userId')
    }
    return sessionSubject
  } catch (error) {
    if (error instanceof HttpError) throw error
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
