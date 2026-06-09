export type TikoTtsProvider = 'openai' | 'azure' | 'elevenlabs' | 'browser' | 'auto'

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
  provider: string | { name?: string; model?: string; voice?: string }
  language: string
  voice: string
  model: string
}

export interface GenerationTtsResponse {
  data: GenerationTtsAudioAsset
  meta?: {
    cached?: boolean
    schemaVersion?: number
    requestId?: string
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

export interface TikoMedia {
  id: string
  name: string
  title: string
  original_url: string
  tags?: string[]
  [key: string]: unknown
}

export const COLLECTION_CATEGORY_MAP: Record<string, string[]> = {
  __default_animals: ['animals'],
  __default_food: ['food'],
  __default_snacks: ['snacks', 'food-snacks'],
  __default_drinks: ['drinks'],
  __default_colors: ['colors'],
  __default_emotions: ['emotions', 'feelings'],
  __default_transport: ['transport', 'vehicles'],
  __default_body: ['body', 'body-parts'],
  __default_numbers: ['numbers'],
  __default_letters: ['letters', 'alphabet'],
  __default_actions: ['actions', 'verbs'],
  __default_people: ['people', 'family'],
  __default_places: ['places', 'locations'],
  __default_clothing: ['clothing', 'clothes'],
  __default_nature: ['nature', 'weather'],
}

export function useTikoMedia() {
  const loading = { value: false }

  async function fetchByCategory(categories: string[], _options?: { limit?: number }): Promise<TikoMedia[]> {
    return []
  }

  async function search(query: string, _options?: { limit?: number }): Promise<TikoMedia[]> {
    return []
  }

  return { fetchByCategory, search, loading }
}
