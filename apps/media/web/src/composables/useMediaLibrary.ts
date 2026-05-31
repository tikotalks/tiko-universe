import { ref, computed } from 'vue'
import type {
  MediaItem,
  MediaListResponse,
  MediaDetailResponse,
  MediaQueryParams,
} from '../types/media'

/**
 * Resolves the media API base URL from env or default.
 */
function resolveApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_MEDIA_API_URL ?? 'https://media.tikoapi.org/v1').replace(/\/$/, '')
}

/**
 * Composable for browsing and searching the media library.
 * Provides reactive state for pagination, filtering, and search.
 */
export function useMediaLibrary() {
  const apiBaseUrl = resolveApiBaseUrl()

  // ── State ───────────────────────────────────────────────────
  const items = ref<MediaItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(24)
  const totalPages = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Filters ─────────────────────────────────────────────────
  const searchQuery = ref('')
  const activeType = ref<MediaType | undefined>(undefined)
  const activeCategory = ref<string | undefined>(undefined)
  const activeTags = ref<string[]>([])

  // ── Computed ────────────────────────────────────────────────
  const hasNextPage = computed(() => page.value < totalPages.value)
  const hasPrevPage = computed(() => page.value > 1)

  // ── Helpers ─────────────────────────────────────────────────
  function buildQueryString(params: MediaQueryParams): string {
    const qs = new URLSearchParams()
    if (params.type) qs.set('type', params.type)
    if (params.category) qs.set('category', params.category)
    if (params.tags?.length) qs.set('tags', params.tags.join(','))
    if (params.search) qs.set('search', params.search)
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.sort) qs.set('sort', params.sort)
    if (params.order) qs.set('order', params.order)
    const str = qs.toString()
    return str ? `?${str}` : ''
  }

  // ── Fetch media list ────────────────────────────────────────
  async function fetchMedia(resetPage = false) {
    if (resetPage) page.value = 1
    loading.value = true
    error.value = null

    try {
      const params: MediaQueryParams = {
        type: activeType.value,
        category: activeCategory.value,
        tags: activeTags.value.length ? activeTags.value : undefined,
        search: searchQuery.value || undefined,
        page: page.value,
        limit: limit.value,
        sort: 'created_at',
        order: 'desc',
      }

      const url = `${apiBaseUrl}/media${buildQueryString(params)}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const body = await response.json() as MediaListResponse
      items.value = body.data
      total.value = body.meta.total
      totalPages.value = body.meta.totalPages
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch media'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  // ── Fetch single media item ─────────────────────────────────
  async function fetchMediaItem(id: string): Promise<MediaItem | null> {
    try {
      const url = `${apiBaseUrl}/media/${id}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const body = await response.json() as MediaDetailResponse
      return body.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch media item'
      return null
    }
  }

  // ── Get download URL ────────────────────────────────────────
  function getDownloadUrl(id: string, format?: string): string {
    const qs = format ? `?format=${format}` : ''
    return `${apiBaseUrl}/media/${id}/download${qs}`
  }

  // ── Pagination helpers ──────────────────────────────────────
  function goToPage(p: number) {
    if (p < 1 || p > totalPages.value) return
    page.value = p
    fetchMedia()
  }

  function nextPage() {
    if (hasNextPage.value) goToPage(page.value + 1)
  }

  function prevPage() {
    if (hasPrevPage.value) goToPage(page.value - 1)
  }

  // ── Filter setters (auto-fetch) ─────────────────────────────
  function setSearch(query: string) {
    searchQuery.value = query
    fetchMedia(true)
  }

  function setType(type: MediaType | undefined) {
    activeType.value = type
    fetchMedia(true)
  }

  function setCategory(category: string | undefined) {
    activeCategory.value = category
    fetchMedia(true)
  }

  function toggleTag(tag: string) {
    const idx = activeTags.value.indexOf(tag)
    if (idx >= 0) activeTags.value.splice(idx, 1)
    else activeTags.value.push(tag)
    fetchMedia(true)
  }

  return {
    // State
    items,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    // Filters
    searchQuery,
    activeType,
    activeCategory,
    activeTags,
    // Computed
    hasNextPage,
    hasPrevPage,
    // Actions
    fetchMedia,
    fetchMediaItem,
    getDownloadUrl,
    goToPage,
    nextPage,
    prevPage,
    setSearch,
    setType,
    setCategory,
    toggleTag,
  }
}

// Re-export types for convenience
type MediaType = import('../types/media').MediaType
export type { MediaType }
