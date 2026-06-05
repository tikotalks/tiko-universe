import type { SentenceStartResponse } from '@tiko/talk-types'

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

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

interface ServiceBinding {
  fetch(request: Request): Promise<Response>
}

export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  IDENTITY_SERVICE: ServiceBinding
  GENERATION_SERVICE: ServiceBinding
  ALLOWED_ORIGINS?: string
  TIKO_ENVIRONMENT?: string
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://talk.tikoapps.org',
  'https://dev.talk.tikoapps.org',
  'http://localhost:3066',
  'http://localhost:5173',
  'http://localhost:4173',
  'capacitor://localhost',
  'ionic://localhost',
  'tiko://native',
].join(',')

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

    if (path === '/health' || path === '/v1/sentence/health') {
      if (request.method !== 'GET') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(json({ data: { ok: true, service: 'sentence-api', environment: env.TIKO_ENVIRONMENT ?? 'unknown' } }), cors)
    }

    if (path === '/v1/sentence/start') {
      if (request.method !== 'GET') return withCors(jsonError('method_not_allowed', 'Method not allowed.', 405), cors)
      return withCors(await startSentence(url), cors)
    }

    return withCors(jsonError('not_found', 'Route not found.', 404), cors)
  } catch (error) {
    if (error instanceof HttpError) {
      return withCors(jsonError(error.code, error.message, error.status, error.field), cors)
    }
    return withCors(jsonError('internal_error', 'Unexpected server error.', 500), cors)
  }
}

async function startSentence(url: URL): Promise<Response> {
  const locale = readLocale(url)

  // Foundation-only route: return a typed empty shell until language-pack and
  // worker v1a tasks add D1/KV-backed pack loading and transition logic.
  const response: SentenceStartResponse = {
    templates: [],
    initialCategories: [],
    initialWords: [],
    savedPhrases: [],
    stripState: { words: [], validNext: [], canComplete: false },
  }

  return json({ ...response, locale })
}

function readLocale(url: URL): string {
  const locale = url.searchParams.get('locale')?.trim()
  if (!locale) throw new HttpError(400, 'missing_locale', 'Query parameter "locale" is required.', 'locale')
  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale)) {
    throw new HttpError(400, 'invalid_locale', 'Locale must use a language tag like "en" or "en-US".', 'locale')
  }
  return locale
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers()
  const origin = request.headers.get('Origin')
  const allowed = allowedOrigins(env)

  if (origin && allowed.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}

function allowedOrigins(env: Env): Set<string> {
  return new Set((env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS).split(',').map((origin) => origin.trim()).filter(Boolean))
}

function withCors(response: Response, cors: Headers): Response {
  const headers = new Headers(response.headers)
  cors.forEach((value, key) => headers.set(key, value))
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function jsonError(code: string, message: string, status: number, field?: string): Response {
  return json({ error: { code, message, ...(field ? { field } : {}) } }, status)
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public field?: string) {
    super(message)
  }
}
