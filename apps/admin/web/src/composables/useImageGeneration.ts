import type { ImageGenerationResult, AdminApiResponse } from '../types/admin'
import { useAdminAuth } from './useAdminAuth'

type TikoStyle = 'tiko-original' | 'tiko-v2' | 'tiko-natural'

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

  async function listImages(status: 'draft' | 'promoted', page = 1, limit = 24): Promise<ImageListResponse> {
    const url = `${baseUrl()}/images?status=${status}&page=${page}&limit=${limit}`
    const response = await fetch(url, { headers: authHeaders() })
    return readJson<ImageListResponse>(response, 'Could not load images')
  }

  function imageSrc(item: { imageUrl: string }): string {
    if (item.imageUrl.startsWith('http')) return item.imageUrl
    return `${baseUrl()}${item.imageUrl.replace('/v1/generation', '')}`
  }

  async function pushToMedia(item: ImageGalleryItem): Promise<string> {
    const imageUrl = imageSrc(item)
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
    if (item) {
      try {
        await pushToMedia(item)
      } catch {
        // Promote succeeded; media upload is best-effort.
        // The image is already public in the generation library.
      }
    }
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

  return { generateImage, listImages, promoteImage, pushToMedia, deleteImage, enrichImage, editImage, upscaleImage, imageSrc }
}
