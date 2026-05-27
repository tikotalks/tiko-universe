export type TikoTtsProvider = 'openai' | 'azure' | 'browser' | 'auto'

export interface GenerationTtsRequest {
  text: string
  language: string
  provider?: TikoTtsProvider
  voice?: string
  model?: string
  speed?: number
  pitch?: number
}

export interface GenerationTtsAudioAsset {
  id: string
  audioUrl: string
  contentType: string
  fileSizeBytes?: number
  generatedAt: string
  provider: string
  language: string
  voice: string
  model: string
}

export interface GenerationTtsResponse {
  data: GenerationTtsAudioAsset
  meta?: {
    cached?: boolean
    schemaVersion?: number
  }
}

export interface LegacyTtsResponse {
  success: boolean
  audioUrl?: string
  cached?: boolean
  metadata?: Record<string, unknown>
  error?: string
}

export interface ApiErrorEnvelope {
  error: {
    code: string
    message: string
    field?: string
    retryAfterSeconds?: number
  }
  meta?: {
    requestId?: string
  }
}

export function isGenerationTtsResponse(value: unknown): value is GenerationTtsResponse {
  if (!value || typeof value !== 'object') return false
  const data = (value as { data?: unknown }).data
  return !!data && typeof data === 'object' && typeof (data as { audioUrl?: unknown }).audioUrl === 'string'
}

export function generationTtsCacheKey(request: GenerationTtsRequest): string {
  return [
    request.language.trim().toLowerCase(),
    request.provider ?? 'auto',
    request.voice ?? '',
    request.model ?? 'tts-1',
    request.speed ?? 1,
    request.pitch ?? 0,
    request.text.trim()
  ].join('|')
}
