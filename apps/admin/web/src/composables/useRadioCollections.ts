import { ref } from 'vue'
import { useAdminAuth } from './useAdminAuth'

export interface RadioSharedSong {
  title: string
  artist?: string
  source: 'youtube' | 'r2' | 'spotify' | 'apple-music'
  youtubeVideoId?: string
  audioUrl?: string
  externalId?: string
  externalUrl?: string
  thumbnailUrl?: string
  duration?: number
}

export interface RadioSharedCollection {
  code: string
  name: string
  color: string
  imageUrl?: string
  songs: RadioSharedSong[]
  songCount: number
  featured: boolean
  shareUrl: string
}

export interface RadioCollectionDraft {
  name: string
  color: string
  imageUrl?: string
  songs: RadioSharedSong[]
  featured: boolean
}

export interface YouTubeSearchResult {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  durationSeconds?: number
}

interface Envelope<T> {
  data?: T
  error?: { message?: string }
}

/**
 * Curated Radio collections — the Disney and bedtime sets a family scans into
 * their own Radio. Published through media-api, which hands back the share code
 * and the link a QR carries.
 */
export function useRadioCollections() {
  const { token, config } = useAdminAuth()
  const collections = ref<RadioSharedCollection[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  function mediaBaseUrl(): string {
    return (config.value?.mediaApiUrl ?? 'https://media.tikoapi.org/v1').replace(/\/$/, '')
  }

  function endpoint(path = ''): string {
    return `${mediaBaseUrl()}/radio/collections${path}`
  }

  function authHeaders(): Record<string, string> {
    return { authorization: `Bearer ${token.value}`, 'content-type': 'application/json' }
  }

  async function unwrap<T>(response: Response, fallback: string): Promise<T> {
    const body = await response.json().catch(() => null) as Envelope<T> | null
    if (!response.ok || !body?.data) throw new Error(body?.error?.message ?? fallback)
    return body.data
  }

  async function list(): Promise<RadioSharedCollection[]> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(endpoint())
      collections.value = await unwrap<RadioSharedCollection[]>(response, 'Could not load collections.')
      return collections.value
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Could not load collections.'
      return []
    } finally {
      loading.value = false
    }
  }

  async function create(draft: RadioCollectionDraft): Promise<RadioSharedCollection | null> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(endpoint(), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(draft),
      })
      const collection = await unwrap<RadioSharedCollection>(response, 'Could not publish the collection.')
      collections.value = [collection, ...collections.value]
      return collection
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Could not publish the collection.'
      return null
    } finally {
      saving.value = false
    }
  }

  async function update(code: string, draft: RadioCollectionDraft): Promise<RadioSharedCollection | null> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(endpoint(`/${encodeURIComponent(code)}`), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(draft),
      })
      const collection = await unwrap<RadioSharedCollection>(response, 'Could not save the collection.')
      collections.value = collections.value.map(existing => existing.code === code ? collection : existing)
      return collection
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Could not save the collection.'
      return null
    } finally {
      saving.value = false
    }
  }

  async function remove(code: string): Promise<boolean> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(endpoint(`/${encodeURIComponent(code)}`), {
        method: 'DELETE',
        headers: authHeaders(),
      })
      await unwrap<{ code: string }>(response, 'Could not remove the collection.')
      collections.value = collections.value.filter(existing => existing.code !== code)
      return true
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Could not remove the collection.'
      return false
    } finally {
      saving.value = false
    }
  }

  /** Songs are found the same way a parent finds them in the app. */
  async function searchYouTube(query: string, limit = 12): Promise<YouTubeSearchResult[]> {
    if (!query.trim()) return []
    try {
      const url = new URL(`${mediaBaseUrl()}/youtube/search`)
      url.searchParams.set('q', query.trim())
      url.searchParams.set('limit', String(limit))
      const response = await fetch(url)
      return await unwrap<YouTubeSearchResult[]>(response, 'YouTube search is unavailable.')
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'YouTube search is unavailable.'
      return []
    }
  }

  return { collections, loading, saving, error, list, create, update, remove, searchYouTube }
}
