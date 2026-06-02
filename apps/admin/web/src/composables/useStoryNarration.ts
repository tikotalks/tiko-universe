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

export interface StoryGalleryItem {
  id: string
  title: string
  description: string | null
  voice: string
  speed: number
  segmentCount: number
  status: 'draft' | 'promoted'
  renderStatus: string
  audioUrl: string | null
  fileSizeBytes: number | null
  category: string
  tags: string[]
  createdAt: string
}

interface StoryListResponse {
  data: StoryGalleryItem[]
  meta: { total: number; page: number; limit: number; totalPages: number; status: string }
}

interface ApiErrorBody {
  error?: { message?: string } | string
}

export function useStoryNarration() {
  const { token, config } = useAdminAuth()

  function generationBaseUrl(): string {
    return (config.value?.generationApiUrl ?? 'https://generation.tikoapi.org/v1/generation').replace(/\/$/, '')
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

  async function post<T>(path: string, payload: unknown): Promise<T> {
    const response = await fetch(`${generationBaseUrl()}${path}`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    const body = await readJson<AdminApiResponse<T>>(response, 'Story request failed')
    return body.data
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

  async function listStories(status: 'draft' | 'promoted', page = 1, limit = 24): Promise<StoryListResponse> {
    const url = `${generationBaseUrl()}/stories?status=${status}&page=${page}&limit=${limit}`
    const response = await fetch(url, { headers: authHeaders() })
    return readJson<StoryListResponse>(response, 'Could not load stories')
  }

  async function promoteStory(id: string): Promise<void> {
    const response = await fetch(`${generationBaseUrl()}/stories/${encodeURIComponent(id)}/promote`, {
      method: 'POST',
      headers: authHeaders(),
    })
    await readJson(response, 'Could not promote story')
  }

  async function deleteStory(id: string): Promise<void> {
    const response = await fetch(`${generationBaseUrl()}/stories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await readJson(response, 'Could not delete story')
  }

  return { tryout, render, audioSrc, listStories, promoteStory, deleteStory }
}
