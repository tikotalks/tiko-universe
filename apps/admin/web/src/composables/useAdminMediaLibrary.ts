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
  thumbnailUrl?: string
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

export function useAdminMediaLibrary() {
  const { token, config } = useAdminAuth()
  const items = ref<AdminMediaItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const totalPages = ref(1)
  const loading = ref(false)
  const uploading = ref(false)
  const error = ref<string | null>(null)

  function mediaBaseUrl(): string {
    return (config.value?.mediaApiUrl ?? 'https://media.tikoapi.org/v1').replace(/\/$/, '')
  }

  async function list(params: { search?: string; type?: string; page?: number; limit?: number } = {}) {
    loading.value = true
    error.value = null
    try {
      const url = new URL(`${mediaBaseUrl()}/media`)
      if (params.search) url.searchParams.set('search', params.search)
      if (params.type) url.searchParams.set('type', params.type)
      url.searchParams.set('page', String(params.page ?? page.value))
      url.searchParams.set('limit', String(params.limit ?? 20))
      const response = await fetch(url, { headers: { authorization: `Bearer ${token.value}` } })
      const body = await response.json().catch(() => null) as ApiErrorBody | MediaListResponse | null
      const apiError = body && 'error' in body ? body.error : undefined
      if (!response.ok) throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Media list failed: ${response.status}`)
      const parsed = body as MediaListResponse
      items.value = parsed.data
      total.value = parsed.meta.total
      page.value = parsed.meta.page
      totalPages.value = parsed.meta.totalPages
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load media.'
    } finally {
      loading.value = false
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

  function itemUrl(item: AdminMediaItem): string {
    return item.url || item.thumbnailUrl || `${mediaBaseUrl()}/media/${item.id}/download`
  }

  return { items, total, page, totalPages, loading, uploading, error, list, upload, itemUrl }
}
