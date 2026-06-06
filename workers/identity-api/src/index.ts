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
const DEFAULT_ALLOWED_ORIGINS = 'https://tiko.mt,https://www.tiko.mt,https://tiko.tikoapps.org,https://yesno.tikoapps.org,https://cards.tikoapps.org,https://sequence.tikoapps.org,https://type.tikoapps.org,https://timer.tikoapps.org,https://admin.tikoapps.org,https://dev.tiko.tikoapps.org,https://dev.yesno.tikoapps.org,https://dev.cards.tikoapps.org,https://dev.sequence.tikoapps.org,https://dev.type.tikoapps.org,https://dev.timer.tikoapps.org,https://dev.admin.tikoapps.org,http://localhost:3056,http://localhost:3057,http://localhost:3058,http://localhost:3059,http://localhost:3060,http://localhost:3061,http://localhost:3062,http://localhost:3063,http://localhost:3064,http://localhost:3065,http://localhost:3066,http://localhost:5173,http://localhost:4173,capacitor://localhost,ionic://localhost,tiko://native'

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
    const contractRequest = request.clone() as AnyRequest
    const canonical = await handleCanonicalIdentity(request, env)
    if (canonical) return withBrowserSessionCookie(contractRequest, await withTikoSessionContract(contractRequest, env, canonical))

    const managed = await handleManagedIdentity(request, env)
    if (managed) return withBrowserSessionCookie(contractRequest, await withTikoSessionContract(contractRequest, env, managed))

    const ankoreResponse = await createIdentityWorker(configForEnv(env), {
      sendEmail: message => requestMagicLinkDelivery(env, message)
    }).fetch(request, {
      ...env,
      ANKORE_TOKEN_PEPPER: env.ANKORE_TOKEN_PEPPER ?? env.TOKEN_PEPPER
    })

    return withBrowserSessionCookie(contractRequest, await withTikoSessionContract(contractRequest, env, ankoreResponse))
  }
}

function configForEnv(env: Env): AnkoreConfig {
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS).split(',').map(entry => entry.trim()).filter(Boolean)
  return { ...baseConfig, cors: { allowedOrigins } }
}

type AccountType = 'temporary' | 'verified' | 'profile_manager' | 'child_account'
type RuntimeMode = 'parent' | 'child'
type LoginMethod = 'device' | 'otp' | 'magic_link' | 'child_code'
type AnyRequest = Request<any, any>

async function handleCanonicalIdentity(request: AnyRequest, env: Env): Promise<Response | null> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/$/, '')
  if (request.method !== 'POST') return null

  if (path === '/v1/identity/email' || path === '/v1/identity/otp/request') {
    const body = await request.json().catch(() => ({})) as { email?: string; purpose?: string }
    const rewrittenBody = { email: body.email, purpose: normalizeEmailPurpose(body.purpose) }
    return fetchAnkoreRoute(request, env, '/v1/identity/email/challenge', rewrittenBody)
  }

  if (path === '/v1/identity/otp/verify') {
    const body = await request.json().catch(() => ({})) as { code?: string; otp?: string; token?: string }
    return fetchAnkoreRoute(request, env, '/v1/identity/email/verify', { otp: body.code ?? body.otp, token: body.token })
  }

  if (path === '/v1/identity/magic-links/verify') {
    const body = await request.json().catch(() => ({})) as { token?: string }
    return fetchAnkoreRoute(request, env, '/v1/identity/email/verify', { token: body.token })
  }

  return null
}

function normalizeEmailPurpose(purpose: string | undefined): 'verify_email' | 'recover' | 'link_account' | 'admin_login' {
  if (purpose === 'verify_email' || purpose === 'link_account' || purpose === 'admin_login') return purpose
  return 'recover'
}

function fetchAnkoreRoute(request: AnyRequest, env: Env, pathname: string, body: unknown): Promise<Response> {
  const url = new URL(request.url)
  url.pathname = pathname
  const headers = new Headers(request.headers)
  headers.set('content-type', 'application/json')
  return createIdentityWorker(configForEnv(env), {
    sendEmail: message => requestMagicLinkDelivery(env, message)
  }).fetch(new Request(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  }), {
    ...env,
    ANKORE_TOKEN_PEPPER: env.ANKORE_TOKEN_PEPPER ?? env.TOKEN_PEPPER
  })
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

