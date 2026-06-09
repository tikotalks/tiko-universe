export type SubjectKind = 'anonymous' | 'device' | 'account' | 'service'

export interface IdentitySubject {
  id: string
  kind: SubjectKind
  product: string
}

export interface IdentityDevice {
  id: string
  secret?: string
}

export type AccountType = 'temporary' | 'verified' | 'profile_manager' | 'child_account'
export type RuntimeMode = 'parent' | 'child'
export type LoginMethod = 'device' | 'otp' | 'magic_link' | 'child_code'

export interface IdentityAccount {
  id: string
  subjectId: string
  emailVerified: boolean
  email?: string | null
  accountType?: AccountType
}

export interface IdentitySession {
  id: string
  token: string
  transport: 'bearer' | 'cookie'
  expiresAt: string
  loginMethod?: LoginMethod
}

export interface TikoUser {
  id: string
  displayName?: string
  email?: string | null
  accountType: AccountType
  mode?: RuntimeMode
  recoverable: boolean
  emailVerified?: boolean
  temporaryExpiresAt?: string
  lastActiveAt?: string
}

export interface RuntimeSummary {
  mode: RuntimeMode
  childModeEnabled: boolean
  pinConfigured: boolean
}

export interface UserCapabilities {
  canVerifyEmail: boolean
  canUseParentMode: boolean
  canUseChildMode: boolean
  canManageChildAccounts: boolean
  canDeleteAccount: boolean
}

export interface SessionBundle {
  user: TikoUser
  device: IdentityDevice | null
  session: IdentitySession
  runtime: RuntimeSummary
  capabilities: UserCapabilities
  account?: IdentityAccount | null
}

export interface IdentityBundle extends Partial<SessionBundle> {
  subject: IdentitySubject
  device?: IdentityDevice | null
  account?: IdentityAccount | null
  session?: IdentitySession
  entitlements?: unknown[]
  roles?: string[]
  managed?: {
    handle?: string
    displayName?: string | null
    managerSubjectId?: string
  }
}

export interface ApiErrorEnvelope {
  error: string
  message?: string
}

export interface DeviceBootstrapRequest {
  device?: {
    id?: string
    secret?: string
    name?: string
    platform?: string
  }
}

export interface EmailChallengeRequest {
  email: string
  purpose?: 'verify_email' | 'recover' | 'recovery' | 'link_account' | 'admin_login' | 'login' | 'reset_pin' | 'confirm_deletion'
}

export interface EmailChallengeResponse {
  ok: true
  message: string
}

export interface EmailVerifyRequest {
  token?: string
  otp?: string
}

export interface PinRequest {
  pin: string
  currentPin?: string
}

export interface PinVerifyRequest {
  pin: string
  purpose?: 'parent_mode' | 'settings' | 'child_accounts' | string
}

export interface PinGrant {
  token: string
  purpose: string
  expiresAt: string
}

export interface ChildAccountSummary {
  id: string
  subjectId: string
  managerSubjectId: string
  handle: string
  name: string
  displayName: string
}

export interface ChildAccountRequest {
  name: string
  code: string
  language?: string
}

export interface ChildAccountUpdateRequest {
  name: string
  language?: string
}

export interface ChildAccountLoginRequest {
  name: string
  code: string
}

export type DataCategory = 'identity' | 'preferences' | 'app_state' | 'user_content' | 'progress' | 'insights'

export interface ResetRequest {
  id: string
  status: 'requested' | 'processing' | 'completed' | 'failed'
  categoriesAffected: DataCategory[]
  createdAt: string
  completedAt?: string
}

export interface ResetAccountDataRequest {
  pinGrantToken?: string
  confirmation: 'reset_my_data'
}

export interface ResetProgressRequest {
  confirmation: 'reset_progress'
}

export interface ResetAppRequest {
  confirmation: 'reset_app'
}

export type DeletionScope = 'local-device' | 'account' | 'child_account'

