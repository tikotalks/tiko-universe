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

interface ServiceBinding {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>
}

export interface Env {
  IDENTITY_DB: D1Database
  TOKEN_PEPPER: string
  MAGIC_LINK_BASE_URL?: string
  COMMUNICATION_API_URL?: string
  COMMUNICATION_API_KEY?: string
  COMMUNICATION_SERVICE?: ServiceBinding
  ALLOWED_ORIGINS?: string
  MAGIC_LINK_TEST_SINK?: Array<{ email: string; token: string; otp: string; url: string; webUrl: string }>
}

interface UserRow {
  id: string
  kind: 'device' | 'recoverable'
  email_hash: string | null
  display_name: string | null
}

interface DeviceRow {
  id: string
  user_id: string
  device_secret_hash: string
  name: string | null
}

interface SessionJoinRow {
  session_id: string
  user_id: string
  user_kind: 'device' | 'recoverable'
  email_hash: string | null
  display_name: string | null
  device_id: string
  device_name: string | null
  expires_at: string
}

interface MagicLinkRow {
  id: string
  user_id: string
  email_hash: string
  otp_hash: string | null
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 180
const MAGIC_LINK_TTL_MS = 1000 * 60 * 15
const GENERIC_RECOVERY_MESSAGE = 'Check your email for the sign-in code.'
const DEFAULT_COMMUNICATION_API_URL = 'https://api.tikotalks.com/v1/communication'
const DEFAULT_ALLOWED_ORIGINS = 'https://tiko.mt,https://www.tiko.mt,https://tiko.tikoapps.org,https://yesno.tikoapps.org,https://cards.tikoapps.org,https://sequence.tikoapps.org,https://type.tikoapps.org,https://timer.tikoapps.org,https://admin.tikoapps.org,https://dev.tiko.tikoapps.org,https://dev.yesno.tikoapps.org,https://dev.cards.tikoapps.org,https://dev.sequence.tikoapps.org,https://dev.type.tikoapps.org,https://dev.timer.tikoapps.org,https://dev.admin.tikoapps.org,http://localhost:3060,http://localhost:3061,http://localhost:3062,http://localhost:3063,http://localhost:3064,http://localhost:3065,http://localhost:5173,http://localhost:4173,capacitor://localhost,ionic://localhost,tiko://native'

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

    if (request.method === 'POST' && path === '/v1/identity/device') {
      return withCors(await bootstrapDevice(request, env), cors)
    }
    if (request.method === 'GET' && path === '/v1/identity/session') {
      return withCors(await getSession(request, env), cors)
    }
    if (request.method === 'POST' && path === '/v1/identity/email') {
      return withCors(await requestRecoveryEmail(request, env), cors)
    }
    if (request.method === 'POST' && path === '/v1/identity/magic-links/verify') {
      return withCors(await verifyMagicLink(request, env), cors)
    }
    if (request.method === 'POST' && path === '/v1/identity/logout') {
      return withCors(await logout(request, env), cors)
    }

    return withCors(jsonError('not_found', 'Route not found.', 404), cors)
  } catch (error) {
    if (error instanceof HttpError) {
      return withCors(jsonError(error.code, error.message, error.status, error.field), cors)
    }
    return withCors(jsonError('internal_error', 'Unexpected server error.', 500), cors)
  }
}

