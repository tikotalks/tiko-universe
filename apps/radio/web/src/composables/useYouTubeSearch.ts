import { ref } from 'vue'
import { resolveTikoMediaApiBaseUrl } from '@tiko/ui'

export interface YouTubeSearchItem {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  durationSeconds?: number
  publishedAt?: string
}

interface SearchEnvelope {
  data?: YouTubeSearchItem[]
  error?: { code?: string; message?: string }
}

export interface YouTubeSearchQuery {
  query?: string
  channelId?: string
  limit?: number
}

const SEARCH_DEBOUNCE_MS = 350

/**
 * YouTube lookups go through media-api so the API key stays server-side and the
 * child's browser never talks to Google directly.
 */
export function useYouTubeSearch(baseUrl: string = resolveTikoMediaApiBaseUrl()) {
  const results = ref<YouTubeSearchItem[]>([])
  const loading = ref(false)
  /** True when the environment has no YouTube key: the UI then offers link paste. */
  const unavailable = ref(false)
  const searched = ref(false)

  let debounceHandle: ReturnType<typeof setTimeout> | null = null
  let generation = 0

  function buildUrl({ query, channelId, limit }: YouTubeSearchQuery): string {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/youtube/search`)
    if (query) url.searchParams.set('q', query)
    if (channelId) url.searchParams.set('channelId', channelId)
    if (limit) url.searchParams.set('limit', String(limit))
    return url.toString()
  }

  async function search(params: YouTubeSearchQuery): Promise<YouTubeSearchItem[]> {
    const query = params.query?.trim() ?? ''
    if (!query && !params.channelId) {
      results.value = []
      searched.value = false
      return []
    }

    const current = ++generation
    loading.value = true
    try {
      const response = await fetch(buildUrl({ ...params, query }))
      const body = await response.json() as SearchEnvelope
      if (current !== generation) return results.value

      if (!response.ok) {
        unavailable.value = true
        results.value = []
        searched.value = true
        return []
      }

      unavailable.value = false
      results.value = body.data ?? []
      searched.value = true
      return results.value
    } catch {
      if (current === generation) {
        unavailable.value = true
        results.value = []
        searched.value = true
      }
      return []
    } finally {
      if (current === generation) loading.value = false
    }
  }

  /** Search as the parent types, without a request per keystroke. */
  function searchDebounced(params: YouTubeSearchQuery) {
    if (debounceHandle) clearTimeout(debounceHandle)
    if (!params.query?.trim() && !params.channelId) {
      generation += 1
      results.value = []
      searched.value = false
      loading.value = false
      return
    }
    loading.value = true
    debounceHandle = setTimeout(() => { void search(params) }, SEARCH_DEBOUNCE_MS)
  }

  function reset() {
    if (debounceHandle) clearTimeout(debounceHandle)
    generation += 1
    results.value = []
    loading.value = false
    searched.value = false
  }

  return { results, loading, unavailable, searched, search, searchDebounced, reset }
}

const YOUTUBE_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
]

/** Video id from any YouTube link shape, including music.youtube.com and shorts. */
export function youTubeVideoId(input: string): string | null {
  const value = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = value.match(pattern)
    if (match) return match[1]
  }
  return null
}
