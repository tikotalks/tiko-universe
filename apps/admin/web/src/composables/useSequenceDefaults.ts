import { ref } from 'vue'
import { useAdminAuth } from './useAdminAuth'

export interface SequenceStep {
  id: string
  label: string
  text: string
  imageRef?: string
  imageRefs?: string[]
  imagePrompt?: string
  imageURL?: string
  imageURLs?: string[]
}

export interface SequenceDefault {
  id: string
  name: string
  title: string
  category?: string
  color?: string
  imageRef?: string
  imageURL?: string
  order: number
  steps: SequenceStep[]
}

export interface SequenceDefaultsPayload {
  sequences: SequenceDefault[]
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

function sanitizeSequence(sequence: SequenceDefault): SequenceDefault {
  const base = { ...sequence }
  delete base.imageURL
  if (base.imageRef && /^https?:\/\//i.test(base.imageRef)) delete base.imageRef
  return {
    ...base,
    steps: sequence.steps.map((step) => {
      const cleanStep = { ...step }
      delete cleanStep.imageURL
      delete cleanStep.imageURLs
      if (cleanStep.imageRef && /^https?:\/\//i.test(cleanStep.imageRef)) delete cleanStep.imageRef
      if (Array.isArray(cleanStep.imageRefs)) cleanStep.imageRefs = cleanStep.imageRefs.filter(ref => !/^https?:\/\//i.test(ref))
      return cleanStep
    }),
  }
}

export function useSequenceDefaults() {
  const { token } = useAdminAuth()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function read(): Promise<SequenceDefaultsPayload> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${contentBaseUrl()}/sequence/content`)
      const body = await response.json().catch(() => null) as { success: boolean; data?: SequenceDefaultsPayload } | null
      if (!response.ok) throw new Error(`Could not load Sequence defaults: ${response.status}`)
      return body?.data ?? { sequences: [] }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load Sequence defaults.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function write(sequences: SequenceDefault[]): Promise<void> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(`${contentBaseUrl()}/admin/sequence/content`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token.value}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ sequences: sequences.map(sanitizeSequence) }),
      })
      const body = await response.json().catch(() => null) as ApiErrorBody | null
      if (!response.ok) throw new Error(errorMessage(body, `Could not save Sequence defaults: ${response.status}`))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not save Sequence defaults.'
      throw e
    } finally {
      saving.value = false
    }
  }

  return { loading, saving, error, read, write }
}
