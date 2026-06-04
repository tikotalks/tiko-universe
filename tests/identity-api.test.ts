import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { identityConfig } from '../workers/identity-api/src/index'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import { describeIdentityContract } from 'ankore/testing'

type Row = Record<string, unknown>
type JsonBody = Record<string, any>

class MemoryResult {
  constructor(private rows: Row[] = [], private meta: Record<string, unknown> = {}) {}

  first<T = Row>(): T | null {
    return (this.rows[0] as T | undefined) ?? null
  }

  all<T = Row>(): { results: T[]; success: true; meta: Record<string, unknown> } {
    return { results: this.rows as T[], success: true, meta: this.meta }
  }

  run(): { success: true; meta: Record<string, unknown> } {
    return { success: true, meta: this.meta }
  }
}

class MemoryStatement {
  private values: unknown[] = []

  constructor(private db: MemoryD1Database, private sql: string) {}

  bind(...values: unknown[]): MemoryStatement {
    this.values = values
    return this
  }

  first<T = Row>(): T | null {
    return this.db.execute(this.sql, this.values).first<T>()
  }

  all<T = Row>() {
    return this.db.execute(this.sql, this.values).all<T>()
  }

  run() {
    return this.db.execute(this.sql, this.values).run()
  }
}

class MemoryD1Database {
  subjects = new Map<string, Row>()
  devices = new Map<string, Row>()
  sessions = new Map<string, Row>()
  accounts = new Map<string, Row>()
  emailChallenges = new Map<string, Row>()
  apiKeys = new Map<string, Row>()
  entitlements = new Map<string, Row>()
  auditEvents: Row[] = []

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql)
  }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (/\b(?:users|magic_links|user_profile_events)\b/.test(normalized)) {
      throw new Error(`Legacy identity table used after Ankore swap: ${normalized}`)
    }

    if (normalized.startsWith('INSERT INTO identity_subjects')) {
      const [id, product, kind, createdAt, updatedAt, disabledAt, metadataJson] = values
      this.subjects.set(String(id), { id, product, kind, created_at: createdAt, updated_at: updatedAt, disabled_at: disabledAt, metadata_json: metadataJson })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT * FROM identity_subjects WHERE id =')) {
      const subject = this.subjects.get(String(values[0]))
      return new MemoryResult(subject ? [subject] : [])
    }

    if (normalized.startsWith('INSERT INTO identity_devices')) {
      const [id, subjectId, product, secretHash, label, userAgentHash, createdAt, lastSeenAt, revokedAt, metadataJson] = values
      this.devices.set(String(id), { id, subject_id: subjectId, product, secret_hash: secretHash, label, user_agent_hash: userAgentHash, created_at: createdAt, last_seen_at: lastSeenAt, revoked_at: revokedAt, metadata_json: metadataJson })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT * FROM identity_devices WHERE id =')) {
      const device = this.devices.get(String(values[0]))
      return new MemoryResult(device ? [device] : [])
    }
    if (normalized.startsWith('UPDATE identity_devices SET last_seen_at')) {
      const [lastSeenAt, id] = values
      Object.assign(this.devices.get(String(id)) ?? {}, { last_seen_at: lastSeenAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE identity_devices SET revoked_at')) {
      const [revokedAt, id] = values
      Object.assign(this.devices.get(String(id)) ?? {}, { revoked_at: revokedAt })
      return new MemoryResult()
    }

    if (normalized.startsWith('INSERT INTO identity_sessions')) {
      const [id, subjectId, deviceId, product, transport, tokenHash, createdAt, expiresAt, lastSeenAt, revokedAt, metadataJson] = values
      this.sessions.set(String(id), { id, subject_id: subjectId, device_id: deviceId, product, transport, token_hash: tokenHash, created_at: createdAt, expires_at: expiresAt, last_seen_at: lastSeenAt, revoked_at: revokedAt, metadata_json: metadataJson })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT * FROM identity_sessions WHERE token_hash =')) {
      const session = [...this.sessions.values()].find((row) => row.token_hash === values[0])
      return new MemoryResult(session ? [session] : [])
    }
    if (normalized.startsWith('UPDATE identity_sessions SET last_seen_at')) {
      const [lastSeenAt, id] = values
      Object.assign(this.sessions.get(String(id)) ?? {}, { last_seen_at: lastSeenAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE identity_sessions SET revoked_at')) {
      const [revokedAt, id] = values
      Object.assign(this.sessions.get(String(id)) ?? {}, { revoked_at: revokedAt })
      return new MemoryResult()
    }

    if (normalized.startsWith('INSERT INTO identity_accounts')) {
      const [id, subjectId, product, emailHash, emailPlain, emailVerifiedAt, createdAt, updatedAt, disabledAt, metadataJson] = values
      this.accounts.set(String(id), { id, subject_id: subjectId, product, email_hash: emailHash, email_plain: emailPlain, email_verified_at: emailVerifiedAt, created_at: createdAt, updated_at: updatedAt, disabled_at: disabledAt, metadata_json: metadataJson })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT * FROM identity_accounts WHERE subject_id =')) {
      const account = [...this.accounts.values()].find((row) => row.subject_id === values[0] && !row.disabled_at)
      return new MemoryResult(account ? [account] : [])
    }
    if (normalized.startsWith('SELECT * FROM identity_accounts WHERE product =')) {
      const account = [...this.accounts.values()].find((row) => row.product === values[0] && row.email_hash === values[1] && !row.disabled_at)
      return new MemoryResult(account ? [account] : [])
    }
    if (normalized.startsWith('UPDATE identity_accounts SET email_verified_at')) {
      const [verifiedAt, updatedAt, id] = values
      Object.assign(this.accounts.get(String(id)) ?? {}, { email_verified_at: verifiedAt, updated_at: updatedAt })
      return new MemoryResult()
    }

    if (normalized.startsWith('INSERT INTO identity_email_challenges')) {
      const [id, subjectId, accountId, product, purpose, emailHash, tokenHash, otpHash, createdAt, expiresAt, consumedAt, attemptCount, metadataJson] = values
      this.emailChallenges.set(String(id), { id, subject_id: subjectId, account_id: accountId, product, purpose, email_hash: emailHash, token_hash: tokenHash, otp_hash: otpHash, created_at: createdAt, expires_at: expiresAt, consumed_at: consumedAt, attempt_count: attemptCount, metadata_json: metadataJson })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT * FROM identity_email_challenges WHERE token_hash =')) {
      const challenge = [...this.emailChallenges.values()].find((row) => row.token_hash === values[0])
      return new MemoryResult(challenge ? [challenge] : [])
    }
    if (normalized.startsWith('SELECT * FROM identity_email_challenges WHERE otp_hash =')) {
      const challenge = [...this.emailChallenges.values()].find((row) => row.otp_hash === values[0])
      return new MemoryResult(challenge ? [challenge] : [])
    }
    if (normalized.startsWith('UPDATE identity_email_challenges SET consumed_at')) {
      const [consumedAt, id] = values
      Object.assign(this.emailChallenges.get(String(id)) ?? {}, { consumed_at: consumedAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE identity_email_challenges SET attempt_count')) {
      const [id] = values
      const row = this.emailChallenges.get(String(id))
      if (row) row.attempt_count = Number(row.attempt_count ?? 0) + 1
      return new MemoryResult()
    }

    if (normalized.startsWith('SELECT * FROM identity_entitlements WHERE subject_id =')) {
      const entitlements = [...this.entitlements.values()].filter((row) => row.subject_id === values[0] && !row.revoked_at)
      return new MemoryResult(entitlements)
    }
    if (normalized.startsWith('INSERT INTO identity_entitlements')) {
      const [id, subjectId, product, key, valueJson, source, createdAt, expiresAt, revokedAt] = values
      this.entitlements.set(String(id), { id, subject_id: subjectId, product, key, value_json: valueJson, source, created_at: createdAt, expires_at: expiresAt, revoked_at: revokedAt })
      return new MemoryResult()
    }

    if (normalized.startsWith('INSERT INTO identity_api_keys')) {
      const [id, subjectId, product, name, keyHash, keyPrefix, scopesJson, createdAt, expiresAt, lastUsedAt, revokedAt] = values
      this.apiKeys.set(String(id), { id, subject_id: subjectId, product, name, key_hash: keyHash, key_prefix: keyPrefix, scopes_json: scopesJson, created_at: createdAt, expires_at: expiresAt, last_used_at: lastUsedAt, revoked_at: revokedAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT * FROM identity_api_keys WHERE key_hash =')) {
      const key = [...this.apiKeys.values()].find((row) => row.key_hash === values[0])
      return new MemoryResult(key ? [key] : [])
    }
    if (normalized.startsWith('SELECT * FROM identity_api_keys WHERE subject_id =')) {
      const keys = [...this.apiKeys.values()].filter((row) => row.subject_id === values[0] && !row.revoked_at)
      return new MemoryResult(keys)
    }
    if (normalized.startsWith('UPDATE identity_api_keys SET revoked_at')) {
      const [revokedAt, id, subjectId] = values
      const row = this.apiKeys.get(String(id))
      if (row && row.subject_id === subjectId) row.revoked_at = revokedAt
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE identity_api_keys SET last_used_at')) {
      const [lastUsedAt, id] = values
      Object.assign(this.apiKeys.get(String(id)) ?? {}, { last_used_at: lastUsedAt })
      return new MemoryResult()
    }

    if (normalized.startsWith('INSERT INTO identity_audit_events')) {
      const [id, subjectId, actorSubjectId, product, type, createdAt, ipHash, userAgentHash, metadataJson] = values
      this.auditEvents.push({ id, subject_id: subjectId, actor_subject_id: actorSubjectId, product, type, created_at: createdAt, ip_hash: ipHash, user_agent_hash: userAgentHash, metadata_json: metadataJson })
      return new MemoryResult()
    }

    throw new Error(`Unhandled SQL in Ankore test fake: ${normalized}`)
  }
}

function env(db = new MemoryD1Database()) {
  return {
    IDENTITY_DB: db,
    TOKEN_PEPPER: 'test-pepper',
    MAGIC_LINK_BASE_URL: 'https://example.test/magic',
    ALLOWED_ORIGINS: 'https://app.tiko.test,https://yesno.tikoapps.org,https://cards.tikoapps.org,tiko://native',
    MAGIC_LINK_TEST_SINK: [] as Array<{ email: string; token: string; otp: string; url: string; webUrl: string }>
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

async function fetchJson(path: string, init: RequestInit = {}, testEnv = env()) {
  const request = new Request(`https://identity.test${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }
  })
  const response = await worker.fetch(request, testEnv as never, {} as never)
  const body = response.status === 204 ? {} : await response.json().catch(() => ({})) as JsonBody
  return { response, body, env: testEnv }
}

describeIdentityContract('identity-api published Ankore contract', { config: identityConfig, tokenPepper: 'test-pepper' })

describe('identity-api Ankore contract', () => {
  it('normalizes the Tiko identity contract through the published Ankore package', () => {
    expect(identityConfig.product).toBe('tiko')
    expect(identityConfig.databaseBinding).toBe('IDENTITY_DB')
    expect(identityConfig.basePath).toBe('/v1/identity')
    expect(identityConfig.tablePrefix).toBe('identity_')
    expect(identityConfig.session).toMatchObject({ bearer: true, cookie: true, ttlDays: 180, rotateOnRefresh: true, cookieName: 'tiko_session' })
    expect(identityConfig.device).toMatchObject({ required: true, autoCreateSubject: true })
    expect(identityConfig.email).toMatchObject({ enabled: true, storage: 'hash', purposes: ['recover'] })
    expect(identityConfig.cors.allowedOrigins).toContain('https://admin.tikoapps.org')
    expect(identityConfig.cors.allowedOrigins).toContain('tiko://native')
  })
})

describe('identity-api endpoints', () => {
  it('allows only configured origins in CORS preflight responses', async () => {
    const allowed = await fetchJson('/v1/identity/device', {
      method: 'OPTIONS',
      headers: { origin: 'https://app.tiko.test' }
    })
    const denied = await fetchJson('/v1/identity/device', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' }
    })

    expect(allowed.response.status).toBe(204)
    expect(allowed.response.headers.get('access-control-allow-origin')).toBe('https://app.tiko.test')
    expect(denied.response.status).toBe(403)
    expect(denied.response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('bootstraps a device subject through Ankore and stores only Ankore identity rows', async () => {
    const testEnv = env()
    const { response, body } = await fetchJson('/v1/identity/device', {
      method: 'POST',
      body: JSON.stringify({ device: { name: 'Kitchen iPad', platform: 'ios' } })
    }, testEnv)

    expect(response.status).toBe(201)
    const bundle = body as IdentityBundle
    expect(bundle.subject.kind).toBe('anonymous')
    expect(bundle.session?.token).toMatch(/^ank_/)

    const db = testEnv.IDENTITY_DB
    expect(db.subjects.size).toBe(1)
    expect(db.devices.size).toBe(1)
    expect(db.sessions.size).toBe(1)
    const storedSession = [...db.sessions.values()][0]
    const storedDevice = [...db.devices.values()][0]
    expect(storedSession.token_hash).not.toBe(bundle.session?.token)
    expect(String(storedSession.token_hash)).toMatch(/^sha256:/)
    expect(String(storedDevice.secret_hash)).toMatch(/^sha256:/)
  })

  it('sets a shared tikoapps.org HttpOnly session cookie on browser identity hosts', async () => {
    const testEnv = env()
    const request = new Request('https://id.tikoapps.org/v1/identity/device', {
      method: 'POST',
      headers: { origin: 'https://yesno.tikoapps.org', 'content-type': 'application/json' },
      body: JSON.stringify({ device: { platform: 'web' } })
    })

    const response = await worker.fetch(request, testEnv as never, {} as never)
    const body = await response.json() as IdentityBundle
    const cookie = response.headers.get('set-cookie') ?? ''

    expect(response.status).toBe(201)
    expect(body.session?.token).toMatch(/^ank_/)
    expect(cookie).toContain('tiko_session=')
    expect(cookie).toContain('Domain=.tikoapps.org')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(response.headers.get('access-control-allow-origin')).toBe('https://yesno.tikoapps.org')
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('restores a browser session from the shared tikoapps.org cookie without bearer auth', async () => {
    const testEnv = env()
    const created = await worker.fetch(new Request('https://id.tikoapps.org/v1/identity/device', {
      method: 'POST',
      headers: { origin: 'https://yesno.tikoapps.org', 'content-type': 'application/json' },
      body: JSON.stringify({ device: { platform: 'web' } })
    }), testEnv as never, {} as never)
    const createdBundle = await created.json() as IdentityBundle
    const cookie = created.headers.get('set-cookie')?.split(';')[0] ?? ''

    const restored = await worker.fetch(new Request('https://id.tikoapps.org/v1/identity/session', {
      headers: { origin: 'https://cards.tikoapps.org', cookie }
    }), testEnv as never, {} as never)
    const restoredBundle = await restored.json() as IdentityBundle

    expect(restored.status).toBe(200)
    expect(restoredBundle.subject.id).toBe(createdBundle.subject.id)
  })

  it('restores the same device with device credentials and creates a fresh session', async () => {
    const testEnv = env()
    const first = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const firstBundle = first.body as IdentityBundle

    const second = await fetchJson('/v1/identity/device', {
      method: 'POST',
      body: JSON.stringify({ device: { id: firstBundle.device?.id, secret: firstBundle.device?.secret } })
    }, testEnv)
    const secondBundle = second.body as IdentityBundle

    expect(second.response.status).toBe(200)
    expect(secondBundle.subject.id).toBe(firstBundle.subject.id)
    expect(secondBundle.device?.id).toBe(firstBundle.device?.id)
    expect(secondBundle.session?.token).not.toBe(firstBundle.session?.token)
  })

  it('looks up, refreshes, and logs out bearer sessions through Ankore', async () => {
    const testEnv = env()
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const token = (created.body as IdentityBundle).session?.token ?? ''

    const lookedUp = await fetchJson('/v1/identity/session', { headers: { authorization: `Bearer ${token}` } }, testEnv)
    expect(lookedUp.response.status).toBe(200)
    expect((lookedUp.body as IdentityBundle).subject.id).toBe((created.body as IdentityBundle).subject.id)

    const refreshed = await fetchJson('/v1/identity/session/refresh', { method: 'POST', headers: { authorization: `Bearer ${token}` } }, testEnv)
    expect(refreshed.response.status).toBe(200)
    const refreshedToken = (refreshed.body as IdentityBundle).session?.token ?? ''
    expect(refreshedToken).not.toBe(token)
    expect((await fetchJson('/v1/identity/session', { headers: { authorization: `Bearer ${token}` } }, testEnv)).response.status).toBe(401)

    const loggedOut = await fetchJson('/v1/identity/logout', { method: 'POST', headers: { authorization: `Bearer ${refreshedToken}` } }, testEnv)
    expect(loggedOut.response.status).toBe(204)

    const afterLogout = await fetchJson('/v1/identity/session', { headers: { authorization: `Bearer ${refreshedToken}` } }, testEnv)
    expect(afterLogout.response.status).toBe(401)
    expect(afterLogout.body.error).toBe('invalid_session')
  })

  it('always returns a generic response for recovery email requests', async () => {
    const testEnv = env()
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const token = (created.body as IdentityBundle).session?.token ?? ''

    const known = await fetchJson('/v1/identity/email/challenge', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'caregiver@example.test', purpose: 'recover' })
    }, testEnv)
    const unknown = await fetchJson('/v1/identity/email/challenge', {
      method: 'POST',
      body: JSON.stringify({ email: 'other@example.test', purpose: 'recover' })
    }, testEnv)

    expect(known.response.status).toBe(202)
    expect(unknown.response.status).toBe(202)
    expect(known.body).toEqual(unknown.body)
    expect(known.body.ok).toBe(true)
    expect(known.body.message).not.toMatch(/exist|found|missing/i)
  })

  it('requests magic-link delivery through communication-api from Ankore email challenges', async () => {
    const communicationFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { accepted: true, messageId: 'msg_1' } }), { status: 202 }))
    const testEnv = { ...env(), COMMUNICATION_API_URL: 'https://communication.test/v1/communication', COMMUNICATION_API_KEY: 'comm_test_key' }
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const token = (created.body as IdentityBundle).session?.token ?? ''

    const response = await fetchJson('/v1/identity/email/challenge', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'caregiver@example.test', purpose: 'recover' })
    }, testEnv)

    expect(response.response.status).toBe(202)
    expect(communicationFetch).toHaveBeenCalledTimes(1)
    expect(communicationFetch).toHaveBeenCalledWith('https://communication.test/v1/communication/email/magic-link', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        authorization: 'Bearer comm_test_key',
        'content-type': 'application/json'
      })
    }))
    const body = JSON.parse(String((communicationFetch.mock.calls[0][1] as RequestInit).body))
    expect(body).toMatchObject({ to: 'caregiver@example.test' })
    expect(body.magicLinkUrl).toContain(testEnv.MAGIC_LINK_TEST_SINK[0]?.token)
    expect(body.otp).toBe(testEnv.MAGIC_LINK_TEST_SINK[0]?.otp)
    expect(body.otp).toMatch(/^\d{6}$/)
  })

  it('verifies magic link token and OTP through Ankore and consumes challenges', async () => {
    const testEnv = env()
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const token = (created.body as IdentityBundle).session?.token ?? ''
    await fetchJson('/v1/identity/email/challenge', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'caregiver@example.test', purpose: 'recover' })
    }, testEnv)
    const magicToken = testEnv.MAGIC_LINK_TEST_SINK[0]?.token ?? ''

    const bad = await fetchJson('/v1/identity/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'bad-token' })
    }, testEnv)
    expect(bad.response.status).toBe(400)
    expect(bad.body.error).toBe('invalid_or_expired_challenge')

    const good = await fetchJson('/v1/identity/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: magicToken })
    }, testEnv)
    expect(good.response.status).toBe(200)
    expect((good.body as IdentityBundle).account?.emailVerified).toBe(true)

    const replay = await fetchJson('/v1/identity/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: magicToken })
    }, testEnv)
    expect(replay.response.status).toBe(400)

    await fetchJson('/v1/identity/email/challenge', {
      method: 'POST',
      body: JSON.stringify({ email: 'otp@example.test', purpose: 'recover' })
    }, testEnv)
    const otp = testEnv.MAGIC_LINK_TEST_SINK[1]?.otp ?? ''
    const otpGood = await fetchJson('/v1/identity/email/verify', {
      method: 'POST',
      body: JSON.stringify({ otp })
    }, testEnv)
    expect(otpGood.response.status).toBe(200)
  })
})

describe('@tiko/identity client', () => {
  it('calls the shared identity contracts with bearer sessions', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const client = new IdentityClient({
      baseUrl: 'https://identity.test/v1',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} })
        return new Response(JSON.stringify({ subject: { id: 'sub_1', kind: 'anonymous', product: 'tiko' }, device: { id: 'dev_1' }, session: { id: 'ses_1', token: 'tok_1', transport: 'bearer', expiresAt: '2030-01-01T00:00:00.000Z' } }), { status: 200 })
      }
    })

    await client.getSession('session-token')

    expect(calls[0].url).toBe('https://identity.test/v1/identity/session')
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer session-token')
  })

  it('can call browser cookie session contracts with credentials included and no bearer token', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const client = new IdentityClient({
      baseUrl: 'https://id.tikoapps.org/v1',
      credentials: 'include',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} })
        return new Response(JSON.stringify({ subject: { id: 'sub_1', kind: 'anonymous', product: 'tiko' }, device: { id: 'dev_1' }, session: { id: 'ses_1', token: 'tok_1', transport: 'cookie', expiresAt: '2030-01-01T00:00:00.000Z' } }), { status: 200 })
      }
    })

    await client.getCookieSession()

    expect(calls[0].url).toBe('https://id.tikoapps.org/v1/identity/session')
    expect(calls[0].init.credentials).toBe('include')
    expect((calls[0].init.headers as Record<string, string>).authorization).toBeUndefined()
  })
})
