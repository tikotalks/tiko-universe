import { ref } from 'vue'
import { useAdminAuth } from '../useAdminAuth'
import type { AdminApiResponse } from '../../types/admin'
import type { CreateMediaUploadApiKeyInput, IssuedMediaUploadApiKey, MediaUploadApiKey } from './useAdminApiKeys.model'

interface ApiErrorBody {
  error?: { message?: string } | string
}

function adminApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_ADMIN_API_URL ?? 'https://admin.tikoapi.org/v1/admin').replace(/\/$/, '')
}

export function useAdminApiKeys() {
  const { token } = useAdminAuth()
  const keys = ref<MediaUploadApiKey[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${token.value}`)
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')

    const response = await fetch(`${adminApiBaseUrl()}${path}`, { ...init, headers })
    const body = await response.json().catch(() => null) as ApiErrorBody | AdminApiResponse<T> | null
    if (!response.ok) {
      const apiError = body && 'error' in body ? body.error : undefined
      throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Admin API error: ${response.status}`)
    }
    return (body as AdminApiResponse<T>).data
  }

  async function list(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const data = await adminFetch<{ keys: MediaUploadApiKey[] }>('/api-keys')
      keys.value = data.keys
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Could not load API keys.'
    } finally {
      loading.value = false
    }
  }

  async function create(input: CreateMediaUploadApiKeyInput): Promise<IssuedMediaUploadApiKey> {
    saving.value = true
    error.value = null
    try {
      const created = await adminFetch<IssuedMediaUploadApiKey>('/api-keys', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      const record: MediaUploadApiKey = {
        id: created.id,
        name: created.name,
        prefix: created.prefix,
        scopes: created.scopes,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
        lastUsedAt: created.lastUsedAt,
      }
      keys.value = [record, ...keys.value]
      return created
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Could not create API key.'
      throw cause
    } finally {
      saving.value = false
    }
  }

  async function revoke(id: string): Promise<void> {
    saving.value = true
    error.value = null
    try {
      await adminFetch<{ id: string, revoked: boolean }>(`/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' })
      keys.value = keys.value.filter((key) => key.id !== id)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Could not revoke API key.'
      throw cause
    } finally {
      saving.value = false
    }
  }

  return { keys, loading, saving, error, list, create, revoke }
}
