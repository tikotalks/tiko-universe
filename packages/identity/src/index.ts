export type UserKind = 'device' | 'recoverable'

export interface User {
  id: string
  displayName?: string
  kind: UserKind
  recoverable: boolean
}

export interface Device {
  id: string
  name?: string
  secret?: string
}

export interface Session {
  token: string
  expiresAt: string
}

export interface SessionBundle {
  user: User
  device: Device
  session: Session
}

export interface ApiErrorEnvelope {
  error: {
    code: string
    message: string
    field?: string
    retryAfterSeconds?: number
  }
  meta?: {
    requestId?: string
  }
}

export interface DeviceBootstrapRequest {
  device?: {
    id?: string
    secret?: string
    name?: string
    platform?: string
  }
}

export interface RecoveryEmailRequest {
  email: string
}

export interface RecoveryEmailResponse {
  message: string
}

export interface MagicLinkVerifyRequest {
  token: string
}

export interface IdentityClientOptions {
  baseUrl: string
  fetch?: typeof fetch
}

export class IdentityApiError extends Error {
  readonly status: number
  readonly code: string
  readonly field?: string

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.error.message)
    this.name = 'IdentityApiError'
    this.status = status
    this.code = envelope.error.code
    this.field = envelope.error.field
  }
}

export class IdentityClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch

  constructor(options: IdentityClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.fetcher = options.fetch ?? fetch
  }

  bootstrapDevice(input: DeviceBootstrapRequest = {}): Promise<SessionBundle> {
    return this.request<SessionBundle>('/identity/device', {
      method: 'POST',
      body: JSON.stringify(input)
    })
  }

  getSession(sessionToken: string): Promise<SessionBundle> {
    return this.request<SessionBundle>('/identity/session', {
      method: 'GET',
      headers: bearerHeaders(sessionToken)
    })
  }

  requestRecoveryEmail(input: RecoveryEmailRequest, sessionToken?: string): Promise<RecoveryEmailResponse> {
    return this.request<RecoveryEmailResponse>('/identity/email', {
      method: 'POST',
      headers: sessionToken ? bearerHeaders(sessionToken) : undefined,
      body: JSON.stringify(input)
    })
  }

  verifyMagicLink(input: MagicLinkVerifyRequest): Promise<SessionBundle> {
    return this.request<SessionBundle>('/identity/magic-links/verify', {
      method: 'POST',
      body: JSON.stringify(input)
    })
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
