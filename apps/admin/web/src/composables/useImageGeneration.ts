import { reactive } from 'vue'
import type { ImageGenerationResult, AdminApiResponse } from '../types/admin'
import type { JobDto, JobInput } from '../components/images/imageGenerationQueueTypes'
import { useAdminAuth } from './useAdminAuth'

// Shared across every useImageGeneration() instance so each binary loads once.
// <img> tags can't send a Bearer token, so private (draft) binaries 401 when
// loaded directly; we fetch them with auth and cache an object URL keyed by id.
const imageObjectUrls = reactive(new Map<string, string>())
const loadingImageBlobs = new Set<string>()

type TikoStyle = 'tiko-original' | 'tiko-v2' | 'tiko-v3' | 'tiko-natural'

interface GenerateImageInput {
  prompt: string
  size: '1024x1024' | '1024x1792' | '1792x1024'
  quality: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  tikoStyle?: TikoStyle
  title?: string
  category?: string
  tags?: string[]
  count?: number
}

export interface ImageGalleryItem {
  id: string
  imageUrl: string
  prompt: string
  revisedPrompt: string | null
  model: string | null
  size: string
  quality: string
  style: string
  width: number | null
  height: number | null
  fileSizeBytes: number | null
  title: string | null
  description: string | null
  category: string
  tags: string[]
  status: 'draft' | 'promoted'
  isPreview: boolean
  mediaId: string | null
  createdAt: string
}

interface ImageListResponse {
  data: ImageGalleryItem[]
  meta: { total: number; page: number; limit: number; totalPages: number; status: string }
}

export interface ImageFilters {
  search?: string
  category?: string
  tag?: string
}

export interface ImageFacetMeta {
  returned: number
  total: number
  truncated: boolean
}

export interface ImageFacets {
  categories: Array<{ value: string; count: number }>
  tags: Array<{ value: string; count: number }>
  meta: { categories: ImageFacetMeta; tags: ImageFacetMeta }
}

const EMPTY_IMAGE_FACET_META: ImageFacetMeta = { returned: 0, total: 0, truncated: false }

export const EMPTY_IMAGE_FACETS: ImageFacets = {
  categories: [],
  tags: [],
  meta: { categories: EMPTY_IMAGE_FACET_META, tags: EMPTY_IMAGE_FACET_META },
}

export interface ImageMetaFields {
  title?: string | null
  description?: string | null
  category?: string
  tags?: string[]
}

interface ApiErrorBody {
  error?: { message?: string } | string
}

