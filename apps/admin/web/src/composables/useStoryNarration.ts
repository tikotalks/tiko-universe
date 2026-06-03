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

export interface VoiceSample {
  id: string
  label: string
  provider: string
  model: string
  sampleUrl: string
}

export interface StoryDraftChapterInput {
  id: string
  title: string
  text: string
  voice: string
  speed: number
  position: number
}

export interface CreateStoryDraftInput {
  title: string
  description?: string
  coverMediaId?: string
  targetAlbumId?: string
  defaultVoice: string
  defaultSpeed: number
  chapters: StoryDraftChapterInput[]
}

export interface StoryDraft {
  id: string
  title: string
  description?: string
  coverMediaId?: string
  defaultVoice: string
  defaultSpeed: number
  targetAlbumId?: string
  status: string
  chapters: StoryDraftChapterInput[]
  createdAt: string
  updatedAt: string
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
      const apiError = body && typeof body === 'object' && 'error' in body ? (body as ApiErrorBody).error : undefined
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

  async function listVoices(): Promise<VoiceSample[]> {
    const response = await fetch(`${generationBaseUrl()}/voices`, { headers: authHeaders() })
    const body = await readJson<AdminApiResponse<{ voices: VoiceSample[] }>>(response, 'Could not load voices')
    return body.data.voices
  }

  async function createDraft(input: CreateStoryDraftInput): Promise<StoryDraft> {
    return post<StoryDraft>('/story-drafts', input)
  }

  async function listDrafts(): Promise<StoryDraft[]> {
    const response = await fetch(`${generationBaseUrl()}/story-drafts`, { headers: authHeaders() })
    const body = await readJson<AdminApiResponse<StoryDraft[]>>(response, 'Could not load story drafts')
    return body.data
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

  return { tryout, render, audioSrc, listStories, listVoices, createDraft, listDrafts, promoteStory, deleteStory }
}
