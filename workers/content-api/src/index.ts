// Tiko content-api — D1-backed published content read model.
// Public reads only for now; admin mutations belong in admin-api.
import { authenticate, type AuthEnv } from '../../shared/auth'

interface Env extends AuthEnv {
  CONTENT_DB: D1Database
  CONTENT_CACHE?: KVNamespace
  USER_IMAGES?: R2Bucket
  ALLOWED_ORIGINS?: string
  APP_API_URL?: string
  IDENTITY_API_URL?: string
  MEDIA_API_URL?: string
  TRANSLATIONS_API_URL?: string
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  run(): Promise<{ success: boolean }>
}

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>
  put(key: string, value: ArrayBuffer | ReadableStream | Blob, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<R2Object>
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream
  arrayBuffer(): Promise<ArrayBuffer>
}

interface R2Object {
  key: string
  size: number
  httpMetadata?: { contentType?: string; cacheControl?: string }
}

type JsonRecord = Record<string, unknown>
type QueryMethod =
  | 'getProjects'
  | 'getProject'
  | 'getProjectBySlug'
  | 'getPages'
  | 'getPage'
  | 'getPageBySlug'
  | 'getPageWithFullContent'
  | 'getLanguages'
  | 'getItems'
  | 'getItem'
  | 'getItemBySlug'

interface ContentQuery {
  method?: QueryMethod
  params?: JsonRecord
}

interface CardTile {
  id: string
  title: string
  speech: string
  color: string
  order: number
  imageRef?: string
}

interface CardCollection {
  id: string
  title: string
  color: string
  order: number
  mediaCategories: string[]
  imageRef?: string
  parentID?: string | null
  cards: CardTile[]
}

const TIKO_COLOR_NAMES = new Set(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'beige', 'cyan', 'teal', 'navy', 'lime', 'magenta', 'maroon', 'gold', 'silver'])
const DEFAULT_ALLOWED_ORIGINS = [
  'https://tiko.mt',
  'https://www.tiko.mt',
  'https://tiko.tikoapps.org',
  'https://cards.tikoapps.org',
  'https://sequence.tikoapps.org',
  'https://type.tikoapps.org',
  'https://timer.tikoapps.org',
  'https://admin.tikoapps.org',
  'https://dev.tiko.tikoapps.org',
  'https://dev.cards.tikoapps.org',
  'https://dev.sequence.tikoapps.org',
  'https://dev.type.tikoapps.org',
  'https://dev.timer.tikoapps.org',
  'https://dev.admin.tikoapps.org',
  'http://localhost:5173',
  'http://localhost:4173',
]

const CACHE_TTL_SECONDS = 300
const CACHE_KEY_CARDS_COLLECTIONS = 'cards:collections'
const CACHE_KEY_YES_NO_CONTENT = 'yes-no:content'
const CACHE_KEY_SEQUENCE_CONTENT = 'sequence:content'
const CACHE_VERSION_PREFIX = 'content-cache-version'

async function invalidateCardsCache(env: Env): Promise<void> {
  await invalidateCacheNamespace(env, CACHE_KEY_CARDS_COLLECTIONS)
}

async function invalidateYesNoCache(env: Env): Promise<void> {
  await invalidateCacheNamespace(env, CACHE_KEY_YES_NO_CONTENT)
}

async function invalidateSequenceCache(env: Env): Promise<void> {
  await invalidateCacheNamespace(env, CACHE_KEY_SEQUENCE_CONTENT)
}

async function invalidateCacheNamespace(env: Env, namespace: string): Promise<void> {
  if (!env.CONTENT_CACHE) return
  await env.CONTENT_CACHE.put(cacheVersionKey(namespace), `${Date.now()}-${crypto.randomUUID()}`)
}

function cacheVersionKey(namespace: string): string {
  return `${CACHE_VERSION_PREFIX}:${namespace}`
}

interface UserImageRow {
  id: string
  r2_key: string
  content_type: string
  file_size_bytes: number | null
  width: number | null
  height: number | null
  uploaded_by: string | null
}

async function resolveImageRef(imageRef: string | null | undefined, env: Env): Promise<string | null> {
  if (!imageRef) return null
  const row = await env.CONTENT_DB.prepare('SELECT id, r2_key FROM user_images WHERE id = ?').bind(imageRef).first<{ id: string; r2_key: string }>()
  if (row) return `/v1/content/images/${row.id}`
  const mediaBase = (env.MEDIA_API_URL ?? 'https://media.tikoapi.org/v1').replace(/\/$/, '')
  const mediaResp = await fetch(`${mediaBase}/media/${encodeURIComponent(imageRef)}`, { headers: { Accept: 'application/json' } })
  if (mediaResp.ok) {
    const body = await mediaResp.json() as { original_url?: string }
    return body.original_url ?? null
  }
  return null
}

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  if (origin && allowedOrigins(env).includes(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

function json(request: Request, env: Env, body: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request, env),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
      ...extraHeaders,
    },
  })
}

function error(request: Request, env: Env, code: string, message: string, status: number): Response {
  return json(request, env, { success: false, error: { code, message } }, status)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asImageRef(value: unknown): string | undefined {
  const ref = asString(value)
  if (!ref || /^https?:\/\//i.test(ref)) return undefined
  return ref
}

function asImageRefs(value: unknown): string[] {
  return parseStringArray(value).filter(ref => !/^https?:\/\//i.test(ref))
}

function asLimit(value: unknown, fallback = 50): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 1), 100) : fallback
}

function searchParamsToObject(searchParams: URLSearchParams): JsonRecord {
  const params: JsonRecord = {}
  searchParams.forEach((value, key) => { params[key] = value })
  return params
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseStringArray(value: unknown): string[] {
  return parseJsonArray(value)
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim())
}

function normalizeLanguage(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase().replace('_', '-')
  if (!normalized) return undefined
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalized) ? normalized : undefined
}

function languageFromAcceptLanguage(header: string | null): string | undefined {
  return normalizeLanguage(header?.split(',')[0]?.split(';')[0])
}

function languageFromRequest(request: Request): string | undefined {
  const url = new URL(request.url)
  return normalizeLanguage(url.searchParams.get('language') ?? url.searchParams.get('locale') ?? url.searchParams.get('lang'))
    ?? languageFromAcceptLanguage(request.headers.get('Accept-Language'))
}

async function languageFromUserSettings(env: Env, appId: string, sessionToken: string | undefined): Promise<string | undefined> {
  if (!sessionToken || !env.APP_API_URL) return undefined
  try {
    const appBase = env.APP_API_URL.replace(/\/$/, '')
    const resp = await fetch(`${appBase}/v1/apps/${encodeURIComponent(appId)}/settings`, {
      headers: { Authorization: `Bearer ${sessionToken}`, Accept: 'application/json' },
    })
    if (!resp.ok) return undefined
    const body = await resp.json() as { settings?: { language?: unknown } }
    return normalizeLanguage(typeof body.settings?.language === 'string' ? body.settings.language : undefined)
  } catch {
    return undefined
  }
}

async function effectiveCardsLanguage(request: Request, env: Env, sessionToken: string | undefined): Promise<string> {
  return languageFromRequest(request)
    ?? await languageFromUserSettings(env, 'cards', sessionToken)
    ?? 'en'
}

async function effectiveAppLanguage(request: Request, env: Env, appId: string, sessionToken: string | undefined): Promise<string> {
  return languageFromRequest(request)
    ?? await languageFromUserSettings(env, appId, sessionToken)
    ?? 'en'
}

function normalizeRow(row: JsonRecord): JsonRecord {
  const normalized: JsonRecord = { ...row }
  for (const key of ['tags', 'categories', 'metadata', 'data']) {
    if (key in normalized && typeof normalized[key] === 'string') {
      try { normalized[key] = JSON.parse(normalized[key] as string) } catch { /* keep raw string */ }
    }
  }
  for (const key of ['is_active', 'is_published']) {
    if (key in normalized) normalized[key] = Boolean(normalized[key])
  }
  return normalized
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  return `{${Object.entries(value as JsonRecord)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(',')}}`
}

