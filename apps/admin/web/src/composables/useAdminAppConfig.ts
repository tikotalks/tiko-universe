import { ref } from 'vue'
import type { TikoAppColor, TikoAppConfig } from '@tiko/ui'
import { useAdminAuth } from './useAdminAuth'

export interface AdminManagedAppConfig extends TikoAppConfig {
  updatedAt?: string | null
  version?: number
}

export interface TikoGeneralSettings {
  supportedLanguages: string[]
  [key: string]: unknown
}

interface AdminConfigListResponse {
  configs: Record<TikoAppColor, AdminManagedAppConfig>
}

interface AdminConfigWriteResponse {
  config: AdminManagedAppConfig
  updatedAt: string
  version: number
}

interface TikoSettingsResponse {
  settings: TikoGeneralSettings
  updatedAt: string | null
  version: number
}

interface ApiErrorBody {
  error?: { message?: string } | string
}

interface AdminApiResponse<T> {
  data: T
}

function adminApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_ADMIN_API_URL ?? 'https://admin.tikoapi.org/v1/admin').replace(/\/$/, '')
}

function errorMessage(body: ApiErrorBody | null, fallback: string): string {
  const apiError = body?.error
  return (typeof apiError === 'string' ? apiError : apiError?.message) ?? fallback
}

export function useAdminAppConfig() {
  const { token } = useAdminAuth()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function readConfigs(): Promise<Record<TikoAppColor, AdminManagedAppConfig>> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${adminApiBaseUrl()}/apps/config`, {
        headers: { authorization: `Bearer ${token.value}` },
      })
      const body = await response.json().catch(() => null) as AdminApiResponse<AdminConfigListResponse> | ApiErrorBody | null
      if (!response.ok) throw new Error(errorMessage(body as ApiErrorBody | null, `Could not load app config: ${response.status}`))
      return (body as AdminApiResponse<AdminConfigListResponse>).data.configs
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load app config.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function writeConfig(app: TikoAppColor, config: AdminManagedAppConfig, version = 0): Promise<AdminConfigWriteResponse> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(`${adminApiBaseUrl()}/apps/config/${encodeURIComponent(app)}`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${token.value}`, 'content-type': 'application/json' },
        body: JSON.stringify({ config, version }),
      })
      const body = await response.json().catch(() => null) as AdminApiResponse<AdminConfigWriteResponse> | ApiErrorBody | null
      if (!response.ok) throw new Error(errorMessage(body as ApiErrorBody | null, `Could not save app config: ${response.status}`))
      return (body as AdminApiResponse<AdminConfigWriteResponse>).data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not save app config.'
      throw e
    } finally {
      saving.value = false
    }
  }

  async function readTikoSettings(): Promise<TikoSettingsResponse> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${adminApiBaseUrl()}/tiko/settings`, {
        headers: { authorization: `Bearer ${token.value}` },
      })
      const body = await response.json().catch(() => null) as AdminApiResponse<TikoSettingsResponse> | ApiErrorBody | null
      if (!response.ok) throw new Error(errorMessage(body as ApiErrorBody | null, `Could not load Tiko settings: ${response.status}`))
      return (body as AdminApiResponse<TikoSettingsResponse>).data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load Tiko settings.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function writeTikoSettings(settings: TikoGeneralSettings, version = 0): Promise<TikoSettingsResponse> {
    saving.value = true
    error.value = null
    try {
      const response = await fetch(`${adminApiBaseUrl()}/tiko/settings`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${token.value}`, 'content-type': 'application/json' },
        body: JSON.stringify({ settings, version }),
      })
      const body = await response.json().catch(() => null) as AdminApiResponse<TikoSettingsResponse> | ApiErrorBody | null
      if (!response.ok) throw new Error(errorMessage(body as ApiErrorBody | null, `Could not save Tiko settings: ${response.status}`))
      return (body as AdminApiResponse<TikoSettingsResponse>).data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not save Tiko settings.'
      throw e
    } finally {
      saving.value = false
    }
  }

  return { loading, saving, error, readConfigs, writeConfig, readTikoSettings, writeTikoSettings }
}
