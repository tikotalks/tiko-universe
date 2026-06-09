import { authenticate, type AuthEnv } from '../../shared/auth'

type D1Value = string | number | boolean | null

type TikoAppId = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'radio' | 'media' | 'admin' | 'tiko' | 'todo' | 'talk'
interface TikoAppConfigPayload {
  id: TikoAppId
  title: string
  appColor: TikoAppId
  appIcon: string
  appIconMediaCategory?: string
  appIconImageUrl?: string
  themeColor?: string
}
interface AppConfigRow {
  app: string
  title: string
  app_color: string
  app_icon: string
  app_icon_media_category: string | null
  app_icon_image_url: string | null
  theme_color: string | null
  updated_at: string
  version: number
}

interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement
}

export interface Env extends AuthEnv {
  AUTH_DB: D1Database
  APP_DB: D1Database
  TOKEN_PEPPER: string
  ADMIN_EMAIL?: string
  APP_API_URL?: string
  GENERATION_API_URL?: string
  MEDIA_API_URL?: string
  COMMUNICATION_API_URL?: string
  COMMUNICATION_API_KEY?: string
}

interface AdminSession {
  userId: string
  emailHash: string
  email: string
  roles: string[]
}

interface AdminUserListItem {
  id: string
  kind: string
  email: string | null
  roles: string[]
  createdAt: string
  updatedAt: string
  lastSeenAt: string | null
  hasData: boolean
}

const ADMIN_EMAIL = 'me@sil.mt'
const PRODUCT = 'tiko'
const ADMIN_ROLE = 'admin'
const VALID_ROLES = new Set(['guest', 'user', 'child', 'profile_manager', 'content_editor', 'admin'])
const APPS = ['yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'media', 'admin', 'tiko', 'todo', 'talk'] as const
const DEFAULT_APP_CONFIGS: Record<TikoAppId, TikoAppConfigPayload> = {
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, '')

    if (path === '/v1/admin/health' && request.method === 'GET') {
      return json({ data: { ok: true, service: 'admin-api' } })
    }

    const admin = await requireAdmin(request, env)
    if (admin instanceof Response) return withCors(admin)

    if (path === '/v1/admin/me' && request.method === 'GET') {
      return json({ data: { userId: admin.userId, email: admin.email, role: 'admin', roles: admin.roles } })
    }

    if (path === '/v1/admin/config' && request.method === 'GET') {
      return json({
        data: {
          appApiUrl: (env.APP_API_URL ?? 'https://dev.api.tikotalks.com/v1/apps').replace(/\/$/, ''),
          generationApiUrl: (env.GENERATION_API_URL ?? 'https://dev-api.tikotalks.com/v1/generation').replace(/\/$/, ''),
          mediaApiUrl: (env.MEDIA_API_URL ?? 'https://media-api.tikotalks.com/v1').replace(/\/$/, ''),
          communicationApiUrl: (env.COMMUNICATION_API_URL ?? 'https://dev.api.tikotalks.com/v1/communication').replace(/\/$/, ''),
        },
      })
    }

    if (path === '/v1/admin/apps/config' && request.method === 'GET') {
      return listAppConfigs(env.APP_DB)
    }

    const appConfigMatch = path.match(/^\/v1\/admin\/apps\/config\/([^/]+)$/)
    if (appConfigMatch && request.method === 'PUT') {
      return writeAppConfig(request, env.APP_DB, decodeURIComponent(appConfigMatch[1]))
    }

    if (path === '/v1/admin/users' && request.method === 'GET') {
      const query = url.searchParams.get('q') ?? ''
      const users = await listUsers(env.AUTH_DB, env.APP_DB, query)
      return json({ data: { users: await ensureAdminInUsers(env.AUTH_DB, env.APP_DB, users, admin, query) } })
    }

    const assignRoleMatch = path.match(/^\/v1\/admin\/users\/([^/]+)\/roles$/)
    if (assignRoleMatch && request.method === 'POST') {
      return assignUserRole(request, env.AUTH_DB, admin, decodeURIComponent(assignRoleMatch[1]))
    }

    const revokeRoleMatch = path.match(/^\/v1\/admin\/users\/([^/]+)\/roles\/([^/]+)$/)
    if (revokeRoleMatch && request.method === 'DELETE') {
      return revokeUserRole(env.AUTH_DB, decodeURIComponent(revokeRoleMatch[1]), decodeURIComponent(revokeRoleMatch[2]))
    }

    if (path === '/v1/admin/communication/inbox' && request.method === 'GET') {
      return withCors(await proxyCommunicationInbox(request, env))
    }

    return apiError('not_found', 'Route not found.', 404)
  },

  async scheduled(_event: { cron: string }, env: Env): Promise<void> {
    await cleanupAnonymousSubjects(env)
  },
}