async function sha256Hex(value: unknown, length = 32): Promise<string> {
  const bytes = new TextEncoder().encode(typeof value === 'string' ? value : stableJson(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
}

async function cached<T>(request: Request, env: Env, key: string, loader: () => Promise<T>): Promise<T> {
  if (new URL(request.url).searchParams.get('no-cache') === '1' || !env.CONTENT_CACHE) return loader()
  const cachedValue = await env.CONTENT_CACHE.get(key)
  if (cachedValue) return JSON.parse(cachedValue) as T
  const value = await loader()
  await env.CONTENT_CACHE.put(key, JSON.stringify(value), { expirationTtl: CACHE_TTL_SECONDS })
  return value
}

async function cachedInNamespace<T>(request: Request, env: Env, namespace: string, key: string, loader: () => Promise<T>): Promise<T> {
  if (new URL(request.url).searchParams.get('no-cache') === '1' || !env.CONTENT_CACHE) return loader()
  const version = await env.CONTENT_CACHE.get(cacheVersionKey(namespace)) ?? '0'
  return cached(request, env, `${namespace}:${version}:${key}`, loader)
}

async function getProjects(env: Env): Promise<JsonRecord[]> {
  const { results } = await env.CONTENT_DB.prepare(
    `SELECT id, name, slug, description, created_at, updated_at
     FROM content_projects
     WHERE COALESCE(is_active, 1) = 1
     ORDER BY name ASC`,
  ).all<JsonRecord>()
  return results.map(normalizeRow)
}

async function getProject(env: Env, params: JsonRecord): Promise<JsonRecord | null> {
  const id = asString(params.id)
  const slug = asString(params.slug)
  if (!id && !slug) throw new Error('Project id or slug is required')
  const row = await env.CONTENT_DB.prepare(
    `SELECT id, name, slug, description, created_at, updated_at
     FROM content_projects
     WHERE ${id ? 'id = ?' : 'slug = ?'} AND COALESCE(is_active, 1) = 1
     LIMIT 1`,
  ).bind(id ?? slug).first<JsonRecord>()
  return row ? normalizeRow(row) : null
}

async function getPages(env: Env, params: JsonRecord): Promise<JsonRecord[]> {
  const projectId = asString(params.projectId)
  const projectSlug = asString(params.projectSlug)
  const languageCode = asString(params.languageCode ?? params.language)
  const limit = asLimit(params.limit)
  const values: unknown[] = []
  const clauses = [`COALESCE(p.is_published, p.status = 'published', 1) = 1`]
  if (projectId) { clauses.push('p.project_id = ?'); values.push(projectId) }
  if (projectSlug) { clauses.push('pr.slug = ?'); values.push(projectSlug) }
  if (languageCode) { clauses.push('p.language_code = ?'); values.push(languageCode) }
  values.push(limit)
  const { results } = await env.CONTENT_DB.prepare(
    `SELECT p.*, pr.slug AS project_slug
     FROM content_pages p
     LEFT JOIN content_projects pr ON pr.id = p.project_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY COALESCE(p.navigation_order, 0) ASC, p.title ASC
     LIMIT ?`,
  ).bind(...values).all<JsonRecord>()
  return results.map(normalizeRow)
}

async function getPage(env: Env, params: JsonRecord): Promise<JsonRecord | null> {
  const id = asString(params.id ?? params.pageId)
  const slug = asString(params.slug ?? params.pageSlug ?? params.pageIdOrSlug)
  const projectId = asString(params.projectId)
  const projectSlug = asString(params.projectSlug)
  const languageCode = asString(params.languageCode ?? params.language)
  if (!id && !slug) throw new Error('Page id or slug is required')

  const values: unknown[] = []
  const clauses = [`COALESCE(p.is_published, p.status = 'published', 1) = 1`]
  if (id) { clauses.push('p.id = ?'); values.push(id) } else { clauses.push('p.slug = ?'); values.push(slug) }
  if (projectId) { clauses.push('p.project_id = ?'); values.push(projectId) }
  if (projectSlug) { clauses.push('pr.slug = ?'); values.push(projectSlug) }
  if (languageCode) { clauses.push('p.language_code = ?'); values.push(languageCode) }

  const row = await env.CONTENT_DB.prepare(
    `SELECT p.*, pr.slug AS project_slug
     FROM content_pages p
     LEFT JOIN content_projects pr ON pr.id = p.project_id
     WHERE ${clauses.join(' AND ')}
     LIMIT 1`,
  ).bind(...values).first<JsonRecord>()
  return row ? normalizeRow(row) : null
}

async function getPageSections(env: Env, pageId: string): Promise<JsonRecord[]> {
  const { results } = await env.CONTENT_DB.prepare(
    `SELECT ps.*, s.name, s.slug, s.template_id
     FROM content_page_sections ps
     LEFT JOIN content_sections s ON s.id = ps.section_id
     WHERE ps.page_id = ?
     ORDER BY COALESCE(ps.order_index, ps.sort_order, 0) ASC`,
  ).bind(pageId).all<JsonRecord>()
  return results.map(normalizeRow)
}

async function getPageWithFullContent(env: Env, params: JsonRecord): Promise<JsonRecord | null> {
  const page = await getPage(env, params)
  if (!page?.id) return null
  const sections = await getPageSections(env, String(page.id))
  return { ...page, sections }
}

async function getLanguages(env: Env): Promise<JsonRecord[]> {
  const { results } = await env.CONTENT_DB.prepare(
    `SELECT code, name, is_active FROM languages WHERE COALESCE(is_active, 1) = 1 ORDER BY code ASC`,
  ).all<JsonRecord>()
  return results.map(normalizeRow)
}

async function getItems(env: Env, params: JsonRecord): Promise<JsonRecord[]> {
  const templateId = asString(params.templateId)
  const languageCode = asString(params.languageCode ?? params.language)
  const limit = asLimit(params.limit)
  const values: unknown[] = []
  const clauses = [`COALESCE(status = 'published', 1) = 1`]
  if (templateId) { clauses.push('template_id = ?'); values.push(templateId) }
  if (languageCode) { clauses.push('language_code = ?'); values.push(languageCode) }
  values.push(limit)
  const { results } = await env.CONTENT_DB.prepare(
    `SELECT * FROM content_items WHERE ${clauses.join(' AND ')} ORDER BY title ASC LIMIT ?`,
  ).bind(...values).all<JsonRecord>()
  return results.map(normalizeRow)
}

async function getItem(env: Env, params: JsonRecord): Promise<JsonRecord | null> {
  const id = asString(params.id ?? params.itemId)
  const slug = asString(params.slug)
  if (!id && !slug) throw new Error('Item id or slug is required')
  const row = await env.CONTENT_DB.prepare(
    `SELECT * FROM content_items WHERE ${id ? 'id = ?' : 'slug = ?'} AND COALESCE(status = 'published', 1) = 1 LIMIT 1`,
  ).bind(id ?? slug).first<JsonRecord>()
  return row ? normalizeRow(row) : null
}

async function executeQuery(env: Env, query: ContentQuery): Promise<unknown> {
  const params = query.params ?? {}
  switch (query.method) {
    case 'getProjects': return getProjects(env)
    case 'getProject': return getProject(env, params)
    case 'getProjectBySlug': return getProject(env, { slug: params.slug })
    case 'getPages': return getPages(env, params)
    case 'getPage': return getPage(env, params)
    case 'getPageBySlug': return getPage(env, params)
    case 'getPageWithFullContent': return getPageWithFullContent(env, params)
    case 'getLanguages': return getLanguages(env)
    case 'getItems': return getItems(env, params)
    case 'getItem': return getItem(env, params)
    case 'getItemBySlug': return getItem(env, { slug: params.slug })
    default: throw new Error(`Unknown method: ${query.method ?? 'missing'}`)
  }
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

interface AppContentItemRow {
  id: string
  app_id: string
  type: string
  parent_id: string | null
  title: string
  subtitle: string | null
  body: string | null
  speech: string | null
  color_token: string | null
  icon: string | null
  image_ref: string | null
  sort_order: number
  is_default: number
  is_published: number
  owner_user_id: string | null
  owner_child_id: string | null
  source_item_id: string | null
  metadata_json: string | null
}

interface AppContentTranslationRow {
  item_id: string
  title: string | null
  subtitle: string | null
  body: string | null
  speech: string | null
  metadata_json: string | null
}

interface LocalizedContentItem extends AppContentItemRow {
  metadata: JsonRecord
}

interface YesNoAnswerTile {
  id: string
  label: string
  speech: string
  color?: string
  imageRef?: string
  icon?: string
}

interface YesNoAnswerSet {
  id: string
  title: string
  description?: string
  color?: string
  imageRef?: string
  order: number
  answers: YesNoAnswerTile[]
}

interface SequenceStep {
  id: string
  label: string
  text: string
  imageRef?: string
  imageRefs?: string[]
  imagePrompt?: string
}

interface SequenceDefault {
  id: string
  name: string
  title: string
  category?: string
  color?: string
  imageRef?: string
  order: number
  steps: SequenceStep[]
}

function parseJsonRecord(value: unknown): JsonRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as JsonRecord
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonRecord : {}
  } catch {
    return {}
  }
}

function overlayText(base: string | null, translated: string | null): string | null {
  return typeof translated === 'string' && translated.trim() ? translated : base
}

function asColorToken(value: unknown, fallback = 'orange'): string {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (TIKO_COLOR_NAMES.has(normalized)) return normalized
  }
  return fallback
}

