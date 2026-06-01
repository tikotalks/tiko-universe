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

export interface Env {
  COMMUNICATION_DB: D1Database
  COMMUNICATION_API_KEY: string
  RESEND_API_KEY?: string
  MAGIC_LINK_FROM_EMAIL?: string
  ALLOWED_ORIGINS?: string
}

interface MessageRow {
  id: string
  direction: 'inbound' | 'outbound'
  channel: 'email'
  type: string
  status: string
  from_address: string | null
  to_address: string | null
  subject: string | null
  text_body: string | null
  html_body: string | null
  provider: string | null
  provider_message_id: string | null
  related_user_id: string | null
  related_app: string | null
  metadata_json: string
  created_at: string
  updated_at: string
}

const RESEND_EMAILS_URL = 'https://api.resend.com/emails'
const DEFAULT_MAGIC_LINK_FROM_EMAIL = 'Tiko <noreply@tikotalks.com>'
const DEFAULT_ALLOWED_ORIGINS = 'https://admin.tikoapps.org,https://dev.admin.tikoapps.org,http://localhost:5173,http://localhost:4173'

export default {
  fetch(request: Request, env: Env): Promise<Response> {
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

    if (path === '/v1/communication/health' && request.method === 'GET') {
      return withCors(json({ data: { ok: true, service: 'communication-api' } }), cors)
    }

    requireServiceAuth(request, env)

    if (path === '/v1/communication/email/magic-link' && request.method === 'POST') {
      return withCors(await sendMagicLinkEmail(request, env), cors)
    }
    if (path === '/v1/communication/inbound/email' && request.method === 'POST') {
      return withCors(await captureInboundEmail(request, env), cors)
    }
    if (path === '/v1/communication/inbox' && request.method === 'GET') {
      return withCors(await listInbox(url, env), cors)
    }

    return withCors(jsonError('not_found', 'Route not found.', 404), cors)
  } catch (error) {
    if (error instanceof HttpError) {
      return withCors(jsonError(error.code, error.message, error.status, error.field), cors)
    }
    return withCors(jsonError('internal_error', 'Unexpected server error.', 500), cors)
  }
}

async function sendMagicLinkEmail(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ to?: string; magicLinkUrl?: string; relatedUserId?: string; relatedApp?: string }>(request)
  const to = normalizeEmail(body.to)
  const magicLinkUrl = requiredUrl(body.magicLinkUrl, 'magicLinkUrl')
  if (!to) throw new HttpError(400, 'invalid_email', 'to must be a valid email address.', 'to')

  const now = new Date().toISOString()
  const messageId = id('msg')
  const from = env.MAGIC_LINK_FROM_EMAIL ?? DEFAULT_MAGIC_LINK_FROM_EMAIL
  const subject = 'Your Tiko magic link'
  const text = `Open this link to continue with Tiko:\n\n${magicLinkUrl}\n\nThis link expires in 15 minutes.`
  const html = magicLinkHtml(magicLinkUrl)

  await insertMessage(env, {
    id: messageId,
    direction: 'outbound',
    channel: 'email',
    type: 'identity_magic_link',
    status: 'queued',
    from_address: from,
    to_address: to,
    subject,
    text_body: text,
    html_body: html,
    provider: 'resend',
    provider_message_id: null,
    related_user_id: optionalString(body.relatedUserId),
    related_app: optionalString(body.relatedApp),
    metadata_json: JSON.stringify({ template: 'identity_magic_link' }),
    created_at: now,
    updated_at: now
  })
  await insertEvent(env, messageId, 'message_queued', 'tiko', { type: 'identity_magic_link' }, now)

  if (!env.RESEND_API_KEY) {
    await markMessage(env, messageId, 'failed', null, now)
    await insertAttempt(env, messageId, 'resend', 'failed', null, 'email_provider_not_configured', 'Email provider is not configured.', now)
    throw new HttpError(503, 'email_provider_not_configured', 'Email provider is not configured.')
  }

  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html, text })
  })
  const providerBody = await response.json().catch(() => null) as { id?: string; message?: string; error?: string } | null
  const providerMessageId = providerBody?.id ?? null

  if (!response.ok) {
    await markMessage(env, messageId, 'failed', providerMessageId, now)
    await insertAttempt(env, messageId, 'resend', 'failed', providerMessageId, `http_${response.status}`, providerBody?.message ?? providerBody?.error ?? null, now)
    throw new HttpError(502, 'email_send_failed', 'Could not send the email.')
  }

  await markMessage(env, messageId, 'sent', providerMessageId, now)
  await insertAttempt(env, messageId, 'resend', 'sent', providerMessageId, null, null, now)
  await insertEvent(env, messageId, 'provider_accepted', 'resend', providerBody ?? {}, now)

  return json({ data: { accepted: true, messageId, providerMessageId } }, 202)
}

