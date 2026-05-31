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

export function useImageGeneration() {
  const { token, config } = useAdminAuth()

  async function generateImage(input: GenerateImageInput): Promise<ImageGenerationResult> {
    const baseUrl = config.value?.generationApiUrl ?? 'https://dev.api.tikoapi.org/v1/generation'
    const response = await fetch(`${baseUrl}/image`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token.value}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(body?.error?.message ?? `Image generation failed: ${response.status}`)
    }
    return (body as AdminApiResponse<ImageGenerationResult>).data
  }

  return { generateImage }
}