function fallbackCardColor(index: number): string {
  const colors = ['red', 'yellow', 'green', 'blue', 'orange', 'purple']
  return colors[index % colors.length]
}

function normalizeCardsCollection(collection: CardCollection): CardCollection {
  const collectionColor = asColorToken(collection.color, 'orange')
  return {
    ...collection,
    color: collectionColor,
    mediaCategories: Array.isArray(collection.mediaCategories) ? collection.mediaCategories : [],
    parentID: collection.parentID ?? null,
    cards: (collection.cards ?? []).map((card, index) => ({
      ...card,
      speech: card.speech || card.title,
      color: asColorToken(card.color, collectionColor),
      order: typeof card.order === 'number' ? card.order : index,
    })),
  }
}

async function getLocalizedContentItems(env: Env, appId: string, language: string): Promise<LocalizedContentItem[]> {
  const { results: rows } = await env.CONTENT_DB.prepare(
    `SELECT id, app_id, type, parent_id, title, subtitle, body, speech, color_token,
            icon, image_ref, sort_order, is_default, is_published, owner_user_id,
            owner_child_id, source_item_id, metadata_json
     FROM content_items
     WHERE app_id = ?
       AND COALESCE(is_published, status = 'published', 1) = 1
       AND owner_user_id IS NULL
     ORDER BY COALESCE(parent_id, id), sort_order ASC, title ASC`,
  ).bind(appId).all<AppContentItemRow>()

  if (rows.length === 0) return []

  const normalizedLanguage = normalizeLanguage(language) ?? 'en'
  const translationMap = new Map<string, AppContentTranslationRow>()
  if (normalizedLanguage !== 'en') {
    const { results: translations } = await env.CONTENT_DB.prepare(
      `SELECT item_id, title, subtitle, body, speech, metadata_json
       FROM content_item_translations
       WHERE locale = ?`,
    ).bind(normalizedLanguage).all<AppContentTranslationRow>()
    for (const translation of translations) translationMap.set(translation.item_id, translation)
  }

  return rows.map((row) => {
    const translation = translationMap.get(row.id)
    const baseMetadata = parseJsonRecord(row.metadata_json)
    const translatedMetadata = parseJsonRecord(translation?.metadata_json)
    return {
      ...row,
      title: overlayText(row.title, translation?.title ?? null) ?? row.title,
      subtitle: overlayText(row.subtitle, translation?.subtitle ?? null),
      body: overlayText(row.body, translation?.body ?? null),
      speech: overlayText(row.speech, translation?.speech ?? null),
      metadata: { ...baseMetadata, ...translatedMetadata },
    }
  })
}

async function mapCardsContentItems(items: LocalizedContentItem[]): Promise<CardCollection[]> {
  const collections = items.filter(item => item.type === 'collection')
  const cards = items.filter(item => item.type === 'card')
  const cardsByCollection = new Map<string, LocalizedContentItem[]>()
  for (const card of cards) {
    if (!card.parent_id) continue
    const existing = cardsByCollection.get(card.parent_id)
    if (existing) existing.push(card)
    else cardsByCollection.set(card.parent_id, [card])
  }

  const result: CardCollection[] = []
  for (const collection of collections) {
    const mediaCategories = parseJsonArray(collection.metadata.mediaCategories) as string[]
    const collectionCards: CardTile[] = []
    for (const card of cardsByCollection.get(collection.id) ?? []) {
      collectionCards.push({
        id: card.id,
        title: card.title,
        speech: card.speech ?? card.title,
        color: asColorToken(card.color_token, asColorToken(collection.color_token)),
        order: card.sort_order,
        ...(card.image_ref ? { imageRef: card.image_ref } : {}),
      })
    }

    result.push({
      id: collection.id,
      title: collection.title,
      color: asColorToken(collection.color_token),
      order: collection.sort_order,
      mediaCategories,
      ...(collection.image_ref ? { imageRef: collection.image_ref } : {}),
      ...(collection.parent_id ? { parentID: collection.parent_id } : {}),
      cards: collectionCards.sort((a, b) => a.order - b.order),
    })
  }

  return result.sort((a, b) => a.order - b.order)
}

async function getDefaultCollections(env: Env, language = 'en'): Promise<CardCollection[]> {
  const items = await getLocalizedContentItems(env, 'cards', language)
  return mapCardsContentItems(items)
}

