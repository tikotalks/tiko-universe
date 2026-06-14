import { ref } from 'vue'
import { useAdminAuth } from './useAdminAuth'

export interface TalkMediaMapEntry {
  conceptId: string
  imageUrl: string
  source: 'auto' | 'manual'
  updatedAt: string
}

function sentenceApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_SENTENCE_API_URL ?? 'https://sentence.tikoapi.org').replace(/\/$/, '')
}

export function useTalkMapping() {
  const { token } = useAdminAuth()

  const items = ref<TalkMediaMapEntry[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchMap(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${sentenceApiBaseUrl()}/v1/sentence-admin/media-map`, {
        headers: { authorization: `Bearer ${token.value}` },
      })
      if (!response.ok) throw new Error(`Failed to load media map (${response.status})`)
      const body = await response.json() as { map: TalkMediaMapEntry[] }
      items.value = body.map
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load media map.'
    } finally {
      loading.value = false
    }
  }

  async function putEntry(conceptId: string, imageUrl: string): Promise<void> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(`${sentenceApiBaseUrl()}/v1/sentence-admin/media-map`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token.value}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ conceptId, imageUrl }),
      })
      if (!response.ok) throw new Error(`Failed to save mapping (${response.status})`)
      const body = await response.json() as { conceptId: string; imageUrl: string | null }
      if (body.imageUrl) {
        const idx = items.value.findIndex(i => i.conceptId === body.conceptId)
        const entry: TalkMediaMapEntry = { conceptId: body.conceptId, imageUrl: body.imageUrl!, source: 'manual', updatedAt: new Date().toISOString() }
        if (idx !== -1) items.value[idx] = entry
        else items.value.push(entry)
      } else {
        items.value = items.value.filter(i => i.conceptId !== body.conceptId)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not save mapping.'
      throw e
    } finally {
      saving.value = false
    }
  }

  async function deleteEntry(conceptId: string): Promise<void> {
    await putEntry(conceptId, '')
  }

  return { items, loading, saving, error, fetchMap, putEntry, deleteEntry }
}
