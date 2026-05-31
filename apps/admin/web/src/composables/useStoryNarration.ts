import type { AdminApiResponse, StoryRenderResult, StorySegmentInput, StoryTryoutResult } from '../types/admin'
import { useAdminAuth } from './useAdminAuth'

interface TryoutInput {
  text: string
  language: string
  voice: string
  model: string
  speed: number
}

interface RenderStoryInput {
  title: string
  description?: string
  language: string
  voice: string
  model: string
  speed: number
  segments: StorySegmentInput[]
  category?: string
  tags?: string[]
}

interface ApiErrorBody {
  error?: { message?: string } | string
}

export function useStoryNarration() {
  const { token, config } = useAdminAuth()

  function generationBaseUrl(): string {
    return (config.value?.generationApiUrl ?? 'https://dev.api.tikotalks.com/v1/generation').replace(/\/$/, '')
  }

  async function post<T>(path: string, payload: unknown): Promise<T> {
    const response = await fetch(`${generationBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token.value}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const body = await response.json().catch(() => null) as ApiErrorBody | AdminApiResponse<T> | null
    const apiError = body && 'error' in body ? body.error : undefined
    if (!response.ok) throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Story request failed: ${response.status}`)
    return (body as AdminApiResponse<T>).data
  }

  function audioSrc(url: string): string {
    if (url.startsWith('http')) return url
    return `${generationBaseUrl()}${url.replace('/v1/generation', '')}`
  }

  async function tryout(input: TryoutInput): Promise<StoryTryoutResult> {
    return post<StoryTryoutResult>('/stories/tryout', input)
  }

  async function render(input: RenderStoryInput): Promise<StoryRenderResult> {
    return post<StoryRenderResult>('/stories/render', input)
  }

  return { tryout, render, audioSrc }
}
