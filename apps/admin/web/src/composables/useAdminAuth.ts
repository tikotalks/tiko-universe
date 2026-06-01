import { computed, ref } from 'vue'
import type { AdminApiResponse, AdminConfig, AdminUser } from '../types/admin'

const ADMIN_SESSION_KEY = 'tiko_admin_identity_session'
const ADMIN_EMAIL = 'me@sil.mt'

interface ApiErrorBody {
  error?: { message?: string } | string
}

interface IdentitySessionBundle {
  user: {
    id: string
    displayName?: string
    kind: 'device' | 'recoverable'
    recoverable: boolean
  }
  device: {
    id: string
    name?: string
    secret?: string
  }
  session: {
    token: string
    expiresAt: string
  }
}

const token = ref(readStoredSession()?.session.token ?? '')
const user = ref<AdminUser | null>(null)
const config = ref<AdminConfig | null>(null)
const loading = ref(false)
const emailSent = ref(false)
const error = ref<string | null>(null)

function adminApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_ADMIN_API_URL ?? 'https://admin-api.tikotalks.com/v1/admin').replace(/\/$/, '')
}

function identityBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_IDENTITY_API_URL ?? 'https://api.tikotalks.com/v1/identity').replace(/\/$/, '')
}

function readStoredSession(): IdentitySessionBundle | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return null
    const bundle = JSON.parse(raw) as IdentitySessionBundle
    if (!bundle?.session?.token || !bundle?.session?.expiresAt) return null
    if (new Date(bundle.session.expiresAt).getTime() <= Date.now()) return null
    return bundle
  } catch {
    return null
  }
}

function storeSession(bundle: IdentitySessionBundle) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(bundle))
  token.value = bundle.session.token
}

async function readJsonResponse<T>(response: Response): Promise<T | ApiErrorBody | null> {
  return response.json().catch(() => null) as Promise<T | ApiErrorBody | null>
}

function errorMessage(body: ApiErrorBody | null, fallback: string): string {
  const apiError = body && 'error' in body ? body.error : undefined
  return (typeof apiError === 'string' ? apiError : apiError?.message) ?? fallback
}

async function adminFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${adminApiBaseUrl()}${path}`, {
    headers: { authorization: `Bearer ${token.value}` },
  })
  const body = await readJsonResponse<AdminApiResponse<T>>(response)
  if (!response.ok) throw new Error(errorMessage(body as ApiErrorBody | null, `Admin API error: ${response.status}`))
  return (body as AdminApiResponse<T>).data
}

async function identityFetch<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${identityBaseUrl()}${path}`, init)
  const body = await readJsonResponse<T>(response)
  if (!response.ok) throw new Error(errorMessage(body as ApiErrorBody | null, `Identity API error: ${response.status}`))
  return body as T
}

async function ensureDeviceSession(): Promise<IdentitySessionBundle> {
  const stored = readStoredSession()
  if (stored) {
    token.value = stored.session.token
    return stored
  }

  const bundle = await identityFetch<IdentitySessionBundle>('/device', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ device: { name: 'Tiko Admin', platform: 'web' } }),
  })
  storeSession(bundle)
  return bundle
}

export function useAdminAuth() {
  const isAuthed = computed(() => Boolean(user.value))
  const adminEmail = ADMIN_EMAIL

  async function verifyStoredSession() {
    if (!token.value) return false

    loading.value = true
    error.value = null
    try {
      user.value = await adminFetch<AdminUser>('/me')
      config.value = await adminFetch<AdminConfig>('/config')
      return true
    } catch (e) {
      user.value = null
      config.value = null
      error.value = e instanceof Error ? e.message : 'Admin verification failed.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function requestMagicLink() {
    loading.value = true
    error.value = null
    emailSent.value = false
    try {
      const session = await ensureDeviceSession()
      await identityFetch('/email', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.session.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email: adminEmail }),
      })
      emailSent.value = true
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Could not send a magic link to ${adminEmail}.`
      return false
    } finally {
      loading.value = false
    }
  }

  async function verifyMagicLink(magicToken: string) {
    const cleanToken = magicToken.trim()
    if (!cleanToken) {
      error.value = 'Magic link token is missing or expired.'
      return false
    }

    loading.value = true
    error.value = null
    try {
      const bundle = await identityFetch<IdentitySessionBundle>('/magic-links/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: cleanToken }),
      })
      storeSession(bundle)
      return verifyStoredSession()
    } catch (e) {
      user.value = null
      config.value = null
      error.value = e instanceof Error ? e.message : 'Magic link verification failed.'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    config.value = null
    emailSent.value = false
    localStorage.removeItem(ADMIN_SESSION_KEY)
  }

  return {
    token,
    user,
    config,
    loading,
    error,
    emailSent,
    isAuthed,
    adminEmail,
    requestMagicLink,
    verifyMagicLink,
    verifyStoredSession,
    logout,
  }
}