export interface CreateDeletionRequest {
  scope: DeletionScope
  childAccountId?: string
  pinGrantToken?: string
  recoveryGrantToken?: string
}

export interface DeletionRequest {
  id: string
  scope: DeletionScope
  status: 'requested' | 'awaiting-verification' | 'processing' | 'completed' | 'failed' | 'cancelled'
  createdAt: string
  updatedAt: string
  completedAt?: string
  canCancel: boolean
}

export interface IdentityClientOptions {
  baseUrl: string
  fetch?: typeof fetch
  credentials?: RequestCredentials
}

export class IdentityApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.message ?? envelope.error)
    this.name = 'IdentityApiError'
    this.status = status
    this.code = envelope.error
  }
}

export class IdentityClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch
  private readonly credentials?: RequestCredentials

  constructor(options: IdentityClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.credentials = options.credentials
  }

  bootstrapDevice(input: DeviceBootstrapRequest = {}): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/device', {
      method: 'POST',
      body: JSON.stringify(input)
    })
  }

  getSession(sessionToken: string): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/session', {
      method: 'GET',
      headers: bearerHeaders(sessionToken)
    })
  }

  getCookieSession(): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/session', {
      method: 'GET'
    })
  }

  refreshSession(sessionToken: string): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/session/refresh', {
      method: 'POST',
      headers: bearerHeaders(sessionToken)
    })
  }

  requestEmailVerification(input: EmailChallengeRequest, sessionToken?: string): Promise<EmailChallengeResponse> {
    return this.request<EmailChallengeResponse>('/identity/email', {
      method: 'POST',
      headers: sessionToken ? bearerHeaders(sessionToken) : undefined,
      body: JSON.stringify(input)
    })
  }

  requestOtp(input: EmailChallengeRequest, sessionToken?: string): Promise<EmailChallengeResponse> {
    return this.request<EmailChallengeResponse>('/identity/otp/request', {
      method: 'POST',
      headers: sessionToken ? bearerHeaders(sessionToken) : undefined,
      body: JSON.stringify(input)
    })
  }

  createEmailChallenge(input: EmailChallengeRequest, sessionToken?: string): Promise<EmailChallengeResponse> {
    return this.requestEmailVerification(input, sessionToken)
  }

  verifyMagicLink(token: string): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/magic-links/verify', {
      method: 'POST',
      body: JSON.stringify({ token })
    })
  }

  verifyEmail(input: EmailVerifyRequest): Promise<IdentityBundle> {
    if (!input.token && !input.otp) throw new Error('token or otp is required')
    if (input.token) return this.verifyMagicLink(input.token)
    return this.verifyOtp(input.otp ?? '')
  }

  verifyOtp(otp: string): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ code: otp })
    })
  }

  async logout(sessionToken: string): Promise<void> {
    await this.request<void>('/identity/logout', {
      method: 'POST',
      headers: bearerHeaders(sessionToken)
    })
  }

  setPin(sessionToken: string, input: PinRequest): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/pin', {
      method: 'POST',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify(input)
    })
  }

  verifyPin(sessionToken: string, input: PinVerifyRequest): Promise<{ ok: true; grant: PinGrant }> {
    return this.request<{ ok: true; grant: PinGrant }>('/identity/pin/verify', {
      method: 'POST',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify(input)
    })
  }

  async removePin(sessionToken: string, pin: string): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/pin', {
      method: 'DELETE',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify({ pin })
    })
  }

  enableChildMode(sessionToken: string): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/mode/child/enable', {
      method: 'POST',
      headers: bearerHeaders(sessionToken)
    })
  }

  enterChildMode(sessionToken: string): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/mode/child', {
      method: 'POST',
      headers: bearerHeaders(sessionToken)
    })
  }

  enterParentMode(sessionToken: string, pin?: string): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/mode/parent', {
      method: 'POST',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify(pin ? { pin } : {})
    })
  }

  listChildAccounts(sessionToken: string): Promise<{ childAccounts: ChildAccountSummary[] }> {
    return this.request<{ childAccounts: ChildAccountSummary[] }>('/identity/child-accounts', {
      method: 'GET',
      headers: bearerHeaders(sessionToken)
    })
  }

  createChildAccount(sessionToken: string, input: ChildAccountRequest): Promise<{ child: ChildAccountSummary }> {
    return this.request<{ child: ChildAccountSummary }>('/identity/child-accounts', {
      method: 'POST',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify(input)
    })
  }

  updateChildAccount(sessionToken: string, childAccountId: string, input: ChildAccountUpdateRequest): Promise<{ child: ChildAccountSummary }> {
    return this.request<{ child: ChildAccountSummary }>(`/identity/child-accounts/${encodeURIComponent(childAccountId)}`, {
      method: 'PUT',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify(input)
    })
  }

  resetChildAccountCode(sessionToken: string, childAccountId: string, code: string): Promise<{ child: ChildAccountSummary }> {
    return this.request<{ child: ChildAccountSummary }>(`/identity/child-accounts/${encodeURIComponent(childAccountId)}/code/reset`, {
      method: 'POST',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify({ code })
    })
  }

  async deleteChildAccount(sessionToken: string, childAccountId: string): Promise<void> {
    await this.request<void>(`/identity/child-accounts/${encodeURIComponent(childAccountId)}`, {
      method: 'DELETE',
      headers: bearerHeaders(sessionToken)
    })
  }

  loginChildAccount(input: ChildAccountLoginRequest): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/child-accounts/login', {
      method: 'POST',
      body: JSON.stringify(input)
    })
  }

  // ─── Reset & Deletion ───────────────────────────────────────────────

  resetAccountData(sessionToken: string, input: ResetAccountDataRequest): Promise<ResetRequest> {
    return this.request<ResetRequest>('/identity/reset', {
      method: 'POST',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify(input)
    })
  }

  resetChildAccountProgress(sessionToken: string, childAccountId: string, input: ResetProgressRequest): Promise<ResetRequest> {
    return this.request<ResetRequest>(`/identity/child-accounts/${encodeURIComponent(childAccountId)}/progress/reset`, {
      method: 'POST',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify(input)
    })
  }

  createDeletionRequest(sessionToken: string, input: CreateDeletionRequest): Promise<DeletionRequest> {
    return this.request<DeletionRequest>('/identity/deletion-requests', {
      method: 'POST',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify(input)
    })
  }

  getDeletionRequest(sessionToken: string, requestId: string): Promise<DeletionRequest> {
    return this.request<DeletionRequest>(`/identity/deletion-requests/${encodeURIComponent(requestId)}`, {
      headers: bearerHeaders(sessionToken)
    })
  }

  /** @deprecated Use createDeletionRequest({ scope: 'account' }) instead */
  async deleteSelf(sessionToken: string): Promise<void> {
    await this.request<void>('/identity/me', {
      method: 'DELETE',
      headers: bearerHeaders(sessionToken)
    })
  }

  getProfile(sessionToken: string): Promise<{ profile: Record<string, unknown> }> {
    return this.request<{ profile: Record<string, unknown> }>('/identity/profile', {
      headers: bearerHeaders(sessionToken)
    })
  }

  updateProfile(sessionToken: string, data: Record<string, unknown>): Promise<{ profile: Record<string, unknown> }> {
    return this.request<{ profile: Record<string, unknown> }>('/identity/profile', {
      method: 'PUT',
      headers: bearerHeaders(sessionToken),
      body: JSON.stringify(data)
    })
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const headers = {
      'content-type': 'application/json',
      ...(init.headers as Record<string, string> | undefined)
    }
    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers, credentials: this.credentials })
    if (response.status === 204) return undefined as T
    const body = await response.json()
    if (!response.ok) {
      throw new IdentityApiError(response.status, body as ApiErrorEnvelope)
    }
    return body as T
  }
}

function bearerHeaders(sessionToken: string): Record<string, string> {
  return { authorization: `Bearer ${sessionToken}` }
}

