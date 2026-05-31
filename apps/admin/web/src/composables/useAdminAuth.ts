import { computed, ref } from 'vue'
import type { AdminApiResponse, AdminConfig, AdminUser } from '../types/admin'

const ADMIN_TOKEN_KEY = 'tiko_admin_token'

const token = ref(localStorage.getItem(ADMIN_TOKEN_KEY) ?? '')
const user = ref<AdminUser | null>(null)
const config = ref<AdminConfig | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

function adminApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_ADMIN_API_URL ?? 'https://dev.admin.tikoapi.org/v1/admin').replace(/\/$/, '')
}

async function adminFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${adminApiBaseUrl()}${path}`, {
    headers: { authorization: `Bearer ${token.value}` },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Admin API error: ${response.status}`)
  }
  return (body as AdminApiResponse<T>).data
}

export function useAdminAuth() {
  const isAuthed = computed(() => Boolean(user.value))

  async function verify(candidateToken?: string) {
    if (candidateToken !== undefined) token.value = candidateToken.trim()
    if (!token.value) {
      error.value = 'Paste your Tiko session token to unlock the dashboard.'
      return false
    }

    loading.value = true
    error.value = null
    try {
      user.value = await adminFetch<AdminUser>('/me')
      config.value = await adminFetch<AdminConfig>('/config')
      localStorage.setItem(ADMIN_TOKEN_KEY, token.value)
      return true
    } catch (e) {
      user.value = null
      config.value = null
      localStorage.removeItem(ADMIN_TOKEN_KEY)
      error.value = e instanceof Error ? e.message : 'Admin verification failed.'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    config.value = null
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  }

  return { token, user, config, loading, error, isAuthed, verify, logout }
}
