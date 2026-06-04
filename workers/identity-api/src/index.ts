import { normalizeConfig, type AnkoreConfig, type NormalizedAnkoreConfig } from 'ankore'
import { createIdentityWorker, type EmailMessage } from 'ankore/worker'

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement
}

interface ServiceBinding {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>
}

export interface Env {
  IDENTITY_DB: D1Database
  TOKEN_PEPPER: string
  ANKORE_TOKEN_PEPPER?: string
  MAGIC_LINK_BASE_URL?: string
  COMMUNICATION_API_URL?: string
  COMMUNICATION_API_KEY?: string
  COMMUNICATION_SERVICE?: ServiceBinding
  ALLOWED_ORIGINS?: string
  MAGIC_LINK_TEST_SINK?: Array<{ email: string; token: string; otp: string; url: string; webUrl: string }>
}

const SESSION_TTL_DAYS = 180
const DEFAULT_COMMUNICATION_API_URL = 'https://api.tikotalks.com/v1/communication'
const DEFAULT_ALLOWED_ORIGINS = 'https://tiko.mt,https://www.tiko.mt,https://tiko.tikoapps.org,https://yesno.tikoapps.org,https://cards.tikoapps.org,https://sequence.tikoapps.org,https://type.tikoapps.org,https://timer.tikoapps.org,https://admin.tikoapps.org,https://dev.tiko.tikoapps.org,https://dev.yesno.tikoapps.org,https://dev.cards.tikoapps.org,https://dev.sequence.tikoapps.org,https://dev.type.tikoapps.org,https://dev.timer.tikoapps.org,https://dev.admin.tikoapps.org,http://localhost:3060,http://localhost:3061,http://localhost:3062,http://localhost:3063,http://localhost:3064,http://localhost:3065,http://localhost:5173,http://localhost:4173,capacitor://localhost,ionic://localhost,tiko://native'

const baseConfig = {
  product: 'tiko',
  databaseBinding: 'IDENTITY_DB',
  basePath: '/v1/identity',
  session: {
    bearer: true,
    cookie: true,
    ttlDays: SESSION_TTL_DAYS,
    rotateOnRefresh: true,
    cookieName: 'tiko_session'
  },
  device: {
    required: true,
    autoCreateSubject: true
  },
  email: {
    enabled: true,
    storage: 'hash',
    purposes: ['recover']
  },
  accounts: {
    enabled: false,
    passwords: false,
    required: false
  },
  apiKeys: {
    enabled: false
  },
  entitlements: {
    enabled: false
  },
  cors: {
    allowedOrigins: DEFAULT_ALLOWED_ORIGINS.split(',')
  }
} satisfies AnkoreConfig

export const identityConfig: NormalizedAnkoreConfig = normalizeConfig(baseConfig)

export default {
  async fetch(request: Request, env: Env, _ctx?: unknown): Promise<Response> {
    const managed = await handleManagedIdentity(request, env)
    if (managed) return withBrowserSessionCookie(request, managed)

    return createIdentityWorker(configForEnv(env), {
      sendEmail: message => requestMagicLinkDelivery(env, message)
    }).fetch(request, {
      ...env,
      ANKORE_TOKEN_PEPPER: env.ANKORE_TOKEN_PEPPER ?? env.TOKEN_PEPPER
    }).then(response => withBrowserSessionCookie(request, response))
  }
}

function configForEnv(env: Env): AnkoreConfig {
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS).split(',').map(entry => entry.trim()).filter(Boolean)
  return { ...baseConfig, cors: { allowedOrigins } }
}

interface ManagedCredentialRow {
  id: string
  subject_id: string
  manager_subject_id: string
  product: string
  handle: string
  handle_norm: string
  code_hash: string
  display_name: string | null
  created_at: string
  revoked_at: string | null
  metadata_json: string
}

interface SubjectRow {
  id: string
  product: string
  kind: string
  disabled_at: string | null
}

interface SessionRow {
  id: string
  subject_id: string
  device_id: string | null
  product: string
  token_hash: string
  expires_at: string
  revoked_at: string | null
}

async function handleManagedIdentity(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/$/, '')
  if (path === '/v1/identity/managed/children' && request.method === 'POST') return createManagedChild(request, env)
  if (path === '/v1/identity/managed/login' && request.method === 'POST') return loginManagedChild(request, env)
  if (path === '/v1/identity/profile' && request.method === 'GET') return getProfile(request, env)
  if (path === '/v1/identity/profile' && request.method === 'PUT') return updateProfile(request, env)
  return null
}

