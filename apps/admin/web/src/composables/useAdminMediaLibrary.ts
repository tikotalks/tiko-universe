import { ref } from 'vue'
import { tikoImageUrl } from '@tiko/ui'
import { useAdminAuth } from './useAdminAuth'

export interface AdminMediaItem {
  id: string
  title?: string
  description?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  type?: 'image' | 'audio' | 'video'
  /** First category, as `folder` on the wire. Kept for callers that only need one. */
  category?: string
  folder?: string
  categories?: string[]
  tags?: string[]
  url?: string
  original_url?: string
  thumbnailUrl?: string
  thumbnail_url?: string
  medium_url?: string
  is_active?: boolean
  is_hidden?: boolean
  created_at?: string
  createdAt?: string
}

interface MediaListResponse {
  data: AdminMediaItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext?: boolean
    hasPrev?: boolean
  }
}

interface UploadResponse {
  id?: string
  success: boolean
  filename: string
  url: string
  thumbnail?: string
  medium?: string
  size: number
  type: string
  title?: string
  description?: string
  tags?: string[]
  categories?: string[]
  error?: string
  details?: string
}

interface ApiErrorBody {
  error?: { message?: string } | string
}

export interface AudioLibraryTrack {
  id: string
  albumId: string
  mediaId: string
  title: string
  artist?: string
  durationSeconds?: number
  position: number
  audioUrl?: string
  mimeType?: string
  fileName?: string
}

export type MediaState = '' | 'active' | 'inactive' | 'hidden'

export interface MediaListFilters {
  search?: string
  type?: string
  category?: string
  tag?: string
  state?: MediaState
  page?: number
  limit?: number
  includeInactive?: boolean
  includeHidden?: boolean
}

export interface MediaFacet {
  value: string
  count: number
}

export interface MediaFacets {
  categories: MediaFacet[]
  tags: MediaFacet[]
  types: MediaFacet[]
}

export interface AudioLibraryAlbum {
  id: string
  title: string
  description?: string
  coverMediaId?: string
  visibility: 'public' | 'private'
  radioEnabled: boolean
  sortMode: 'manual' | 'created_desc' | 'title_asc'
  settings: Record<string, unknown>
  tracks: AudioLibraryTrack[]
  createdAt: string
  updatedAt: string
}

// The API names the category list `folder` (a single value) plus `categories`.
// Admin code reads `category`, so fill it in once here rather than at every call site.
function normaliseItem(item: AdminMediaItem): AdminMediaItem {
  const categories = item.categories ?? (item.folder ? [item.folder] : [])
  const category = item.category ?? categories[0]
  return category ? { ...item, categories, category } : { ...item, categories }
}

