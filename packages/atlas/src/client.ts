import {
  AtlasClientError,
  type AtlasClientOptions,
  type AtlasDataFetchRequest,
  type AtlasImageRequest,
  type AtlasImageResponse,
  type AtlasRunRequest,
  type AtlasRunResponse,
  type AtlasSpeechRequest,
  type AtlasSpeechResponse,
  type AtlasTextRequest,
  type AtlasTextResponse,
  type AtlasProviderStatus,
  type AtlasProviderUsageSummary,
  type AtlasUsageRow,
} from './types'

export interface AtlasClient {
  run<T = unknown>(request: AtlasRunRequest): Promise<AtlasRunResponse<T>>
  speech: {
    synthesize(request: AtlasSpeechRequest): Promise<AtlasRunResponse<AtlasSpeechResponse>>
  }
  images: {
    generate(request: AtlasImageRequest): Promise<AtlasRunResponse<AtlasImageResponse>>
  }
  text: {
    generate(request: AtlasTextRequest): Promise<AtlasRunResponse<AtlasTextResponse>>
  }
  data: {
    fetch<T = unknown>(request: AtlasDataFetchRequest): Promise<AtlasRunResponse<T>>
  }
  admin: {
    usage(params?: { app?: string; capability?: string; limit?: number }): Promise<{ data: { requests: AtlasUsageRow[] }; meta: { schemaVersion: 1; requestId: string } }>
    usageByProvider(): Promise<{ data: { providers: AtlasProviderUsageSummary[] }; meta: { schemaVersion: 1; requestId: string } }>
    providerStatus(): Promise<{ data: { providers: AtlasProviderStatus[] }; meta: { schemaVersion: 1; requestId: string } }>
    request(id: string): Promise<{ data: { request: AtlasUsageRow }; meta: { schemaVersion: 1; requestId: string } }>
  }
}

export function createAtlasClient(options: AtlasClientOptions): AtlasClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis)
  const post = <T>(path: string, body: unknown) => requestJson<T>({ fetcher, url: `${baseUrl}${path}`, method: 'POST', getSessionToken: options.getSessionToken, body })
  const get = <T>(path: string) => requestJson<T>({ fetcher, url: `${baseUrl}${path}`, method: 'GET', getSessionToken: options.getSessionToken })

  return {
    async run<T = unknown>(request: AtlasRunRequest): Promise<AtlasRunResponse<T>> {
      return post<AtlasRunResponse<T>>('/run', request)
    },
    speech: {
      synthesize(request: AtlasSpeechRequest) {
        return post<AtlasRunResponse<AtlasSpeechResponse>>('/speech', request)
      },
    },
    images: {
      generate(request: AtlasImageRequest) {
        return post<AtlasRunResponse<AtlasImageResponse>>('/images', request)
      },
    },
    text: {
      generate(request: AtlasTextRequest) {
        return post<AtlasRunResponse<AtlasTextResponse>>('/text', request)
      },
    },
    data: {
      fetch<T = unknown>(request: AtlasDataFetchRequest) {
        return post<AtlasRunResponse<T>>('/data/fetch', request)
      },
    },
    admin: {
      usage(params = {}) {
        const search = new URLSearchParams()
        if (params.app) search.set('app', params.app)
        if (params.capability) search.set('capability', params.capability)
        if (params.limit !== undefined) search.set('limit', String(params.limit))
        const suffix = search.toString() ? `?${search}` : ''
        return get(`/admin/usage${suffix}`)
      },
      usageByProvider() {
        return get('/admin/usage/by-provider')
      },
      providerStatus() {
        return get('/admin/provider-status')
      },
      request(id: string) {
        return get(`/admin/requests/${encodeURIComponent(id)}`)
      },
    },
  }
}

async function requestJson<T>(params: {
  fetcher: typeof fetch
  url: string
  getSessionToken?: AtlasClientOptions['getSessionToken']
  method: 'GET' | 'POST'
  body?: unknown
}): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const token = await params.getSessionToken?.()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await params.fetcher(params.url, {
    method: params.method,
    headers,
    ...(params.body === undefined ? {} : { body: JSON.stringify(params.body) }),
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

  if (parsed === null) {
    throw new AtlasClientError({
      code: 'atlas_invalid_json',
      message: 'Response body was not valid JSON.',
      status: response.status,
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