async function listAppConfigs(db: D1Database): Promise<Response> {
  const { results } = await db.prepare('SELECT app, title, app_color, app_icon, app_icon_media_category, app_icon_image_url, theme_color, updated_at, version FROM app_config').all<AppConfigRow>()
  const rows = new Map((results ?? []).map((row) => [row.app, row]))
  const configs = Object.fromEntries(APPS.map((app) => [app, rowToConfig(app, rows.get(app) ?? null)]))
  return json({ data: { configs } })
}

async function writeAppConfig(request: Request, db: D1Database, rawApp: string): Promise<Response> {
  let app: TikoAppId
  try {
    app = parseApp(rawApp)
  } catch {
    return apiError('unknown_app', 'App is not registered for shared config.', 404)
  }
  const body = await readJson<{ config?: Partial<TikoAppConfigPayload>, version?: number }>(request)
  const next = normalizeAppConfig(app, body.config ?? {})
  const existing = await db.prepare('SELECT version FROM app_config WHERE app = ?').bind(app).first<{ version: number }>()
  const currentVersion = existing ? Number(existing.version) : 0
  if (typeof body.version === 'number' && body.version !== currentVersion) {
    return apiError('version_conflict', 'Stored app config version does not match requested version.', 409)
  }
  const now = new Date().toISOString()
  const version = currentVersion + 1
  await db.prepare(
    `INSERT INTO app_config (app, title, app_color, app_icon, app_icon_media_category, app_icon_image_url, theme_color, updated_at, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(app) DO UPDATE SET
       title = excluded.title,
       app_color = excluded.app_color,
       app_icon = excluded.app_icon,
       app_icon_media_category = excluded.app_icon_media_category,
       app_icon_image_url = excluded.app_icon_image_url,
       theme_color = excluded.theme_color,
       updated_at = excluded.updated_at,
       version = excluded.version`
  ).bind(app, next.title, next.appColor, next.appIcon, next.appIconMediaCategory ?? null, next.appIconImageUrl ?? null, next.themeColor ?? null, now, version).run()
  return json({ data: { config: next, updatedAt: now, version } })
}

function rowToConfig(app: TikoAppId, row: AppConfigRow | null): TikoAppConfigPayload & { updatedAt: string | null, version: number } {
  const fallback = DEFAULT_APP_CONFIGS[app]
  if (!row) return { ...fallback, updatedAt: null, version: 0 }
  return {
    id: app,
    title: row.title || fallback.title,
    appColor: parseAppColor(row.app_color, fallback.appColor),
    appIcon: row.app_icon || fallback.appIcon,
    ...(row.app_icon_media_category ? { appIconMediaCategory: row.app_icon_media_category } : fallback.appIconMediaCategory ? { appIconMediaCategory: fallback.appIconMediaCategory } : {}),
    ...(row.app_icon_image_url ? { appIconImageUrl: row.app_icon_image_url } : fallback.appIconImageUrl ? { appIconImageUrl: fallback.appIconImageUrl } : {}),
    ...(row.theme_color ? { themeColor: row.theme_color } : fallback.themeColor ? { themeColor: fallback.themeColor } : {}),
    updatedAt: row.updated_at,
    version: Number(row.version)
  }
}

function normalizeAppConfig(app: TikoAppId, value: Partial<TikoAppConfigPayload>): TikoAppConfigPayload {
  const fallback = DEFAULT_APP_CONFIGS[app]
  return {
    id: app,
    title: cleanString(value.title, fallback.title),
    appColor: parseAppColor(value.appColor, fallback.appColor),
    appIcon: cleanString(value.appIcon, fallback.appIcon),
    ...(cleanOptionalString(value.appIconMediaCategory) ? { appIconMediaCategory: cleanOptionalString(value.appIconMediaCategory) } : {}),
    ...(cleanOptionalString(value.appIconImageUrl) ? { appIconImageUrl: cleanOptionalString(value.appIconImageUrl) } : {}),
    ...(cleanOptionalString(value.themeColor) ? { themeColor: cleanOptionalString(value.themeColor) } : {})
  }
}

