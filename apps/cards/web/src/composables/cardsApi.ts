import type { CardCollection, CardsCardInput, CardsCollectionInput, CardsPayload, CommunicationCard } from '../types'

export function resolveContentBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_CONTENT_BASE_URL ?? env?.VITE_CONTENT_API_URL ?? 'https://content.tikoapi.org/v1').replace(/\/$/, '')
}

export interface CardsApiOptions {
  baseUrl?: string
  getSessionToken: () => string
  fetcher?: typeof fetch
}

export function createCardsApi(options: CardsApiOptions) {
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

    async fetchCollections(): Promise<CardCollection[]> {
      const body = await request<CardsPayload>('/cards/collections')
      return (body.data && 'collections' in body.data ? body.data.collections : []) ?? []
    },

    async createCollection(input: CardsCollectionInput & { id: string; order: number }): Promise<CardCollection | null> {
      const body = await request<CardsPayload>('/cards/collections', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return body.data && !('collections' in body.data) ? body.data as CardCollection : null
    },

    async updateCollection(id: string, input: CardsCollectionInput): Promise<CardCollection | null> {
      const body = await request<CardsPayload>(`/cards/collections/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })
      return body.data && !('collections' in body.data) ? body.data as CardCollection : null
    },

    async deleteCollection(id: string): Promise<void> {
      await request(`/cards/collections/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },

    async createCard(collectionID: string, input: CardsCardInput & { id: string; order: number }): Promise<CommunicationCard | null> {
      const body = await request<CardsPayload>(`/cards/collections/${encodeURIComponent(collectionID)}/cards`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return body.data && !('collections' in body.data) ? body.data as CommunicationCard : null
    },

    async updateCard(collectionID: string, cardID: string, input: CardsCardInput): Promise<CommunicationCard | null> {
      const body = await request<CardsPayload>(`/cards/collections/${encodeURIComponent(collectionID)}/cards/${encodeURIComponent(cardID)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })
      return body.data && !('collections' in body.data) ? body.data as CommunicationCard : null
    },

    async deleteCard(collectionID: string, cardID: string): Promise<void> {
      await request(`/cards/collections/${encodeURIComponent(collectionID)}/cards/${encodeURIComponent(cardID)}`, { method: 'DELETE' })
    },
  }
}
