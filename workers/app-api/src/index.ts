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

export interface Env {
  APP_DB: D1Database
  IDENTITY_DB: D1Database
  TOKEN_PEPPER: string
  ALLOWED_ORIGINS?: string
}

export type TikoAppId = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer'
type AppResource = 'settings' | 'state'

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

interface SessionJoinRow {
  user_id: string
  user_kind: 'device' | 'recoverable'
  device_id: string
  expires_at: string
}

const DEFAULT_ALLOWED_ORIGINS = 'https://tiko.mt,https://www.tiko.mt,https://tiko.tikoapps.org,https://yesno.tikoapps.org,https://cards.tikoapps.org,https://sequence.tikoapps.org,https://type.tikoapps.org,https://timer.tikoapps.org,https://admin.tikoapps.org,https://dev.tiko.tikoapps.org,https://dev.yesno.tikoapps.org,https://dev.cards.tikoapps.org,https://dev.sequence.tikoapps.org,https://dev.type.tikoapps.org,https://dev.timer.tikoapps.org,https://dev.admin.tikoapps.org,http://localhost:5173,http://localhost:4173,capacitor://localhost,ionic://localhost,tiko://native'

interface AppDataRow {
  data_json: string
  updated_at: string
  version: number
}

const APPS = ['yes-no', 'type', 'cards', 'sequence', 'timer'] as const
const DEFAULTS: Record<TikoAppId, Record<AppResource, JsonValue>> = {
  'yes-no': {
    settings: { language: 'en', colorMode: 'system', spokenPrompt: 'Make a choice.' },
    state: { prompt: 'Yes or no?', lastAnswer: null }
  },
  type: {
    settings: { language: 'en', colorMode: 'system', keyboardLayout: 'qwerty' },
    state: { text: '', completedPrompts: [] }
  },
  cards: { settings: {}, state: {} },
  sequence: { settings: {}, state: {} },
  timer: { settings: {}, state: {} }
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
    const match = /^\/v1\/apps\/([^/]+)\/(settings|state)$/.exec(path)

    if (!match) return withCors(jsonError('not_found', 'Route not found.', 404), cors)

    const app = parseApp(match[1])
    const resource = match[2] as AppResource
    const session = await requireSession(request, env)

    if (request.method === 'GET') return withCors(await readAppData(env, session.user_id, app, resource), cors)
    if (request.method === 'PUT') return withCors(await writeAppData(request, env, session.user_id, app, resource), cors)

    return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
  } catch (error) {
    if (error instanceof HttpError) {
      return withCors(jsonError(error.code, error.message, error.status, error.field), cors)
    }
    return withCors(jsonError('internal_error', 'Unexpected server error.', 500), cors)
  }
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

function payload(app: TikoAppId, resource: AppResource, value: JsonValue, updatedAt: string | null, version: number) {
  return { app, [resource]: value, updatedAt, version }
}

async function requireSession(request: Request, env: Env): Promise<SessionJoinRow> {
  const sessionToken = requireBearer(request)
  const tokenHash = await hashToken(sessionToken, env.TOKEN_PEPPER)
  const row = await first<SessionJoinRow>(env.IDENTITY_DB.prepare(`
    SELECT s.user_id, u.kind AS user_kind, s.device_id, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN devices d ON d.id = s.device_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  `).bind(tokenHash, new Date().toISOString()))
  if (!row) throw new HttpError(401, 'unauthorized', 'Session is invalid or expired.')
  return row
}

export async function hashToken(value: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`${pepper}:${value}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function parseApp(value: string): TikoAppId {
  if ((APPS as readonly string[]).includes(value)) return value as TikoAppId
  throw new HttpError(404, 'unknown_app', 'App is not registered for shared data.', 'app')
}

function tableName(resource: AppResource): 'app_settings' | 'app_state' {
  return resource === 'settings' ? 'app_settings' : 'app_state'
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
  headers.set('access-control-allow-methods', 'GET,PUT,OPTIONS')
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
