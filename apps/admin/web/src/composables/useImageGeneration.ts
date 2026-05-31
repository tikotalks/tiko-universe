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

interface ApiErrorBody {
  error?: { message?: string } | string
}

export function useImageGeneration() {
  const { token, config } = useAdminAuth()

  async function generateImage(input: GenerateImageInput): Promise<ImageGenerationResult> {
    const baseUrl = config.value?.generationApiUrl ?? 'https://dev.api.tikotalks.com/v1/generation'
    const response = await fetch(`${baseUrl}/image`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token.value}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    })
    const body = await response.json().catch(() => null) as ApiErrorBody | AdminApiResponse<ImageGenerationResult> | null
    if (!response.ok) {
      const apiError = body && 'error' in body ? body.error : undefined
      throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Image generation failed: ${response.status}`)
    }
    return (body as AdminApiResponse<ImageGenerationResult>).data
  }

  return { generateImage }
}