interface AccountRow {
  id: string
  subject_id: string
  product: string
  email_verified_at: string | null
  email_plain: string | null
  disabled_at: string | null
}

interface RuntimeState {
  mode: RuntimeMode
  childModeEnabled: boolean
  pinHash?: string
}

async function handleManagedIdentity(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/$/, '')
  if (path === '/v1/identity/pin' && request.method === 'POST') return setPin(request, env)
  if (path === '/v1/identity/pin/verify' && request.method === 'POST') return verifyPin(request, env)
  if (path === '/v1/identity/pin' && request.method === 'DELETE') return removePin(request, env)
  if (path === '/v1/identity/mode/child/enable' && request.method === 'POST') return enableChildMode(request, env)
  if (path === '/v1/identity/mode/child' && request.method === 'POST') return enterChildMode(request, env)
  if (path === '/v1/identity/mode/parent' && request.method === 'POST') return enterParentMode(request, env)
  if (path === '/v1/identity/child-accounts' && request.method === 'GET') return listManagedChildren(request, env)
  if (path === '/v1/identity/child-accounts' && request.method === 'POST') return createManagedChild(request, env)
  if (path === '/v1/identity/managed/children' && request.method === 'POST') return createManagedChild(request, env)
  if (path === '/v1/identity/child-accounts/login' && request.method === 'POST') return loginManagedChild(request, env)
  if (path === '/v1/identity/managed/login' && request.method === 'POST') return loginManagedChild(request, env)
  const childMatch = path.match(/^\/v1\/identity\/child-accounts\/([^/]+)(?:\/(code\/reset))?$/)
  if (childMatch && request.method === 'PUT') return updateManagedChild(request, env, childMatch[1])
  if (childMatch && request.method === 'POST' && childMatch[2] === 'code/reset') return resetManagedChildCode(request, env, childMatch[1])
  if (childMatch && request.method === 'DELETE') return deleteManagedChild(request, env, childMatch[1])
  if (path === '/v1/identity/me' && request.method === 'DELETE') return deleteCurrentIdentity(request, env)
  return null
}

async function setPin(request: Request, env: Env): Promise<Response> {
  const session = await requireIdentitySession(request, env)
  if (!session) return Response.json({ error: 'invalid_session' }, { status: 401 })
  const accountType = await accountTypeForSubject(env, session.subjectId)
  if (accountType === 'temporary' || accountType === 'child_account') return Response.json({ error: 'pin_not_allowed' }, { status: 403 })

  const body = await request.json().catch(() => ({})) as { pin?: string; currentPin?: string }
  const pin = String(body.pin ?? '')
  if (!/^\d{4}$/.test(pin)) return Response.json({ error: 'invalid_pin' }, { status: 400 })
  const currentRuntime = await runtimeStateForSubject(env, session.subjectId)
  if (currentRuntime.pinHash && currentRuntime.pinHash !== await hashSecret(String(body.currentPin ?? ''), env, 'pin')) {
    return Response.json({ error: 'invalid_pin' }, { status: 403 })
  }

  const nextRuntime = { ...currentRuntime, pinHash: await hashSecret(pin, env, 'pin') }
  await updateRuntimeState(env, session.subjectId, nextRuntime)
  return sessionResponse(request, env)
}

