// Tiko content-api — D1-backed published content read model.
// Public reads only for now; admin mutations belong in admin-api.

interface Env {
  CONTENT_DB: D1Database
  CONTENT_CACHE?: KVNamespace
  USER_IMAGES?: R2Bucket
  ALLOWED_ORIGINS?: string
  APP_API_URL?: string
  ADMIN_SECRET?: string
  IDENTITY_API_URL?: string
  MEDIA_API_URL?: string
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement
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
  colorHex: number
  order: number
  imageRef?: string
}

interface CardCollection {
  id: string
  title: string
  colorHex: number
  order: number
  mediaCategories: string[]
  imageURL?: string
  cards: CardTile[]
}

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

async function invalidateCardsCache(env: Env): Promise<void> {
  if (env.CONTENT_CACHE) await env.CONTENT_CACHE.delete(CACHE_KEY_CARDS_COLLECTIONS)
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

async function cached<T>(request: Request, env: Env, key: string, loader: () => Promise<T>): Promise<T> {
  if (new URL(request.url).searchParams.get('no-cache') === '1' || !env.CONTENT_CACHE) return loader()
  const cachedValue = await env.CONTENT_CACHE.get(key)
  if (cachedValue) return JSON.parse(cachedValue) as T
  const value = await loader()
  await env.CONTENT_CACHE.put(key, JSON.stringify(value), { expirationTtl: CACHE_TTL_SECONDS })
  return value
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

interface CardsCollectionRow {
  id: string
  title: string
  color_hex: number
  display_order: number
  media_categories: string | null
}

interface CardsTileRow {
  id: string
  collection_id: string
  title: string
  speech: string
  color_hex: number
  display_order: number
  image_ref: string | null
}

// Map a hex color string ('#4CAF50') or number to a numeric colorHex.
function parseColorHex(color: unknown, fallback = 0x888888): number {
  if (typeof color === 'number') return color
  if (typeof color === 'string') {
    const hex = color.replace(/^#/, '')
    const n = parseInt(hex, 16)
    if (!isNaN(n)) return n
  }
  return fallback
}

// Map app-api CardsCollection format (web) to content-api CardCollection format (iOS).
interface AppApiCollection {
  id?: unknown
  title?: unknown
  color?: unknown
  order?: unknown
  mediaCategories?: unknown
  image?: unknown
  tiles?: unknown[]
}

function mapAppApiCollection(raw: AppApiCollection, index: number): CardCollection {
  const colorHex = parseColorHex(raw.color)
  const tiles = Array.isArray(raw.tiles) ? raw.tiles : []
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    colorHex,
    order: typeof raw.order === 'number' ? raw.order : index,
    mediaCategories: Array.isArray(raw.mediaCategories) ? (raw.mediaCategories as string[]) : [],
    ...(typeof raw.image === 'string' && raw.image ? { imageURL: raw.image } : {}),
    cards: tiles.map((t, i) => {
      const tile = t as { id?: unknown; title?: unknown; speech?: unknown; color?: unknown }
      return {
        id: String(tile.id ?? ''),
        title: String(tile.title ?? ''),
        speech: String(tile.speech ?? tile.title ?? ''),
        colorHex: parseColorHex(tile.color, colorHex),
        order: i,
      }
    }),
  }
}

async function getDefaultCollections(env: Env): Promise<CardCollection[]> {
  // Primary: app-api global defaults (single source of truth shared with web app)
  if (env.APP_API_URL) {
    try {
      const appBase = env.APP_API_URL.replace(/\/$/, '')
      const resp = await fetch(`${appBase}/v1/apps/defaults/cards/state`)
      if (resp.ok) {
        const body = (await resp.json()) as { state?: { collections?: unknown[] } }
        const cols = body?.state?.collections
        if (Array.isArray(cols) && cols.length > 0) {
          return (cols as AppApiCollection[]).map(mapAppApiCollection)
        }
      }
    } catch {
      // fall through to DB
    }
  }

  // Fallback: content-DB cards_collections table
  const { results: collectionRows } = await env.CONTENT_DB.prepare(
    `SELECT id, title, color_hex, display_order, media_categories
     FROM cards_collections
     WHERE is_active = 1
     ORDER BY display_order ASC`,
  ).all<CardsCollectionRow>()

  const { results: tileRows } = await env.CONTENT_DB.prepare(
    `SELECT id, collection_id, title, speech, color_hex, display_order, image_ref
     FROM cards_tiles
     ORDER BY collection_id, display_order ASC`,
  ).all<CardsTileRow>()

  const tilesByCollection = new Map<string, CardTile[]>()
  for (const row of tileRows) {
    const tile: CardTile = {
      id: row.id,
      title: row.title,
      speech: row.speech,
      colorHex: row.color_hex,
      order: row.display_order,
      imageRef: row.image_ref ?? undefined,
    }
    const existing = tilesByCollection.get(row.collection_id)
    if (existing) { existing.push(tile) } else { tilesByCollection.set(row.collection_id, [tile]) }
  }

  return collectionRows.map((row) => {
    const cats = parseJsonArray(row.media_categories) as string[]
    const imageURL = cats.find(c => c.startsWith('http'))
    return {
      id: row.id,
      title: row.title,
      colorHex: row.color_hex,
      order: row.display_order,
      mediaCategories: cats.filter(c => !c.startsWith('http')),
      ...(imageURL ? { imageURL } : {}),
      cards: tilesByCollection.get(row.id) ?? [],
    }
  })
}

async function getCardsCollections(env: Env, sessionToken?: string): Promise<{ collections: CardCollection[] }> {
  const defaults = await getDefaultCollections(env)

  if (!sessionToken || !env.APP_API_URL) {
    return { collections: defaults }
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
        for (const col of defaults) merged.set(col.id, col)
        for (const col of userCollections as CardCollection[]) merged.set(col.id, col)
        return { collections: Array.from(merged.values()) }
      }
    }
  } catch {
    // silently fall through to defaults
  }

  return { collections: defaults }
}

