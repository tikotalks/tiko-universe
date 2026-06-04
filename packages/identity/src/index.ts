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

export interface IdentityAccount {
  id: string
  subjectId: string
  emailVerified: boolean
  email?: string | null
}

export interface IdentitySession {
  id: string
  token: string
  transport: 'bearer' | 'cookie'
  expiresAt: string
}

export interface IdentityBundle {
  subject: IdentitySubject
  device?: IdentityDevice | null
  account?: IdentityAccount | null
  session?: IdentitySession
  entitlements?: unknown[]
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
  purpose?: 'verify_email' | 'recover' | 'link_account' | 'admin_login'
}

export interface EmailChallengeResponse {
  ok: true
  message: string
}

export interface EmailVerifyRequest {
  token?: string
  otp?: string
}

export interface IdentityClientOptions {
  baseUrl: string
  fetch?: typeof fetch
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

  constructor(options: IdentityClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis)
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

  refreshSession(sessionToken: string): Promise<IdentityBundle> {
    return this.request<IdentityBundle>('/identity/session/refresh', {
      method: 'POST',
      headers: bearerHeaders(sessionToken)
    })
  }

  createEmailChallenge(input: EmailChallengeRequest, sessionToken?: string): Promise<EmailChallengeResponse> {
    return this.request<EmailChallengeResponse>('/identity/email/challenge', {
      method: 'POST',
      headers: sessionToken ? bearerHeaders(sessionToken) : undefined,
      body: JSON.stringify(input)
    })
  }

  verifyEmail(input: EmailVerifyRequest): Promise<IdentityBundle> {
    if (!input.token && !input.otp) throw new Error('token or otp is required')
    return this.request<IdentityBundle>('/identity/email/verify', {
      method: 'POST',
      body: JSON.stringify(input)
    })
  }

  verifyOtp(otp: string): Promise<IdentityBundle> {
    return this.verifyEmail({ otp })
  }

  async logout(sessionToken: string): Promise<void> {
    await this.request<void>('/identity/logout', {
      method: 'POST',
      headers: bearerHeaders(sessionToken)
    })
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const headers = {
      'content-type': 'application/json',
      ...(init.headers as Record<string, string> | undefined)
    }
    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers })
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
