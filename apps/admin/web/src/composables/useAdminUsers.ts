import { ref } from 'vue'
import { useAdminAuth } from './useAdminAuth'
import type { AdminApiResponse, AdminManagedUser, TikoRole } from '../types/admin'

interface ApiErrorBody {
  error?: { message?: string } | string
}

export const assignableRoles: Array<{ value: TikoRole; label: string; description: string }> = [
  { value: 'guest', label: 'Guest', description: 'Temporary/device subject.' },
  { value: 'user', label: 'User', description: 'Verified account-backed subject.' },
  { value: 'child', label: 'Child', description: 'Managed child profile; no Parent Mode.' },
  { value: 'profile_manager', label: 'Profile manager', description: 'Adult/caregiver/school manager.' },
  { value: 'content_editor', label: 'Content editor', description: 'Can manage content and defaults.' },
  { value: 'admin', label: 'Admin', description: 'Full admin access and role management.' },
]

function adminApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_ADMIN_API_URL ?? 'https://admin.tikoapi.org/v1/admin').replace(/\/$/, '')
}

export function useAdminUsers() {
  const { token } = useAdminAuth()
  const users = ref<AdminManagedUser[]>([])
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

  async function list(query = '') {
    loading.value = true
    error.value = null
    try {
      const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
      const data = await adminFetch<{ users: AdminManagedUser[] }>(`/users${params}`)
      users.value = data.users
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load users.'
    } finally {
      loading.value = false
    }
  }

  async function assignRole(subjectId: string, role: TikoRole) {
    saving.value = true
    error.value = null
    try {
      const data = await adminFetch<{ subjectId: string; roles: TikoRole[] }>(`/users/${encodeURIComponent(subjectId)}/roles`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      })
      updateUserRoles(data.subjectId, data.roles)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not assign role.'
    } finally {
      saving.value = false
    }
  }

  async function revokeRole(subjectId: string, role: TikoRole) {
    saving.value = true
    error.value = null
    try {
      const data = await adminFetch<{ subjectId: string; roles: TikoRole[] }>(`/users/${encodeURIComponent(subjectId)}/roles/${encodeURIComponent(role)}`, {
        method: 'DELETE',
      })
      updateUserRoles(data.subjectId, data.roles)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not revoke role.'
    } finally {
      saving.value = false
    }
  }

  function updateUserRoles(subjectId: string, roles: TikoRole[]) {
    users.value = users.value.map((user) => user.id === subjectId ? { ...user, roles } : user)
  }

  return { users, loading, saving, error, list, assignRole, revokeRole }
}
