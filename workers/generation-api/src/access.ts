import { authenticate, type AuthEnv, type AuthSuccess } from '../../shared/auth'
import { CORS_HEADERS, apiError } from './http'

interface UsageD1Database {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>
      run(): Promise<{ meta?: { changes?: number } }>
    }
  }
}

export interface GenerationAuthEnv extends AuthEnv {
  GENERATION_DB: UsageD1Database
}

export interface PaidAuthContext {
  auth: AuthSuccess
  subjectKey: string
}

export interface GenerationAccessContext {
  auth: AuthSuccess | null
}

export interface UsagePolicy {
  capability: string
  units: number
  maxRequestsPerMinute: number
  maxUnitsPerDay: number
}

export async function requireAuth(request: Request, env: GenerationAuthEnv, handler: (context: GenerationAccessContext) => Promise<Response>): Promise<Response> {
  const authed = await authenticate(request, env)
  if (authed.ok === false) return authFailureResponse(authed.response)
  return handler({ auth: authed })
}

export async function optionalAuth(request: Request, env: GenerationAuthEnv): Promise<GenerationAccessContext | Response> {
  if (!request.headers.has('authorization')) return { auth: null }
  const authed = await authenticate(request, env)
  if (authed.ok === false) return authFailureResponse(authed.response)
  return { auth: authed }
}

export function isServiceAccess(context: GenerationAccessContext): boolean {
  return context.auth?.method === 'api_key'
}

// Service keys and Tiko admins manage all generated content, not just their own,
// so they bypass the per-user created_by ownership filter.
export function isElevatedAccess(context: GenerationAccessContext): boolean {
  if (isServiceAccess(context)) return true
  const roles = (context.auth as { roles?: unknown } | null)?.roles
  return Array.isArray(roles) && roles.includes('admin')
}

export function sessionUserId(context: GenerationAccessContext): string | null {
  return context.auth?.method === 'session' && context.auth.userId ? context.auth.userId : null
}

export function createdBy(context: GenerationAccessContext): string | null {
  return sessionUserId(context)
}

export function canAccessOwnedRecord(context: GenerationAccessContext, record: { is_public?: unknown; created_by?: unknown }): boolean {
  if (Number(record.is_public ?? 0) === 1) return true
  if (isElevatedAccess(context)) return true
  const userId = sessionUserId(context)
  return !!userId && typeof record.created_by === 'string' && record.created_by === userId
}

export function canMutateOwnedRecord(context: GenerationAccessContext, record: { created_by?: unknown }): boolean {
  if (isElevatedAccess(context)) return true
  const userId = sessionUserId(context)
  return !!userId && typeof record.created_by === 'string' && record.created_by === userId
}

export function forbiddenOrUnauthorized(context: GenerationAccessContext): Response {
  return context.auth ? apiError('forbidden', 'You do not have access to this generated content.', 403) : apiError('unauthorized', 'Authentication is required.', 401)
}

export async function requirePaidAccess(request: Request, env: GenerationAuthEnv, policy: UsagePolicy, handler: (context: PaidAuthContext) => Promise<Response>): Promise<Response> {
  const context = await authenticatePaidRequest(request, env)
  if (context instanceof Response) return context
  const usageError = await recordUsageWindow(env, context.subjectKey, policy)
  if (usageError) return usageError
  return handler(context)
}

export async function authenticatePaidRequest(request: Request, env: GenerationAuthEnv): Promise<PaidAuthContext | Response> {
  const authed = await authenticate(request, env)
  if (authed.ok === false) return authFailureResponse(authed.response)
  if (!authed.bearerToken) return apiError('invalid_auth_context', 'Authenticated requests must include the validated bearer token.', 500)
  const subjectKey = authed.method === 'session' && authed.userId
    ? `session:${authed.userId}`
    : `key:${await sha256Hex(authed.bearerToken)}`
  return { auth: authed, subjectKey }
}

function authFailureResponse(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

async function recordUsageWindow(env: GenerationAuthEnv, subjectKey: string, policy: UsagePolicy): Promise<Response | null> {
  const now = new Date()
  const minuteStart = new Date(Math.floor(now.getTime() / 60000) * 60000).toISOString()
  const dayStart = now.toISOString().slice(0, 10)
  const minute = await readUsageWindow(env, subjectKey, policy.capability, 'minute', minuteStart)
  if (minute.request_count >= policy.maxRequestsPerMinute) return apiError('rate_limited', 'Rate limit exceeded.', 429)
  const day = await readUsageWindow(env, subjectKey, policy.capability, 'day', dayStart)
  if (day.unit_count + policy.units > policy.maxUnitsPerDay) return apiError('budget_exceeded', 'Daily usage budget exceeded.', 429)
  await incrementUsageWindow(env, subjectKey, policy.capability, 'minute', minuteStart, 1, policy.units)
  await incrementUsageWindow(env, subjectKey, policy.capability, 'day', dayStart, 1, policy.units)
  return null
}

async function readUsageWindow(env: GenerationAuthEnv, subjectKey: string, capability: string, windowKind: string, windowStart: string): Promise<{ request_count: number; unit_count: number }> {
  const row = await env.GENERATION_DB.prepare(`
    SELECT request_count, unit_count FROM generation_usage_windows
    WHERE subject_key = ? AND capability = ? AND window_kind = ? AND window_start = ?
    LIMIT 1
  `).bind(subjectKey, capability, windowKind, windowStart).first<{ request_count: number; unit_count: number }>()
  return { request_count: Number(row?.request_count ?? 0), unit_count: Number(row?.unit_count ?? 0) }
}

async function incrementUsageWindow(env: GenerationAuthEnv, subjectKey: string, capability: string, windowKind: string, windowStart: string, requests: number, units: number): Promise<void> {
  const at = new Date().toISOString()
  await env.GENERATION_DB.prepare(`
    INSERT INTO generation_usage_windows (subject_key, capability, window_kind, window_start, request_count, unit_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(subject_key, capability, window_kind, window_start) DO UPDATE SET
      request_count = request_count + excluded.request_count,
      unit_count = unit_count + excluded.unit_count,
      updated_at = excluded.updated_at
  `).bind(subjectKey, capability, windowKind, windowStart, requests, units, at).run()
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
