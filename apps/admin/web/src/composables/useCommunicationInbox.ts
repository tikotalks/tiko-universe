import { ref } from 'vue'
import { useAdminAuth } from './useAdminAuth'
import type { AdminApiResponse, CommunicationMessage } from '../types/admin'

interface ApiErrorBody {
  error?: { message?: string } | string
}

function adminApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_ADMIN_API_URL ?? 'https://dev.admin-api.tikotalks.com/v1/admin').replace(/\/$/, '')
}

export function useCommunicationInbox() {
  const { token } = useAdminAuth()
  const messages = ref<CommunicationMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function list() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${adminApiBaseUrl()}/communication/inbox`, {
        headers: { authorization: `Bearer ${token.value}` }
      })
      const body = await response.json().catch(() => null) as ApiErrorBody | AdminApiResponse<CommunicationMessage[]> | null
      const apiError = body && 'error' in body ? body.error : undefined
      if (!response.ok) throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Inbox failed: ${response.status}`)
      messages.value = (body as AdminApiResponse<CommunicationMessage[]>).data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load inbox.'
    } finally {
      loading.value = false
    }
  }

  return { messages, loading, error, list }
}
