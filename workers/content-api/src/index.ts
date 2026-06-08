// Tiko content-api — D1-backed published content read model.
// Public reads only for now; admin mutations belong in admin-api.

interface Env {
  CONTENT_DB: D1Database
  CONTENT_CACHE?: KVNamespace
  ALLOWED_ORIGINS?: string
  APP_API_URL?: string      // e.g. https://app.tikoapi.org  — for fetching user state
  ADMIN_SECRET?: string     // Bearer token required for admin mutation endpoints
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
  imageURL?: string
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
}

async function getCardsCollections(env: Env, sessionToken?: string): Promise<{ collections: CardCollection[] }> {
  const { results: collectionRows } = await env.CONTENT_DB.prepare(
    `SELECT id, title, color_hex, display_order, media_categories
     FROM cards_collections
     WHERE is_active = 1
     ORDER BY display_order ASC`,
  ).all<CardsCollectionRow>()

  const { results: tileRows } = await env.CONTENT_DB.prepare(
    `SELECT id, collection_id, title, speech, color_hex, display_order
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
    }
    const existing = tilesByCollection.get(row.collection_id)
    if (existing) {
      existing.push(tile)
    } else {
      tilesByCollection.set(row.collection_id, [tile])
    }
  }

  const defaults: CardCollection[] = collectionRows.map((row) => ({
    id: row.id,
    title: row.title,
    colorHex: row.color_hex,
    order: row.display_order,
    mediaCategories: parseJsonArray(row.media_categories) as string[],
    cards: tilesByCollection.get(row.id) ?? [],
  }))

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
    let body: { id?: unknown; title?: unknown; speech?: unknown; colorHex?: unknown; order?: unknown; imageURL?: unknown }
    try { body = (await request.json()) as typeof body } catch {
      return error(request, env, 'bad_request', 'Request body must be valid JSON', 400)
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return error(request, env, 'bad_request', 'title is required', 400)
    const speech = typeof body.speech === 'string' && body.speech.trim() ? body.speech.trim() : title

    const current = await getUserCardsState(env, sessionToken)
    if (!current) return error(request, env, 'unauthorized', 'Unauthorized', 401)

    const collectionIndex = current.state.collections.findIndex(c => c.id === collectionId)
    if (collectionIndex === -1) return error(request, env, 'not_found', 'Collection not found', 404)

    const collection = current.state.collections[collectionIndex]
    const id = typeof body.id === 'string' && body.id.startsWith('user_') ? body.id : `user_${crypto.randomUUID()}`
    const colorHex = typeof body.colorHex === 'number' ? body.colorHex : collection.colorHex
    const order = typeof body.order === 'number' ? body.order : collection.cards.length
    const imageURL = typeof body.imageURL === 'string' && body.imageURL ? body.imageURL : undefined
    const newCard: CardTile = { id, title, speech, colorHex, order, ...(imageURL ? { imageURL } : {}) }

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

    const data = await cached(request, env, 'cards:collections', () => getCardsCollections(env))
    return json(request, env, { success: true, data })
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
        return json(request, env, result)
      } catch (err) {
        return error(request, env, 'bad_request', err instanceof Error ? err.message : 'Failed to update collections', 400)
      }
    }

    return error(request, env, 'method_not_allowed', 'Method not allowed', 405)
  },
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
