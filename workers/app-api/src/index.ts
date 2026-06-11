import { authenticate, type AuthEnv } from '../../shared/auth'
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

export interface Env extends AuthEnv {
  APP_DB: D1Database
  IDENTITY_DB?: D1Database
  TOKEN_PEPPER?: string
  ALLOWED_ORIGINS?: string
}

export type TikoAppId = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'radio' | 'media' | 'admin' | 'tiko' | 'todo' | 'talk'
type AppResource = 'settings' | 'state' | 'progress'

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

interface SessionJoinRow {
  user_id: string
  device_id: string | null
  expires_at: string
}

const DEFAULT_ALLOWED_ORIGINS = 'https://tiko.mt,https://www.tiko.mt,https://tiko.tikoapps.org,https://yesno.tikoapps.org,https://cards.tikoapps.org,https://sequence.tikoapps.org,https://type.tikoapps.org,https://timer.tikoapps.org,https://admin.tikoapps.org,https://admin.tikoapi.org,https://dev.tiko.tikoapps.org,https://dev.yesno.tikoapps.org,https://dev.cards.tikoapps.org,https://dev.sequence.tikoapps.org,https://dev.type.tikoapps.org,https://dev.timer.tikoapps.org,https://dev.admin.tikoapps.org,http://localhost:5173,http://localhost:4173,capacitor://localhost,ionic://localhost,tiko://native'

interface AppDataRow {
  data_json: string
  updated_at: string
  version: number
}

