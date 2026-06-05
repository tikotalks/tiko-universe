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

export interface Env {
  ATLAS_DB?: D1DatabaseLike
  ATLAS_CACHE?: KVNamespaceLike
  ATLAS_ASSETS_BUCKET?: R2BucketLike
  AI?: unknown
  OPENAI_API_KEY?: string
  ELEVENLABS_API_KEY?: string
  YOUTUBE_API_KEY?: string
  TOKEN_PEPPER?: string
  SERVICE_API_KEYS?: string
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
