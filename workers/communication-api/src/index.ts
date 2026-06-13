import { requireServiceKey, type AuthEnv } from '../../shared/auth'

type D1Value = string | number | boolean | null

interface D1Result<T = unknown> {
  results?: T[]
  success: boolean
  meta: Record<string, unknown>
}

interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run(): Promise<D1Result>
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement
}

export interface Env {
  COMMUNICATION_DB: D1Database
  AUTH_DB?: D1Database
  TOKEN_PEPPER?: string
  ANKORE_TOKEN_PEPPER?: string
  PEPPER_SECRET?: { get(): Promise<string> }
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

    await requireServiceAuth(request, env)

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
  const body = await readJson<{ to?: string; magicLinkUrl?: string; webLinkUrl?: string; otp?: string; relatedUserId?: string; relatedApp?: string }>(request)
  const to = normalizeEmail(body.to)
  const magicLinkUrl = requiredUrl(body.magicLinkUrl, 'magicLinkUrl')
  const webLinkUrl = body.webLinkUrl ? requiredUrl(body.webLinkUrl, 'webLinkUrl') : undefined
  const otp = optionalString(body.otp)
  if (!to) throw new HttpError(400, 'invalid_email', 'to must be a valid email address.', 'to')

  const now = new Date().toISOString()
  const messageId = id('msg')
  const from = env.MAGIC_LINK_FROM_EMAIL ?? DEFAULT_MAGIC_LINK_FROM_EMAIL
  const subject = otp ? `${formatOtp(otp)} is your Tiko sign-in code` : 'Your Tiko sign-in link'
  const storedSubject = otp ? 'Your Tiko sign-in code' : subject
  const otpLine = otp ? `Your sign-in code: ${formatOtp(otp)}\n\n` : ''
  const text = `${otpLine}Open this link to sign in to Tiko:\n\n${magicLinkUrl}\n\nThis link and code expire in 15 minutes.\n\nIf you did not request this, you can ignore this email.`
  const html = magicLinkHtml(magicLinkUrl, { otp, webLinkUrl })
  const redactedText = redactMagicLinkMessage(text, magicLinkUrl, otp)
  const redactedHtml = redactMagicLinkMessage(html, magicLinkUrl, otp)