async function getYesNoContent(env: Env, language: string): Promise<{ answerSets: YesNoAnswerSet[]; answers: YesNoAnswerTile[]; selectedSetId: string | null }> {
  const items = await getLocalizedContentItems(env, 'yes-no', language)
  const sets = items.filter(item => item.type === 'answer_set')
  const answers = items.filter(item => item.type === 'answer_tile')
  const answersBySet = new Map<string, LocalizedContentItem[]>()
  for (const answer of answers) {
    if (!answer.parent_id) continue
    const existing = answersBySet.get(answer.parent_id)
    if (existing) existing.push(answer)
    else answersBySet.set(answer.parent_id, [answer])
  }

  const answerSets: YesNoAnswerSet[] = []
  for (const set of sets) {
    const mappedAnswers: YesNoAnswerTile[] = []
    for (const answer of (answersBySet.get(set.id) ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
      mappedAnswers.push({
        id: typeof answer.metadata.answerId === 'string' ? answer.metadata.answerId : answer.id,
        label: answer.title,
        speech: answer.speech ?? answer.title,
        ...(answer.color_token ? { color: answer.color_token } : {}),
        ...(answer.image_ref ? { imageRef: answer.image_ref } : {}),
        ...(answer.icon ? { icon: answer.icon } : {}),
      })
    }

    answerSets.push({
      id: set.id,
      title: set.title,
      ...(set.subtitle ? { description: set.subtitle } : {}),
      ...(set.color_token ? { color: set.color_token } : {}),
      ...(set.image_ref ? { imageRef: set.image_ref } : {}),
      order: set.sort_order,
      answers: mappedAnswers,
    })
  }

  const sortedSets = answerSets.sort((a, b) => a.order - b.order)
  return {
    answerSets: sortedSets,
    answers: sortedSets[0]?.answers ?? [],
    selectedSetId: sortedSets[0]?.id ?? null,
  }
}

async function getSequenceContent(env: Env, language: string): Promise<{ sequences: SequenceDefault[] }> {
  const items = await getLocalizedContentItems(env, 'sequence', language)
  const sequences = items.filter(item => item.type === 'sequence')
  const steps = items.filter(item => item.type === 'sequence_step')
  const stepsBySequence = new Map<string, LocalizedContentItem[]>()
  for (const step of steps) {
    if (!step.parent_id) continue
    const existing = stepsBySequence.get(step.parent_id)
    if (existing) existing.push(step)
    else stepsBySequence.set(step.parent_id, [step])
  }

  const mappedSequences: SequenceDefault[] = []
  for (const sequence of sequences) {
    const mappedSteps: SequenceStep[] = []
    for (const step of (stepsBySequence.get(sequence.id) ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
      const imageRefs = asImageRefs(step.metadata.imageRefs)
      const imagePrompt = asString(step.metadata.imagePrompt)
      mappedSteps.push({
        id: step.id,
        label: step.title,
        text: step.speech ?? step.title,
        ...(step.image_ref ? { imageRef: step.image_ref } : {}),
        ...(imageRefs.length > 0 ? { imageRefs } : {}),
        ...(imagePrompt ? { imagePrompt } : {}),
      })
    }

    mappedSequences.push({
      id: sequence.id,
      name: sequence.title,
      title: sequence.title,
      ...(asString(sequence.metadata.category) ? { category: asString(sequence.metadata.category) } : {}),
      ...(sequence.color_token ? { color: sequence.color_token } : {}),
      ...(sequence.image_ref ? { imageRef: sequence.image_ref } : {}),
      order: sequence.sort_order,
      steps: mappedSteps,
    })
  }

  return { sequences: mappedSequences.sort((a, b) => a.order - b.order) }
}

async function getCardsCollections(env: Env, language: string, sessionToken?: string): Promise<{ collections: CardCollection[] }> {
  const localizedDefaults = await getDefaultCollections(env, language)

  if (!sessionToken || !env.APP_API_URL) {
    return { collections: localizedDefaults }
  }

  try {
    const resp = await fetch(`${env.APP_API_URL}/v1/apps/cards/state`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    if (resp.ok) {
      const body = (await resp.json()) as { state?: { collections?: unknown[] } }
      const userCollections = body?.state?.collections
      if (Array.isArray(userCollections) && userCollections.length > 0) {
        const merged = new Map<string, CardCollection>()
        for (const col of localizedDefaults) merged.set(col.id, col)
        for (const col of userCollections as CardCollection[]) merged.set(col.id, normalizeCardsCollection(col))
        return { collections: Array.from(merged.values()) }
      }
    }
  } catch {
    // silently fall through to defaults
  }

  return { collections: localizedDefaults }
}

async function putAdminCardsCollections(
  env: Env,
  collections: CardCollection[],
): Promise<{ success: boolean; count: number }> {
  if (!Array.isArray(collections) || collections.length === 0) {
    throw new Error('collections must be a non-empty array')
  }

  const existingRows = await env.CONTENT_DB.prepare(
    `SELECT id FROM content_items WHERE app_id = ? AND owner_user_id IS NULL`,
  ).bind('cards').all<{ id: string }>()
  const incomingIds = new Set<string>()
  for (const col of collections) {
    incomingIds.add(col.id)
    for (const tile of col.cards ?? []) incomingIds.add(tile.id)
  }
  const removedIds = (existingRows.results ?? []).map(row => row.id).filter(id => !incomingIds.has(id))
  const statements = deleteRemovedDefaultItemStatements(env, removedIds)

  for (const col of collections) {
    statements.push(env.CONTENT_DB.prepare(
      `INSERT INTO content_items (
	         id, template_id, title, slug, status, language_code, tags, categories, data,
	         app_id, type, parent_id, source_locale, speech, color_token, image_ref,
	         sort_order, is_default, is_published, metadata_json
	       )
	       VALUES (?, 'cards.collection', ?, ?, 'published', 'en', NULL, '["cards"]', ?,
         'cards', 'collection', NULL, 'en', ?, ?, ?, ?, 1, 1, ?)
       ON CONFLICT(id) DO UPDATE SET
         template_id = excluded.template_id,
         title = excluded.title,
         slug = excluded.slug,
         status = excluded.status,
         language_code = excluded.language_code,
         tags = excluded.tags,
         categories = excluded.categories,
         data = excluded.data,
         app_id = excluded.app_id,
         type = excluded.type,
         parent_id = excluded.parent_id,
         source_locale = excluded.source_locale,
         speech = excluded.speech,
         color_token = excluded.color_token,
         image_ref = excluded.image_ref,
         sort_order = excluded.sort_order,
         is_default = excluded.is_default,
         is_published = excluded.is_published,
         metadata_json = excluded.metadata_json,
         updated_at = datetime('now')`,
    )
      .bind(
        col.id,
        col.title,
        col.id,
        JSON.stringify({ mediaCategories: col.mediaCategories ?? [] }),
	        col.title,
	        asColorToken(col.color),
	        asImageRef(col.imageRef) ?? null,
	        col.order ?? 0,
	        JSON.stringify({ mediaCategories: col.mediaCategories ?? [] }),
      ))

    if (Array.isArray(col.cards)) {
      for (const tile of col.cards) {
        statements.push(env.CONTENT_DB.prepare(
          `INSERT INTO content_items (
	             id, template_id, title, slug, status, language_code, tags, categories, data,
	             app_id, type, parent_id, source_locale, speech, color_token, image_ref,
	             sort_order, is_default, is_published, metadata_json
	           )
	           VALUES (?, 'cards.card', ?, ?, 'published', 'en', NULL, '["cards"]', ?,
	             'cards', 'card', ?, 'en', ?, ?, ?, ?, 1, 1, ?)
             ON CONFLICT(id) DO UPDATE SET
               template_id = excluded.template_id,
               title = excluded.title,
               slug = excluded.slug,
               status = excluded.status,
               language_code = excluded.language_code,
               tags = excluded.tags,
               categories = excluded.categories,
               data = excluded.data,
               app_id = excluded.app_id,
               type = excluded.type,
               parent_id = excluded.parent_id,
               source_locale = excluded.source_locale,
               speech = excluded.speech,
               color_token = excluded.color_token,
               image_ref = excluded.image_ref,
               sort_order = excluded.sort_order,
               is_default = excluded.is_default,
               is_published = excluded.is_published,
               metadata_json = excluded.metadata_json,
               updated_at = datetime('now')`,
        )
          .bind(
            tile.id,
            tile.title,
            tile.id,
            JSON.stringify({ collectionId: col.id }),
            col.id,
	            tile.speech,
	            asColorToken(tile.color, asColorToken(col.color)),
	            asImageRef(tile.imageRef) ?? null,
	            tile.order ?? 0,
	            JSON.stringify({ collectionId: col.id }),
          ))
      }
    }
  }
  await env.CONTENT_DB.batch(statements)

  return { success: true, count: collections.length }
}

async function putAdminSequenceContent(
  env: Env,
  sequences: SequenceDefault[],
): Promise<{ success: boolean; count: number }> {
  if (!Array.isArray(sequences) || sequences.length === 0) {
    throw new Error('sequences must be a non-empty array')
  }

  const sequenceIds = sequences.map((sequence) => asString(sequence.id) ?? `sequence_${crypto.randomUUID()}`)
  const stepIds = sequences.map((sequence, sequenceIndex) =>
    (sequence.steps ?? []).map((step, stepIndex) => asString(step.id) ?? `${sequenceIds[sequenceIndex]}_step_${stepIndex + 1}`),
  )
  const existingRows = await env.CONTENT_DB.prepare(
    `SELECT id FROM content_items WHERE app_id = ? AND owner_user_id IS NULL`,
  ).bind('sequence').all<{ id: string }>()
  const incomingIds = new Set<string>()
  for (const [sequenceIndex, sequence] of sequences.entries()) {
    const sequenceId = sequenceIds[sequenceIndex]
    incomingIds.add(sequenceId)
    for (const [stepIndex] of (sequence.steps ?? []).entries()) {
      incomingIds.add(stepIds[sequenceIndex][stepIndex])
    }
  }
  const removedIds = (existingRows.results ?? []).map(row => row.id).filter(id => !incomingIds.has(id))
  const statements = deleteRemovedDefaultItemStatements(env, removedIds)

  for (const [sequenceIndex, sequence] of sequences.entries()) {
    const sequenceId = sequenceIds[sequenceIndex]
    const title = asString(sequence.title) ?? asString(sequence.name) ?? `Sequence ${sequenceIndex + 1}`
    const category = asString(sequence.category)
    statements.push(env.CONTENT_DB.prepare(
      `INSERT INTO content_items (
       id, template_id, title, slug, status, language_code, tags, categories, data,
         app_id, type, parent_id, source_locale, speech, color_token, image_ref,
         sort_order, is_default, is_published, metadata_json
       )
       VALUES (?, 'sequence.sequence', ?, ?, 'published', 'en', NULL, '["sequence"]', ?,
         'sequence', 'sequence', NULL, 'en', ?, ?, ?, ?, 1, 1, ?)
       ON CONFLICT(id) DO UPDATE SET
         template_id = excluded.template_id,
         title = excluded.title,
         slug = excluded.slug,
         status = excluded.status,
         language_code = excluded.language_code,
         tags = excluded.tags,
         categories = excluded.categories,
         data = excluded.data,
         app_id = excluded.app_id,
         type = excluded.type,
         parent_id = excluded.parent_id,
         source_locale = excluded.source_locale,
         speech = excluded.speech,
         color_token = excluded.color_token,
         image_ref = excluded.image_ref,
         sort_order = excluded.sort_order,
         is_default = excluded.is_default,
         is_published = excluded.is_published,
         metadata_json = excluded.metadata_json,
         updated_at = datetime('now')`,
    )
      .bind(
        sequenceId,
        title,
        sequenceId,
        JSON.stringify({ category, stepCount: Array.isArray(sequence.steps) ? sequence.steps.length : 0 }),
        title,
        asString(sequence.color) ?? null,
        asImageRef(sequence.imageRef) ?? null,
        typeof sequence.order === 'number' ? sequence.order : sequenceIndex,
        JSON.stringify({ category }),
      ))

    for (const [stepIndex, step] of (sequence.steps ?? []).entries()) {
      const stepId = stepIds[sequenceIndex][stepIndex]
      const label = asString(step.label) ?? asString(step.text) ?? `Step ${stepIndex + 1}`
      const text = asString(step.text) ?? label
      const imageRefs = asImageRefs(step.imageRefs)
      const metadata = {
        sequenceId,
        imagePrompt: asString(step.imagePrompt) ?? null,
        imageRefs,
      }
      statements.push(env.CONTENT_DB.prepare(
        `INSERT INTO content_items (
           id, template_id, title, slug, status, language_code, tags, categories, data,
           app_id, type, parent_id, source_locale, speech, image_ref,
           sort_order, is_default, is_published, metadata_json
         )
         VALUES (?, 'sequence.step', ?, ?, 'published', 'en', NULL, '["sequence"]', ?,
           'sequence', 'sequence_step', ?, 'en', ?, ?, ?, 1, 1, ?)
         ON CONFLICT(id) DO UPDATE SET
           template_id = excluded.template_id,
           title = excluded.title,
           slug = excluded.slug,
           status = excluded.status,
           language_code = excluded.language_code,
           tags = excluded.tags,
           categories = excluded.categories,
           data = excluded.data,
           app_id = excluded.app_id,
           type = excluded.type,
           parent_id = excluded.parent_id,
           source_locale = excluded.source_locale,
           speech = excluded.speech,
           image_ref = excluded.image_ref,
           sort_order = excluded.sort_order,
           is_default = excluded.is_default,
           is_published = excluded.is_published,
           metadata_json = excluded.metadata_json,
           updated_at = datetime('now')`,
      )
        .bind(
          stepId,
          label,
          stepId,
          JSON.stringify({ sequenceId }),
          sequenceId,
          text,
          asImageRef(step.imageRef) ?? null,
          stepIndex,
          JSON.stringify(metadata),
        ))
    }
  }
  await env.CONTENT_DB.batch(statements)

  return { success: true, count: sequences.length }
}

function deleteRemovedDefaultItemStatements(env: Env, itemIds: string[]): D1PreparedStatement[] {
  if (itemIds.length === 0) return []
  const placeholders = itemIds.map(() => '?').join(', ')
  return [
    env.CONTENT_DB.prepare(`DELETE FROM content_item_translations WHERE item_id IN (${placeholders})`).bind(...itemIds),
    env.CONTENT_DB.prepare(`DELETE FROM content_items WHERE id IN (${placeholders})`).bind(...itemIds),
  ]
}

// ---------------------------------------------------------------------------
// User cards state helpers (reads/writes via app-api state blob)
// ---------------------------------------------------------------------------

interface UserCardsState {
  collections: CardCollection[]
}

async function getUserCardsState(
  env: Env,
  sessionToken: string,
): Promise<{ state: UserCardsState; version: number } | null> {
  if (!env.APP_API_URL) return null
  try {
    const resp = await fetch(`${env.APP_API_URL}/v1/apps/cards/state`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    if (!resp.ok) return null
    const body = (await resp.json()) as { state?: { collections?: unknown[] }; version?: number }
    return {
      state: { collections: Array.isArray(body?.state?.collections) ? (body.state!.collections as CardCollection[]) : [] },
      version: typeof body?.version === 'number' ? body.version : 0,
    }
  } catch {
    return null
  }
}

async function putUserCardsState(env: Env, sessionToken: string, state: UserCardsState, version: number): Promise<boolean> {
  if (!env.APP_API_URL) return false
  try {
    const resp = await fetch(`${env.APP_API_URL}/v1/apps/cards/state`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, version }),
    })
    return resp.ok
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// User cards mutation handlers
// ---------------------------------------------------------------------------

async function handlePostCards(request: Request, env: Env, segments: string[]): Promise<Response> {
  const authHeader = request.headers.get('Authorization') ?? ''
  const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  if (!sessionToken) return error(request, env, 'unauthorized', 'Authorization required', 401)

  // POST /v1/cards/collections
  if (segments[2] === 'collections' && segments.length === 3) {
    let body: { id?: unknown; title?: unknown; color?: unknown; order?: unknown; imageRef?: unknown }
    try { body = (await request.json()) as typeof body } catch {
      return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return error(request, env, 'bad_request', 'title is required', 400)

    const current = await getUserCardsState(env, sessionToken)
    if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)

    const id = typeof body.id === 'string' && body.id.startsWith('user_') ? body.id : `user_${crypto.randomUUID()}`
    const color = asColorToken(body.color, fallbackCardColor(current.state.collections.length))
    const order = typeof body.order === 'number' ? body.order : current.state.collections.length
    const imageRef = asImageRef(body.imageRef)
    const newCollection: CardCollection = { id, title, color, order, mediaCategories: [], ...(imageRef ? { imageRef } : {}), cards: [] }

    const existing = current.state.collections.find(c => c.id === id)
    const updated: UserCardsState = {
      collections: existing ? current.state.collections : [...current.state.collections, newCollection],
    }
    const ok = await putUserCardsState(env, sessionToken, updated, current.version)
    if (!ok) return error(request, env, 'internal_error', 'Failed to save collection', 500)

    return json(request, env, { success: true, data: newCollection }, 201)
  }

  // POST /v1/cards/collections/:id/cards
  if (segments[2] === 'collections' && segments[4] === 'cards' && segments.length === 5) {
    const collectionId = segments[3]
    const isDefault = !collectionId.startsWith('user_')
    let body: { id?: unknown; title?: unknown; speech?: unknown; color?: unknown; order?: unknown; imageRef?: unknown }
    try { body = (await request.json()) as typeof body } catch {
      return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return error(request, env, 'bad_request', 'title is required', 400)
    const speech = typeof body.speech === 'string' && body.speech.trim() ? body.speech.trim() : title
    const color = asColorToken(body.color, 'orange')
    const order = typeof body.order === 'number' ? body.order : 0

    if (isDefault) {
      if (!(await verifyAdminFromSession(env, sessionToken))) {
        return error(request, env, 'forbidden', 'Admin role required to add cards to default collections', 403)
      }
      const id = `__default_${crypto.randomUUID().replace(/-/g, '')}`
      const imageRef = asImageRef(body.imageRef) ?? null
      await env.CONTENT_DB.prepare(
        `INSERT INTO content_items (
           id, template_id, title, slug, status, language_code, tags, categories, data,
           app_id, type, parent_id, source_locale, speech, color_token, image_ref,
           sort_order, is_default, is_published, metadata_json
         )
         VALUES (?, 'cards.card', ?, ?, 'published', 'en', NULL, '["cards"]', ?,
           'cards', 'card', ?, 'en', ?, ?, ?, ?, 1, 1, ?)`,
      ).bind(
        id,
        title,
        id,
        JSON.stringify({ collectionId }),
        collectionId,
        speech,
        color,
        imageRef,
        order,
        JSON.stringify({ collectionId }),
      ).run()
      await invalidateCardsCache(env)
      const newCard: CardTile = { id, title, speech, color, order, ...(imageRef ? { imageRef } : {}) }
      return json(request, env, { success: true, data: newCard }, 201)
    }

    const current = await getUserCardsState(env, sessionToken)
    if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)

    const collectionIndex = current.state.collections.findIndex(c => c.id === collectionId)
    if (collectionIndex === -1) return error(request, env, 'not_found', 'Collection not found', 404)

    const collection = current.state.collections[collectionIndex]
    const id = typeof body.id === 'string' && body.id.startsWith('user_') ? body.id : `user_${crypto.randomUUID()}`
    const resolvedColor = asColorToken(body.color, collection.color)
    const resolvedOrder = order || collection.cards.length
    const imageRef = asImageRef(body.imageRef)
    const newCard: CardTile = { id, title, speech, color: resolvedColor, order: resolvedOrder, ...(imageRef ? { imageRef } : {}) }

    const alreadyExists = collection.cards.some(c => c.id === id)
    const updatedCollection = { ...collection, cards: alreadyExists ? collection.cards : [...collection.cards, newCard] }
    const updatedCollections = [...current.state.collections]
    updatedCollections[collectionIndex] = updatedCollection
    const ok = await putUserCardsState(env, sessionToken, { collections: updatedCollections }, current.version)
    if (!ok) return error(request, env, 'internal_error', 'Failed to save card', 500)

    return json(request, env, { success: true, data: newCard }, 201)
  }

  return error(request, env, 'not_found', 'Not found', 404)
}

async function requireAdminSession(request: Request, env: Env): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: { code: 'unauthorized', message: 'Unauthorized' } }), {
      status: 401,
      headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json; charset=utf-8' },
    })
  }
  if (!await verifyAdminFromSession(env, token)) {
    return new Response(JSON.stringify({ success: false, error: { code: 'forbidden', message: 'Admin access required' } }), {
      status: 403,
      headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json; charset=utf-8' },
    })
  }
  return null
}

