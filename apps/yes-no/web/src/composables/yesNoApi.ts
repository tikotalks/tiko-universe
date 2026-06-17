import { resolveTikoContentApiBaseUrl } from '@tiko/ui'
import type { AnswerSet, AnswerSetInput, AnswerTile, AnswerTileInput, YesNoContentResponse, YesNoPayload } from '../types'

export function resolveContentBaseUrl() {
  return resolveTikoContentApiBaseUrl()
}

export interface YesNoApiOptions {
  baseUrl?: string
  getSessionToken: () => string
  fetcher?: typeof fetch
}

export function createYesNoApi(options: YesNoApiOptions) {
  const baseUrl = (options.baseUrl ?? resolveContentBaseUrl()).replace(/\/$/, '')
  const fetcher = options.fetcher ?? fetch

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    const token = options.getSessionToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')

    const response = await fetcher(`${baseUrl}${path}`, { ...init, headers })
    if (!response.ok) throw new Error(`Content API request failed: ${response.status}`)
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  return {
    baseUrl,

    async fetchContent(language?: string): Promise<YesNoContentResponse> {
      const query = language ? `?language=${encodeURIComponent(language)}` : ''
      const body = await request<YesNoPayload>(`/yes-no/content${query}`)
      return (body.data && typeof body.data === 'object' && 'answerSets' in body.data
        ? body.data as YesNoContentResponse
        : { answerSets: [], answers: [], selectedSetId: null })
    },

    async createAnswerSet(input: AnswerSetInput & { id: string; order: number }): Promise<AnswerSet | null> {
      const body = await request<YesNoPayload>('/yes-no/answer-sets', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return body.data && 'title' in body.data ? body.data as AnswerSet : null
    },

    async updateAnswerSet(id: string, input: AnswerSetInput): Promise<AnswerSet | null> {
      const body = await request<YesNoPayload>(`/yes-no/answer-sets/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })
      return body.data && 'title' in body.data ? body.data as AnswerSet : null
    },

    async deleteAnswerSet(id: string): Promise<void> {
      await request(`/yes-no/answer-sets/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },

    async createAnswerTile(setId: string, input: AnswerTileInput & { id: string; order: number }): Promise<AnswerTile | null> {
      const body = await request<YesNoPayload>(`/yes-no/answer-sets/${encodeURIComponent(setId)}/tiles`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return body.data && 'label' in body.data ? body.data as AnswerTile : null
    },

    async updateAnswerTile(setId: string, tileId: string, input: AnswerTileInput): Promise<AnswerTile | null> {
      const body = await request<YesNoPayload>(`/yes-no/answer-sets/${encodeURIComponent(setId)}/tiles/${encodeURIComponent(tileId)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })
      return body.data && 'label' in body.data ? body.data as AnswerTile : null
    },

    async deleteAnswerTile(setId: string, tileId: string): Promise<void> {
      await request(`/yes-no/answer-sets/${encodeURIComponent(setId)}/tiles/${encodeURIComponent(tileId)}`, { method: 'DELETE' })
    },

    async replaceAll(input: { answerSets: AnswerSet[]; selectedSetId?: string | null }): Promise<{ answerSets: AnswerSet[]; selectedSetId: string | null } | null> {
      const body = await request<YesNoPayload>('/yes-no/answer-sets', {
        method: 'PUT',
        body: JSON.stringify(input),
      })
      if (body.data && typeof body.data === 'object' && 'answerSets' in body.data) {
        return body.data as { answerSets: AnswerSet[]; selectedSetId: string | null }
      }
      return null
    },
  }
}