const APPS = ['yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'media', 'admin', 'tiko', 'todo', 'talk'] as const
const DEFAULTS: Record<TikoAppId, Record<AppResource, JsonValue>> = {
  'yes-no': {
    settings: { language: 'en', colorMode: 'system', spokenPrompt: 'Make a choice.' },
    state: { prompt: 'Yes or no?', lastAnswer: null },
    progress: {}
  },
  type: {
    settings: { language: 'en', colorMode: 'system', keyboardLayout: 'qwerty' },
    state: { text: '', completedPrompts: [] },
    progress: {}
  },
  cards: { settings: {}, state: {}, progress: {} },
  sequence: { settings: {}, state: {}, progress: {} },
  timer: { settings: {}, state: {}, progress: {} },
  radio: { settings: {}, state: {}, progress: {} },
  media: { settings: {}, state: {}, progress: {} },
  admin: { settings: {}, state: {}, progress: {} },
  tiko: { settings: {}, state: {}, progress: {} },
  todo: { settings: {}, state: {}, progress: {} },
  talk: { settings: {}, state: {}, progress: {} }
}

interface AppConfigRow {
  app: string
  title: string
  app_color: string
  app_icon: string
  app_icon_media_category: string | null
  app_icon_image_url: string | null
  theme_color: string | null
  supported_languages_mode: string | null
  supported_languages_json: string | null
  updated_at: string
  version: number
}

const DEFAULT_APP_CONFIGS: Record<TikoAppId, AppConfigPayload> = {
  'yes-no': { id: 'yes-no', title: 'Yes No', appColor: 'yes-no', appIcon: 'ui/check-fat', appIconMediaCategory: 'emotions', themeColor: '#9b3fbd' },
  type: { id: 'type', title: 'Type', appColor: 'type', appIcon: 'ui/type', appIconMediaCategory: 'letters', themeColor: '#2488ff' },
  cards: { id: 'cards', title: 'Cards', appColor: 'cards', appIcon: 'education/book-2', appIconMediaCategory: 'animals', themeColor: '#ff8a1f' },
  sequence: { id: 'sequence', title: 'Sequence', appColor: 'sequence', appIcon: 'ui/list', appIconMediaCategory: 'routines', themeColor: '#16b8a6' },
  timer: { id: 'timer', title: 'Timer', appColor: 'timer', appIcon: 'ui/timer', appIconMediaCategory: 'transport', themeColor: '#f8c22e' },
  radio: { id: 'radio', title: 'Radio', appColor: 'radio', appIcon: 'media/headphones', appIconMediaCategory: 'music', themeColor: '#e84057' },
  media: { id: 'media', title: 'Media', appColor: 'media', appIcon: 'media/image', appIconMediaCategory: 'art', themeColor: '#2dd4bf' },
  admin: { id: 'admin', title: 'Admin', appColor: 'admin', appIcon: 'ui/settings', appIconMediaCategory: 'tools', themeColor: '#8b5cf6' },
  tiko: { id: 'tiko', title: 'Tiko', appColor: 'tiko', appIcon: 'ui/heart', appIconMediaCategory: 'tiko', themeColor: '#ef4f8f' },
  todo: { id: 'todo', title: 'Todo', appColor: 'todo', appIcon: 'ui/check-list', appIconMediaCategory: 'routines', themeColor: '#2488ff' },
  talk: { id: 'talk', title: 'Talk', appColor: 'talk', appIcon: 'ui/talk', appIconMediaCategory: 'communication', themeColor: '#17131c' }
}

interface AppConfigPayload {
  id: TikoAppId
  title: string
  appColor: TikoAppId
  appIcon: string
  appIconMediaCategory?: string
  appIconImageUrl?: string
  themeColor?: string
  supportedLanguagesMode?: 'tiko-defaults' | 'custom'
  supportedLanguages?: string[]
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

    // Public app config endpoints — values are admin-managed with static fallbacks.
    if (path === '/v1/apps/config' && request.method === 'GET') return withCors(await readAppConfigs(env), cors)
    const configMatch = /^\/v1\/apps\/config\/([^/]+)$/.exec(path)
    if (configMatch) {
      const app = parseApp(configMatch[1])
      if (request.method === 'GET') return withCors(await readAppConfig(env, app), cors)
      return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
    }

    // Global defaults endpoints — public GET, admin-protected PUT
    const defaultsMatch = /^\/v1\/apps\/defaults\/([^/]+)\/(settings|state)$/.exec(path)
    if (defaultsMatch) {
      const app = parseApp(defaultsMatch[1])
      const resource = defaultsMatch[2] as AppResource
      if (request.method === 'GET') return withCors(await readDefaults(env, app, resource), cors)
      if (request.method === 'PUT') {
        await requireAdminSession(request, env)
        return withCors(await writeDefaults(request, env, app, resource), cors)
      }
      return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
    }

    const match = /^\/v1\/apps\/([^/]+)\/(settings|state|progress)$/.exec(path)

    if (!match) {
      // Reset endpoints
      const resetMatch = /^\/v1\/apps\/([^/]+)\/resets\/(app|progress)$/.exec(path)
      if (resetMatch) {
        const app = parseApp(resetMatch[1])
        const resetType = resetMatch[2]
        const session = await requireSession(request, env)
        if (request.method !== 'POST') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
        if (resetType === 'app') return withCors(await resetApp(env, session.user_id, app, request), cors)
        return withCors(await resetAppProgress(env, session.user_id, app, request), cors)
      }
      return withCors(jsonError('not_found', 'Route not found.', 404), cors)
    }

    const app = parseApp(match[1])
    const resource = match[2] as AppResource
    const session = await requireSession(request, env)

    if (request.method === 'GET') return withCors(await readAppData(env, session.user_id, app, resource), cors)
    if (request.method === 'PUT') return withCors(await writeAppData(request, env, session.user_id, app, resource), cors)
    if (request.method === 'DELETE' && resource === 'progress') return withCors(await clearAppProgress(env, session.user_id, app), cors)

    return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
  } catch (error) {
    if (error instanceof HttpError) {
      return withCors(jsonError(error.code, error.message, error.status, error.field), cors)
    }
    return withCors(jsonError('internal_error', 'Unexpected server error.', 500), cors)
  }
}


async function readAppConfigs(env: Env): Promise<Response> {
  const { results } = await env.APP_DB.prepare('SELECT app, title, app_color, app_icon, app_icon_media_category, app_icon_image_url, theme_color, supported_languages_mode, supported_languages_json, updated_at, version FROM app_config').all<AppConfigRow>()
  const rows = new Map((results ?? []).map((row) => [row.app, row]))
  const configs = Object.fromEntries(APPS.map((app) => [app, rowToConfig(app, rows.get(app) ?? null)]))
  return json({ configs, updatedAt: latestUpdatedAt(results ?? []) })
}

async function readAppConfig(env: Env, app: TikoAppId): Promise<Response> {
  const row = await first<AppConfigRow>(env.APP_DB.prepare('SELECT app, title, app_color, app_icon, app_icon_media_category, app_icon_image_url, theme_color, supported_languages_mode, supported_languages_json, updated_at, version FROM app_config WHERE app = ?').bind(app))
  return json({ config: rowToConfig(app, row), updatedAt: row?.updated_at ?? null, version: row ? Number(row.version) : 0 })
}