  await insertMessage(env, {
    id: messageId,
    direction: 'outbound',
    channel: 'email',
    type: 'identity_magic_link',
    status: 'queued',
    from_address: from,
    to_address: to,
    subject: storedSubject,
    text_body: redactedText,
    html_body: redactedHtml,
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

async function requireServiceAuth(request: Request, env: Env): Promise<void> {
  const auth = await requireServiceKey(request, {
    AUTH_DB: env.AUTH_DB as unknown as AuthEnv['AUTH_DB'],
    TOKEN_PEPPER: env.TOKEN_PEPPER,
    ANKORE_TOKEN_PEPPER: env.ANKORE_TOKEN_PEPPER,
    PEPPER_SECRET: env.PEPPER_SECRET,
  }, ['communication.send'])
  if (auth instanceof Response) throw new HttpError(auth.status === 403 ? 403 : 401, auth.status === 403 ? 'service_key_required' : 'unauthorized', 'Communication service authorization is required.')
}

function formatOtp(otp: string): string {
  const digits = otp.replace(/\D/g, '')
  return digits.length === 6 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : otp
}

function redactMagicLinkMessage(value: string, magicLinkUrl: string, otp?: string | null): string {
  const redactedUrl = redactedMagicLinkUrl(magicLinkUrl)
  let redacted = value
    .split(magicLinkUrl).join(redactedUrl)
    .split(escapeHtml(magicLinkUrl)).join(escapeHtml(redactedUrl))
  if (otp) {
    redacted = redacted
      .split(otp).join('[REDACTED_OTP]')
      .split(formatOtp(otp)).join('[REDACTED_OTP]')
      .split(escapeHtml(formatOtp(otp))).join('[REDACTED_OTP]')
  }
  return redacted
}

function redactedMagicLinkUrl(value: string): string {
  try {
    const url = new URL(value)
    for (const key of ['token', 'otp', 'code']) {
      if (url.searchParams.has(key)) url.searchParams.set(key, '[REDACTED]')
    }
    if (!url.searchParams.has('token') && !url.searchParams.has('otp') && !url.searchParams.has('code')) {
      return '[REDACTED_MAGIC_LINK]'
    }
    return url.toString()
  } catch {
    return '[REDACTED_MAGIC_LINK]'
  }
}

function magicLinkHtml(magicLinkUrl: string, opts: { otp?: string | null; webLinkUrl?: string }): string {
  const escapedUrl = escapeHtml(magicLinkUrl)
  const escapedWebUrl = opts.webLinkUrl ? escapeHtml(opts.webLinkUrl) : null
  const otpFormatted = opts.otp ? formatOtp(opts.otp) : null

  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 923.92 575.6" width="120" height="75" style="display:block;">
    <path fill="#ffffff" d="M539.9,183.54c-6.2,37.3-19.96,125.76-19.96,125.76s40.81-38.99,56.5-49.23c29.55-19.28,59.86,4.73,50.27,38.27c-6.44,22.5-70.24,63.18-70.24,63.18l47.1,36.52c23.72-4.7,45.23,17.03,35.56,41.01c-7.07,17.53-21.73,34.45-52.58,26.57c-27.51-7.03-74.93-56.05-74.93-56.05s-2.46,29.11-5.67,39c-7.3,22.46-36.76,37.2-57.09,21.74c-11.52-8.77-12.89-20.2-12.08-33.9c3.05-51.87,17.54-106.74,21.25-158.66c12.54-65.07,8.98-117.57,52.55-127.32C536.17,144.7,543.5,161.88,539.9,183.54z"/>
    <path fill="#ffffff" d="M276.59,268.89c0,0,46.66-7.44,54.36,1.53c19.16,22.33,2.08,64.16-24.7,71.14c-6.33,1.65-43.47,10.98-43.47,10.98s-3.19,16.97-6.39,47.75c-0.58,5.59-1.62,12.37-1.12,17.86c1.26,13.72,15.87,21.81,33.13,22.96c46.09,3.07,19.47,80.86-60.38,58.74c-60.39-16.74-49.76-54.99-43.57-103.05c1.22-9.47,3.68-39.15,3.68-39.15s-85.18,12.57-90.07,11.6c-32.9-6.55-27.97-49.41-6.23-65.76c9.05-6.81,109.02-27.29,109.02-27.29s10.42-64.66,12.05-70.64c8.92-32.63,61.93-37.21,69.28-0.33C282.98,209.31,276.59,268.89,276.59,268.89z"/>
    <path fill="#ffffff" d="M824.58,270.85c-65.75-61.74-171.61,4.21-175.47,85.9c-4.2,88.77,92.75,122.16,157.94,71.97C852.93,393.41,869.64,313.16,824.58,270.85z M762.42,377.09c-26.79,12.07-51.03-12.57-36.45-38.45c9.6-17.05,38.37-24.85,50.79-6.97C787.42,347.02,778.74,369.73,762.42,377.09z"/>
    <path fill="#ffffff" d="M396.51,265.15c18.27-2.46,33.62,8.94,38.16,26.33c-4.55,44.93-10,90.3-16.74,135.01c-3.06,20.3-2.99,40.72-22.26,52.81c-10.55,6.62-27.19,9.45-38.44,3.61c-20.21-10.5-14.45-34.96-12.35-53.38c4.09-35.89,9.51-74.22,15-110.01C363.52,295.81,367.04,269.12,396.51,265.15z"/>
    <path fill="#ffffff" d="M381.43,73.95c20.95-8.54,24.59,16.01,30.11,75.36c5.89,63.38,2.72,82.93-17.02,86.6c-24.09,4.48-31.01-12.49-32.49-76.15C360.54,95.83,359.67,82.82,381.43,73.95z"/>
    <path fill="#ffffff" d="M325.61,101.65c14.81-18.39,28.68-6.21,74.73,31.64c49.18,40.42,64.34,59.45,49.55,73.03c-18.42,16.93-30.7,13.24-76.97-30.5C326.45,131.88,310.88,119.95,325.61,101.65z"/>
    <path fill="#ffffff" d="M450.49,115.02c13.78,19.17-1.66,29.3-50.39,63.61c-52.05,36.64-74.43,46.18-83.59,28.32c-11.42-22.27-4.59-33.11,49.89-66.07C421.12,107.77,436.77,95.94,450.49,115.02z"/>
  </svg>`

  const otpBlock = otpFormatted ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" style="background: #f3f0ff; border-radius: 16px; padding: 24px 40px;">
            <tr>
              <td align="center">
                <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7c3aed;">Sign-in code</p>
                <p style="margin: 0; font-size: 44px; font-weight: 800; letter-spacing: 0.18em; color: #17131c; font-family: 'Courier New', Courier, monospace;">${escapeHtml(otpFormatted)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  ` : ''

  const webLinkBlock = escapedWebUrl ? `
    <p style="margin: 0; font-size: 14px; color: #7c6f88; text-align: center;">
      Or <a href="${escapedWebUrl}" style="color: #7c3aed; text-decoration: underline;">open in your browser</a>
    </p>
  ` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Tiko</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f4f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">

          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 20px 20px 0 0; padding: 32px 40px;">
              ${logoSvg}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background: #ffffff; border-radius: 0 0 20px 20px; padding: 36px 40px;">
              <h1 style="margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #17131c; text-align: center;">Sign in to Tiko</h1>
              <p style="margin: 0 0 4px; font-size: 15px; line-height: 1.55; color: #5f5768; text-align: center;">
                ${otpFormatted ? 'Enter the code below or click the button to sign in.' : 'Click the button below to sign in to your account.'}
              </p>
              <p style="margin: 0 0 24px; font-size: 13px; color: #9c8faa; text-align: center;">Expires in 15 minutes.</p>

              ${otpBlock}

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 16px;">
                <tr>
                  <td align="center">
                    <a href="${escapedUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 14px 36px; border-radius: 999px; letter-spacing: 0.01em;">Open Tiko</a>
                  </td>
                </tr>
              </table>

              ${webLinkBlock}

              <!-- Fallback URL -->
              <p style="margin: 28px 0 0; font-size: 12px; line-height: 1.6; color: #9c8faa; text-align: center; border-top: 1px solid #f0eef5; padding-top: 24px;">
                If the button does not work, copy and paste this link:<br>
                <a href="${escapedUrl}" style="color: #7c3aed; word-break: break-all;">${escapedUrl}</a>
              </p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #c4bace; text-align: center;">
                If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 0 0;">
              <p style="margin: 0; font-size: 12px; color: #c4bace;">
                Tiko &mdash; Communication tools for everyone<br>
                <a href="https://tikotalks.com" style="color: #c4bace; text-decoration: none;">tikotalks.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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
