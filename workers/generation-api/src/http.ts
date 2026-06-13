export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, options: { timeoutMs: number }): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetchWithTimeout(input, init, options.timeoutMs).catch((error) => {
      lastError = error
      return null
    })
    if (!response) continue
    if (attempt === 0 && isRetryableStatus(response.status)) {
      await response.body?.cancel().catch(() => undefined)
      continue
    }
    return response
  }
  throw lastError instanceof Error ? lastError : new Error('fetch_failed')
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

export function apiError(code: string, message: string, status = 400, field?: string): Response {
  return json({ error: { code, message, ...(field ? { field } : {}) } }, status)
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
