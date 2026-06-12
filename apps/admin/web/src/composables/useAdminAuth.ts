import { computed, ref } from 'vue'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import type { AdminApiResponse, AdminConfig, AdminUser } from '../types/admin'

const LEGACY_ADMIN_TOKEN_KEY = 'tiko_admin_token'
const LEGACY_ADMIN_IDENTITY_KEY = 'tiko_admin_identity'

localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY)
localStorage.removeItem(LEGACY_ADMIN_IDENTITY_KEY)

const token = ref('')
const user = ref<AdminUser | null>(null)
const config = ref<AdminConfig | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const loginMessage = ref<string | null>(null)

let deviceSessionPromise: Promise<IdentityBundle> | null = null

interface ApiErrorBody {
  error?: { message?: string } | string
}

class AdminFetchError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'AdminFetchError'
  }
}

function adminApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_ADMIN_API_URL ?? 'https://admin.tikoapi.org/v1/admin').replace(/\/$/, '')
}

function identityApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_API_BASE_URL ?? env?.VITE_IDENTITY_API_URL ?? 'https://identity.tikoapi.org/v1').replace(/\/$/, '')
}

function storeIdentity(bundle: IdentityBundle) {
  const sessionToken = requireSessionToken(bundle)
  token.value = sessionToken
}

function requireSessionToken(bundle: IdentityBundle): string {
  if (!bundle.session?.token) throw new Error('Identity response did not include a session token.')
  return bundle.session.token
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
    throw new AdminFetchError((typeof apiError === 'string' ? apiError : apiError?.message) ?? `Admin API error: ${response.status}`, response.status)
  }
  return (body as AdminApiResponse<T>).data
}

export function useAdminAuth() {
  const isAuthed = computed(() => Boolean(user.value))
  const identityClient = new IdentityClient({ baseUrl: identityApiBaseUrl(), credentials: 'include' })

  async function ensureDeviceSession(): Promise<IdentityBundle> {
    try {
      const current = await identityClient.getCookieSession()
      storeIdentity(current)
      return current
    } catch {
      token.value = ''
    }

    const bundle = await identityClient.bootstrapDevice({
      device: { name: 'Tiko Admin web', platform: 'web' }
    })
    storeIdentity(bundle)
    return bundle
  }

  function warmDeviceSession() {
    if (!deviceSessionPromise) {
      deviceSessionPromise = ensureDeviceSession().catch(() => {
        deviceSessionPromise = null
        return Promise.reject(new Error('Device session failed'))
      })
    }
    return deviceSessionPromise
  }

  async function verify(candidateToken?: string, { silent = false } = {}) {
    if (candidateToken !== undefined) token.value = candidateToken.trim()
    if (!token.value) {
      if (!silent) error.value = 'Paste your Tiko session token to unlock the dashboard.'
      return false
    }

    if (!silent) loading.value = true
    error.value = null
    try {
      const nextUser = await adminFetch<AdminUser>('/me')
      const nextConfig = await adminFetch<AdminConfig>('/config')
      user.value = nextUser
      config.value = nextConfig
      loginMessage.value = null
      return true
    } catch (e) {
      if (e instanceof AdminFetchError && (e.status === 401 || e.status === 403)) {
        user.value = null
        config.value = null
        token.value = ''
      }
      if (!silent) error.value = e instanceof Error ? e.message : 'Admin verification failed.'
      return false
    } finally {
      if (!silent) loading.value = false
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
      const bundle = await warmDeviceSession()
      const response = await identityClient.createEmailChallenge({ email: normalizedEmail, purpose: 'recover' }, requireSessionToken(bundle))
      loginMessage.value = response.message || 'Check your email for the magic link.'
      return true
    } catch (e) {
      deviceSessionPromise = null
      error.value = e instanceof Error ? e.message : 'Could not request a magic link.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function verifyEmailChallenge(value: string) {
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
      const bundle = await identityClient.verifyEmail(request)
      storeIdentity(bundle)
      return verify(requireSessionToken(bundle))
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
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY)
    localStorage.removeItem(LEGACY_ADMIN_IDENTITY_KEY)
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
    warmDeviceSession,
    requestMagicLink,
    verifyEmailChallenge,
    logout
  }
}
