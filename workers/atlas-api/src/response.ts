const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function optionsResponse(): Response {
  return new Response(null, { headers: CORS_HEADERS })
}

export function json(data: unknown, status = 200): Response {
  return withCors(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))
}

export function apiError(code: string, message: string, status: number, requestId: string, details?: Record<string, unknown>): Response {
  return json({
    error: { code, message, ...(details ? { details } : {}) },
    meta: { schemaVersion: 1, requestId },
  }, status)
}

export function createRequestId(): string {
  return `atlas_${crypto.randomUUID()}`
}
