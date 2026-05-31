import { ref } from 'vue'
import { useAdminAuth } from './useAdminAuth'

export type TikoManagedApp = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer'
export type AppResource = 'settings' | 'state'

export interface AppDataPayload {
  app: TikoManagedApp
  settings?: Record<string, unknown>
  state?: Record<string, unknown>
  updatedAt: string | null
  version: number
}

export function useAppDefaults() {
  const { token, config } = useAdminAuth()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  function appBaseUrl(): string {
    return (config.value?.appApiUrl ?? 'https://dev.api.tikoapi.org/v1/apps').replace(/\/$/, '')
  }

  async function read(app: TikoManagedApp, resource: AppResource): Promise<AppDataPayload> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${appBaseUrl()}/${app}/${resource}`, {
        headers: { authorization: `Bearer ${token.value}` },
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error?.message ?? `Could not load ${app} ${resource}: ${response.status}`)
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
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error?.message ?? `Could not save ${app} ${resource}: ${response.status}`)
      return body as AppDataPayload
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Could not save ${app} ${resource}.`
      throw e
    } finally {
      saving.value = false
    }
  }

  return { loading, saving, error, read, write }
}
