import { ref } from 'vue'
import { useAdminAuth } from './useAdminAuth'

export type TikoManagedApp = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'radio' | 'todo' | 'talk'
export type AppResource = 'settings' | 'state'

export interface AppDataPayload {
  app: TikoManagedApp
  settings?: Record<string, unknown>
  state?: Record<string, unknown>
  updatedAt: string | null
  version: number
}

interface ApiErrorBody {
  error?: { message?: string } | string
}

function errorMessage(body: ApiErrorBody | AppDataPayload | null, fallback: string): string {
  const apiError = body && 'error' in body ? body.error : undefined
  return (typeof apiError === 'string' ? apiError : apiError?.message) ?? fallback
}

export function useAppDefaults() {
  const { token, config } = useAdminAuth()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  function appBaseUrl(): string {
    return (config.value?.appApiUrl ?? 'https://app.tikoapi.org/v1/apps').replace(/\/$/, '')
  }

  async function read(app: TikoManagedApp, resource: AppResource): Promise<AppDataPayload> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${appBaseUrl()}/${app}/${resource}`, {
        headers: { authorization: `Bearer ${token.value}` },
      })
      const body = await response.json().catch(() => null) as ApiErrorBody | AppDataPayload | null
      if (!response.ok) throw new Error(errorMessage(body, `Could not load ${app} ${resource}: ${response.status}`))
      return body as AppDataPayload
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Could not load ${app} ${resource}.`
      throw e
    } finally {
      loading.value = false
    }
  }

  async function write(app: TikoManagedApp, resource: AppResource, value: Record<string, unknown>, version: number): Promise<AppDataPayload> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(`${appBaseUrl()}/${app}/${resource}`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${token.value}`, 'content-type': 'application/json' },
        body: JSON.stringify({ [resource]: value, version }),
      })
      const body = await response.json().catch(() => null) as ApiErrorBody | AppDataPayload | null
      if (!response.ok) throw new Error(errorMessage(body, `Could not save ${app} ${resource}: ${response.status}`))
      return body as AppDataPayload
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Could not save ${app} ${resource}.`
      throw e
    } finally {
      saving.value = false
    }
  }

  async function readDefaults(app: TikoManagedApp, resource: AppResource): Promise<AppDataPayload> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${appBaseUrl()}/defaults/${app}/${resource}`, {
        headers: { authorization: `Bearer ${token.value}` },
      })
      const body = await response.json().catch(() => null) as ApiErrorBody | AppDataPayload | null
      if (!response.ok) throw new Error(errorMessage(body, `Could not load ${app} defaults: ${response.status}`))
      return body as AppDataPayload
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Could not load ${app} defaults.`
      throw e
    } finally {
      loading.value = false
    }
  }

  async function writeDefaults(app: TikoManagedApp, resource: AppResource, value: Record<string, unknown>, version: number): Promise<AppDataPayload> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(`${appBaseUrl()}/defaults/${app}/${resource}`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${token.value}`, 'content-type': 'application/json' },
        body: JSON.stringify({ [resource]: value, version }),
      })
      const body = await response.json().catch(() => null) as ApiErrorBody | AppDataPayload | null
      if (!response.ok) throw new Error(errorMessage(body, `Could not save ${app} defaults: ${response.status}`))
      return body as AppDataPayload
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Could not save ${app} defaults.`
      throw e
    } finally {
      saving.value = false
    }
  }

  return { loading, saving, error, read, write, readDefaults, writeDefaults }
}
