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
  | 'narakeet'
  | 'youtube'
  | 'url-metadata'
  | 'internal'
  | 'noop'

export type AtlasCostClass = 'free' | 'low' | 'medium' | 'high'

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
  costClass: AtlasCostClass
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

export interface SpeechRequest {
  text: string
  locale?: string
  language?: string
  app: string
  purpose: string
  format?: 'mp3'
  voice?: string
  model?: string
  speed?: number
  provider?: 'openai' | 'elevenlabs' | 'narakeet' | 'auto'
}

export interface ImageRequest {
  prompt: string
  app: string
  purpose: string
  size?: 'square' | 'portrait' | 'landscape'
  transparent?: boolean
  count?: number
  model?: string
  provider?: 'openai' | 'auto'
}

export interface TextRequest {
  input: string
  app: string
  purpose: string
  system?: string
  outputFormat?: 'plain' | 'markdown' | 'json'
  model?: string
  provider?: 'cloudflare-workers-ai' | 'openai' | 'auto'
  maxTokens?: number
  temperature?: number
}

export interface DataFetchRequest {
  source: 'youtube' | 'url-metadata' | 'custom' | string
  operation: string
  app: string
  purpose: string
  input: Record<string, unknown>
  cache?: { mode?: 'default' | 'bypass' | 'refresh'; ttlSeconds?: number }
}

export interface Env {
  ATLAS_DB?: D1DatabaseLike
  ATLAS_CACHE?: KVNamespaceLike
  ATLAS_ASSETS_BUCKET?: R2BucketLike
  AI?: { run(model: string, input: unknown): Promise<unknown> }
  OPENAI_API_KEY?: string
  ELEVENLABS_API_KEY?: string
  NARAKEET_API_KEY?: string
  YOUTUBE_API_KEY?: string
  TOKEN_PEPPER?: string
  ANKORE_TOKEN_PEPPER?: string
  AUTH_DB?: {
    prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; all(): Promise<{ results: unknown[] }>; run?(): Promise<unknown> } }
  }
  IDENTITY_BASE_URL?: string
  IDENTITY_SERVICE?: { fetch(input: Request | string, init?: RequestInit): Promise<Response> }
}

export interface D1DatabaseLike {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>
      all<T>(): Promise<{ results: T[] }>
      run(): Promise<unknown>
    }
  }
}

export interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

export interface R2BucketLike {
  get(key: string): Promise<{ body: BodyInit; httpMetadata?: { contentType?: string } } | null>
  put(key: string, value: ArrayBuffer | Uint8Array, options?: Record<string, unknown>): Promise<unknown>
  delete(key: string): Promise<unknown>
}

export interface AtlasExecutionResult {
  data: unknown
  provider: AtlasProvider
  model?: string
  cached?: boolean
  status?: number
  usage?: Record<string, unknown>
  requestHash?: string
  inputUnits?: number | null
  outputUnits?: number | null
  estimatedCostUsd?: number | null
  providerDurationMs?: number | null
}
