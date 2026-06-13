/**
 * Shared authentication middleware for Tiko Cloudflare Workers.
 *
 * Accepts either:
 *   1. A Bearer session token validated against the identity-api service
 *   2. An API key validated against the D1 `identity_api_keys` table
 *
 * Usage:
 *   const authed = await authenticate(request, env)
 *   if (!authed.ok) return authed.response  // 401
 *   // authed.userId is available when the token is a session token
 */

// ── Auth result ──────────────────────────────────────────────

export interface AuthSuccess {
  ok: true
  method: 'session' | 'api_key'
  /** Populated when method === 'session' */
  userId?: string
  subjectId?: string
  roles?: string[]
  capabilities?: Record<string, unknown>
  scopes?: string[]
}

export interface AuthFailure {
  ok: false
  response: Response
}

export type AuthResult = AuthSuccess | AuthFailure

// ── Env contract (add these to your worker's Env interface) ──

/**
 * Secrets Store binding type — when `[[secrets_store_secrets]]` is configured,
 * the binding exposes an async `.get()` that returns the secret value.
 */
export type SecretStoreSecret = { get(): Promise<string> }

export interface AuthEnv {
  /** D1 database binding for the identity/auth database */
  AUTH_DB?: {
    prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; all(): Promise<{ results: unknown[] }>; run?(): Promise<unknown> } }
  }
  TOKEN_PEPPER?: string
  ANKORE_TOKEN_PEPPER?: string
  /** Secrets Store binding for TOKEN_PEPPER (centralized across workers) */
  PEPPER_SECRET?: SecretStoreSecret
  /** @deprecated Static API key fallback is intentionally not used. */
  API_KEYS?: string
  /** Base URL of the identity service (e.g. https://api.tikotalks.com/v1) */
  IDENTITY_BASE_URL?: string
  /**
   * Service binding to the identity-api worker. When set, session validation uses
   * a direct Worker-to-Worker call instead of an HTTP fetch — required when both
   * workers live on the same Cloudflare zone (where public-URL subrequests hang).
   */
  IDENTITY_SERVICE?: {
    fetch(input: Request | string, init?: RequestInit): Promise<Response>
  }
}

// ── Pepper resolution ─────────────────────────────────────────

let cachedPepper: string | null = null
let cachedPepperExpiresAt = 0
const PEPPER_CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Resolve the TOKEN_PEPPER from whichever source is available.
 *
 * Priority:
 *   1. Secrets Store binding (`PEPPER_SECRET`) — centralized across workers
 *   2. `ANKORE_TOKEN_PEPPER` env var (legacy alias)
 *   3. `TOKEN_PEPPER` env var (direct wrangler secret)
 *
 * Results from the Secrets Store are cached in-memory for 5 minutes to avoid
 * repeated async calls on every request.
 */
export async function resolvePepper(env: AuthEnv): Promise<string | undefined> {
  if (env.PEPPER_SECRET) {
    const now = Date.now()
    if (cachedPepper && cachedPepperExpiresAt > now) return cachedPepper
    try {
      const value = await env.PEPPER_SECRET.get()
      if (value) {
        cachedPepper = value
        cachedPepperExpiresAt = now + PEPPER_CACHE_TTL_MS
        return value
      }
    } catch {
      // Fall through to env vars
    }
  }
  return env.ANKORE_TOKEN_PEPPER ?? env.TOKEN_PEPPER
}

// ── In-memory key cache ──────────────────────────────────────

interface CachedKey {
  hash: string
  subjectId: string
  name: string
  scopes: string[]
  expiresAt: string | null
}

let keysCache = new Map<string, { expiresAt: number; key: CachedKey | null }>()
let keyLookupUnavailableUntil = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const NEGATIVE_CACHE_TTL_MS = 60 * 1000

export interface AuthenticateOptions {
  scopes?: string[]
}

export interface RequireRoleOptions {
  capabilities?: string[]
  product?: string
}

// ── Session validation response from identity-api ────────────

interface IdentitySessionBody {
  subject: { id: string }
  session?: { token: string; expiresAt: string }
  roles?: string[]
  capabilities?: Record<string, unknown>
}

// ── Helpers ──────────────────────────────────────────────────

function getBearer(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1]?.trim() || null
}

/**
 * Load active API keys from D1 and refresh the in-memory cache.
 */