async function verifyPin(request: Request, env: Env): Promise<Response> {
  const session = await requireIdentitySession(request, env)
  if (!session) return Response.json({ error: 'invalid_session' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { pin?: string; purpose?: string }
  const runtime = await runtimeStateForSubject(env, session.subjectId)
  if (!runtime.pinHash || runtime.pinHash !== await hashSecret(String(body.pin ?? ''), env, 'pin')) {
    return Response.json({ error: 'invalid_pin' }, { status: 403 })
  }
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  return Response.json({ ok: true, grant: { token: randomToken('grt_'), purpose: body.purpose ?? 'parent_mode', expiresAt } })
}

async function removePin(request: Request, env: Env): Promise<Response> {
  const session = await requireIdentitySession(request, env)
  if (!session) return Response.json({ error: 'invalid_session' }, { status: 401 })
  const accountType = await accountTypeForSubject(env, session.subjectId)
  if (accountType === 'temporary' || accountType === 'child_account') return Response.json({ error: 'pin_not_allowed' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { pin?: string }
  const runtime = await runtimeStateForSubject(env, session.subjectId)
  if (runtime.pinHash && runtime.pinHash !== await hashSecret(String(body.pin ?? ''), env, 'pin')) return Response.json({ error: 'invalid_pin' }, { status: 403 })
  await updateRuntimeState(env, session.subjectId, { mode: 'parent', childModeEnabled: false })
  return sessionResponse(request, env)
}

async function enableChildMode(request: Request, env: Env): Promise<Response> {
  const session = await requireIdentitySession(request, env)
  if (!session) return Response.json({ error: 'invalid_session' }, { status: 401 })
  const accountType = await accountTypeForSubject(env, session.subjectId)
  if (accountType !== 'verified' && accountType !== 'profile_manager') return Response.json({ error: 'child_mode_not_allowed' }, { status: 403 })
  const runtime = await runtimeStateForSubject(env, session.subjectId)
  if (!runtime.pinHash) return Response.json({ error: 'pin_required' }, { status: 409 })
  await updateRuntimeState(env, session.subjectId, { ...runtime, childModeEnabled: true })
  return sessionResponse(request, env)
}

async function enterChildMode(request: Request, env: Env): Promise<Response> {
  const session = await requireIdentitySession(request, env)
  if (!session) return Response.json({ error: 'invalid_session' }, { status: 401 })
  const accountType = await accountTypeForSubject(env, session.subjectId)
  if (accountType === 'child_account') return sessionResponse(request, env)
  if (accountType !== 'verified' && accountType !== 'profile_manager') return Response.json({ error: 'child_mode_not_allowed' }, { status: 403 })
  const runtime = await runtimeStateForSubject(env, session.subjectId)
  if (!runtime.pinHash || !runtime.childModeEnabled) return Response.json({ error: 'child_mode_not_enabled' }, { status: 409 })
  await updateRuntimeState(env, session.subjectId, { ...runtime, mode: 'child' })
  return sessionResponse(request, env)
}

async function enterParentMode(request: Request, env: Env): Promise<Response> {
  const session = await requireIdentitySession(request, env)
  if (!session) return Response.json({ error: 'invalid_session' }, { status: 401 })
  const accountType = await accountTypeForSubject(env, session.subjectId)
  if (accountType === 'child_account') return Response.json({ error: 'parent_mode_not_allowed' }, { status: 403 })
  const runtime = await runtimeStateForSubject(env, session.subjectId)
  if (runtime.mode === 'child') {
    const body = await request.json().catch(() => ({})) as { pin?: string }
    if (!runtime.pinHash || runtime.pinHash !== await hashSecret(String(body.pin ?? ''), env, 'pin')) return Response.json({ error: 'invalid_pin' }, { status: 403 })
  }
  await updateRuntimeState(env, session.subjectId, { ...runtime, mode: 'parent' })
  return sessionResponse(request, env)
}

async function deleteCurrentIdentity(request: Request, env: Env): Promise<Response> {
  const session = await requireIdentitySession(request, env)
  if (!session) return Response.json({ error: 'invalid_session' }, { status: 401 })

  const at = new Date().toISOString()
  await env.IDENTITY_DB.prepare('UPDATE identity_subjects SET disabled_at = ?, updated_at = ? WHERE id = ? AND product = ?')
    .bind(at, at, session.subjectId, 'tiko')
    .run()
  await env.IDENTITY_DB.prepare('UPDATE identity_accounts SET disabled_at = ?, updated_at = ? WHERE subject_id = ? AND product = ? AND disabled_at IS NULL')
    .bind(at, at, session.subjectId, 'tiko')
    .run()
  await env.IDENTITY_DB.prepare('UPDATE identity_sessions SET revoked_at = ? WHERE subject_id = ? AND product = ? AND revoked_at IS NULL')
    .bind(at, session.subjectId, 'tiko')
    .run()
  await env.IDENTITY_DB.prepare('UPDATE identity_devices SET revoked_at = ? WHERE subject_id = ? AND product = ? AND revoked_at IS NULL')
    .bind(at, session.subjectId, 'tiko')
    .run()
  await env.IDENTITY_DB.prepare('UPDATE identity_role_assignments SET revoked_at = ? WHERE subject_id = ? AND product = ? AND revoked_at IS NULL')
    .bind(at, session.subjectId, 'tiko')
    .run()
  await env.IDENTITY_DB.prepare('UPDATE identity_managed_credentials SET revoked_at = ? WHERE subject_id = ? AND product = ? AND revoked_at IS NULL')
    .bind(at, session.subjectId, 'tiko')
    .run()
  await env.IDENTITY_DB.prepare('INSERT INTO identity_audit_events (id, subject_id, actor_subject_id, product, type, created_at, ip_hash, user_agent_hash, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id('aud'), session.subjectId, session.subjectId, 'tiko', 'identity.deleted_self', at, null, null, '{}')
    .run()

  return new Response(null, { status: 204 })
}

async function createManagedChild(request: Request, env: Env): Promise<Response> {
  const manager = await requireIdentitySession(request, env)
  if (!manager) return Response.json({ error: 'invalid_session' }, { status: 401 })
  if (!await canManageChildren(request, env, manager.subjectId)) return Response.json({ error: 'forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({})) as { handle?: string; name?: string; accessCode?: string; code?: string; displayName?: string; language?: string }
  const handle = normalizeHandle(body.handle ?? body.name)
  const accessCode = String(body.accessCode ?? body.code ?? '')
  if (!handle || !/^\d{4}$/.test(accessCode)) return Response.json({ error: 'invalid_child_account' }, { status: 400 })

  const at = new Date().toISOString()
  const subjectId = id('sub')
  const credentialId = id('mcr')
  const displayName = typeof (body.displayName ?? body.name) === 'string' && String(body.displayName ?? body.name).trim() ? String(body.displayName ?? body.name).trim() : handle

  await env.IDENTITY_DB.prepare('INSERT INTO identity_subjects (id, product, kind, created_at, updated_at, disabled_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(subjectId, 'tiko', 'account', at, at, null, JSON.stringify({ managed: true, managerSubjectId: manager.subjectId, displayName, language: body.language }))
    .run()
  await assignRole(env.IDENTITY_DB, subjectId, 'child', 'managed_login', manager.subjectId)
  await env.IDENTITY_DB.prepare('INSERT INTO identity_managed_credentials (id, subject_id, manager_subject_id, product, handle, handle_norm, code_hash, display_name, created_at, revoked_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(credentialId, subjectId, manager.subjectId, 'tiko', handle, handle.toLowerCase(), await hashSecret(accessCode, env, 'managed-code'), displayName, at, null, JSON.stringify({ language: body.language }))
    .run()

  return Response.json({ child: { id: subjectId, subjectId, managerSubjectId: manager.subjectId, handle, name: displayName, displayName, roles: ['child'] } }, { status: 201 })
}

async function listManagedChildren(request: Request, env: Env): Promise<Response> {
  const manager = await requireIdentitySession(request, env)
  if (!manager) return Response.json({ error: 'invalid_session' }, { status: 401 })
  if (!await canManageChildren(request, env, manager.subjectId)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const { results } = await env.IDENTITY_DB.prepare('SELECT * FROM identity_managed_credentials WHERE product = ? AND manager_subject_id = ? AND revoked_at IS NULL')
    .bind('tiko', manager.subjectId)
    .all<ManagedCredentialRow>()
  return Response.json({ childAccounts: results.map(childAccountFromRow) })
}

async function updateManagedChild(request: Request, env: Env, childAccountId: string | undefined): Promise<Response> {
  const manager = await requireIdentitySession(request, env)
  if (!manager || !childAccountId) return Response.json({ error: 'invalid_session' }, { status: 401 })
  if (!await canManageChildren(request, env, manager.subjectId)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { name?: string; displayName?: string; language?: string }
  const displayName = String(body.displayName ?? body.name ?? '').trim()
  if (!displayName) return Response.json({ error: 'invalid_child_account' }, { status: 400 })
  const row = await managedChildForManager(env, manager.subjectId, childAccountId)
  if (!row) return Response.json({ error: 'not_found' }, { status: 404 })
  const metadata = parseJson(row.metadata_json)
  await env.IDENTITY_DB.prepare('UPDATE identity_managed_credentials SET display_name = ?, metadata_json = ? WHERE id = ? AND manager_subject_id = ? AND product = ? AND revoked_at IS NULL')
    .bind(displayName, JSON.stringify({ ...metadata, language: body.language ?? metadata.language }), row.id, manager.subjectId, 'tiko')
    .run()
  return Response.json({ child: { ...childAccountFromRow(row), name: displayName, displayName } })
}

async function resetManagedChildCode(request: Request, env: Env, childAccountId: string | undefined): Promise<Response> {
  const manager = await requireIdentitySession(request, env)
  if (!manager || !childAccountId) return Response.json({ error: 'invalid_session' }, { status: 401 })
  if (!await canManageChildren(request, env, manager.subjectId)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { code?: string }
  const code = String(body.code ?? '')
  if (!/^\d{4}$/.test(code)) return Response.json({ error: 'invalid_child_code' }, { status: 400 })
  const row = await managedChildForManager(env, manager.subjectId, childAccountId)
  if (!row) return Response.json({ error: 'not_found' }, { status: 404 })
  await env.IDENTITY_DB.prepare('UPDATE identity_managed_credentials SET code_hash = ? WHERE id = ? AND manager_subject_id = ? AND product = ? AND revoked_at IS NULL')
    .bind(await hashSecret(code, env, 'managed-code'), row.id, manager.subjectId, 'tiko')
    .run()
  return Response.json({ child: childAccountFromRow(row) })
}

async function deleteManagedChild(request: Request, env: Env, childAccountId: string | undefined): Promise<Response> {
  const manager = await requireIdentitySession(request, env)
  if (!manager || !childAccountId) return Response.json({ error: 'invalid_session' }, { status: 401 })
  if (!await canManageChildren(request, env, manager.subjectId)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const row = await managedChildForManager(env, manager.subjectId, childAccountId)
  if (!row) return Response.json({ error: 'not_found' }, { status: 404 })
  const at = new Date().toISOString()
  await env.IDENTITY_DB.prepare('UPDATE identity_managed_credentials SET revoked_at = ? WHERE subject_id = ? AND product = ? AND revoked_at IS NULL')
    .bind(at, row.subject_id, 'tiko')
    .run()
  await env.IDENTITY_DB.prepare('UPDATE identity_sessions SET revoked_at = ? WHERE subject_id = ? AND product = ? AND revoked_at IS NULL')
    .bind(at, row.subject_id, 'tiko')
    .run()
  await env.IDENTITY_DB.prepare('UPDATE identity_subjects SET disabled_at = ?, updated_at = ? WHERE id = ? AND product = ?')
    .bind(at, at, row.subject_id, 'tiko')
    .run()
  return new Response(null, { status: 204 })
}

function childAccountFromRow(row: ManagedCredentialRow) {
  return { id: row.subject_id, subjectId: row.subject_id, managerSubjectId: row.manager_subject_id, handle: row.handle, name: row.display_name ?? row.handle, displayName: row.display_name ?? row.handle }
}

async function managedChildForManager(env: Env, managerSubjectId: string, childAccountId: string): Promise<ManagedCredentialRow | null> {
  return env.IDENTITY_DB.prepare('SELECT * FROM identity_managed_credentials WHERE manager_subject_id = ? AND product = ? AND subject_id = ? AND revoked_at IS NULL LIMIT 1')
    .bind(managerSubjectId, 'tiko', childAccountId)
    .first<ManagedCredentialRow>()
}

async function loginManagedChild(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => ({})) as { handle?: string; name?: string; accessCode?: string; code?: string; managerSubjectId?: string }
  const handle = normalizeHandle(body.handle ?? body.name)
  const accessCode = String(body.accessCode ?? body.code ?? '')
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

async function requireIdentitySession(request: Request, env: Env): Promise<{ subjectId: string } | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) return null
  const session = await env.IDENTITY_DB.prepare('SELECT * FROM identity_sessions WHERE token_hash = ? LIMIT 1')
    .bind(await hashSecret(token, env, 'session'))
    .first<SessionRow>()
  if (!session || session.revoked_at || session.product !== 'tiko' || new Date(session.expires_at).getTime() <= Date.now()) return null
  return { subjectId: session.subject_id }
}

async function sessionResponse(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  url.pathname = '/v1/identity/session'
  const ankoreResponse = await createIdentityWorker(configForEnv(env), {
    sendEmail: message => requestMagicLinkDelivery(env, message)
  }).fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }), {
    ...env,
    ANKORE_TOKEN_PEPPER: env.ANKORE_TOKEN_PEPPER ?? env.TOKEN_PEPPER
  })
  const response = await withTikoSessionContract(request, env, ankoreResponse)
  const body = await response.clone().json().catch(() => null) as Record<string, any> | null
  if (body?.runtime) return response
  const session = await requireIdentitySession(request, env)
  if (!session) return response
  const accountType = await accountTypeForSubject(env, session.subjectId)
  const runtime = await deriveRuntime(env, session.subjectId, accountType)
  return Response.json({
    ...(body ?? {}),
    subject: body?.subject ?? { id: session.subjectId },
    runtime,
    user: { accountType, mode: runtime.mode, recoverable: accountType !== 'temporary', emailVerified: accountType !== 'temporary' }
  }, { status: response.status, headers: response.headers })
}

async function accountTypeForSubject(env: Env, subjectId: string): Promise<AccountType> {
  const roles = await activeRoles(env.IDENTITY_DB, subjectId)
  if (roles.includes('child')) return 'child_account'
  if (roles.includes('profile_manager')) return 'profile_manager'
  const account = await env.IDENTITY_DB.prepare('SELECT * FROM identity_accounts WHERE subject_id = ? AND product = ? AND disabled_at IS NULL LIMIT 1')
    .bind(subjectId, 'tiko')
    .first<AccountRow>()
  if (account?.email_verified_at) return 'verified'
  return 'temporary'
}

async function canManageChildren(request: Request, env: Env, subjectId: string): Promise<boolean> {
  if (!await hasRole(env.IDENTITY_DB, subjectId, 'profile_manager')) return false
  const runtime = await runtimeStateForSubject(env, subjectId)
  return runtime.mode === 'parent'
}

async function runtimeStateForSubject(env: Env, subjectId: string): Promise<RuntimeState> {
  const subject = await env.IDENTITY_DB.prepare('SELECT * FROM identity_subjects WHERE id = ? LIMIT 1')
    .bind(subjectId)
    .first<SubjectRow & { metadata_json?: string }>()
  const metadata = parseJson(subject?.metadata_json)
  const rawRuntime = parseRecord(metadata.tikoRuntime)
  return {
    mode: rawRuntime.mode === 'child' ? 'child' : 'parent',
    childModeEnabled: rawRuntime.childModeEnabled === true,
    ...(typeof rawRuntime.pinHash === 'string' ? { pinHash: rawRuntime.pinHash } : {})
  }
}

async function updateRuntimeState(env: Env, subjectId: string, runtime: RuntimeState): Promise<void> {
  const subject = await env.IDENTITY_DB.prepare('SELECT * FROM identity_subjects WHERE id = ? LIMIT 1')
    .bind(subjectId)
    .first<SubjectRow & { metadata_json?: string }>()
  const metadata = parseJson(subject?.metadata_json)
  const nextRuntime = {
    mode: runtime.mode,
    childModeEnabled: runtime.childModeEnabled,
    ...(runtime.pinHash ? { pinHash: runtime.pinHash } : {})
  }
  await env.IDENTITY_DB.prepare('UPDATE identity_subjects SET metadata_json = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify({ ...metadata, tikoRuntime: nextRuntime }), new Date().toISOString(), subjectId)
    .run()
}

function parseJson(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || !value) return {}
  try {
    return parseRecord(JSON.parse(value))
  } catch {
    return {}
  }
}

function parseRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
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

async function withTikoSessionContract(request: AnyRequest, env: Env, response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type') ?? ''
  if (response.status < 200 || response.status >= 300 || !contentType.includes('application/json')) return response

  const clone = response.clone()
  const body = await clone.json().catch(() => null) as Record<string, any> | null
  if (!body?.subject?.id || !body.session) return response

  const roles = Array.isArray(body.roles) ? body.roles.map(String) : await activeRoles(env.IDENTITY_DB, String(body.subject.id)).catch(() => [])
  const accountType = deriveAccountType(body, roles)
  const runtime = await deriveRuntime(env, String(body.subject.id), accountType)
  const capabilities = deriveCapabilities(accountType, runtime)
  const displayName = typeof body.managed?.displayName === 'string'
    ? body.managed.displayName
    : typeof body.subject?.metadata?.displayName === 'string'
      ? body.subject.metadata.displayName
      : undefined
  const emailVerified = Boolean(body.account?.emailVerified)
  const user = {
    id: String(body.subject.id),
    ...(displayName ? { displayName } : {}),
    ...(body.account?.email ? { email: body.account.email } : {}),
    accountType,
    mode: runtime.mode,
    recoverable: emailVerified,
    emailVerified
  }
  const session = { ...body.session, loginMethod: await deriveLoginMethod(request, body, accountType) }
  const account = body.account ? { ...body.account, accountType } : body.account ?? null
  const nextBody = { ...body, user, account, session, runtime, capabilities }
  const headers = new Headers(response.headers)
  headers.set('content-type', 'application/json')
  return new Response(JSON.stringify(nextBody), { status: response.status, statusText: response.statusText, headers })
}

function deriveAccountType(body: Record<string, any>, roles: string[]): AccountType {
  if (roles.includes('child') || body.managed) return 'child_account'
  if (roles.includes('profile_manager')) return 'profile_manager'
  if (body.account?.emailVerified) return 'verified'
  return 'temporary'
}

async function deriveRuntime(env: Env, subjectId: string, accountType: AccountType): Promise<{ mode: RuntimeMode; childModeEnabled: boolean; pinConfigured: boolean }> {
  if (accountType === 'child_account') return { mode: 'child', childModeEnabled: true, pinConfigured: false }
  const runtime = await runtimeStateForSubject(env, subjectId).catch(() => ({ mode: 'parent', childModeEnabled: false } as RuntimeState))
  return { mode: runtime.mode, childModeEnabled: runtime.childModeEnabled, pinConfigured: Boolean(runtime.pinHash) }
}

function deriveCapabilities(accountType: AccountType, runtime: { mode: RuntimeMode; pinConfigured: boolean }) {
  return {
    canVerifyEmail: accountType === 'temporary',
    canUseParentMode: accountType !== 'child_account',
    canUseChildMode: (accountType === 'verified' || accountType === 'profile_manager') && runtime.pinConfigured || accountType === 'child_account',
    canManageChildAccounts: accountType === 'profile_manager' && runtime.mode === 'parent',
    canDeleteAccount: accountType !== 'child_account'
  }
}

async function deriveLoginMethod(request: AnyRequest, body: Record<string, any>, accountType: AccountType): Promise<LoginMethod> {
  const path = new URL(request.url).pathname
  if (accountType === 'child_account' || path.endsWith('/managed/login') || path.endsWith('/child-accounts/login')) return 'child_code'
  if (path.includes('/email/verify') || path.includes('/magic-links/verify') || path.includes('/otp/verify')) {
    const requestBody = await request.clone().json().catch(() => ({})) as { token?: unknown; otp?: unknown; code?: unknown }
    if (requestBody.token) return 'magic_link'
    if (requestBody.otp || requestBody.code) return 'otp'
    return 'otp'
  }
  return 'device'
}

async function withBrowserSessionCookie(request: AnyRequest, response: Response): Promise<Response> {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Credentials', 'true')

  const url = new URL(request.url)
  const isTikoAppsIdentityHost = url.hostname === 'id.tikoapps.org' || url.hostname.endsWith('.id.tikoapps.org')
  const path = url.pathname.replace(/\/$/, '')
  const shouldClearCookie = (request.method === 'POST' && path === '/v1/identity/logout') || (request.method === 'DELETE' && path === '/v1/identity/me')

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