function rowToConfig(app: TikoAppId, row: AppConfigRow | null): AppConfigPayload {
  const fallback = DEFAULT_APP_CONFIGS[app]
  if (!row) return fallback
  return {
    id: app,
    title: row.title || fallback.title,
    appColor: parseConfigColor(row.app_color, fallback.appColor),
    appIcon: row.app_icon || fallback.appIcon,
    ...(row.app_icon_media_category ? { appIconMediaCategory: row.app_icon_media_category } : fallback.appIconMediaCategory ? { appIconMediaCategory: fallback.appIconMediaCategory } : {}),
    ...(row.app_icon_image_url ? { appIconImageUrl: row.app_icon_image_url } : fallback.appIconImageUrl ? { appIconImageUrl: fallback.appIconImageUrl } : {}),
    ...(row.theme_color ? { themeColor: row.theme_color } : fallback.themeColor ? { themeColor: fallback.themeColor } : {}),
    supportedLanguagesMode: row.supported_languages_mode === 'custom' ? 'custom' : 'tiko-defaults',
    supportedLanguages: parseLanguageList(row.supported_languages_json)
  }
}

function parseLanguageList(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function parseConfigColor(value: string, fallback: TikoAppId): TikoAppId {
  return (APPS as readonly string[]).includes(value) ? value as TikoAppId : fallback
}

function latestUpdatedAt(rows: AppConfigRow[]): string | null {
  return rows.reduce<string | null>((latest, row) => !latest || row.updated_at > latest ? row.updated_at : latest, null)
}

async function readAppData(env: Env, userId: string, app: TikoAppId, resource: AppResource): Promise<Response> {
  const row = await first<AppDataRow>(env.APP_DB.prepare(`
    SELECT data_json, updated_at, version
    FROM ${tableName(resource)}
    WHERE user_id = ? AND app = ?
  `).bind(userId, app))

  if (!row) return json(payload(app, resource, cloneDefault(app, resource), null, 0))

  return json(payload(app, resource, parseStoredJson(row.data_json), row.updated_at, Number(row.version)))
}

async function writeAppData(request: Request, env: Env, userId: string, app: TikoAppId, resource: AppResource): Promise<Response> {
  const body = await readJson<Record<string, unknown>>(request)
  const key = resource
  const value = body[key]
  if (!isJsonObject(value)) throw new HttpError(400, 'invalid_request', `${key} must be a JSON object.`, key)

  const expectedVersion = optionalVersion(body.version)
  const existing = await first<AppDataRow>(env.APP_DB.prepare(`
    SELECT data_json, updated_at, version
    FROM ${tableName(resource)}
    WHERE user_id = ? AND app = ?
  `).bind(userId, app))
  const currentVersion = existing ? Number(existing.version) : 0
  if (expectedVersion !== null && expectedVersion !== currentVersion) {
    throw new HttpError(409, 'version_conflict', 'Stored version does not match requested version.', 'version')
  }

  const now = new Date().toISOString()
  const nextVersion = currentVersion + 1
  await run(env.APP_DB.prepare(`
    INSERT INTO ${tableName(resource)} (user_id, app, data_json, updated_at, version)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, app) DO UPDATE SET
      data_json = excluded.data_json,
      updated_at = excluded.updated_at,
      version = excluded.version
  `).bind(userId, app, JSON.stringify(value), now, nextVersion))

  return json(payload(app, resource, value as JsonValue, now, nextVersion))
}

// ---------------------------------------------------------------------------
// Global defaults (admin-editable, public-read)
// ---------------------------------------------------------------------------

async function readDefaults(env: Env, app: TikoAppId, resource: AppResource): Promise<Response> {
  const row = await first<AppDataRow>(env.APP_DB.prepare(
    'SELECT data_json, updated_at, version FROM app_defaults WHERE app = ? AND resource = ?'
  ).bind(app, resource))

  if (!row) return json(payload(app, resource, cloneDefault(app, resource), null, 0))

  return json(payload(app, resource, parseStoredJson(row.data_json), row.updated_at, Number(row.version)))
}

async function writeDefaults(request: Request, env: Env, app: TikoAppId, resource: AppResource): Promise<Response> {
  const body = await readJson<Record<string, unknown>>(request)
  const key = resource
  const value = body[key]
  if (!isJsonObject(value)) throw new HttpError(400, 'invalid_request', `${key} must be a JSON object.`, key)

  const expectedVersion = optionalVersion(body.version)
  const existing = await first<AppDataRow>(env.APP_DB.prepare(
    'SELECT data_json, updated_at, version FROM app_defaults WHERE app = ? AND resource = ?'
  ).bind(app, resource))
  const currentVersion = existing ? Number(existing.version) : 0
  if (expectedVersion !== null && expectedVersion !== currentVersion) {
    throw new HttpError(409, 'version_conflict', 'Stored version does not match requested version.', 'version')
  }

  const now = new Date().toISOString()
  const nextVersion = currentVersion + 1
  await run(env.APP_DB.prepare(
    `INSERT INTO app_defaults (app, resource, data_json, updated_at, version)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(app, resource) DO UPDATE SET
       data_json = excluded.data_json,
       updated_at = excluded.updated_at,
       version = excluded.version`
  ).bind(app, resource, JSON.stringify(value), now, nextVersion))

  return json(payload(app, resource, value as JsonValue, now, nextVersion))
}

function payload(app: TikoAppId, resource: AppResource, value: JsonValue, updatedAt: string | null, version: number) {
  return { app, [resource]: value, updatedAt, version }
}

// ---------------------------------------------------------------------------
// App reset endpoints
// ---------------------------------------------------------------------------

async function resetApp(env: Env, userId: string, app: TikoAppId, request: Request): Promise<Response> {
  const body = await readJson<Record<string, unknown>>(request).catch(() => ({} as Record<string, unknown>))
  if ((body as { confirmation?: string }).confirmation !== 'reset_app') {
    return jsonError('confirmation_required', 'Confirmation string "reset_app" is required.', 400)
  }
  const now = new Date().toISOString()
  const settingsDefault = cloneDefault(app, 'settings')
  const stateDefault = cloneDefault(app, 'state')
  const progressDefault = cloneDefault(app, 'progress')
  await run(env.APP_DB.prepare('INSERT INTO app_settings (user_id, app, data_json, updated_at, version) VALUES (?, ?, ?, ?, 1) ON CONFLICT(user_id, app) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at, version = version + 1')
    .bind(userId, app, JSON.stringify(settingsDefault), now))
  await run(env.APP_DB.prepare('INSERT INTO app_state (user_id, app, data_json, updated_at, version) VALUES (?, ?, ?, ?, 1) ON CONFLICT(user_id, app) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at, version = version + 1')
    .bind(userId, app, JSON.stringify(stateDefault), now))
  await run(env.APP_DB.prepare('INSERT INTO app_progress (user_id, app, data_json, updated_at, version) VALUES (?, ?, ?, ?, 1) ON CONFLICT(user_id, app) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at, version = version + 1')
    .bind(userId, app, JSON.stringify(progressDefault), now))
  return json({ app, reset: 'app', status: 'completed', categoriesAffected: ['preferences', 'app_state', 'progress'], resetAt: now }, 202)
}

async function resetAppProgress(env: Env, userId: string, app: TikoAppId, request: Request): Promise<Response> {
  const body = await readJson<Record<string, unknown>>(request).catch(() => ({} as Record<string, unknown>))
  if ((body as { confirmation?: string }).confirmation !== 'reset_progress') {
    return jsonError('confirmation_required', 'Confirmation string "reset_progress" is required.', 400)
  }
  const now = new Date().toISOString()
  const progressDefault = cloneDefault(app, 'progress')
  await run(env.APP_DB.prepare('INSERT INTO app_progress (user_id, app, data_json, updated_at, version) VALUES (?, ?, ?, ?, 1) ON CONFLICT(user_id, app) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at, version = version + 1')
    .bind(userId, app, JSON.stringify(progressDefault), now))
  return json({ app, reset: 'progress', status: 'completed', categoriesAffected: ['progress'], resetAt: now }, 202)
}

// ---------------------------------------------------------------------------
// Progress clear (DELETE /apps/{app}/progress)
// ---------------------------------------------------------------------------

async function clearAppProgress(env: Env, userId: string, app: TikoAppId): Promise<Response> {
  const now = new Date().toISOString()
  const empty = JSON.stringify({})
  await run(env.APP_DB.prepare(
    'INSERT INTO app_progress (user_id, app, data_json, updated_at, version) VALUES (?, ?, ?, ?, 1) ON CONFLICT(user_id, app) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at, version = version + 1'
  ).bind(userId, app, empty, now))
  return json({ app, progress: {}, updatedAt: now, version: 1 })
}

async function requireSession(request: Request, env: Env): Promise<SessionJoinRow> {
  const authed = await authenticate(request, env)
  if (authed.ok && authed.method === 'session' && authed.userId) {
    return { user_id: authed.userId, device_id: null, expires_at: '' }
  }

  // Backward-compatible local fallback for older deployments/tests that validate
  // app sessions directly from D1. Production should use identity-api validation
  // through IDENTITY_SERVICE so app-api does not need a copied TOKEN_PEPPER secret.
  if (env.IDENTITY_DB && env.TOKEN_PEPPER) {
    const sessionToken = requireBearer(request)
    const tokenHash = await hashToken(sessionToken, env.TOKEN_PEPPER)
    const row = await first<SessionJoinRow>(env.IDENTITY_DB.prepare(`
      SELECT s.subject_id AS user_id, s.device_id, s.expires_at
      FROM identity_sessions s
      JOIN identity_subjects u ON u.id = s.subject_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
    `).bind(tokenHash, new Date().toISOString()))
    if (row) return row
  }

  if (authed.ok && authed.method === 'api_key') throw new HttpError(403, 'session_required', 'A Tiko user session is required.')
  throw new HttpError(401, 'unauthorized', 'Session is invalid or expired.')
}

async function requireAdminSession(request: Request, env: Env): Promise<void> {
  await requireSession(request, env)
  const token = requireBearer(request)
  const baseUrl = (env.IDENTITY_BASE_URL ?? 'https://api.tikotalks.com/v1').replace(/\/$/, '')
  const url = `${baseUrl}/identity/session`
  const init: RequestInit = { headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } }
  try {
    const response = env.IDENTITY_SERVICE ? await env.IDENTITY_SERVICE.fetch(url, init) : await fetch(url, init)
    if (!response.ok) throw new HttpError(403, 'forbidden', 'Admin access required.')
    const body = (await response.json()) as { roles?: string[]; capabilities?: { canEditContent?: boolean } }
    const isAdmin = (Array.isArray(body.roles) && (body.roles.includes('admin') || body.roles.includes('content_editor')))
      || body.capabilities?.canEditContent === true
    if (!isAdmin) throw new HttpError(403, 'forbidden', 'Admin access required.')
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(403, 'forbidden', 'Admin access required.')
  }
}