async function hashApiKey(token: string, env: AuthEnv): Promise<string | null> {
  const pepper = await resolvePepper(env)
  if (!pepper) return null
  const material = `tiko:api-key:${pepper}:${token}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material))
  return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  const length = Math.max(left.length, right.length)
  let diff = left.length ^ right.length
  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return diff === 0
}

function parseScopes(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    // Legacy comma-separated scopes are normalized below.
  }
  return trimmed.split(',').map((scope) => scope.trim()).filter(Boolean)
}

function hasScopes(granted: string[], required: string[] | undefined): boolean {
  if (!required || required.length === 0) return true
  return granted.includes('*') || required.every((scope) => granted.includes(scope))
}

async function lookupApiKey(hash: string, db: NonNullable<AuthEnv['AUTH_DB']>): Promise<CachedKey | null> {
  const now = Date.now()
  if (now < keyLookupUnavailableUntil) return null
  const cached = keysCache.get(hash)
  if (cached && cached.expiresAt > now) return cached.key

  try {
    const row = await db
      .prepare('SELECT id, subject_id, product, name, key_hash, scopes_json, expires_at, revoked_at FROM identity_api_keys WHERE key_hash = ? AND revoked_at IS NULL LIMIT 1')
      .bind(hash)
      .first<Record<string, unknown>>()
    const key = row && timingSafeEqual(String(row.key_hash), hash)
      ? {
          hash: String(row.key_hash),
          subjectId: String(row.subject_id),
          name: String(row.name),
          scopes: parseScopes(row.scopes_json),
          expiresAt: row.expires_at ? String(row.expires_at) : null,
        }
      : null
    keysCache.set(hash, { expiresAt: now + (key ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS), key })
    return key
  } catch {
    keyLookupUnavailableUntil = now + NEGATIVE_CACHE_TTL_MS
    return null
  }
}

/**
 * Check whether `token` matches a known API key.
 */
async function validateApiKey(token: string, env: AuthEnv, options: AuthenticateOptions): Promise<AuthSuccess | null> {
  if (!env.AUTH_DB) return null
  const hash = await hashApiKey(token, env)
  if (!hash) return null
  const key = await lookupApiKey(hash, env.AUTH_DB)
  if (!key) return null
  const now = new Date().toISOString()
  if (key.expiresAt !== null && key.expiresAt <= now) return null
  if (!hasScopes(key.scopes, options.scopes)) return null
  const updateLastUsed = env.AUTH_DB.prepare('UPDATE identity_api_keys SET last_used_at = ? WHERE key_hash = ?')
    .bind(now, hash)
    .run?.()
  await updateLastUsed?.catch(() => undefined)
  return { ok: true, method: 'api_key', subjectId: key.subjectId, scopes: key.scopes }
}

async function validateSession(
  token: string,
  env: AuthEnv,
): Promise<{ userId: string; roles: string[]; capabilities: Record<string, unknown> } | null> {
  const baseUrl = (env.IDENTITY_BASE_URL ?? 'https://api.tikotalks.com/v1').replace(/\/$/, '')
  const url = `${baseUrl}/identity/session`
  const init: RequestInit = {
    method: 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  }
  try {
    const response = env.IDENTITY_SERVICE
      ? await env.IDENTITY_SERVICE.fetch(url, init)
      : await fetch(url, init)
    if (!response.ok) return null
    const body = (await response.json()) as IdentitySessionBody
    if (!body.subject?.id) return null
    return {
      userId: body.subject.id,
      roles: Array.isArray(body.roles) ? body.roles.map(String) : [],
      capabilities: body.capabilities && typeof body.capabilities === 'object' ? body.capabilities : {},
    }
  } catch {
    return null
  }
}

export async function loadIdentityRoles(env: AuthEnv, subjectId: string, product = 'tiko'): Promise<string[]> {
  if (!env.AUTH_DB) return []
  const { results } = await env.AUTH_DB.prepare(
    'SELECT role FROM identity_role_assignments WHERE subject_id = ? AND product = ? AND revoked_at IS NULL',
  )
    .bind(subjectId, product)
    .all()
  return Array.from(new Set(results
    .map((row) => (row && typeof row === 'object' && 'role' in row ? String((row as { role?: unknown }).role ?? '') : ''))
    .filter(Boolean)))
    .sort()
}

// ── Main authenticate function ───────────────────────────────

export async function authenticate(
  request: Request,
  env: AuthEnv,
  options: AuthenticateOptions = {},
): Promise<AuthResult> {
  const token = getBearer(request)
  if (!token) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: { code: 'unauthorized', message: 'Authorization header with Bearer token is required.' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    }
  }

  // 1. Check API key first (cheapest check — cached D1 lookup, no external network call)
  const apiKey = await validateApiKey(token, env, options)
  if (apiKey) {
    return apiKey
  }

  // 2. Validate as session token against identity service
  const session = await validateSession(token, env)
  if (session) {
    return {
      ok: true,
      method: 'session',
      userId: session.userId,
      roles: session.roles,
      capabilities: session.capabilities,
    }
  }

  return {
    ok: false,
    response: new Response(
      JSON.stringify({
        error: {
          code: 'unauthorized',
          message: 'Invalid or expired token. Provide a valid session token or API key.',
        },
      }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    ),
  }
}

export async function requireSession(request: Request, env: AuthEnv): Promise<AuthSuccess | Response> {
  const auth = await authenticate(request, env)
  if (auth.ok === false) return auth.response
  if (auth.method !== 'session' || !auth.userId) {
    return new Response(
      JSON.stringify({ error: { code: 'session_required', message: 'A Tiko user session is required.' } }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )
  }
  return auth
}

export async function requireRole(
  request: Request,
  env: AuthEnv,
  roles: string[],
  options: RequireRoleOptions = {},
): Promise<AuthSuccess | Response> {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session
  const allowed = new Set(roles)
  const userId = session.userId
  if (!userId) {
    return new Response(
      JSON.stringify({ error: { code: 'session_required', message: 'A Tiko user session is required.' } }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )
  }
  const sessionRoles = session.roles?.length ? session.roles : await loadIdentityRoles(env, userId, options.product ?? 'tiko')
  session.roles = sessionRoles
  const hasRole = sessionRoles.some((role) => allowed.has(role)) === true
  const hasCapability = options.capabilities?.some((capability) => session.capabilities?.[capability] === true) === true
  if (!hasRole && !hasCapability) {
    return new Response(
      JSON.stringify({ error: { code: 'forbidden', message: 'Required role is missing.' } }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )
  }
  return session
}

export async function requireServiceKey(request: Request, env: AuthEnv, scopes: string[] = []): Promise<AuthSuccess | Response> {
  const auth = await authenticate(request, env, { scopes })
  if (auth.ok === false) return auth.response
  if (auth.method !== 'api_key') {
    return new Response(
      JSON.stringify({ error: { code: 'service_key_required', message: 'A service API key is required.' } }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )
  }
  return auth
}
