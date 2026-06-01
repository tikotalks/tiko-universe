import { computed, ref } from 'vue'
import { IdentityClient, type SessionBundle } from '@tiko/identity'
import type { AdminApiResponse, AdminConfig, AdminUser } from '../types/admin'

const ADMIN_TOKEN_KEY = 'tiko_admin_token'
const ADMIN_IDENTITY_KEY = 'tiko_admin_identity'

const token = ref(localStorage.getItem(ADMIN_TOKEN_KEY) ?? '')
const user = ref<AdminUser | null>(null)
const config = ref<AdminConfig | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const loginMessage = ref<string | null>(null)

interface ApiErrorBody {
  error?: { message?: string } | string
}

function adminApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_ADMIN_API_URL ?? 'https://dev.admin-api.tikotalks.com/v1/admin').replace(/\/$/, '')
}

function identityApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_API_BASE_URL ?? env?.VITE_IDENTITY_API_URL ?? 'https://api.tikotalks.com/v1').replace(/\/$/, '')
}

function readStoredIdentity(): SessionBundle | null {
  try {
    const value = localStorage.getItem(ADMIN_IDENTITY_KEY)
    return value ? JSON.parse(value) as SessionBundle : null
  } catch {
    return null
  }
}

function storeIdentity(bundle: SessionBundle) {
  token.value = bundle.session.token
  localStorage.setItem(ADMIN_IDENTITY_KEY, JSON.stringify(bundle))
  localStorage.setItem(ADMIN_TOKEN_KEY, bundle.session.token)
}

function isOtpCode(value: string): boolean {
  return /^\d{6}$/.test(value.replace(/\s/g, ''))
}

function tokenFromMagicLink(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    return url.searchParams.get('token')?.trim() ?? trimmed
  } catch {
    return trimmed
  }
}

async function adminFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${adminApiBaseUrl()}${path}`, {
    headers: { authorization: `Bearer ${token.value}` },
  })
  const body = await response.json().catch(() => null) as ApiErrorBody | AdminApiResponse<T> | null
  if (!response.ok) {
    const apiError = body && 'error' in body ? body.error : undefined
    throw new Error((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Admin API error: ${response.status}`)
  }
  return (body as AdminApiResponse<T>).data
}

export function useAdminAuth() {
  const isAuthed = computed(() => Boolean(user.value))
  const identityClient = new IdentityClient({ baseUrl: identityApiBaseUrl() })

  async function ensureDeviceSession(): Promise<SessionBundle> {
    const stored = readStoredIdentity()
    if (stored?.session.token) {
      try {
        const current = await identityClient.getSession(stored.session.token)
        const restored = { ...current, device: { ...current.device, secret: stored.device.secret } }
        storeIdentity(restored)
        return restored
      } catch {
        localStorage.removeItem(ADMIN_IDENTITY_KEY)
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        token.value = ''
      }
    }

    const bundle = await identityClient.bootstrapDevice({
      device: {
        name: 'Tiko Admin web',
        platform: 'web'
      }
    })
    storeIdentity(bundle)
    return bundle
  }

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
      loginMessage.value = null
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

  async function requestMagicLink(email: string) {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      error.value = 'Enter the admin email address.'
      return false
    }

    loading.value = true
    error.value = null
    loginMessage.value = null
    try {
      const bundle = await ensureDeviceSession()
      const response = await identityClient.requestRecoveryEmail({ email: normalizedEmail }, bundle.session.token)
      loginMessage.value = response.message || 'Check your email for the magic link.'
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not request a magic link.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function verifyMagicLink(value: string) {
    const trimmed = value.trim()
    if (!trimmed) {
      error.value = 'Enter the sign-in code or paste the magic link from your email.'
      return false
    }

    loading.value = true
    error.value = null
    try {
      const request = isOtpCode(trimmed)
        ? { otp: trimmed.replace(/\s/g, '') }
        : { token: tokenFromMagicLink(trimmed) }
      const bundle = await identityClient.verifyMagicLink(request)
      storeIdentity(bundle)
      return verify(bundle.session.token)
    } catch (e) {
      user.value = null
      config.value = null
      error.value = e instanceof Error ? e.message : 'Sign-in verification failed.'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    config.value = null
    loginMessage.value = null
    error.value = null
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_IDENTITY_KEY)
  }

  return {
    token,
    user,
    config,
    loading,
    error,
    loginMessage,
    isAuthed,
    verify,
    requestMagicLink,
    verifyMagicLink,
    logout
  }
}
