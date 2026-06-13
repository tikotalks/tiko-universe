import { ref } from 'vue'
import { useAdminAuth } from './useAdminAuth'

export interface AdminMediaItem {
  id: string
  title?: string
  description?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  type?: 'image' | 'audio' | 'video'
  category?: string
  tags?: string[]
  url?: string
  original_url?: string
  thumbnailUrl?: string
  thumbnail_url?: string
  medium_url?: string
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

  async function list(params: { search?: string; type?: string; page?: number; limit?: number } = {}) {
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
      items.value = parsed.data
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
    try {
      const parsed = new URL(url)
      if (parsed.host === 'data.tikocdn.org' && parsed.pathname.startsWith('/uploads/')) {
        return `https://data.tikocdn.org/cdn-cgi/image/width=${size},height=${size},fit=cover,quality=80,f=auto${parsed.pathname}`
      }
    } catch {
      // Keep non-URL values as-is.
    }
    return url
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

  return { items, total, page, totalPages, loading, uploading, error, list, upload, itemUrl, mediaDownloadUrl, mediaRefPreviewUrl, itemPreviewUrl, previewUrl, listAudioAlbums, createAudioAlbum, addAudioTrack }
}