function parseApp(value: string): TikoAppId {
  if ((APPS as readonly string[]).includes(value)) return value as TikoAppId
  throw new Error('unknown_app')
}

function parseAppColor(value: unknown, fallback: TikoAppId): TikoAppId {
  return typeof value === 'string' && (APPS as readonly string[]).includes(value) ? value as TikoAppId : fallback
}

function cleanString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : fallback
}

function cleanOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 240) : undefined
}

async function readJson<T>(request: Request): Promise<T> {
  if (!request.body) return {} as T
  try {
    return await request.json() as T
  } catch {
    return {} as T
  }
}

async function requireAdmin(request: Request, env: Env): Promise<AdminSession | Response> {
  const authed = await authenticate(request, env)
  if (authed.ok === false) return authed.response

  // The admin dashboard is intentionally session-only. API keys may call service-to-service
  // APIs elsewhere, but they do not prove that the browser user is me@sil.mt.
  if (authed.method !== 'session' || !authed.userId) {
    return apiError('admin_session_required', 'Admin access requires a user session.', 403)
  }

  const row = await env.AUTH_DB.prepare('SELECT subject_id AS id, email_hash, email_plain FROM identity_accounts WHERE subject_id = ? AND disabled_at IS NULL LIMIT 1')
    .bind(authed.userId)
    .first<{ id: string; email_hash: string | null; email_plain: string | null }>()

  if (!row) {
    return apiError('forbidden', 'This dashboard is only available to Tiko admins.', 403)
  }

  const roles = await activeRoles(env.AUTH_DB, row.id)
  if (!roles.includes(ADMIN_ROLE) && await canBootstrapAdmin(env, row)) {
    await assignRole(env.AUTH_DB, row.id, ADMIN_ROLE, 'bootstrap', null)
    roles.push(ADMIN_ROLE)
  }

  if (!roles.includes(ADMIN_ROLE)) {
    return apiError('forbidden', 'This dashboard is only available to the configured Tiko admin.', 403)
  }

  return { userId: row.id, emailHash: row.email_hash ?? '', email: normalizeEmail(row.email_plain ?? env.ADMIN_EMAIL ?? ADMIN_EMAIL), roles }
}

async function activeRoles(db: D1Database, subjectId: string): Promise<string[]> {
  const { results } = await db.prepare('SELECT role FROM identity_role_assignments WHERE subject_id = ? AND product = ? AND revoked_at IS NULL')
    .bind(subjectId, PRODUCT)
    .all<{ role: string }>()
  return Array.from(new Set(results.map((row) => row.role).filter(Boolean))).sort()
}

async function canBootstrapAdmin(env: Env, row: { email_hash: string | null }): Promise<boolean> {
  const adminEmail = normalizeEmail(env.ADMIN_EMAIL || ADMIN_EMAIL)
  const adminEmailHash = await hashToken(adminEmail, env.TOKEN_PEPPER)
  return row.email_hash === adminEmailHash
}

