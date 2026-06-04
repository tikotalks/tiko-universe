import { authenticate, type AuthEnv } from '../../shared/auth'

type D1Value = string | number | boolean | null

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
}

const ADMIN_EMAIL = 'me@sil.mt'
const PRODUCT = 'tiko'
const ADMIN_ROLE = 'admin'
const VALID_ROLES = new Set(['guest', 'user', 'child', 'profile_manager', 'content_editor', 'admin'])

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
          generationApiUrl: (env.GENERATION_API_URL ?? 'https://dev.api.tikotalks.com/v1/generation').replace(/\/$/, ''),
          mediaApiUrl: (env.MEDIA_API_URL ?? 'https://media-api.tikotalks.com/v1').replace(/\/$/, ''),
          communicationApiUrl: (env.COMMUNICATION_API_URL ?? 'https://dev.api.tikotalks.com/v1/communication').replace(/\/$/, ''),
        },
      })
    }

    if (path === '/v1/admin/users' && request.method === 'GET') {
      const query = url.searchParams.get('q') ?? ''
      const users = await listUsers(env.AUTH_DB, query)
      return json({ data: { users: await ensureAdminInUsers(env.AUTH_DB, users, admin, query) } })
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

async function listUsers(db: D1Database, query: string): Promise<AdminUserListItem[]> {
  const q = `%${query.trim().toLowerCase()}%`
  const { results } = await db.prepare(`
    SELECT s.id, s.kind, a.email_plain AS email, s.created_at, s.updated_at,
      COALESCE(json_group_array(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
    FROM identity_subjects s
    LEFT JOIN identity_accounts a ON a.subject_id = s.id AND a.disabled_at IS NULL
    LEFT JOIN identity_role_assignments r ON r.subject_id = s.id AND r.product = ? AND r.revoked_at IS NULL
    WHERE s.product = ? AND s.disabled_at IS NULL
      AND (? = '%%' OR lower(s.id) LIKE ? OR lower(s.kind) LIKE ? OR lower(COALESCE(a.email_plain, '')) LIKE ?)
    GROUP BY s.id, s.kind, a.email_plain, s.created_at, s.updated_at
    ORDER BY s.created_at DESC
    LIMIT 100
  `)
    .bind(PRODUCT, PRODUCT, q, q, q, q)
    .all<{ id: string; kind: string; email: string | null; created_at: string; updated_at: string; roles: string | null }>()

  return results.map(normalizeUserRow)
}

async function ensureAdminInUsers(db: D1Database, users: AdminUserListItem[], admin: AdminSession, query: string): Promise<AdminUserListItem[]> {
  if (users.some((user) => user.id === admin.userId)) return users
  if (!matchesAdminQuery(admin, query)) return users

  const row = await db.prepare(`
    SELECT s.id, s.kind, a.email_plain AS email, s.created_at, s.updated_at,
      COALESCE(json_group_array(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
    FROM identity_subjects s
    LEFT JOIN identity_accounts a ON a.subject_id = s.id AND a.disabled_at IS NULL
    LEFT JOIN identity_role_assignments r ON r.subject_id = s.id AND r.product = ? AND r.revoked_at IS NULL
    WHERE s.id = ? AND s.disabled_at IS NULL
    GROUP BY s.id, s.kind, a.email_plain, s.created_at, s.updated_at
    LIMIT 1
  `)
    .bind(PRODUCT, admin.userId)
    .first<{ id: string; kind: string; email: string | null; created_at: string; updated_at: string; roles: string | null }>()

  const adminUser = row
    ? normalizeUserRow(row)
    : {
        id: admin.userId,
        kind: 'account',
        email: admin.email,
        roles: admin.roles as AdminUserListItem['roles'],
        createdAt: '',
        updatedAt: '',
      }

  return [adminUser, ...users]
}

function matchesAdminQuery(admin: AdminSession, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return [admin.userId, admin.email, ...admin.roles].some((value) => value.toLowerCase().includes(normalized))
}

function normalizeUserRow(row: { id: string; kind: string; email: string | null; created_at: string; updated_at: string; roles: string | null }): AdminUserListItem {
  return {
    id: row.id,
    kind: row.kind,
    email: row.email,
    roles: parseRoles(row.roles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
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
