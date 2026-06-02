import type { ImageGenerationResult, AdminApiResponse } from '../types/admin'
import { useAdminAuth } from './useAdminAuth'

interface GenerateImageInput {
  prompt: string
  size: '1024x1024' | '1024x1792' | '1792x1024'
  quality: 'standard' | 'hd'
  style: 'vivid' | 'natural'
  title?: string
  category?: string
  tags?: string[]
}

export interface ImageGalleryItem {
  id: string
  imageUrl: string
  prompt: string
  revisedPrompt: string | null
  size: string
  quality: string
  style: string
  width: number | null
  height: number | null
  fileSizeBytes: number | null
  title: string | null
  category: string
  tags: string[]
  status: 'draft' | 'promoted'
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
    return (config.value?.generationApiUrl ?? 'https://dev.api.tikotalks.com/v1/generation').replace(/\/$/, '')
  }

  function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return { authorization: `Bearer ${token.value}`, ...extra }
  }

  async function readJson<T>(response: Response, fallback: string): Promise<T> {
    const body = await response.json().catch(() => null) as ApiErrorBody | T | null
    if (!response.ok) {
      const apiError = body && 'error' in body ? (body as ApiErrorBody).error : undefined
      throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `${fallback}: ${response.status}`)
    }
    return body as T
  }

  async function generateImage(input: GenerateImageInput): Promise<ImageGenerationResult> {
    const response = await fetch(`${baseUrl()}/image`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(input),
    })
    const body = await readJson<AdminApiResponse<ImageGenerationResult>>(response, 'Image generation failed')
    return body.data
  }

  async function listImages(status: 'draft' | 'promoted', page = 1, limit = 24): Promise<ImageListResponse> {
    const url = `${baseUrl()}/images?status=${status}&page=${page}&limit=${limit}`
    const response = await fetch(url, { headers: authHeaders() })
    return readJson<ImageListResponse>(response, 'Could not load images')
  }

  async function promoteImage(id: string): Promise<void> {
    const response = await fetch(`${baseUrl()}/images/${encodeURIComponent(id)}/promote`, {
      method: 'POST',
      headers: authHeaders(),
    })
    await readJson(response, 'Could not promote image')
  }

  async function deleteImage(id: string): Promise<void> {
    const response = await fetch(`${baseUrl()}/images/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await readJson(response, 'Could not delete image')
  }

  function imageSrc(item: { imageUrl: string }): string {
    if (item.imageUrl.startsWith('http')) return item.imageUrl
    return `${baseUrl()}${item.imageUrl.replace('/v1/generation', '')}`
  }

  return { generateImage, listImages, promoteImage, deleteImage, imageSrc }
}