async function putAdminCardsCollections(
  env: Env,
  collections: CardCollection[],
): Promise<{ success: boolean; count: number }> {
  if (!Array.isArray(collections) || collections.length === 0) {
    throw new Error('collections must be a non-empty array')
  }

  await env.CONTENT_DB.prepare(`DELETE FROM cards_collections`).run()

  for (const col of collections) {
    await env.CONTENT_DB.prepare(
      `INSERT INTO cards_collections (id, title, color_hex, display_order, media_categories, language_code, is_active)
       VALUES (?, ?, ?, ?, ?, 'en', 1)`,
    )
      .bind(
        col.id,
        col.title,
        col.colorHex ?? 0,
        col.order ?? 0,
        JSON.stringify(col.mediaCategories ?? []),
      )
      .run()

    if (Array.isArray(col.cards)) {
      for (const tile of col.cards) {
        await env.CONTENT_DB.prepare(
          `INSERT INTO cards_tiles (id, collection_id, title, speech, color_hex, display_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
          .bind(tile.id, col.id, tile.title, tile.speech, tile.colorHex ?? 0, tile.order ?? 0)
          .run()
      }
    }
  }

  return { success: true, count: collections.length }
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
    let body: { id?: unknown; title?: unknown; colorHex?: unknown; order?: unknown; imageURL?: unknown }
    try { body = (await request.json()) as typeof body } catch {
      return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return error(request, env, 'bad_request', 'title is required', 400)

    const current = await getUserCardsState(env, sessionToken)
    if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)

    const colors = [0xFF6B6B, 0xFFD93D, 0x6BCB77, 0x4D96FF, 0xFF922B, 0xCC5DE8]
    const id = typeof body.id === 'string' && body.id.startsWith('user_') ? body.id : `user_${crypto.randomUUID()}`
    const colorHex = typeof body.colorHex === 'number' ? body.colorHex : colors[current.state.collections.length % colors.length]
    const order = typeof body.order === 'number' ? body.order : current.state.collections.length
    const imageURL = typeof body.imageURL === 'string' && body.imageURL ? body.imageURL : undefined
    const newCollection: CardCollection = { id, title, colorHex, order, mediaCategories: [], ...(imageURL ? { imageURL } : {}), cards: [] }

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
    let body: { id?: unknown; title?: unknown; speech?: unknown; colorHex?: unknown; order?: unknown; imageURL?: unknown; imageRef?: unknown }
    try { body = (await request.json()) as typeof body } catch {
      return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return error(request, env, 'bad_request', 'title is required', 400)
    const speech = typeof body.speech === 'string' && body.speech.trim() ? body.speech.trim() : title
    const colorHex = typeof body.colorHex === 'number' ? body.colorHex : 0
    const order = typeof body.order === 'number' ? body.order : 0

    if (isDefault) {
      if (!(await verifyAdminFromSession(env, sessionToken))) {
        return error(request, env, 'forbidden', 'Admin role required to add cards to default collections', 403)
      }
      const id = `__default_${crypto.randomUUID().replace(/-/g, '')}`
      const imageRef = typeof body.imageRef === 'string' && body.imageRef ? body.imageRef : null
      await env.CONTENT_DB.prepare(
        'INSERT INTO cards_tiles (id, collection_id, title, speech, color_hex, display_order, image_ref) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(id, collectionId, title, speech, colorHex, order, imageRef).run()
      await invalidateCardsCache(env)
      const newCard: CardTile = { id, title, speech, colorHex, order, ...(imageRef ? { imageRef } : {}) }
      return json(request, env, { success: true, data: newCard }, 201)
    }

    const current = await getUserCardsState(env, sessionToken)
    if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)

    const collectionIndex = current.state.collections.findIndex(c => c.id === collectionId)
    if (collectionIndex === -1) return error(request, env, 'not_found', 'Collection not found', 404)

    const collection = current.state.collections[collectionIndex]
    const id = typeof body.id === 'string' && body.id.startsWith('user_') ? body.id : `user_${crypto.randomUUID()}`
    const resolvedColor = colorHex || collection.colorHex
    const resolvedOrder = order || collection.cards.length
    const imageURL = typeof body.imageURL === 'string' && body.imageURL ? body.imageURL : undefined
    const newCard: CardTile = { id, title, speech, colorHex: resolvedColor, order: resolvedOrder, ...(imageURL ? { imageURL } : {}) }

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

function requireAdminSecret(request: Request, env: Env): Response | null {
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!env.ADMIN_SECRET || token !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ success: false, error: { code: 'unauthorized', message: 'Unauthorized' } }), {
      status: 401,
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
  if (!env.USER_IMAGES) return new Response('Not found', { status: 404 })

  const row = await env.CONTENT_DB.prepare('SELECT r2_key, content_type FROM user_images WHERE id = ?').bind(imageId).first<{ r2_key: string; content_type: string }>()
  if (!row) return new Response('Not found', { status: 404 })

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

    if (sessionToken) {
      const data = await getCardsCollections(env, sessionToken)
      return json(request, env, { success: true, data }, 200, { 'Cache-Control': 'no-store' })
    }

    const data = await cached(request, env, CACHE_KEY_CARDS_COLLECTIONS, () => getCardsCollections(env))
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
    const cacheKey = `query:${JSON.stringify(query)}`
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
      const authError = requireAdminSecret(request, env)
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

    return error(request, env, 'method_not_allowed', 'Method not allowed', 405)
  },
}

async function verifyAdminFromSession(env: Env, sessionToken: string): Promise<boolean> {
  const baseURL = env.IDENTITY_API_URL ?? 'https://identity.tikoapi.org/v1'
  try {
    const resp = await fetch(`${baseURL}/identity/session`, {
      headers: { Authorization: `Bearer ${sessionToken}`, Accept: 'application/json' },
    })
    if (!resp.ok) return false
    const body = (await resp.json()) as { roles?: string[]; capabilities?: { canEditContent?: boolean } }
    if (Array.isArray(body.roles) && (body.roles.includes('admin') || body.roles.includes('content_editor'))) return true
    if (body.capabilities?.canEditContent === true) return true
    return false
  } catch {
    return false
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

    let body: { title?: unknown; colorHex?: unknown; imageURL?: unknown }
    try { body = (await request.json()) as typeof body } catch {
      return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return error(request, env, 'bad_request', 'title is required', 400)
    if (typeof body.colorHex !== 'number') return error(request, env, 'bad_request', 'colorHex is required', 400)
    const colorHex = body.colorHex
    const imageURL = typeof body.imageURL === 'string' && body.imageURL ? body.imageURL : undefined

    if (isDefault) {
      if (!(await verifyAdminFromSession(env, sessionToken))) {
        // Non-admin: store override in user state so it persists and is merged on next load
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
          order: base?.order ?? 0,
          title,
          colorHex,
          ...(imageURL !== undefined ? { imageURL } : {}),
        }

        const updatedCollections = existingIdx >= 0
          ? current.state.collections.map((c, i) => i === existingIdx ? updated : c)
          : [...current.state.collections, updated]

        const ok = await putUserCardsState(env, sessionToken, { collections: updatedCollections }, current.version)
        if (!ok) return error(request, env, 'internal_error', 'Failed to save collection', 500)
        return json(request, env, { success: true, data: updated })
      }
      // Admin: update global defaults in content-DB
      const sets: string[] = ['title = ?', 'color_hex = ?']
      const values: unknown[] = [title, colorHex]
      if (imageURL !== undefined) { sets.push('media_categories = ?') && values.push(JSON.stringify([imageURL])) }
      values.push(collectionId)
      await env.CONTENT_DB.prepare(`UPDATE cards_collections SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run()
      await invalidateCardsCache(env)
      const updated: CardCollection = { id: collectionId, title, colorHex, order: 0, mediaCategories: imageURL ? [imageURL] : [], ...(imageURL ? { imageURL } : {}), cards: [] }
      return json(request, env, { success: true, data: updated })
    }

    const current = await getUserCardsState(env, sessionToken)
    if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)
    const idx = current.state.collections.findIndex(c => c.id === collectionId)
    if (idx === -1) return error(request, env, 'not_found', 'Collection not found', 404)
    const existing = current.state.collections[idx]
    const updatedCollection: CardCollection = { ...existing, title, ...(colorHex !== undefined ? { colorHex } : {}), ...(imageURL ? { imageURL } : {}) }
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

    let body: { title?: unknown; speech?: unknown; colorHex?: unknown; imageRef?: unknown }
    try { body = (await request.json()) as typeof body } catch {
      return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return error(request, env, 'bad_request', 'title is required', 400)
    const speech = typeof body.speech === 'string' && body.speech.trim() ? body.speech.trim() : title
    if (typeof body.colorHex !== 'number') return error(request, env, 'bad_request', 'colorHex is required', 400)
    const colorHex = body.colorHex

    if (isDefault) {
      if (!(await verifyAdminFromSession(env, sessionToken))) {
        return error(request, env, 'forbidden', 'Admin role required to edit default cards', 403)
      }
      const imageRef = typeof body.imageRef === 'string' && body.imageRef ? body.imageRef : null
      await env.CONTENT_DB.prepare('UPDATE cards_tiles SET title = ?, speech = ?, color_hex = ?, image_ref = ? WHERE id = ?').bind(title, speech, colorHex, imageRef, cardId).run()
      await invalidateCardsCache(env)
      const updatedCard: CardTile = { id: cardId, title, speech, colorHex, order: 0, ...(imageRef ? { imageRef } : {}) }
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
    const updatedCard: CardTile = { ...existingCard, title, speech, ...(colorHex !== undefined ? { colorHex } : {}) }
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
      await env.CONTENT_DB.prepare('DELETE FROM cards_tiles WHERE collection_id = ?').bind(collectionId).run()
      await env.CONTENT_DB.prepare('DELETE FROM cards_collections WHERE id = ?').bind(collectionId).run()
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
      await env.CONTENT_DB.prepare('DELETE FROM cards_tiles WHERE id = ? AND collection_id = ?').bind(cardId, collectionId).run()
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
    'INSERT OR REPLACE INTO cards_collections (id, title, color_hex, display_order, media_categories, language_code, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
  ).bind(id, col.title, col.colorHex ?? 0, col.order ?? 0, JSON.stringify(col.mediaCategories ?? []), 'en').run()

  if (Array.isArray(col.cards)) {
    for (const tile of col.cards) {
      await env.CONTENT_DB.prepare(
        'INSERT OR REPLACE INTO cards_tiles (id, collection_id, title, speech, color_hex, display_order, image_ref) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(tile.id, id, tile.title, tile.speech, tile.colorHex ?? 0, tile.order ?? 0, tile.imageRef ?? null).run()
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