async function assignRole(db: D1Database, subjectId: string, role: string, source: string, actorSubjectId: string | null): Promise<void> {
  await db.prepare('INSERT INTO identity_role_assignments (id, subject_id, product, role, source, actor_subject_id, created_at, revoked_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(`role_${crypto.randomUUID().replace(/-/g, '')}`, subjectId, PRODUCT, role, source, actorSubjectId, new Date().toISOString(), null, '{}')
    .run()
}

async function listUsers(authDb: D1Database, appDb: D1Database, query: string): Promise<AdminUserListItem[]> {
  const q = `%${query.trim().toLowerCase()}%`
  const { results } = await authDb.prepare(`
    SELECT s.id, s.kind, a.email_plain AS email, s.created_at, s.updated_at,
      MAX(COALESCE(sess.last_seen_at, sess.created_at)) AS last_seen_at,
      COALESCE(json_group_array(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
    FROM identity_subjects s
    INNER JOIN identity_accounts a ON a.subject_id = s.id AND a.disabled_at IS NULL AND a.email_hash IS NOT NULL
    LEFT JOIN identity_sessions sess ON sess.subject_id = s.id AND sess.revoked_at IS NULL
    LEFT JOIN identity_role_assignments r ON r.subject_id = s.id AND r.product = ? AND r.revoked_at IS NULL
    WHERE s.product = ? AND s.disabled_at IS NULL
      AND (? = '%%' OR lower(s.id) LIKE ? OR lower(s.kind) LIKE ? OR lower(COALESCE(a.email_plain, '')) LIKE ?)
    GROUP BY s.id, s.kind, a.email_plain, s.created_at, s.updated_at
    ORDER BY last_seen_at DESC, s.created_at DESC
    LIMIT 100
  `)
    .bind(PRODUCT, PRODUCT, q, q, q, q)
    .all<{ id: string; kind: string; email: string | null; created_at: string; updated_at: string; last_seen_at: string | null; roles: string | null }>()

  const users = results.map(normalizeUserRow)
  const dataSet = await subjectsWithData(appDb, users.map((u) => u.id))
  return users.map((u) => ({ ...u, hasData: dataSet.has(u.id) }))
}

async function ensureAdminInUsers(authDb: D1Database, appDb: D1Database, users: AdminUserListItem[], admin: AdminSession, query: string): Promise<AdminUserListItem[]> {
  if (users.some((user) => user.id === admin.userId)) return users
  if (!matchesAdminQuery(admin, query)) return users

  const row = await authDb.prepare(`
    SELECT s.id, s.kind, a.email_plain AS email, s.created_at, s.updated_at,
      MAX(COALESCE(sess.last_seen_at, sess.created_at)) AS last_seen_at,
      COALESCE(json_group_array(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
    FROM identity_subjects s
    LEFT JOIN identity_accounts a ON a.subject_id = s.id AND a.disabled_at IS NULL
    LEFT JOIN identity_sessions sess ON sess.subject_id = s.id AND sess.revoked_at IS NULL
    LEFT JOIN identity_role_assignments r ON r.subject_id = s.id AND r.product = ? AND r.revoked_at IS NULL
    WHERE s.id = ? AND s.disabled_at IS NULL
    GROUP BY s.id, s.kind, a.email_plain, s.created_at, s.updated_at
    LIMIT 1
  `)
    .bind(PRODUCT, admin.userId)
    .first<{ id: string; kind: string; email: string | null; created_at: string; updated_at: string; last_seen_at: string | null; roles: string | null }>()

  const dataSet = row ? await subjectsWithData(appDb, [admin.userId]) : new Set<string>()
  const adminUser = row
    ? { ...normalizeUserRow(row), hasData: dataSet.has(admin.userId) }
    : { id: admin.userId, kind: 'account', email: admin.email, roles: admin.roles as AdminUserListItem['roles'], createdAt: '', updatedAt: '', lastSeenAt: null, hasData: false }

  return [adminUser, ...users]
}

function matchesAdminQuery(admin: AdminSession, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return [admin.userId, admin.email, ...admin.roles].some((value) => value.toLowerCase().includes(normalized))
}

function normalizeUserRow(row: { id: string; kind: string; email: string | null; created_at: string; updated_at: string; last_seen_at?: string | null; roles: string | null }): AdminUserListItem {
  return {
    id: row.id,
    kind: row.kind,
    email: row.email,
    roles: parseRoles(row.roles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at ?? null,
    hasData: false,
  }
}

async function subjectsWithData(db: D1Database, subjectIds: string[]): Promise<Set<string>> {
  if (subjectIds.length === 0) return new Set()
  const placeholders = subjectIds.map(() => '?').join(',')
  const { results } = await db.prepare(`
    SELECT DISTINCT user_id FROM app_settings WHERE user_id IN (${placeholders})
    UNION SELECT DISTINCT user_id FROM app_state WHERE user_id IN (${placeholders})
    UNION SELECT DISTINCT user_id FROM app_progress WHERE user_id IN (${placeholders})
  `).bind(...subjectIds, ...subjectIds, ...subjectIds).all<{ user_id: string }>()
  return new Set(results.map((r) => r.user_id))
}

async function cleanupAnonymousSubjects(env: Env): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Find unverified subjects whose last session is older than 30 days (we'll tighten per-subject below)
  const { results } = await env.AUTH_DB.prepare(`
    SELECT s.id, MAX(COALESCE(sess.last_seen_at, sess.created_at, s.created_at)) AS last_seen
    FROM identity_subjects s
    LEFT JOIN identity_accounts a ON a.subject_id = s.id AND a.disabled_at IS NULL
    LEFT JOIN identity_sessions sess ON sess.subject_id = s.id AND sess.revoked_at IS NULL
    WHERE s.product = ? AND s.disabled_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM identity_accounts ia
        WHERE ia.subject_id = s.id AND ia.email_verified_at IS NOT NULL AND ia.disabled_at IS NULL
      )
    GROUP BY s.id
    HAVING MAX(COALESCE(sess.last_seen_at, sess.created_at, s.created_at)) < ? OR MAX(COALESCE(sess.last_seen_at, sess.created_at, s.created_at)) IS NULL
  `).bind(PRODUCT, thirtyDaysAgo).all<{ id: string; last_seen: string | null }>()

  if (results.length === 0) return

  const dataSet = await subjectsWithData(env.APP_DB, results.map((r) => r.id))

  for (const { id, last_seen } of results) {
    const hasData = dataSet.has(id)
    const threshold = hasData ? thirtyDaysAgo : oneDayAgo
    if (!last_seen || last_seen < threshold) {
      await deleteSubjectData(env.APP_DB, id)
      await deleteSubjectIdentity(env.AUTH_DB, id)
    }
  }
}

async function deleteSubjectData(db: D1Database, subjectId: string): Promise<void> {
  await db.prepare('DELETE FROM app_settings WHERE user_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM app_state WHERE user_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM app_progress WHERE user_id = ?').bind(subjectId).run()
}

async function deleteSubjectIdentity(db: D1Database, subjectId: string): Promise<void> {
  await db.prepare('DELETE FROM identity_role_assignments WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_sessions WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_email_challenges WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_accounts WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_devices WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_subjects WHERE id = ?').bind(subjectId).run()
}

async function assignUserRole(request: Request, db: D1Database, admin: AdminSession, subjectId: string): Promise<Response> {
  let body: { role?: unknown }
  try {
    body = await request.json()
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400)
  }

  const role = typeof body.role === 'string' ? body.role : ''
  if (!VALID_ROLES.has(role)) return apiError('invalid_role', 'Role is not assignable.', 400)

  await assignRole(db, subjectId, role, 'manual', admin.userId)
  return json({ data: { subjectId, roles: await activeRoles(db, subjectId) } })
}

async function revokeUserRole(db: D1Database, subjectId: string, role: string): Promise<Response> {
  if (!VALID_ROLES.has(role)) return apiError('invalid_role', 'Role is not assignable.', 400)

  if (role === ADMIN_ROLE) {
    const adminCount = await activeRoleCount(db, ADMIN_ROLE)
    if (adminCount <= 1) return apiError('last_admin_role', 'Cannot revoke the final active admin role.', 409)
  }

  await db.prepare('UPDATE identity_role_assignments SET revoked_at = ? WHERE subject_id = ? AND product = ? AND role = ? AND revoked_at IS NULL')
    .bind(new Date().toISOString(), subjectId, PRODUCT, role)
    .run()
  return json({ data: { subjectId, roles: await activeRoles(db, subjectId) } })
}

async function activeRoleCount(db: D1Database, role: string): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS count FROM identity_role_assignments WHERE product = ? AND role = ? AND revoked_at IS NULL')
    .bind(PRODUCT, role)
    .first<{ count: number }>()
  return row?.count ?? 0
}

