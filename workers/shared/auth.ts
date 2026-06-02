/**
 * Shared authentication middleware for Tiko Cloudflare Workers.
 *
 * Accepts either:
 *   1. A Bearer session token validated against the identity-api service
 *   2. An API key validated against the D1 `api_keys` table (with in-memory cache)
 *      — falls back to the comma-separated API_KEYS env var when AUTH_DB is absent
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
}

export interface AuthFailure {
  ok: false
  response: Response
}

export type AuthResult = AuthSuccess | AuthFailure

// ── Env contract (add these to your worker's Env interface) ──

export interface AuthEnv {
  /** D1 database binding for the identity/auth database */
  AUTH_DB?: {
    prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; all(): Promise<{ results: unknown[] }> } }
  }
  /** Comma-separated list of valid API keys (fallback when AUTH_DB is absent) */
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

// ── In-memory key cache ──────────────────────────────────────

interface CachedKey {
  hash: string
  name: string
  scopes: string
  active: boolean
  expiresAt: string | null
}

let keysCache: CachedKey[] | null = null
let keysCacheExpiry = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ── Session validation response from identity-api ────────────

interface SessionBundle {
  user: { id: string }
  session: { token: string; expiresAt: string }
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
async function refreshKeysFromD1(db: NonNullable<AuthEnv['AUTH_DB']>): Promise<void> {
  const { results } = await db
    .prepare('SELECT key_hash, name, scopes, active, expires_at FROM api_keys WHERE active = 1')
    .bind()
    .all()

  keysCache = (results as Array<Record<string, unknown>>).map((row) => ({
    hash: String(row.key_hash),
    name: String(row.name),
    scopes: String(row.scopes),
    active: Boolean(row.active),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  }))
  keysCacheExpiry = Date.now() + CACHE_TTL_MS
}

/**
 * Check whether `token` matches a known API key.
 * Uses D1 + cache when AUTH_DB is available, otherwise falls back to API_KEYS env var.
 */
async function isApiKey(token: string, env: AuthEnv): Promise<boolean> {
  if (env.AUTH_DB) {
    // Refresh cache if expired or empty
    if (!keysCache || Date.now() > keysCacheExpiry) {
      try {
        await refreshKeysFromD1(env.AUTH_DB)
      } catch {
        // If D1 lookup fails, keep whatever cache we have (or empty)
      }
    }

    if (keysCache) {
      const now = new Date().toISOString()
      return keysCache.some(
        (key) =>
          key.hash === token &&
          key.active &&
          (key.expiresAt === null || key.expiresAt > now),
      )
    }

    return false
  }

  // Fallback: env var
  if (!env.API_KEYS) return false
  return env.API_KEYS
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .includes(token)
}

async function validateSession(
  token: string,
  env: AuthEnv,
): Promise<{ userId: string } | null> {
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
    const body = (await response.json()) as SessionBundle
    return { userId: body.user.id }
  } catch {
    return null
  }
}

// ── Main authenticate function ───────────────────────────────

export async function authenticate(
  request: Request,
  env: AuthEnv,
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
  if (await isApiKey(token, env)) {
    return { ok: true, method: 'api_key' }
  }

  // 2. Validate as session token against identity service
  const session = await validateSession(token, env)
  if (session) {
    return { ok: true, method: 'session', userId: session.userId }
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
