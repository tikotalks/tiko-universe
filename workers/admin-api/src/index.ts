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
}

const ADMIN_EMAIL = 'me@sil.mt'

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
      return json({ data: { userId: admin.userId, email: admin.email, role: 'admin' } })
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

  const adminEmail = normalizeEmail(env.ADMIN_EMAIL || ADMIN_EMAIL)
  const adminEmailHash = await hashToken(adminEmail, env.TOKEN_PEPPER)
  const row = await env.AUTH_DB.prepare('SELECT id, email_hash FROM users WHERE id = ? LIMIT 1')
    .bind(authed.userId)
    .first<{ id: string; email_hash: string | null }>()

  if (!row || row.email_hash !== adminEmailHash) {
    return apiError('forbidden', 'This dashboard is only available to the configured Tiko admin.', 403)
  }

  return { userId: row.id, emailHash: adminEmailHash, email: adminEmail }
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
  const data = new TextEncoder().encode(`${pepper}:${token}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
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
