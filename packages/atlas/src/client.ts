import { AtlasClientError, type AtlasClientOptions, type AtlasRunRequest, type AtlasRunResponse } from './types'

export interface AtlasClient {
  run<T = unknown>(request: AtlasRunRequest): Promise<AtlasRunResponse<T>>
}

export function createAtlasClient(options: AtlasClientOptions): AtlasClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis)

  return {
    async run<T = unknown>(request: AtlasRunRequest): Promise<AtlasRunResponse<T>> {
      return requestJson<AtlasRunResponse<T>>({
        fetcher,
        url: `${baseUrl}/run`,
        getSessionToken: options.getSessionToken,
        body: request,
      })
    },
  }
}

async function requestJson<T>(params: {
  fetcher: typeof fetch
  url: string
  getSessionToken?: AtlasClientOptions['getSessionToken']
  body: unknown
}): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const token = await params.getSessionToken?.()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await params.fetcher(params.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(params.body),
  })

  const parsed = await response.json().catch(() => null) as T | AtlasErrorPayload | null

  if (!response.ok) {
    const errorPayload = isAtlasErrorPayload(parsed) ? parsed : null
    throw new AtlasClientError({
      code: errorPayload?.error?.code ?? 'atlas_request_failed',
      message: errorPayload?.error?.message ?? 'Atlas request failed.',
      status: response.status,
      details: errorPayload?.error?.details,
      requestId: errorPayload?.meta?.requestId,
    })
  }

  return parsed as T
}

interface AtlasErrorPayload {
  error?: { code?: string; message?: string; details?: Record<string, unknown> }
  meta?: { requestId?: string }
}

function isAtlasErrorPayload(value: unknown): value is AtlasErrorPayload {
  return typeof value === 'object' && value !== null && ('error' in value || 'meta' in value)
}