function parseRoles(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? Array.from(new Set(parsed.filter((role): role is string => typeof role === 'string' && role.length > 0))).sort() : []
  } catch {
    return []
  }
}

async function proxyCommunicationInbox(request: Request, env: Env): Promise<Response> {
  if (!env.COMMUNICATION_API_KEY) {
    return apiError('communication_not_configured', 'Communication service is not configured.', 503)
  }
  const incomingUrl = new URL(request.url)
  const baseUrl = (env.COMMUNICATION_API_URL ?? 'https://dev.api.tikotalks.com/v1/communication').replace(/\/$/, '')
  const url = new URL(`${baseUrl}/inbox`)
  const status = incomingUrl.searchParams.get('status')
  const limit = incomingUrl.searchParams.get('limit')
  if (status) url.searchParams.set('status', status)
  if (limit) url.searchParams.set('limit', limit)

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${env.COMMUNICATION_API_KEY}` }
  })
  const body = await response.text()
  return new Response(body, {
    status: response.status,
    headers: { ...CORS_HEADERS, 'Content-Type': response.headers.get('content-type') ?? 'application/json' }
  })
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

async function hashToken(token: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`tiko:email:${pepper}:${token}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function apiError(code: string, message: string, status = 400): Response {
  return json({ error: { code, message } }, status)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