async function requireAnyAuth(request: Request, env: Env): Promise<void> {
  const authed = await authenticate(request, env)
  if (authed.ok) return
  throw new HttpError(401, 'unauthorized', 'Authentication required.')
}

export async function hashToken(value: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`tiko:session:${pepper}:${value}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function parseApp(value: string): TikoAppId {
  if ((APPS as readonly string[]).includes(value)) return value as TikoAppId
  throw new HttpError(404, 'unknown_app', 'App is not registered for shared data.', 'app')
}

function tableName(resource: AppResource): 'app_settings' | 'app_state' | 'app_progress' {
  if (resource === 'settings') return 'app_settings'
  if (resource === 'state') return 'app_state'
  return 'app_progress'
}

function cloneDefault(app: TikoAppId, resource: AppResource): JsonValue {
  return JSON.parse(JSON.stringify(DEFAULTS[app][resource])) as JsonValue
}

function parseStoredJson(value: string): JsonValue {
  try {
    return JSON.parse(value) as JsonValue
  } catch {
    return {}
  }
}

async function readJson<T>(request: Request): Promise<T> {
  if (!request.body) return {} as T
  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON.')
  }
}

function isJsonObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalVersion(value: unknown): number | null {
  if (value === undefined || value === null) return null
  if (!Number.isInteger(value) || Number(value) < 0) throw new HttpError(400, 'invalid_request', 'version must be a non-negative integer.', 'version')
  return Number(value)
}

function getBearer(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1]?.trim() || null
}

function requireBearer(request: Request): string {
  const bearer = getBearer(request)
  if (!bearer) throw new HttpError(401, 'unauthorized', 'Bearer session token is required.')
  return bearer
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

function jsonError(code: string, message: string, status: number, field?: string): Response {
  return json({ error: { code, message, field } }, status)
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers()
  const origin = request.headers.get('origin')
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS).split(',').map((entry) => entry.trim()).filter(Boolean)
  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
    headers.set('access-control-allow-origin', origin)
    headers.set('vary', 'Origin')
  } else if (allowedOrigins.includes('*')) {
    headers.set('access-control-allow-origin', '*')
  }
  headers.set('access-control-allow-methods', 'GET,PUT,POST,DELETE,OPTIONS')
  headers.set('access-control-allow-headers', 'authorization,content-type')
  headers.set('access-control-max-age', '86400')
  return headers
}

function withCors(response: Response, cors: Headers): Response {
  const headers = new Headers(response.headers)
  cors.forEach((value, key) => headers.set(key, value))
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

async function first<T>(statement: D1PreparedStatement): Promise<T | null> {
  return statement.first<T>()
}

async function run(statement: D1PreparedStatement): Promise<void> {
  await statement.run()
}

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly field?: string) {
    super(message)
  }
}
