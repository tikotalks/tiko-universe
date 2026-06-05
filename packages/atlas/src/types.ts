export type AtlasCapability =
  | 'speech.synthesize'
  | 'image.generate'
  | 'text.generate'
  | 'text.classify'
  | 'data.fetch'
  | 'metadata.lookup'

export type AtlasProvider =
  | 'tiko'
  | 'cloudflare-workers-ai'
  | 'openai'
  | 'elevenlabs'
  | 'youtube'
  | 'url-metadata'
  | 'internal'
  | 'noop'

export interface AtlasClientOptions {
  baseUrl: string
  getSessionToken?: () => string | null | undefined | Promise<string | null | undefined>
  fetcher?: typeof fetch
}

export interface AtlasRunRequest {
  capability: AtlasCapability
  app: string
  purpose: string
  input: unknown
  routing?: {
    providerHint?: AtlasProvider
    modelHint?: string
    quality?: 'fast' | 'balanced' | 'best'
    allowFallback?: boolean
  }
  cache?: {
    mode?: 'default' | 'bypass' | 'refresh'
    key?: string
  }
  metadata?: Record<string, unknown>
}

export interface AtlasSpeechRequest {
  text: string
  locale?: string
  language?: string
  app: string
  purpose: string
  format?: 'mp3'
  voice?: string
  model?: string
  speed?: number
  provider?: 'openai' | 'elevenlabs' | 'auto'
}

export interface AtlasSpeechResponse {
  id: string
  audioUrl: string
  contentType: string
  cached: boolean
  provider: { name: AtlasProvider; model?: string; voice?: string }
  usage?: { inputCharacters?: number; estimatedCostUsd?: number }
}

export interface AtlasImageRequest {
  prompt: string
  app: string
  purpose: string
  size?: 'square' | 'portrait' | 'landscape'
  count?: number
  model?: string
  provider?: 'openai' | 'auto'
}

export interface AtlasImageResponse {
  images: Array<{
    id: string
    mediaUrl: string
    contentType?: string
    provider: { name: AtlasProvider; model?: string }
    status: 'generated' | 'stored' | 'pending_review'
    revisedPrompt?: string
  }>
}

export interface AtlasTextRequest {
  input: string
  app: string
  purpose: string
  outputFormat?: 'plain' | 'markdown' | 'json'
  model?: string
  provider?: 'cloudflare-workers-ai' | 'openai' | 'auto'
  maxTokens?: number
  temperature?: number
}

export interface AtlasTextResponse {
  output: string
  format: 'plain' | 'markdown' | 'json'
  provider: { name: AtlasProvider; model?: string }
}

export interface AtlasDataFetchRequest {
  source: string
  operation: string
  app: string
  purpose: string
  input: Record<string, unknown>
  cache?: { mode?: 'default' | 'bypass' | 'refresh'; ttlSeconds?: number }
}

export interface AtlasMeta {
  schemaVersion: 1
  requestId: string
}

export interface AtlasRunResponse<T = unknown> {
  data: T
  meta: AtlasMeta & {
    capability: AtlasCapability
    provider: AtlasProvider
    model?: string
    cached: boolean
    usage?: Record<string, unknown>
  }
}

export interface AtlasCapabilityDescriptor {
  capability: AtlasCapability
  enabled: boolean
  allowedApps: string[]
  allowedPurposes: string[]
  defaultRoute: {
    provider: AtlasProvider
    model?: string
  }
  accepts: string[]
  returns: string[]
  cacheable: boolean
  costClass: 'free' | 'low' | 'medium' | 'high'
}

export interface AtlasErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta: AtlasMeta
}

export class AtlasClientError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: Record<string, unknown>
  readonly requestId?: string

  constructor(params: { code: string; message: string; status: number; details?: Record<string, unknown>; requestId?: string }) {
    super(params.message)
    this.name = 'AtlasClientError'
    this.code = params.code
    this.status = params.status
    this.details = params.details
    this.requestId = params.requestId
  }
}
