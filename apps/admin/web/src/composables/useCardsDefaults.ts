import { ref } from 'vue'
import type { TikoColorName } from '@tiko/data'
import { useAdminAuth } from './useAdminAuth'

export interface CardsCard {
  id: string
  title: string
  speech: string
  color: TikoColorName
  order: number
  imageRef?: string
}

export interface CardsCollection {
  id: string
  title: string
  color: TikoColorName
  order: number
  mediaCategories: string[]
  imageRef?: string
  cards: CardsCard[]
}

export interface CardsDefaultsPayload {
  collections: CardsCollection[]
}

interface ApiErrorBody {
  error?: { message?: string } | string
  success?: boolean
}

function contentBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_CONTENT_API_URL ?? 'https://content.tikoapi.org/v1').replace(/\/$/, '')
}

function errorMessage(body: ApiErrorBody | null, fallback: string): string {
  const apiError = body && 'error' in body ? body.error : undefined
  return (typeof apiError === 'string' ? apiError : apiError?.message) ?? fallback
}

function sanitizeCollection(collection: CardsCollection): CardsCollection {
  const cleanCollection = { ...collection }
  if (cleanCollection.imageRef && /^https?:\/\//i.test(cleanCollection.imageRef)) delete cleanCollection.imageRef
  return {
    ...cleanCollection,
    cards: collection.cards.map((card) => {
      const cleanCard = { ...card }
      if (cleanCard.imageRef && /^https?:\/\//i.test(cleanCard.imageRef)) delete cleanCard.imageRef
      return cleanCard
    }),
  }
}

export function useCardsDefaults() {
  const { token } = useAdminAuth()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function read(): Promise<CardsDefaultsPayload> {
    loading.value = true
    error.value = null
    try {
      // Public read endpoint — no auth needed
      const response = await fetch(`${contentBaseUrl()}/cards/collections`)
      const body = await response.json().catch(() => null) as { success: boolean; data?: CardsDefaultsPayload } | null
      if (!response.ok) throw new Error(`Could not load Cards defaults: ${response.status}`)
      return body?.data ?? { collections: [] }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load Cards defaults.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function write(collections: CardsCollection[]): Promise<void> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(`${contentBaseUrl()}/admin/cards/collections`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token.value}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ collections: collections.map(sanitizeCollection) }),
      })
      const body = await response.json().catch(() => null) as ApiErrorBody | null
      if (!response.ok) throw new Error(errorMessage(body, `Could not save Cards defaults: ${response.status}`))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not save Cards defaults.'
      throw e
    } finally {
      saving.value = false
    }
  }

  return { loading, saving, error, read, write }
}
