import { ref } from 'vue'
import { useAdminAuth } from './useAdminAuth'

export type SpeechProvider = 'openai' | 'elevenlabs' | 'narakeet'

export interface SpeechServiceConfig {
  defaultProvider: SpeechProvider
  models: Partial<Record<SpeechProvider, string>>
  voices: Partial<Record<SpeechProvider, Record<string, string>>>
}

export interface SpeechServiceResponse {
  settings: SpeechServiceConfig
  defaults: {
    narakeetVoices: Record<string, string>
    models: Partial<Record<SpeechProvider, string>>
  }
  updatedAt: string | null
  version: number
}

interface AdminApiResponse<T> {
  data: T
}

interface ApiErrorBody {
  error?: { message?: string } | string
}

function adminApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_ADMIN_API_URL ?? 'https://admin.tikoapi.org/v1/admin').replace(/\/$/, '')
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => null) as ApiErrorBody | T | null
  if (!response.ok) {
    const apiError = body && typeof body === 'object' && 'error' in body ? (body as ApiErrorBody).error : undefined
    throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `${fallback}: ${response.status}`)
  }
  return body as T
}

export function useAdminServices() {
  const { token } = useAdminAuth()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  function headers(extra: Record<string, string> = {}) {
    return { authorization: `Bearer ${token.value}`, ...extra }
  }

  async function readSpeech(): Promise<SpeechServiceResponse> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${adminApiBaseUrl()}/services/speech`, { headers: headers() })
      const body = await readJson<AdminApiResponse<SpeechServiceResponse>>(response, 'Could not load speech service settings')
      return body.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load speech service settings.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function writeSpeech(settings: SpeechServiceConfig, version: number): Promise<SpeechServiceResponse> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(`${adminApiBaseUrl()}/services/speech`, {
        method: 'PUT',
        headers: headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ settings, version }),
      })
      const body = await readJson<AdminApiResponse<Omit<SpeechServiceResponse, 'defaults'>>>(response, 'Could not save speech service settings')
      return {
        ...body.data,
        defaults: { narakeetVoices: {}, models: {} },
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not save speech service settings.'
      throw e
    } finally {
      saving.value = false
    }
  }

  return { loading, saving, error, readSpeech, writeSpeech }
}