// ---------------------------------------------------------------------------
// User image upload & serving
// ---------------------------------------------------------------------------

async function handleUploadUserImage(request: Request, env: Env): Promise<Response> {
  if (!env.USER_IMAGES) return error(request, env, 'not_configured', 'Image storage not configured.', 503)
  const authHeader = request.headers.get('Authorization') ?? ''
  const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  if (!sessionToken) return error(request, env, 'unauthorized', 'Authorization required', 401)
  if (!(await verifyAdminFromSession(env, sessionToken))) {
    return error(request, env, 'forbidden', 'Admin role required to upload images', 403)
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!file || !(file instanceof File)) return error(request, env, 'bad_request', 'file is required', 400)

  const id = crypto.randomUUID()
  const r2Key = `images/${id}.png`
  const arrayBuffer = await file.arrayBuffer()

  await env.USER_IMAGES.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType: file.type || 'image/png', cacheControl: 'public, max-age=31536000, immutable' },
  })

  await env.CONTENT_DB.prepare(
    'INSERT INTO user_images (id, r2_key, content_type, file_size_bytes) VALUES (?, ?, ?, ?)',
  ).bind(id, r2Key, file.type || 'image/png', arrayBuffer.byteLength).run()

  return json(request, env, { success: true, data: { id, url: `/v1/content/images/${id}` } }, 201)
}