async function createManagedChild(request: Request, env: Env): Promise<Response> {
  const manager = await requireIdentitySession(request, env)
  if (!manager) return Response.json({ error: 'invalid_session' }, { status: 401 })
  if (await hasRole(env.IDENTITY_DB, manager.subjectId, 'child')) return Response.json({ error: 'forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({})) as { handle?: string; accessCode?: string; displayName?: string }
  const handle = normalizeHandle(body.handle)
  const accessCode = String(body.accessCode ?? '')
  if (!handle || accessCode.length < 4) return Response.json({ error: 'invalid_managed_child' }, { status: 400 })

  const at = new Date().toISOString()
  const subjectId = id('sub')
  const credentialId = id('mcr')
  const displayName = typeof body.displayName === 'string' && body.displayName.trim() ? body.displayName.trim() : handle

  await env.IDENTITY_DB.prepare('INSERT INTO identity_subjects (id, product, kind, created_at, updated_at, disabled_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(subjectId, 'tiko', 'account', at, at, null, JSON.stringify({ managed: true, managerSubjectId: manager.subjectId }))
    .run()
  await assignRole(env.IDENTITY_DB, subjectId, 'child', 'managed_login', manager.subjectId)
  await env.IDENTITY_DB.prepare('INSERT INTO identity_managed_credentials (id, subject_id, manager_subject_id, product, handle, handle_norm, code_hash, display_name, created_at, revoked_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(credentialId, subjectId, manager.subjectId, 'tiko', handle, handle.toLowerCase(), await hashSecret(accessCode, env, 'managed-code'), displayName, at, null, '{}')
    .run()

  return Response.json({ child: { subjectId, managerSubjectId: manager.subjectId, handle, displayName, roles: ['child'] } }, { status: 201 })
}

async function loginManagedChild(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => ({})) as { handle?: string; accessCode?: string; managerSubjectId?: string }
  const handle = normalizeHandle(body.handle)
  const accessCode = String(body.accessCode ?? '')
  if (!handle || !accessCode) return Response.json({ error: 'invalid_managed_login' }, { status: 401 })

  const row = await env.IDENTITY_DB.prepare('SELECT * FROM identity_managed_credentials WHERE product = ? AND handle_norm = ? AND revoked_at IS NULL LIMIT 1')
    .bind('tiko', handle.toLowerCase())
    .first<ManagedCredentialRow>()
  if (!row || (body.managerSubjectId && row.manager_subject_id !== body.managerSubjectId)) return Response.json({ error: 'invalid_managed_login' }, { status: 401 })
  if (row.code_hash !== await hashSecret(accessCode, env, 'managed-code')) return Response.json({ error: 'invalid_managed_login' }, { status: 401 })

  const subject = await env.IDENTITY_DB.prepare('SELECT * FROM identity_subjects WHERE id = ? LIMIT 1')
    .bind(row.subject_id)
    .first<SubjectRow>()
  if (!subject || subject.disabled_at) return Response.json({ error: 'invalid_managed_login' }, { status: 401 })

  const token = randomToken('ank_')
  const at = new Date()
  const expiresAt = new Date(at.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const session = { id: id('ses'), token, transport: 'bearer', expiresAt }
  await env.IDENTITY_DB.prepare('INSERT INTO identity_sessions (id, subject_id, device_id, product, transport, token_hash, created_at, expires_at, last_seen_at, revoked_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(session.id, subject.id, null, 'tiko', 'bearer', await hashSecret(token, env, 'session'), at.toISOString(), expiresAt, at.toISOString(), null, JSON.stringify({ managed: true }))
    .run()

  return Response.json({
    subject: { id: subject.id, kind: subject.kind, product: subject.product },
    account: null,
    device: null,
    session,
    roles: await activeRoles(env.IDENTITY_DB, subject.id),
    managed: { handle: row.handle, displayName: row.display_name, managerSubjectId: row.manager_subject_id }
  }, { status: 200 })
}

async function getProfile(request: Request, env: Env): Promise<Response> {
  const auth = await requireIdentitySession(request, env)
  if (!auth) return Response.json({ error: 'invalid_session' }, { status: 401 })

  const row = await env.IDENTITY_DB.prepare('SELECT metadata_json FROM identity_subjects WHERE id = ?')
    .bind(auth.subjectId)
    .first<{ metadata_json: string }>()
  const metadata = row ? JSON.parse(row.metadata_json || '{}') : {}
  return Response.json({ profile: metadata })
}

async function updateProfile(request: Request, env: Env): Promise<Response> {
  const auth = await requireIdentitySession(request, env)
  if (!auth) return Response.json({ error: 'invalid_session' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  if (!body || typeof body !== 'object') return Response.json({ error: 'invalid_body' }, { status: 400 })

  // Read current metadata, merge with incoming, write back
  const row = await env.IDENTITY_DB.prepare('SELECT metadata_json FROM identity_subjects WHERE id = ?')
    .bind(auth.subjectId)
    .first<{ metadata_json: string }>()
  const current = row ? JSON.parse(row.metadata_json || '{}') : {}
  const merged = { ...current, ...body }

  await env.IDENTITY_DB.prepare('UPDATE identity_subjects SET metadata_json = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(merged), new Date().toISOString(), auth.subjectId)
    .run()

  return Response.json({ profile: merged })
}

async function requireIdentitySession(request: Request, env: Env): Promise<{ subjectId: string } | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) return null
  const session = await env.IDENTITY_DB.prepare('SELECT * FROM identity_sessions WHERE token_hash = ? LIMIT 1')
    .bind(await hashSecret(token, env, 'session'))
    .first<SessionRow>()
  if (!session || session.revoked_at || session.product !== 'tiko' || new Date(session.expires_at).getTime() <= Date.now()) return null
  return { subjectId: session.subject_id }
}

async function activeRoles(db: D1Database, subjectId: string): Promise<string[]> {
  const { results } = await db.prepare('SELECT role FROM identity_role_assignments WHERE subject_id = ? AND product = ? AND revoked_at IS NULL')
    .bind(subjectId, 'tiko')
    .all<{ role: string }>()
  return Array.from(new Set(results.map((row) => row.role).filter(Boolean))).sort()
}

async function hasRole(db: D1Database, subjectId: string, role: string): Promise<boolean> {
  return (await activeRoles(db, subjectId)).includes(role)
}

async function assignRole(db: D1Database, subjectId: string, role: string, source: string, actorSubjectId: string | null): Promise<void> {
  await db.prepare('INSERT INTO identity_role_assignments (id, subject_id, product, role, source, actor_subject_id, created_at, revoked_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id('role'), subjectId, 'tiko', role, source, actorSubjectId, new Date().toISOString(), null, '{}')
    .run()
}

function normalizeHandle(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const handle = value.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '')
  return handle.length >= 2 && handle.length <= 40 ? handle : null
}

async function hashSecret(secret: string, env: Env, purpose: string): Promise<string> {
  const material = `tiko:${purpose}:${env.ANKORE_TOKEN_PEPPER ?? env.TOKEN_PEPPER}:${secret}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material))
  return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function randomToken(prefix = ''): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index] ?? 0)
  return `${prefix}${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
}

async function withBrowserSessionCookie(request: Request, response: Response): Promise<Response> {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Credentials', 'true')

  const url = new URL(request.url)
  const isTikoAppsIdentityHost = url.hostname === 'id.tikoapps.org' || url.hostname.endsWith('.id.tikoapps.org')
  const shouldClearCookie = request.method === 'POST' && url.pathname.replace(/\/$/, '') === '/v1/identity/logout'

  if (shouldClearCookie && isTikoAppsIdentityHost) {
    headers.append('Set-Cookie', browserCookie('', 0))
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }

  if (!isTikoAppsIdentityHost || response.status < 200 || response.status >= 300 || !response.headers.get('content-type')?.includes('application/json')) {
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }

  const clone = response.clone()
  const body = await clone.json().catch(() => null) as { session?: { token?: string; expiresAt?: string } } | null
  const token = body?.session?.token
  if (token) {
    const maxAge = body.session?.expiresAt ? maxAgeSeconds(body.session.expiresAt) : SESSION_TTL_DAYS * 24 * 60 * 60
    headers.append('Set-Cookie', browserCookie(token, maxAge))
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function browserCookie(value: string, maxAge: number): string {
  const encoded = encodeURIComponent(value)
  return `tiko_session=${encoded}; Max-Age=${maxAge}; Domain=.tikoapps.org; Path=/; HttpOnly; Secure; SameSite=Lax`
}

function maxAgeSeconds(expiresAt: string): number {
  const seconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
  return Math.max(0, seconds)
}

async function requestMagicLinkDelivery(env: Env, message: EmailMessage): Promise<void> {
  const url = magicLinkUrl(env, message.token)
  const webUrl = webMagicLinkUrl(message.token)
  env.MAGIC_LINK_TEST_SINK?.push({ email: message.to, token: message.token, otp: message.otp, url, webUrl })

  if (!env.COMMUNICATION_API_KEY) return

  const baseUrl = (env.COMMUNICATION_API_URL ?? DEFAULT_COMMUNICATION_API_URL).replace(/\/$/, '')
  const endpoint = `${baseUrl}/email/magic-link`
  const init: RequestInit = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.COMMUNICATION_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      to: message.to,
      magicLinkUrl: webUrl,
      webLinkUrl: url !== webUrl ? url : undefined,
      otp: message.otp
    })
  }

  const response = env.COMMUNICATION_SERVICE
    ? await env.COMMUNICATION_SERVICE.fetch(endpoint, init)
    : await fetch(endpoint, init)

  if (!response.ok) throw new Error('communication_send_failed')
}

function magicLinkUrl(env: Env, magicToken: string): string {
  const base = env.MAGIC_LINK_BASE_URL ?? 'https://admin.tikoapps.org'
  const url = new URL(base)
  url.searchParams.set('token', magicToken)
  return url.toString()
}

function webMagicLinkUrl(magicToken: string): string {
  const url = new URL('https://admin.tikoapps.org')
  url.searchParams.set('token', magicToken)
  return url.toString()
}