async function bootstrapDevice(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ device?: { id?: string; secret?: string; name?: string; platform?: string } }>(request)
  const now = new Date()
  const deviceInput = body.device ?? {}
  const name = optionalString(deviceInput.name)
  const platform = optionalString(deviceInput.platform)

  if (deviceInput.id && deviceInput.secret) {
    const existingDevice = await first<DeviceRow>(env.IDENTITY_DB.prepare('SELECT id, user_id, device_secret_hash, name FROM devices WHERE id = ?').bind(deviceInput.id))
    if (existingDevice) {
      const candidateHash = await hashToken(deviceInput.secret, env.TOKEN_PEPPER)
      if (timingSafeEqual(candidateHash, existingDevice.device_secret_hash)) {
        await run(env.IDENTITY_DB.prepare('UPDATE devices SET last_seen_at = ?, name = COALESCE(?, name), platform = COALESCE(?, platform) WHERE id = ?').bind(now.toISOString(), name, platform, existingDevice.id))
        const user = await requireUser(env, existingDevice.user_id)
        const session = await createSession(env, user.id, existingDevice.id, now)
        return json(sessionBundle(user, { ...existingDevice, name: name ?? existingDevice.name }, session.token, session.expiresAt))
      }
    }
  }

  const userId = id('usr')
  const deviceId = id('dev')
  const deviceSecret = token('tds')
  const deviceSecretHash = await hashToken(deviceSecret, env.TOKEN_PEPPER)
  const createdAt = now.toISOString()

  await run(env.IDENTITY_DB.prepare('INSERT INTO users (id, kind, email_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, 'device', null, null, createdAt, createdAt))
  await run(env.IDENTITY_DB.prepare('INSERT INTO devices (id, user_id, device_secret_hash, name, platform, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(deviceId, userId, deviceSecretHash, name, platform, createdAt, createdAt))
  await writeEvent(env, userId, deviceId, 'device_bootstrap', createdAt)

  const session = await createSession(env, userId, deviceId, now)
  return json(sessionBundle({ id: userId, kind: 'device', email_hash: null, display_name: null }, { id: deviceId, name }, session.token, session.expiresAt, deviceSecret))
}

async function getSession(request: Request, env: Env): Promise<Response> {
  const tokenValue = requireBearer(request)
  const row = await sessionByToken(env, tokenValue)
  if (!row) throw new HttpError(401, 'unauthorized', 'Session is invalid or expired.')
  return json(sessionBundle(joinUser(row), joinDevice(row), tokenValue, row.expires_at))
}

async function requestRecoveryEmail(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ email?: string }>(request)
  const email = normalizeEmail(body.email)

  if (email) {
    const now = new Date()
    const emailHash = await hashToken(email, env.TOKEN_PEPPER)
    const bearer = getBearer(request)
    const session = bearer ? await sessionByToken(env, bearer) : null
    const existingUser = await first<UserRow>(env.IDENTITY_DB.prepare('SELECT id, kind, email_hash, display_name FROM users WHERE email_hash = ?').bind(emailHash))
    const userId = existingUser?.id ?? session?.user_id

    if (userId) {
      const magicToken = token('tml')
      const otp = generateOtp()
      const magicHash = await hashToken(magicToken, env.TOKEN_PEPPER)
      const otpHash = await hashToken(otp, env.TOKEN_PEPPER)
      const expiresAt = new Date(now.getTime() + MAGIC_LINK_TTL_MS).toISOString()
      await run(env.IDENTITY_DB.prepare('INSERT INTO magic_links (id, user_id, email_hash, token_hash, otp_hash, purpose, expires_at, created_at, consumed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id('mlk'), userId, emailHash, magicHash, otpHash, 'recovery', expiresAt, now.toISOString(), null))
      const url = magicLinkUrl(env, magicToken)
      const webUrl = webMagicLinkUrl(magicToken)
      env.MAGIC_LINK_TEST_SINK?.push({ email, token: magicToken, otp, url, webUrl })
      await requestMagicLinkDelivery(env, email, { magicLinkUrl: webUrl, webLinkUrl: url !== webUrl ? url : undefined, otp })
    }
  }

  return json({ message: GENERIC_RECOVERY_MESSAGE }, 202)
}

async function verifyMagicLink(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ token?: string; otp?: string }>(request)
  const now = new Date()
  let link: MagicLinkRow | null = null

  if (body.otp) {
    const otp = body.otp.replace(/\s+/g, '').trim()
    const otpHash = await hashToken(otp, env.TOKEN_PEPPER)
    link = await first<MagicLinkRow>(env.IDENTITY_DB.prepare('SELECT id, user_id, email_hash, otp_hash FROM magic_links WHERE otp_hash = ? AND consumed_at IS NULL AND expires_at > ?').bind(otpHash, now.toISOString()))
    if (!link) throw new HttpError(401, 'invalid_magic_link', 'Sign-in code is invalid or expired.')
    await run(env.IDENTITY_DB.prepare('UPDATE magic_links SET consumed_at = ? WHERE otp_hash = ?').bind(now.toISOString(), otpHash))
  } else {
    const magicToken = requiredString(body.token, 'token')
    const tokenHash = await hashToken(magicToken, env.TOKEN_PEPPER)
    link = await first<MagicLinkRow>(env.IDENTITY_DB.prepare('SELECT id, user_id, email_hash, otp_hash FROM magic_links WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > ?').bind(tokenHash, now.toISOString()))
    if (!link) throw new HttpError(401, 'invalid_magic_link', 'Magic link is invalid or expired.')
    await run(env.IDENTITY_DB.prepare('UPDATE magic_links SET consumed_at = ? WHERE token_hash = ?').bind(now.toISOString(), tokenHash))
  }
  const emailOwner = await first<UserRow>(env.IDENTITY_DB.prepare('SELECT id, kind, email_hash, display_name FROM users WHERE email_hash = ?').bind(link.email_hash))
  const userId = emailOwner && emailOwner.id !== link.user_id ? emailOwner.id : link.user_id
  if (!emailOwner || emailOwner.id === link.user_id) {
    await run(env.IDENTITY_DB.prepare('UPDATE users SET kind = ?, email_hash = ?, updated_at = ? WHERE id = ?').bind('recoverable', link.email_hash, now.toISOString(), link.user_id))
  }
  await writeEvent(env, userId, null, 'magic_link_verified', now.toISOString())

  const user = await requireUser(env, userId)
  const deviceId = id('dev')
  const deviceSecret = token('tds')
  const deviceSecretHash = await hashToken(deviceSecret, env.TOKEN_PEPPER)
  await run(env.IDENTITY_DB.prepare('INSERT INTO devices (id, user_id, device_secret_hash, name, platform, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(deviceId, user.id, deviceSecretHash, null, null, now.toISOString(), now.toISOString()))
  const session = await createSession(env, user.id, deviceId, now)

  return json(sessionBundle(user, { id: deviceId, name: null }, session.token, session.expiresAt, deviceSecret))
}

async function logout(request: Request, env: Env): Promise<Response> {
  const sessionToken = requireBearer(request)
  const tokenHash = await hashToken(sessionToken, env.TOKEN_PEPPER)
  await run(env.IDENTITY_DB.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').bind(new Date().toISOString(), tokenHash))
  return new Response(null, { status: 204 })
}

async function createSession(env: Env, userId: string, deviceId: string, now: Date): Promise<{ token: string; expiresAt: string }> {
  const sessionToken = token('tks')
  const tokenHash = await hashToken(sessionToken, env.TOKEN_PEPPER)
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString()
  await run(env.IDENTITY_DB.prepare('INSERT INTO sessions (id, user_id, device_id, token_hash, expires_at, created_at, last_seen_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id('ses'), userId, deviceId, tokenHash, expiresAt, now.toISOString(), now.toISOString(), null))
  return { token: sessionToken, expiresAt }
}

async function sessionByToken(env: Env, sessionToken: string): Promise<SessionJoinRow | null> {
  const tokenHash = await hashToken(sessionToken, env.TOKEN_PEPPER)
  return first<SessionJoinRow>(env.IDENTITY_DB.prepare(`
    SELECT s.id AS session_id, s.user_id, u.kind AS user_kind, u.email_hash, u.display_name, s.device_id, d.name AS device_name, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN devices d ON d.id = s.device_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  `).bind(tokenHash, new Date().toISOString()))
}

async function requireUser(env: Env, userId: string): Promise<UserRow> {
  const user = await first<UserRow>(env.IDENTITY_DB.prepare('SELECT id, kind, email_hash, display_name FROM users WHERE id = ?').bind(userId))
  if (!user) throw new HttpError(404, 'user_not_found', 'User not found.')
  return user
}

function sessionBundle(user: UserRow, device: Pick<DeviceRow, 'id' | 'name'>, tokenValue: string, expiresAt: string, deviceSecret?: string) {
  return {
    user: {
      id: user.id,
      displayName: user.display_name ?? undefined,
      kind: user.kind,
      recoverable: Boolean(user.email_hash)
    },
    device: {
      id: device.id,
      name: device.name ?? undefined,
      secret: deviceSecret
    },
    session: {
      token: tokenValue,
      expiresAt
    }
  }
}

function joinUser(row: SessionJoinRow): UserRow {
  return { id: row.user_id, kind: row.user_kind, email_hash: row.email_hash, display_name: row.display_name }
}

function joinDevice(row: SessionJoinRow): Pick<DeviceRow, 'id' | 'name'> {
  return { id: row.device_id, name: row.device_name }
}

async function writeEvent(env: Env, userId: string, deviceId: string | null, type: string, createdAt: string): Promise<void> {
  await run(env.IDENTITY_DB.prepare('INSERT INTO user_profile_events (id, user_id, device_id, type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id('evt'), userId, deviceId, type, '{}', createdAt))
}

async function requestMagicLinkDelivery(env: Env, email: string, params: { magicLinkUrl: string; webLinkUrl?: string; otp: string }): Promise<void> {
  if (!env.COMMUNICATION_API_KEY) return

  const baseUrl = (env.COMMUNICATION_API_URL ?? DEFAULT_COMMUNICATION_API_URL).replace(/\/$/, '')
  const url = `${baseUrl}/email/magic-link`
  const init: RequestInit = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.COMMUNICATION_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      to: email,
      magicLinkUrl: params.magicLinkUrl,
      webLinkUrl: params.webLinkUrl,
      otp: params.otp,
    })
  }

  const response = env.COMMUNICATION_SERVICE
    ? await env.COMMUNICATION_SERVICE.fetch(url, init)
    : await fetch(url, init)

  if (!response.ok) {
    throw new HttpError(502, 'communication_send_failed', 'Could not request recovery email delivery.')
  }
}

export async function hashToken(value: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`${pepper}:${value}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return result === 0
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
}

function token(prefix: string): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const encoded = btoa(String.fromCharCode(...Array.from(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return `${prefix}_${encoded}`
}

async function readJson<T>(request: Request): Promise<T> {
  if (!request.body) return {} as T
  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON.')
  }
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!email || !email.includes('@') || email.length > 320) return null
  return email
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
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

function generateOtp(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
  return (num % 1000000).toString().padStart(6, '0')
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, 'invalid_request', `${field} is required.`, field)
  return value.trim()
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
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS')
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
