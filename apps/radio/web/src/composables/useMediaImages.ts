import { ref } from 'vue'
import { resolveTikoImageUrl, resolveTikoMediaApiBaseUrl } from '@tiko/ui'

export interface MediaImageOption {
  id: string
  title: string
  /** Original URL, stored on the collection so every platform resizes it itself. */
  url: string
  /** Small CDN-resized URL for the picker grid. */
  previewUrl: string
}

interface MediaListRow {
  id?: string
  title?: string
  file_name?: string
  original_url?: string
  thumbnail_url?: string
  medium_url?: string
}

const SEARCH_DEBOUNCE_MS = 300

/**
 * Tiko Media images for collection artwork. Tiko Media leads the visual language
 * across the apps, so a parent picks a picture here rather than uploading one.
 */
export function useMediaImages(baseUrl: string = resolveTikoMediaApiBaseUrl()) {
  const images = ref<MediaImageOption[]>([])
  const loading = ref(false)
  const searched = ref(false)

  let debounceHandle: ReturnType<typeof setTimeout> | null = null
  let generation = 0

  async function search(query: string, limit = 18): Promise<MediaImageOption[]> {
    const current = ++generation
    loading.value = true
    try {
      const url = new URL(`${baseUrl.replace(/\/$/, '')}/media`)
      url.searchParams.set('type', 'image')
      url.searchParams.set('limit', String(limit))
      if (query.trim()) url.searchParams.set('search', query.trim())

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json() as { data?: MediaListRow[] }
      if (current !== generation) return images.value

      images.value = (body.data ?? [])
        .filter((row): row is MediaListRow & { id: string } => typeof row.id === 'string')
        .map(row => ({
          id: row.id,
          title: row.title || row.file_name || row.id,
          url: row.original_url ?? resolveTikoImageUrl(row, 'medium', baseUrl),
          previewUrl: resolveTikoImageUrl(row, 'small', baseUrl),
        }))
      searched.value = true
      return images.value
    } catch {
      if (current === generation) {
        images.value = []
        searched.value = true
      }
      return []
    } finally {
      if (current === generation) loading.value = false
    }
  }

  function searchDebounced(query: string) {
    if (debounceHandle) clearTimeout(debounceHandle)
    loading.value = true
    debounceHandle = setTimeout(() => { void search(query) }, SEARCH_DEBOUNCE_MS)
  }

  return { images, loading, searched, search, searchDebounced }
}