async function handleGetUserImage(env: Env, imageId: string): Promise<Response> {
  if (!env.USER_IMAGES) {
    const mediaURL = await resolveImageRef(imageId, env)
    if (mediaURL) return Response.redirect(mediaURL, 302)
    return new Response('Not found', { status: 404 })
  }

  const row = await env.CONTENT_DB.prepare('SELECT r2_key, content_type FROM user_images WHERE id = ?').bind(imageId).first<{ r2_key: string; content_type: string }>()
  if (!row) {
    const mediaURL = await resolveImageRef(imageId, env)
    if (mediaURL) return Response.redirect(mediaURL, 302)
    return new Response('Not found', { status: 404 })
  }

  const object = await env.USER_IMAGES.get(row.r2_key)
  if (!object) return new Response('Not found', { status: 404 })

  return new Response(object.body, {
    headers: {
      'Content-Type': row.content_type || 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

async function handleGet(request: Request, env: Env, segments: string[]): Promise<Response> {
  if (segments.length === 0) return json(request, env, { success: true, service: 'content-api' })
  if (segments[0] !== 'v1') return error(request, env, 'not_found', 'Not found', 404)

  const resource = segments[1]

  if (resource === 'cards' && segments[2] === 'collections') {
    const authHeader = request.headers.get('Authorization') ?? ''
    const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    const language = await effectiveCardsLanguage(request, env, sessionToken)

    if (sessionToken) {
      const data = await getCardsCollections(env, language, sessionToken)
      return json(request, env, { success: true, data }, 200, { 'Cache-Control': 'no-store' })
    }

    const data = await cachedInNamespace(request, env, CACHE_KEY_CARDS_COLLECTIONS, language, () => getCardsCollections(env, language))
    return json(request, env, { success: true, data })
  }

  if (resource === 'yes-no' && segments[2] === 'content') {
    const authHeader = request.headers.get('Authorization') ?? ''
    const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    const language = await effectiveAppLanguage(request, env, 'yes-no', sessionToken)

    if (sessionToken) {
      const data = await getYesNoContent(env, language)
      return json(request, env, { success: true, data }, 200, { 'Cache-Control': 'no-store' })
    }

    const data = await cachedInNamespace(request, env, CACHE_KEY_YES_NO_CONTENT, language, () => getYesNoContent(env, language))
    return json(request, env, { success: true, data })
  }

  if (resource === 'sequence' && segments[2] === 'content') {
    const authHeader = request.headers.get('Authorization') ?? ''
    const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    const language = await effectiveAppLanguage(request, env, 'sequence', sessionToken)

    if (sessionToken) {
      const data = await getSequenceContent(env, language)
      return json(request, env, { success: true, data }, 200, { 'Cache-Control': 'no-store' })
    }

    const data = await cachedInNamespace(request, env, CACHE_KEY_SEQUENCE_CONTENT, language, () => getSequenceContent(env, language))
    return json(request, env, { success: true, data })
  }

  // GET /v1/content/images/:id — serve user-uploaded image binary
  if (resource === 'content' && segments[2] === 'images' && segments.length === 4) {
    return handleGetUserImage(env, segments[3])
  }

  if (resource === 'projects' && segments.length === 2) {
    const data = await cached(request, env, 'projects', () => getProjects(env))
    return json(request, env, { success: true, data })
  }
  if (resource === 'projects' && segments[2]) {
    const data = await cached(request, env, `project:${segments[2]}`, () => getProject(env, { slug: segments[2] }))
    if (!data) return error(request, env, 'not_found', 'Project not found', 404)
    return json(request, env, { success: true, data })
  }
  if (resource === 'pages' && segments.length === 2) {
    const url = new URL(request.url)
    const params = searchParamsToObject(url.searchParams)
    const data = await getPages(env, params)
    return json(request, env, { success: true, data })
  }
  if (resource === 'pages' && segments[2]) {
    const url = new URL(request.url)
    const params: JsonRecord = { ...searchParamsToObject(url.searchParams), pageIdOrSlug: segments[2] }
    const data = await getPageWithFullContent(env, params)
    if (!data) return error(request, env, 'not_found', 'Page not found', 404)
    return json(request, env, { success: true, data })
  }
  if (resource === 'languages') {
    return json(request, env, { success: true, data: await getLanguages(env) })
  }

  return error(request, env, 'not_found', 'Not found', 404)
}

async function handleQuery(request: Request, env: Env): Promise<Response> {
  let query: ContentQuery
  try {
    query = (await request.json()) as ContentQuery
  } catch {
    return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
  }
  if (!query.method) return error(request, env, 'bad_request', 'Query method is required', 400)

  try {
    const cacheKey = `query:${await sha256Hex(query)}`
    const data = await cached(request, env, cacheKey, () => executeQuery(env, query))
    return json(request, env, { success: true, data })
  } catch (err) {
    return error(request, env, 'bad_request', err instanceof Error ? err.message : 'Query failed', 400)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/+|\/+$/g, '')
    const segments = path ? path.split('/') : []

    if (request.method === 'GET' && (url.pathname === '/health' || url.pathname === '/healthz')) {
      return json(request, env, { ok: true, service: 'content-api' }, 200, { 'Cache-Control': 'no-store' })
    }
    if (request.method === 'GET') return handleGet(request, env, segments)
    if (request.method === 'POST' && (url.pathname === '/v1/query' || url.pathname === '/query')) return handleQuery(request, env)
    if (request.method === 'POST' && segments[0] === 'v1' && segments[1] === 'cards') return handlePostCards(request, env, segments)

    if (request.method === 'PUT' && segments[0] === 'v1' && segments[1] === 'cards') return handlePutCards(request, env, segments)
    if (request.method === 'DELETE' && segments[0] === 'v1' && segments[1] === 'cards') return handleDeleteCards(request, env, segments)
    if (request.method === 'POST' && segments[0] === 'v1' && segments[1] === 'admin' && segments[2] === 'cards' && segments[3] === 'promote') return handlePromoteCollection(request, env, segments)
    if (request.method === 'POST' && segments[0] === 'v1' && segments[1] === 'images') return handleUploadUserImage(request, env)

    if (request.method === 'PUT' && url.pathname === '/v1/admin/cards/collections') {
      const authError = await requireAdminSession(request, env)
      if (authError) return authError
      let body: { collections?: unknown }
      try {
        body = (await request.json()) as { collections?: unknown }
      } catch {
        return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
      }
      try {
        const result = await putAdminCardsCollections(env, body.collections as CardCollection[])
        await invalidateCardsCache(env)
        return json(request, env, result)
      } catch (err) {
        return error(request, env, 'bad_request', err instanceof Error ? err.message : 'Failed to update collections', 400)
      }
    }

    if (request.method === 'PUT' && url.pathname === '/v1/admin/sequence/content') {
      const authError = await requireAdminSession(request, env)
      if (authError) return authError
      let body: { sequences?: unknown }
      try {
        body = (await request.json()) as { sequences?: unknown }
      } catch {
        return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
      }
      try {
        const result = await putAdminSequenceContent(env, body.sequences as SequenceDefault[])
        await invalidateSequenceCache(env)
        return json(request, env, result)
      } catch (err) {
        return error(request, env, 'bad_request', err instanceof Error ? err.message : 'Failed to update sequences', 400)
      }
    }

    return error(request, env, 'method_not_allowed', 'Method not allowed', 405)
  },
}

async function verifyAdminFromSession(env: Env, sessionToken: string): Promise<boolean> {
  const request = new Request('https://content-auth.local/session', {
    headers: { Authorization: `Bearer ${sessionToken}` },
  })
  const auth = await authenticate(request, authEnv(env))
  if (!auth.ok) return false
  return auth.roles?.includes('admin') === true
    || auth.roles?.includes('content_editor') === true
    || auth.capabilities?.canEditContent === true
}

function authEnv(env: Env): AuthEnv {
  return {
    ...env,
    IDENTITY_BASE_URL: env.IDENTITY_BASE_URL ?? env.IDENTITY_API_URL ?? 'https://identity.tikoapi.org/v1',
  }
}

async function handlePutCards(request: Request, env: Env, segments: string[]): Promise<Response> {
  const authHeader = request.headers.get('Authorization') ?? ''
  const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  if (!sessionToken) return error(request, env, 'unauthorized', 'Authorization required', 401)

  // PUT /v1/cards/collections/:id
  if (segments[2] === 'collections' && segments.length === 4) {
    const collectionId = segments[3]
    const isDefault = !collectionId.startsWith('user_')

    let body: { title?: unknown; color?: unknown; order?: unknown; imageRef?: unknown; saveAsDefault?: unknown }
    try { body = (await request.json()) as typeof body } catch {
      return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return error(request, env, 'bad_request', 'title is required', 400)
    const color = asColorToken(body.color)
    const order = typeof body.order === 'number' && Number.isFinite(body.order) ? Math.max(0, Math.round(body.order)) : undefined
    const imageRef = asImageRef(body.imageRef)
    const saveAsDefault = body.saveAsDefault === true

    if (isDefault) {
      const isAdmin = saveAsDefault && await verifyAdminFromSession(env, sessionToken)

      if (!isAdmin) {
        // Non-admin or "just for me": store override in user state so it persists and is merged on next load
        const current = await getUserCardsState(env, sessionToken)
        if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)

        const allDefaults = await getDefaultCollections(env)
        const defaultCol = allDefaults.find(c => c.id === collectionId)
        const existingIdx = current.state.collections.findIndex(c => c.id === collectionId)
        const base = existingIdx >= 0 ? current.state.collections[existingIdx] : defaultCol

        const updated: CardCollection = {
          id: collectionId,
          mediaCategories: base?.mediaCategories ?? [],
          cards: base?.cards ?? [],
          order: order ?? base?.order ?? 0,
          title,
          color,
          ...(imageRef !== undefined ? { imageRef } : {}),
        }

        const updatedCollections = existingIdx >= 0
          ? current.state.collections.map((c, i) => i === existingIdx ? updated : c)
          : [...current.state.collections, updated]

        const ok = await putUserCardsState(env, sessionToken, { collections: updatedCollections }, current.version)
        if (!ok) return error(request, env, 'internal_error', 'Failed to save collection', 500)
        return json(request, env, { success: true, data: updated })
      }

      await env.CONTENT_DB.prepare(
        `UPDATE content_items
         SET title = ?, speech = ?, color_token = ?, image_ref = ?, sort_order = COALESCE(?, sort_order), updated_at = datetime('now')
         WHERE id = ? AND app_id = 'cards' AND type = 'collection'`,
      ).bind(title, title, color, imageRef ?? null, order ?? null, collectionId).run()
      await invalidateCardsCache(env)

      const updated: CardCollection = { id: collectionId, title, color, order: order ?? 0, mediaCategories: [], ...(imageRef ? { imageRef } : {}), cards: [] }
      return json(request, env, { success: true, data: updated })
    }

    const current = await getUserCardsState(env, sessionToken)
    if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)
    const idx = current.state.collections.findIndex(c => c.id === collectionId)
    if (idx === -1) return error(request, env, 'not_found', 'Collection not found', 404)
    const existing = current.state.collections[idx]
    const updatedCollection: CardCollection = { ...existing, title, color, order: order ?? existing.order, ...(imageRef ? { imageRef } : {}) }
    const updatedCollections = [...current.state.collections]
    updatedCollections[idx] = updatedCollection
    const ok = await putUserCardsState(env, sessionToken, { collections: updatedCollections }, current.version)
    if (!ok) return error(request, env, 'internal_error', 'Failed to save collection', 500)
    return json(request, env, { success: true, data: updatedCollection })
  }

  // PUT /v1/cards/collections/:collectionId/cards/:cardId
  if (segments[2] === 'collections' && segments[4] === 'cards' && segments.length === 6) {
    const collectionId = segments[3]
    const cardId = segments[5]
    const isDefault = !collectionId.startsWith('user_')

    let body: { title?: unknown; speech?: unknown; color?: unknown; order?: unknown; imageRef?: unknown }
    try { body = (await request.json()) as typeof body } catch {
      return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return error(request, env, 'bad_request', 'title is required', 400)
    const speech = typeof body.speech === 'string' && body.speech.trim() ? body.speech.trim() : title
    const color = asColorToken(body.color)
    const order = typeof body.order === 'number' && Number.isFinite(body.order) ? Math.max(0, Math.round(body.order)) : undefined

    if (isDefault) {
      if (!(await verifyAdminFromSession(env, sessionToken))) {
        return error(request, env, 'forbidden', 'Admin role required to edit default cards', 403)
      }
      const imageRef = asImageRef(body.imageRef) ?? null
      await env.CONTENT_DB.prepare(
        `UPDATE content_items
         SET title = ?, speech = ?, color_token = ?, image_ref = ?, sort_order = COALESCE(?, sort_order), updated_at = datetime('now')
         WHERE id = ? AND app_id = 'cards' AND type = 'card'`,
      ).bind(title, speech, color, imageRef, order ?? null, cardId).run()
      await invalidateCardsCache(env)
      const updatedCard: CardTile = { id: cardId, title, speech, color, order: order ?? 0, ...(imageRef ? { imageRef } : {}) }
      return json(request, env, { success: true, data: updatedCard })
    }

    const current = await getUserCardsState(env, sessionToken)
    if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)
    const collIdx = current.state.collections.findIndex(c => c.id === collectionId)
    if (collIdx === -1) return error(request, env, 'not_found', 'Collection not found', 404)
    const collection = current.state.collections[collIdx]
    const cardIdx = collection.cards.findIndex(c => c.id === cardId)
    if (cardIdx === -1) return error(request, env, 'not_found', 'Card not found', 404)
    const existingCard = collection.cards[cardIdx]
    const updatedCard: CardTile = { ...existingCard, title, speech, color, order: order ?? existingCard.order }
    const updatedCards = [...collection.cards]
    updatedCards[cardIdx] = updatedCard
    const updatedCollection: CardCollection = { ...collection, cards: updatedCards }
    const updatedCollections = [...current.state.collections]
    updatedCollections[collIdx] = updatedCollection
    const ok = await putUserCardsState(env, sessionToken, { collections: updatedCollections }, current.version)
    if (!ok) return error(request, env, 'internal_error', 'Failed to save card', 500)
    return json(request, env, { success: true, data: updatedCard })
  }

  return error(request, env, 'not_found', 'Not found', 404)
}

async function handleDeleteCards(request: Request, env: Env, segments: string[]): Promise<Response> {
  const authHeader = request.headers.get('Authorization') ?? ''
  const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  if (!sessionToken) return error(request, env, 'unauthorized', 'Authorization required', 401)

  // DELETE /v1/cards/collections/:id
  if (segments[2] === 'collections' && segments.length === 4) {
    const collectionId = segments[3]
    const isDefault = !collectionId.startsWith('user_')

    if (isDefault) {
      if (!(await verifyAdminFromSession(env, sessionToken))) {
        return error(request, env, 'forbidden', 'Admin role required to delete default collections', 403)
      }
      await env.CONTENT_DB.prepare(`DELETE FROM content_item_translations WHERE item_id IN (SELECT id FROM content_items WHERE app_id = 'cards' AND (id = ? OR parent_id = ?))`).bind(collectionId, collectionId).run()
      await env.CONTENT_DB.prepare(`DELETE FROM content_items WHERE app_id = 'cards' AND (id = ? OR parent_id = ?)`).bind(collectionId, collectionId).run()
      await invalidateCardsCache(env)
      return json(request, env, { success: true })
    }

    const current = await getUserCardsState(env, sessionToken)
    if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)
    const idx = current.state.collections.findIndex(c => c.id === collectionId)
    if (idx === -1) return error(request, env, 'not_found', 'Collection not found', 404)
    const updatedCollections = current.state.collections.filter(c => c.id !== collectionId)
    const ok = await putUserCardsState(env, sessionToken, { collections: updatedCollections }, current.version)
    if (!ok) return error(request, env, 'internal_error', 'Failed to delete collection', 500)
    return json(request, env, { success: true })
  }

  // DELETE /v1/cards/collections/:collectionId/cards/:cardId
  if (segments[2] === 'collections' && segments[4] === 'cards' && segments.length === 6) {
    const collectionId = segments[3]
    const cardId = segments[5]
    const isDefault = !collectionId.startsWith('user_')

    if (isDefault) {
      if (!(await verifyAdminFromSession(env, sessionToken))) {
        return error(request, env, 'forbidden', 'Admin role required to delete default cards', 403)
      }
      await env.CONTENT_DB.prepare(`DELETE FROM content_item_translations WHERE item_id = ?`).bind(cardId).run()
      await env.CONTENT_DB.prepare(`DELETE FROM content_items WHERE id = ? AND parent_id = ? AND app_id = 'cards' AND type = 'card'`).bind(cardId, collectionId).run()
      await invalidateCardsCache(env)
      return json(request, env, { success: true })
    }

    const current = await getUserCardsState(env, sessionToken)
    if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)
    const collIdx = current.state.collections.findIndex(c => c.id === collectionId)
    if (collIdx === -1) return error(request, env, 'not_found', 'Collection not found', 404)
    const collection = current.state.collections[collIdx]
    const cardIdx = collection.cards.findIndex(c => c.id === cardId)
    if (cardIdx === -1) return error(request, env, 'not_found', 'Card not found', 404)
    const updatedCards = collection.cards.filter(c => c.id !== cardId)
    const updatedCollection: CardCollection = { ...collection, cards: updatedCards }
    const updatedCollections = [...current.state.collections]
    updatedCollections[collIdx] = updatedCollection
    const ok = await putUserCardsState(env, sessionToken, { collections: updatedCollections }, current.version)
    if (!ok) return error(request, env, 'internal_error', 'Failed to delete card', 500)
    return json(request, env, { success: true })
  }

  return error(request, env, 'not_found', 'Not found', 404)
}