async function captureInboundEmail(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ from?: string; to?: string; subject?: string; text?: string; html?: string; provider?: string; providerMessageId?: string; payload?: unknown }>(request)
  const from = normalizeEmail(body.from)
  const to = normalizeEmail(body.to)
  if (!from) throw new HttpError(400, 'invalid_email', 'from must be a valid email address.', 'from')
  if (!to) throw new HttpError(400, 'invalid_email', 'to must be a valid email address.', 'to')

  const now = new Date().toISOString()
  const messageId = id('msg')
  await insertMessage(env, {
    id: messageId,
    direction: 'inbound',
    channel: 'email',
    type: 'support_inbound',
    status: 'open',
    from_address: from,
    to_address: to,
    subject: optionalString(body.subject),
    text_body: optionalString(body.text),
    html_body: optionalString(body.html),
    provider: optionalString(body.provider) ?? 'unknown',
    provider_message_id: optionalString(body.providerMessageId),
    related_user_id: null,
    related_app: null,
    metadata_json: JSON.stringify({ payload: body.payload ?? null }),
    created_at: now,
    updated_at: now
  })
  await insertEvent(env, messageId, 'inbound_received', optionalString(body.provider) ?? 'unknown', body.payload ?? {}, now)

  return json({ data: { accepted: true, messageId } }, 202)
}

async function listInbox(url: URL, env: Env): Promise<Response> {
  const limit = clampNumber(Number(url.searchParams.get('limit') ?? 50), 1, 100)
  const status = optionalString(url.searchParams.get('status')) ?? 'open'
  const result = await env.COMMUNICATION_DB.prepare(`
    SELECT id, direction, channel, type, status, from_address, to_address, subject, text_body, html_body,
      provider, provider_message_id, related_user_id, related_app, metadata_json, created_at, updated_at
    FROM communication_messages
    WHERE direction = ? AND status = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind('inbound', status, limit).all<MessageRow>()
  return json({ data: (result.results ?? []).map(publicMessage) })
}

async function insertMessage(env: Env, message: MessageRow): Promise<void> {
  await run(env.COMMUNICATION_DB.prepare(`
    INSERT INTO communication_messages (
      id, direction, channel, type, status, from_address, to_address, subject, text_body, html_body,
      provider, provider_message_id, related_user_id, related_app, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    message.id,
    message.direction,
    message.channel,
    message.type,
    message.status,
    message.from_address,
    message.to_address,
    message.subject,
    message.text_body,
    message.html_body,
    message.provider,
    message.provider_message_id,
    message.related_user_id,
    message.related_app,
    message.metadata_json,
    message.created_at,
    message.updated_at
  ))
}

async function markMessage(env: Env, messageId: string, status: string, providerMessageId: string | null, updatedAt: string): Promise<void> {
  await run(env.COMMUNICATION_DB.prepare('UPDATE communication_messages SET status = ?, provider_message_id = COALESCE(?, provider_message_id), updated_at = ? WHERE id = ?').bind(status, providerMessageId, updatedAt, messageId))
}

async function insertAttempt(env: Env, messageId: string, provider: string, status: string, providerMessageId: string | null, errorCode: string | null, errorMessage: string | null, createdAt: string): Promise<void> {
  await run(env.COMMUNICATION_DB.prepare(`
    INSERT INTO communication_delivery_attempts (
      id, message_id, provider, provider_message_id, status, error_code, error_message, attempt_number, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id('att'), messageId, provider, providerMessageId, status, errorCode, errorMessage, 1, createdAt))
}

async function insertEvent(env: Env, messageId: string, eventType: string, provider: string, payload: unknown, createdAt: string): Promise<void> {
  await run(env.COMMUNICATION_DB.prepare(`
    INSERT INTO communication_events (id, message_id, event_type, provider, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id('evt'), messageId, eventType, provider, JSON.stringify(payload ?? {}), createdAt))
}

function publicMessage(row: MessageRow) {
  return {
    id: row.id,
    direction: row.direction,
    channel: row.channel,
    type: row.type,
    status: row.status,
    from: row.from_address,
    to: row.to_address,
    subject: row.subject,
    text: row.text_body,
    html: row.html_body,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    relatedUserId: row.related_user_id,
    relatedApp: row.related_app,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function requireServiceAuth(request: Request, env: Env): void {
  const bearer = getBearer(request)
  if (!env.COMMUNICATION_API_KEY || !bearer || !timingSafeEqual(bearer, env.COMMUNICATION_API_KEY)) {
    throw new HttpError(401, 'unauthorized', 'Communication service authorization is required.')
  }
}

function magicLinkHtml(magicLinkUrl: string): string {
  const escapedUrl = escapeHtml(magicLinkUrl)
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; color: #17131c;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">Your Tiko magic link</h1>
      <p style="font-size: 16px; line-height: 1.45;">Use this link to continue with Tiko. It expires in 15 minutes.</p>
      <p style="margin: 24px 0;">
        <a href="${escapedUrl}" style="display: inline-block; background: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 18px; border-radius: 999px;">Open Tiko</a>
      </p>
      <p style="font-size: 13px; line-height: 1.45; color: #5f5768;">If the button does not work, paste this link into your browser:<br><a href="${escapedUrl}">${escapedUrl}</a></p>
    </div>
  `
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

function requiredUrl(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, 'invalid_request', `${field} is required.`, field)
  const trimmed = value.trim()
  try {
    const url = new URL(trimmed)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol')
    return trimmed
  } catch {
    throw new HttpError(400, 'invalid_url', `${field} must be a valid URL.`, field)
  }
}

function getBearer(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1]?.trim() || null
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return result === 0
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.floor(value)))
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

async function run(statement: D1PreparedStatement): Promise<void> {
  await statement.run()
}

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly field?: string) {
    super(message)
  }
}