export function useAdminMediaLibrary() {
  const { token, config } = useAdminAuth()
  const items = ref<AdminMediaItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const totalPages = ref(1)
  const loading = ref(false)
  const uploading = ref(false)
  const error = ref<string | null>(null)
  let listRequestId = 0
  let listAbortController: AbortController | null = null

  function mediaBaseUrl(): string {
    return (config.value?.mediaApiUrl ?? 'https://media.tikoapi.org/v1').replace(/\/$/, '')
  }

  async function list(params: MediaListFilters = {}) {
    const requestId = listRequestId + 1
    listRequestId = requestId
    listAbortController?.abort()
    const abortController = new AbortController()
    listAbortController = abortController
    loading.value = true
    error.value = null
    try {
      const url = new URL(`${mediaBaseUrl()}/media`)
      if (params.search) url.searchParams.set('search', params.search)
      if (params.type) url.searchParams.set('type', params.type)
      if (params.category) url.searchParams.set('category', params.category)
      if (params.tag) url.searchParams.set('tags', params.tag)
      if (params.state) url.searchParams.set('state', params.state)
      if (params.includeInactive) url.searchParams.set('includeInactive', 'true')
      if (params.includeHidden) url.searchParams.set('includeHidden', 'true')
      url.searchParams.set('page', String(params.page ?? page.value))
      url.searchParams.set('limit', String(params.limit ?? 20))
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${token.value}` },
        signal: abortController.signal,
      })
      const body = await response.json().catch(() => null) as ApiErrorBody | MediaListResponse | null
      const apiError = body && 'error' in body ? body.error : undefined
      if (!response.ok) throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Media list failed: ${response.status}`)
      if (requestId !== listRequestId) return
      const parsed = body as MediaListResponse
      items.value = parsed.data.map(normaliseItem)
      total.value = parsed.meta.total
      page.value = parsed.meta.page
      totalPages.value = parsed.meta.totalPages
    } catch (e) {
      if (abortController.signal.aborted && requestId !== listRequestId) return
      error.value = e instanceof Error ? e.message : 'Could not load media.'
    } finally {
      if (requestId === listRequestId) {
        loading.value = false
        if (listAbortController === abortController) listAbortController = null
      }
    }
  }

  async function upload(file: File, options: { thumbnail?: File | null } = {}): Promise<UploadResponse> {
    uploading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.set('file', file)
      if (options.thumbnail) formData.set('thumbnail', options.thumbnail)
      const response = await fetch(`${mediaBaseUrl()}/media/upload`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token.value}` },
        body: formData,
      })
      const body = await response.json().catch(() => null) as UploadResponse | null
      if (!response.ok || !body?.success) throw new Error(body?.error ?? body?.details ?? `Upload failed: ${response.status}`)
      await list({ page: 1 })
      return body
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Upload failed.'
      throw e
    } finally {
      uploading.value = false
    }
  }

  async function listAudioAlbums(params: { radioEnabled?: boolean } = {}): Promise<AudioLibraryAlbum[]> {
    const url = new URL(`${mediaBaseUrl()}/audio/albums`)
    if (params.radioEnabled !== undefined) url.searchParams.set('radioEnabled', String(params.radioEnabled))
    const response = await fetch(url, { headers: { authorization: `Bearer ${token.value}` } })
    const body = await response.json().catch(() => null) as ApiErrorBody | { data: AudioLibraryAlbum[] } | null
    const apiError = body && 'error' in body ? body.error : undefined
    if (!response.ok) throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Audio albums failed: ${response.status}`)
    return (body as { data: AudioLibraryAlbum[] }).data
  }

  async function createAudioAlbum(input: { title: string; description?: string; coverMediaId?: string; visibility?: 'public' | 'private'; radioEnabled?: boolean; sortMode?: 'manual' | 'created_desc' | 'title_asc' }): Promise<AudioLibraryAlbum> {
    const response = await fetch(`${mediaBaseUrl()}/audio/albums`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token.value}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    const body = await response.json().catch(() => null) as ApiErrorBody | { data: AudioLibraryAlbum } | null
    const apiError = body && 'error' in body ? body.error : undefined
    if (!response.ok) throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Create album failed: ${response.status}`)
    return (body as { data: AudioLibraryAlbum }).data
  }

  async function addAudioTrack(albumId: string, input: { mediaId: string; title: string; artist?: string; durationSeconds?: number }): Promise<AudioLibraryTrack> {
    const response = await fetch(`${mediaBaseUrl()}/audio/albums/${encodeURIComponent(albumId)}/tracks`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token.value}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    const body = await response.json().catch(() => null) as ApiErrorBody | { data: AudioLibraryTrack } | null
    const apiError = body && 'error' in body ? body.error : undefined
    if (!response.ok) throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Add track failed: ${response.status}`)
    return (body as { data: AudioLibraryTrack }).data
  }

  function resizedMediaUrl(url: string, size = 160): string {
    return tikoImageUrl(url, size <= 200 ? 'small' : 'medium')
  }

  function itemUrl(item: AdminMediaItem): string {
    return item.url || item.original_url || item.medium_url || item.thumbnailUrl || item.thumbnail_url || `${mediaBaseUrl()}/media/${item.id}/download`
  }

  function mediaDownloadUrl(mediaId: string): string {
    return `${mediaBaseUrl()}/media/${encodeURIComponent(mediaId)}/download`
  }

  function mediaRefPreviewUrl(mediaId: string, size = 160): string {
    return resizedMediaUrl(mediaDownloadUrl(mediaId), size)
  }

  function itemPreviewUrl(item: AdminMediaItem, size = 160): string {
    return resizedMediaUrl(item.thumbnailUrl || item.thumbnail_url || item.medium_url || item.url || item.original_url || itemUrl(item), size)
  }

  function previewUrl(url: string, size = 160): string {
    return resizedMediaUrl(url, size)
  }

  async function updateMedia(id: string, fields: { title?: string; description?: string; tags?: string[]; categories?: string[]; is_active?: boolean; is_hidden?: boolean }): Promise<void> {
    const response = await fetch(`${mediaBaseUrl()}/media/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token.value}`, 'content-type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const body = await response.json().catch(() => null) as ApiErrorBody | { data: AdminMediaItem } | null
    const apiError = body && 'error' in body ? body.error : undefined
    if (!response.ok) throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Update failed: ${response.status}`)
    const updated = normaliseItem((body as { data: AdminMediaItem }).data)
    items.value = items.value.map(item => item.id === id ? { ...item, ...updated } : item)
  }

  async function listFacets(): Promise<MediaFacets> {
    const url = new URL(`${mediaBaseUrl()}/media/facets`)
    url.searchParams.set('includeInactive', 'true')
    url.searchParams.set('includeHidden', 'true')
    const response = await fetch(url, { headers: { authorization: `Bearer ${token.value}` } })
    const body = await response.json().catch(() => null) as ApiErrorBody | { data: MediaFacets } | null
    const apiError = body && 'error' in body ? body.error : undefined
    if (!response.ok) throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Media facets failed: ${response.status}`)
    return (body as { data: MediaFacets }).data
  }

  async function deleteMedia(id: string): Promise<void> {
    const response = await fetch(`${mediaBaseUrl()}/media/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token.value}` },
    })
    const body = await response.json().catch(() => null) as ApiErrorBody | null
    const apiError = body && 'error' in body ? body.error : undefined
    if (!response.ok) throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Delete failed: ${response.status}`)
    items.value = items.value.filter(item => item.id !== id)
  }

  async function toggleActive(id: string, isActive: boolean): Promise<void> {
    await updateMedia(id, { is_active: isActive })
  }

  async function toggleHidden(id: string, isHidden: boolean): Promise<void> {
    await updateMedia(id, { is_hidden: isHidden })
  }

  return { items, total, page, totalPages, loading, uploading, error, list, listFacets, upload, updateMedia, deleteMedia, toggleActive, toggleHidden, itemUrl, mediaDownloadUrl, mediaRefPreviewUrl, itemPreviewUrl, previewUrl, listAudioAlbums, createAudioAlbum, addAudioTrack }
}