async function handlePromoteCollection(request: Request, env: Env, _segments: string[]): Promise<Response> {
  const authHeader = request.headers.get('Authorization') ?? ''
  const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  if (!sessionToken) return error(request, env, 'unauthorized', 'Authorization required', 401)
  if (!(await verifyAdminFromSession(env, sessionToken))) {
    return error(request, env, 'forbidden', 'Admin role required to promote collections', 403)
  }

  let body: { collection?: unknown }
  try { body = (await request.json()) as { collection?: unknown } } catch {
    return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
  }
  const col = body.collection as CardCollection | undefined
  if (!col?.id || !col.title) return error(request, env, 'bad_request', 'collection with id and title is required', 400)

  const id = !col.id.startsWith('user_') ? col.id : col.id.replace(/^user_/, '')
  await env.CONTENT_DB.prepare(
	    `INSERT OR REPLACE INTO content_items (
	       id, template_id, title, slug, status, language_code, tags, categories, data,
	       app_id, type, parent_id, source_locale, speech, color_token, image_ref,
	       sort_order, is_default, is_published, metadata_json
	     )
     VALUES (?, 'cards.collection', ?, ?, 'published', 'en', NULL, '["cards"]', ?,
       'cards', 'collection', NULL, 'en', ?, ?, ?, ?, 1, 1, ?)`,
  ).bind(
    id,
    col.title,
    id,
    JSON.stringify({ mediaCategories: col.mediaCategories ?? [] }),
	    col.title,
	    asColorToken(col.color),
	    asImageRef(col.imageRef) ?? null,
	    col.order ?? 0,
    JSON.stringify({ mediaCategories: col.mediaCategories ?? [] }),
  ).run()

  if (Array.isArray(col.cards)) {
    for (const tile of col.cards) {
	      await env.CONTENT_DB.prepare(
	        `INSERT OR REPLACE INTO content_items (
	           id, template_id, title, slug, status, language_code, tags, categories, data,
	           app_id, type, parent_id, source_locale, speech, color_token, image_ref,
	           sort_order, is_default, is_published, metadata_json
	         )
	         VALUES (?, 'cards.card', ?, ?, 'published', 'en', NULL, '["cards"]', ?,
	           'cards', 'card', ?, 'en', ?, ?, ?, ?, 1, 1, ?)`,
      ).bind(
        tile.id,
        tile.title,
        tile.id,
        JSON.stringify({ collectionId: id }),
        id,
	        tile.speech,
	        asColorToken(tile.color, asColorToken(col.color)),
	        asImageRef(tile.imageRef) ?? null,
	        tile.order ?? 0,
        JSON.stringify({ collectionId: id }),
      ).run()
    }
  }

  await invalidateCardsCache(env)
  return json(request, env, { success: true, data: { ...col, id } })
}

export const internals = {
  executeQuery,
  getProjects,
  getProject,
  getPages,
  getPage,
  getPageWithFullContent,
  getLanguages,
  getItems,
  getItem,
  normalizeRow,
  getCardsCollections,
  putAdminCardsCollections,
}