export function useImageGeneration() {
  const { token, config } = useAdminAuth()

  function baseUrl() {
    return (config.value?.generationApiUrl ?? 'https://generation.tikoapi.org/v1/generation').replace(/\/$/, '')
  }

  function mediaBaseUrl() {
    return (config.value?.mediaApiUrl ?? 'https://media.tikoapi.org/v1').replace(/\/$/, '')
  }

  function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return { authorization: `Bearer ${token.value}`, ...extra }
  }

  async function readJson<T>(response: Response, fallback: string): Promise<T> {
    const body = await response.json().catch(() => null) as ApiErrorBody | T | null
    if (!response.ok) {
      const apiError = body && typeof body === 'object' && 'error' in body ? (body as ApiErrorBody).error : undefined
      const message = (typeof apiError === 'string' ? apiError : apiError?.message) ?? `${fallback}: ${response.status}`
      console.error('[api] Request failed', { status: response.status, url: response.url, body })
      throw new Error(message)
    }
    return body as T
  }

  async function generateImage(input: GenerateImageInput): Promise<ImageGenerationResult | ImageGenerationResult[]> {
    const response = await fetch(`${baseUrl()}/image`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(input),
    })
    const body = await readJson<AdminApiResponse<ImageGenerationResult> | { data: ImageGenerationResult[]; meta: Record<string, unknown> }>(response, 'Image generation failed')
    if (Array.isArray((body as { data: ImageGenerationResult[] }).data)) {
      return (body as { data: ImageGenerationResult[] }).data
    }
    return (body as AdminApiResponse<ImageGenerationResult>).data
  }

  async function listImages(status: 'draft' | 'promoted', page = 1, limit = 24, filters: ImageFilters = {}): Promise<ImageListResponse> {
    const url = new URL(`${baseUrl()}/images`)
    url.searchParams.set('status', status)
    url.searchParams.set('page', String(page))
    url.searchParams.set('limit', String(limit))
    if (filters.search) url.searchParams.set('search', filters.search)
    if (filters.category) url.searchParams.set('category', filters.category)
    if (filters.tag) url.searchParams.set('tag', filters.tag)
    const response = await fetch(url, { headers: authHeaders() })
    return readJson<ImageListResponse>(response, 'Could not load images')
  }

  async function listImageFacets(status: 'draft' | 'promoted'): Promise<ImageFacets> {
    const url = `${baseUrl()}/images/facets?status=${status}`
    const response = await fetch(url, { headers: authHeaders() })
    const body = await readJson<{
      data: { categories?: ImageFacets['categories']; tags?: ImageFacets['tags'] }
      meta?: ImageFacets['meta']
    }>(response, 'Could not load image facets')
    return {
      categories: body.data.categories ?? [],
      tags: body.data.tags ?? [],
      meta: body.meta ?? EMPTY_IMAGE_FACETS.meta,
    }
  }

  // Hand-edits the descriptive metadata. Distinct from editImage(), which
  // regenerates the picture itself.
  async function updateImageMeta(id: string, fields: ImageMetaFields): Promise<ImageMetaFields & { id: string }> {
    const response = await fetch(`${baseUrl()}/images/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(fields),
    })
    const body = await readJson<{ data: ImageMetaFields & { id: string } }>(response, 'Could not update image details')
    return body.data
  }

  function binaryUrl(item: { imageUrl: string }): string {
    if (item.imageUrl.startsWith('http')) return item.imageUrl
    return `${baseUrl()}${item.imageUrl.replace('/v1/generation', '')}`
  }

  async function ensureImageBlob(item: { id: string; imageUrl: string }): Promise<void> {
    if (imageObjectUrls.has(item.id) || loadingImageBlobs.has(item.id)) return
    loadingImageBlobs.add(item.id)
    try {
      const response = await fetch(binaryUrl(item), { headers: authHeaders() })
      if (!response.ok) return
      imageObjectUrls.set(item.id, URL.createObjectURL(await response.blob()))
    } catch {
      // Leave uncached; imageSrc will retry on a later render.
    } finally {
      loadingImageBlobs.delete(item.id)
    }
  }

  // Returns a directly-usable src. Public binaries / data URLs pass through; for
  // auth-gated draft binaries it returns the cached blob URL (kicking off an
  // authed fetch on first use), so <img> renders without a Bearer header.
  function imageSrc(item: { id: string; imageUrl: string }): string {
    if (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('data:') || item.imageUrl.startsWith('blob:')) {
      return item.imageUrl
    }
    const cached = imageObjectUrls.get(item.id)
    if (cached) return cached
    void ensureImageBlob(item)
    return ''
  }

  async function pushToMedia(item: ImageGalleryItem): Promise<string> {
    const imageUrl = binaryUrl(item)
    const imageResponse = await fetch(imageUrl, { headers: authHeaders() })
    if (!imageResponse.ok) throw new Error(`Failed to download image for media upload: ${imageResponse.status}`)

    const blob = await imageResponse.blob()
    const safeName = (item.title || item.category || item.id).replace(/[^a-z0-9_-]/gi, '_')
    const filename = `${safeName}.png`

    const form = new FormData()
    form.append('file', new File([blob], filename, { type: 'image/png' }))
    if (item.title) form.append('title', item.title)
    if (item.description) form.append('description', item.description)
    if (item.category) form.append('categories', JSON.stringify([item.category]))
    if (item.tags.length) form.append('tags', JSON.stringify(item.tags))
    if (item.width) form.append('width', String(item.width))
    if (item.height) form.append('height', String(item.height))

    const uploadUrl = `${mediaBaseUrl()}/media/upload`
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${token.value}` },
      body: form,
    })
    const uploadBody = await uploadResponse.json().catch(() => null) as { success?: boolean; id?: string; error?: string; details?: string } | null
    if (!uploadResponse.ok || !uploadBody?.success) {
      throw new Error(uploadBody?.error ?? uploadBody?.details ?? `Media upload failed: ${uploadResponse.status}`)
    }
    const mediaId = uploadBody?.id ?? ''
    if (mediaId) {
      await fetch(`${baseUrl()}/images/${encodeURIComponent(item.id)}/media-link`, {
        method: 'POST',
        headers: authHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ mediaId }),
      }).catch(() => null)
    }
    return mediaId
  }

  async function promoteImage(id: string, item?: ImageGalleryItem): Promise<void> {
    const response = await fetch(`${baseUrl()}/images/${encodeURIComponent(id)}/promote`, {
      method: 'POST',
      headers: authHeaders(),
    })
    await readJson(response, 'Could not promote image')
    if (item) await pushToMedia(item)
  }

  async function deleteImage(id: string): Promise<void> {
    const response = await fetch(`${baseUrl()}/images/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await readJson(response, 'Could not delete image')
  }

  async function enrichImage(id: string): Promise<{ title: string | null; description: string | null; tags: string[]; categories: string[] }> {
    const response = await fetch(`${baseUrl()}/images/${encodeURIComponent(id)}/enrich`, {
      method: 'POST',
      headers: authHeaders(),
    })
    const body = await readJson<{ data: { title: string | null; description: string | null; tags: string[]; categories: string[] } }>(response, 'Could not enrich image')
    return body.data
  }

  async function editImage(sourceId: string, prompt: string, maskBase64?: string, size?: string): Promise<ImageGenerationResult> {
    const payload: Record<string, unknown> = { prompt, size: size || '1024x1024' }
    if (maskBase64) payload.mask_base64 = maskBase64
    const response = await fetch(`${baseUrl()}/images/${encodeURIComponent(sourceId)}/edit`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    const body = await readJson<AdminApiResponse<ImageGenerationResult>>(response, 'Image edit failed')
    return body.data
  }

  async function upscaleImage(id: string, size: string = '1024x1024', quality: string = 'medium'): Promise<ImageGenerationResult> {
    const response = await fetch(`${baseUrl()}/images/${encodeURIComponent(id)}/upscale`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ size, quality }),
    })
    const body = await readJson<AdminApiResponse<ImageGenerationResult>>(response, 'Image upscale failed')
    return body.data
  }

  async function enqueueJobs(items: JobInput[]): Promise<JobDto[]> {
    const response = await fetch(`${baseUrl()}/jobs`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ items }),
    })
    const body = await readJson<{ data: JobDto[] }>(response, 'Job enqueue failed')
    return body.data
  }

  async function listJobs(): Promise<JobDto[]> {
    const response = await fetch(`${baseUrl()}/jobs`, { headers: authHeaders() })
    const body = await readJson<{ data: JobDto[] }>(response, 'Could not load jobs')
    return body.data
  }

  async function deleteJob(id: string): Promise<void> {
    const response = await fetch(`${baseUrl()}/jobs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await readJson(response, 'Could not delete job')
  }

  async function processJobs(): Promise<{ processed: number; remaining: number }> {
    const response = await fetch(`${baseUrl()}/jobs/process`, {
      method: 'POST',
      headers: authHeaders(),
    })
    const body = await readJson<{ data: { processed: number; remaining: number } }>(response, 'Job processing failed')
    return body.data
  }

  async function importImage(imageUrl: string, meta?: { title?: string; category?: string; tags?: string[] }): Promise<ImageGalleryItem> {
    const response = await fetch(`${baseUrl()}/images/import`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ imageUrl, ...meta }),
    })
    const body = await readJson<{ data: ImageGalleryItem }>(response, 'Image import failed')
    return body.data
  }

  return { generateImage, listImages, listImageFacets, updateImageMeta, promoteImage, pushToMedia, deleteImage, enrichImage, editImage, upscaleImage, enqueueJobs, listJobs, deleteJob, processJobs, imageSrc, importImage }
}
