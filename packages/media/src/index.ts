export type TikoTtsProvider = 'openai' | 'azure' | 'elevenlabs' | 'narakeet' | 'browser' | 'auto'

export type TikoImageSize = 'small' | 'medium' | 'large' | 'original'

export const TIKO_IMAGE_SIZES: Record<TikoImageSize, number> = {
  small: 200,
  medium: 800,
  large: 1200,
  original: 0,
}

export const TIKO_MEDIA_CDN_HOST = 'data.tikocdn.org'

/**
 * Build a CDN-resized image URL from a media original_url or upload path.
 *
 * For URLs on data.tikocdn.org, this produces a Cloudflare Image Resizing URL.
 * For other URLs, the original is returned unchanged.
 *
 * @param originalUrl - The original image URL (typically from media API)
 * @param size - Named size: small (200px), medium (800px), large (1200px), or original
 * @returns CDN-resized URL or original URL if not on CDN
 */
export function tikoImageUrl(originalUrl: string | undefined, size: TikoImageSize = 'small'): string {
  if (!originalUrl) return ''
  if (size === 'original') return originalUrl
  try {
    const url = new URL(originalUrl)
    if (url.hostname === TIKO_MEDIA_CDN_HOST && url.pathname.startsWith('/uploads/')) {
      const width = TIKO_IMAGE_SIZES[size]
      return `https://${TIKO_MEDIA_CDN_HOST}/cdn-cgi/image/width=${width},quality=${size === 'small' ? 80 : 85},f=auto${url.pathname}`
    }
    return url.toString()
  } catch {
    return ''
  }
}

/**
 * Build a media-API image URL: /v1/media/{id}/image/{size}
 * This 302-redirects to the CDN-resized URL and works for both public and private images.
 *
 * @param mediaId - The media item ID
 * @param size - Named size: small, medium, large, or original
 * @param apiBaseUrl - Media API base URL (default: https://media.tikoapi.org/v1)
 */
export function tikoMediaImageUrl(
  mediaId: string,
  size: TikoImageSize = 'small',
  apiBaseUrl = 'https://media.tikoapi.org/v1',
): string {
  return `${apiBaseUrl.replace(/\/$/, '')}/media/${encodeURIComponent(mediaId)}/image/${size}`
}

/**
 * Resolve the best available image URL for display at a given size.
 * Prefers an explicit thumbnail_url/medium_url from the API, then falls back
 * to CDN resizing of the original_url.
 *
 * @param item - Media item with optional thumbnail_url, medium_url, original_url
 * @param size - Desired display size
 * @param apiBaseUrl - Media API base URL for building image routes from IDs
 */
export function resolveTikoImageUrl(
  item: { id?: string; original_url?: string; thumbnail_url?: string; medium_url?: string },
  size: TikoImageSize = 'small',
  apiBaseUrl = 'https://media.tikoapi.org/v1',
): string {
  if (size === 'original') return item.original_url || ''
  if (size === 'small' && item.thumbnail_url) return item.thumbnail_url
  if (size === 'medium' && item.medium_url) return item.medium_url
  if (item.id && !item.original_url) return tikoMediaImageUrl(item.id, size, apiBaseUrl)
  return tikoImageUrl(item.original_url, size)
}

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
  const apiBaseUrl = resolveMediaApiBaseUrl()

  async function fetchByCategory(categories: string[], options?: { limit?: number }): Promise<TikoMedia[]> {
    const unique = Array.from(new Set(categories.map(category => category.trim()).filter(Boolean)))
    if (!unique.length) return []

    loading.value = true
    try {
      return dedupeMedia(await fetchMedia(`${apiBaseUrl}/media`, {
        type: 'image',
        category: unique.join(','),
        limit: String(options?.limit ?? 30),
      })).slice(0, options?.limit ?? 30)
    } finally {
      loading.value = false
    }
  }

  async function search(query: string, options?: { limit?: number }): Promise<TikoMedia[]> {
    const normalized = query.trim()
    if (!normalized) return []

    loading.value = true
    try {
      return fetchMedia(`${apiBaseUrl}/media`, {
        type: 'image',
        search: normalized,
        limit: String(options?.limit ?? 30),
      })
    } finally {
      loading.value = false
    }
  }

  return { fetchByCategory, search, loading }
}

function resolveMediaApiBaseUrl(): string {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> }
  return (meta.env?.VITE_MEDIA_API_URL ?? 'https://media.tikoapi.org/v1').replace(/\/$/, '')
}

async function fetchMedia(baseUrl: string, params: Record<string, string>): Promise<TikoMedia[]> {
  const url = new URL(baseUrl)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Media request failed: ${response.status}`)

  const body = await response.json() as { data?: unknown[] }
  return Array.isArray(body.data) ? body.data.map(normalizeMedia).filter((item): item is TikoMedia => item !== null) : []
}

function normalizeMedia(raw: unknown): TikoMedia | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = stringValue(row.id)
  const originalUrl = stringValue(row.original_url) || stringValue(row.url)
  if (!id || !originalUrl) return null

  const fileName = stringValue(row.file_name) || stringValue(row.filename) || id
  const title = stringValue(row.title) || fileName
  const name = stringValue(row.name) || title.toLowerCase().replace(/\s+/g, '_')

  return {
    ...row,
    id,
    name,
    title,
    original_url: originalUrl,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
  }
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function dedupeMedia(items: TikoMedia[]): TikoMedia[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.id || item.original_url
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
