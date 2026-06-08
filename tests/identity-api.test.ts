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

  run(): Promise<{ success: true; meta: Record<string, unknown> }> {
    return Promise.resolve({ success: true, meta: this.meta })
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
  roles: Row[] = []
  managedCredentials = new Map<string, Row>()
  deletionRequests = new Map<string, Row>()
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
      if (normalized.includes('WHERE subject_id =')) {
        const [revokedAt, subjectId, product] = values
        for (const row of this.devices.values()) {
          if (row.subject_id === subjectId && row.product === product && !row.revoked_at) row.revoked_at = revokedAt
        }
      } else {
        const [revokedAt, id] = values
        Object.assign(this.devices.get(String(id)) ?? {}, { revoked_at: revokedAt })
      }
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
      if (normalized.includes('WHERE subject_id =')) {
        const [revokedAt, subjectId, product] = values
        for (const row of this.sessions.values()) {
          if (row.subject_id === subjectId && row.product === product && !row.revoked_at) row.revoked_at = revokedAt
        }
      } else {
        const [revokedAt, id] = values
        Object.assign(this.sessions.get(String(id)) ?? {}, { revoked_at: revokedAt })
      }
      return new MemoryResult()
    }

    if (normalized.startsWith('UPDATE identity_subjects SET disabled_at')) {
      const [disabledAt, updatedAt, id, product] = values
      const row = this.subjects.get(String(id))
      if (row && row.product === product) Object.assign(row, { disabled_at: disabledAt, updated_at: updatedAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE identity_subjects SET metadata_json')) {
      const [metadataJson, updatedAt, id] = values
      const row = this.subjects.get(String(id))
      if (row) Object.assign(row, { metadata_json: metadataJson, updated_at: updatedAt })
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
    if (normalized.startsWith('UPDATE identity_accounts SET disabled_at')) {
      const [disabledAt, updatedAt, subjectId, product] = values
      for (const row of this.accounts.values()) {
        if (row.subject_id === subjectId && row.product === product && !row.disabled_at) Object.assign(row, { disabled_at: disabledAt, updated_at: updatedAt })
      }
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

    if (normalized.startsWith('SELECT role FROM identity_role_assignments')) {
      return new MemoryResult(this.roles.filter((row) => row.subject_id === values[0] && row.product === values[1] && !row.revoked_at))
    }
    if (normalized.startsWith('INSERT INTO identity_role_assignments')) {
      const [id, subjectId, product, role, source, actorSubjectId, createdAt, revokedAt, metadataJson] = values
      this.roles.push({ id, subject_id: subjectId, product, role, source, actor_subject_id: actorSubjectId, created_at: createdAt, revoked_at: revokedAt, metadata_json: metadataJson })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE identity_role_assignments SET revoked_at')) {
      const [revokedAt, subjectId, product] = values
      for (const row of this.roles) {
        if (row.subject_id === subjectId && row.product === product && !row.revoked_at) row.revoked_at = revokedAt
      }
      return new MemoryResult()
    }

    if (normalized.startsWith('INSERT INTO identity_managed_credentials')) {
      const [id, subjectId, managerSubjectId, product, handle, handleNorm, codeHash, displayName, createdAt, revokedAt, metadataJson] = values
      this.managedCredentials.set(String(id), { id, subject_id: subjectId, manager_subject_id: managerSubjectId, product, handle, handle_norm: handleNorm, code_hash: codeHash, display_name: displayName, created_at: createdAt, revoked_at: revokedAt, metadata_json: metadataJson })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT * FROM identity_managed_credentials WHERE product =') && normalized.includes('manager_subject_id =')) {
      const rows = Array.from(this.managedCredentials.values()).filter((credential) => credential.product === values[0] && credential.manager_subject_id === values[1] && !credential.revoked_at)
      return new MemoryResult(rows)
    }
    if (normalized.startsWith('SELECT * FROM identity_managed_credentials WHERE manager_subject_id =') && normalized.includes('subject_id =')) {
      const row = Array.from(this.managedCredentials.values()).find((credential) => credential.manager_subject_id === values[0] && credential.product === values[1] && credential.subject_id === values[2] && !credential.revoked_at)
      return new MemoryResult(row ? [row] : [])
    }
    if (normalized.startsWith('SELECT * FROM identity_managed_credentials WHERE manager_subject_id =')) {
      let rows = Array.from(this.managedCredentials.values()).filter((credential) => credential.manager_subject_id === values[0] && credential.product === values[1] && !credential.revoked_at)
      if (rows.length === 0) rows = Array.from(this.managedCredentials.values()).filter((credential) => credential.product === values[1] && !credential.revoked_at)
      return new MemoryResult(rows)
    }
    if (normalized.startsWith('SELECT * FROM identity_managed_credentials')) {
      const row = Array.from(this.managedCredentials.values()).find((credential) => credential.product === values[0] && credential.handle_norm === values[1] && !credential.revoked_at)
      return new MemoryResult(row ? [row] : [])
    }
    if (normalized.startsWith('UPDATE identity_managed_credentials SET display_name')) {
      const [displayName, metadataJson, id, managerSubjectId, product] = values
      const row = this.managedCredentials.get(String(id))
      if (row && row.manager_subject_id === managerSubjectId && row.product === product && !row.revoked_at) Object.assign(row, { display_name: displayName, metadata_json: metadataJson })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE identity_managed_credentials SET code_hash')) {
      const [codeHash, id, managerSubjectId, product] = values
      const row = this.managedCredentials.get(String(id))
      if (row && row.manager_subject_id === managerSubjectId && row.product === product && !row.revoked_at) row.code_hash = codeHash
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE identity_managed_credentials SET revoked_at')) {
      const [revokedAt, subjectId, product] = values
      for (const row of this.managedCredentials.values()) {
        if (row.subject_id === subjectId && row.product === product && !row.revoked_at) row.revoked_at = revokedAt
      }
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

    if (normalized.startsWith('INSERT INTO identity_deletion_requests')) {
      const [id, subjectId, scope, status, childAccountId, pinGrantToken, createdAt, updatedAt, completedAt, metadataJson] = values
      this.deletionRequests.set(String(id), { id, subject_id: subjectId, scope, status, child_account_id: childAccountId, pin_grant_token: pinGrantToken, created_at: createdAt, updated_at: updatedAt, completed_at: completedAt, metadata_json: metadataJson })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT * FROM identity_deletion_requests WHERE id =')) {
      const req = this.deletionRequests.get(String(values[0]))
      return new MemoryResult(req ? [req] : [])
    }
    if (normalized.startsWith('UPDATE identity_deletion_requests SET')) {
      const id = String(values[values.length - 1])
      const existing = this.deletionRequests.get(id)
      if (existing) {
        if (normalized.includes('status =')) Object.assign(existing, { status: values[0], updated_at: values[1] ?? existing.updated_at })
        if (normalized.includes('completed_at')) Object.assign(existing, { completed_at: values[0], updated_at: values[1] ?? existing.updated_at })
      }
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

async function assignTestRole(db: MemoryD1Database, subjectId: string, role: string) {
  db.roles.push({
    id: `role_test_${db.roles.length + 1}`,
    subject_id: subjectId,
    product: 'tiko',
    role,
    source: 'test',
    actor_subject_id: null,
    created_at: new Date().toISOString(),
    revoked_at: null,
    metadata_json: '{}'
  })
}

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
    expect(bundle.user).toMatchObject({
      id: bundle.subject.id,
      accountType: 'temporary',
      mode: 'parent',
      recoverable: false,
      emailVerified: false
    })
    expect(bundle.runtime).toEqual({ mode: 'parent', childModeEnabled: false, pinConfigured: false })
    expect(bundle.capabilities).toEqual({
      canVerifyEmail: true,
      canUseParentMode: true,
      canUseChildMode: false,
      canManageChildAccounts: false,
      canDeleteAccount: true,
      canEditContent: false
    })
    expect(bundle.session?.loginMethod).toBe('device')
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

  it('lets a signed-in user delete itself and revokes its sessions/devices/account rows', async () => {
    const testEnv = env()
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const bundle = created.body as IdentityBundle
    const token = bundle.session?.token ?? ''
    await fetchJson('/v1/identity/email/challenge', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'caregiver@example.test', purpose: 'recover' })
    }, testEnv)
    const magicToken = testEnv.MAGIC_LINK_TEST_SINK[0]?.token ?? ''
    const verified = await fetchJson('/v1/identity/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: magicToken })
    }, testEnv)
    const verifiedBundle = verified.body as IdentityBundle
    const verifiedToken = verifiedBundle.session?.token ?? ''
    const subjectId = verifiedBundle.subject.id

    const deleted = await fetchJson('/v1/identity/me', { method: 'DELETE', headers: { authorization: `Bearer ${verifiedToken}` } }, testEnv)

    expect(deleted.response.status).toBe(204)
    expect(testEnv.IDENTITY_DB.subjects.get(subjectId)?.disabled_at).toBeTruthy()
    expect([...testEnv.IDENTITY_DB.sessions.values()].filter((row) => row.subject_id === subjectId).every((row) => row.revoked_at)).toBe(true)
    expect([...testEnv.IDENTITY_DB.devices.values()].filter((row) => row.subject_id === subjectId).every((row) => row.revoked_at)).toBe(true)
    expect([...testEnv.IDENTITY_DB.accounts.values()].filter((row) => row.subject_id === subjectId).every((row) => row.disabled_at)).toBe(true)
    const afterDelete = await fetchJson('/v1/identity/session', { headers: { authorization: `Bearer ${verifiedToken}` } }, testEnv)
    expect(afterDelete.response.status).toBe(401)
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
    expect((good.body as IdentityBundle).user).toMatchObject({ accountType: 'verified', mode: 'parent', recoverable: true, emailVerified: true })
    expect((good.body as IdentityBundle).account?.accountType).toBe('verified')
    expect((good.body as IdentityBundle).session?.loginMethod).toBe('magic_link')

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
    expect((otpGood.body as IdentityBundle).session?.loginMethod).toBe('otp')
  })

  it('supports canonical email, OTP, and magic-link endpoint aliases over Ankore challenges', async () => {
    const testEnv = env()
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const token = (created.body as IdentityBundle).session?.token ?? ''

    const requested = await fetchJson('/v1/identity/email', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'canonical@example.test', purpose: 'recovery' })
    }, testEnv)
    expect(requested.response.status).toBe(202)
    expect(requested.body.message).not.toMatch(/exist|found|missing/i)

    const magicToken = testEnv.MAGIC_LINK_TEST_SINK[0]?.token ?? ''
    const magic = await fetchJson('/v1/identity/magic-links/verify', {
      method: 'POST',
      body: JSON.stringify({ token: magicToken })
    }, testEnv)
    expect(magic.response.status).toBe(200)
    expect((magic.body as IdentityBundle).session?.loginMethod).toBe('magic_link')
    expect((magic.body as IdentityBundle).user?.accountType).toBe('verified')

    const otpRequested = await fetchJson('/v1/identity/otp/request', {
      method: 'POST',
      body: JSON.stringify({ email: 'canonical-otp@example.test', purpose: 'login' })
    }, testEnv)
    expect(otpRequested.response.status).toBe(202)
    const otp = testEnv.MAGIC_LINK_TEST_SINK[1]?.otp ?? ''
    const otpVerified = await fetchJson('/v1/identity/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email: 'canonical-otp@example.test', code: otp, purpose: 'login' })
    }, testEnv)
    expect(otpVerified.response.status).toBe(200)
    expect((otpVerified.body as IdentityBundle).session?.loginMethod).toBe('otp')
  })

  it('enforces PIN-backed child and parent runtime modes for verified accounts', async () => {
    const testEnv = env()
    const temporary = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const temporaryToken = (temporary.body as IdentityBundle).session?.token ?? ''

    const temporaryPin = await fetchJson('/v1/identity/pin', {
      method: 'POST',
      headers: { authorization: `Bearer ${temporaryToken}` },
      body: JSON.stringify({ pin: '1234' })
    }, testEnv)
    expect(temporaryPin.response.status).toBe(403)
    expect(temporaryPin.body.error).toBe('pin_not_allowed')

    await fetchJson('/v1/identity/email', {
      method: 'POST',
      headers: { authorization: `Bearer ${temporaryToken}` },
      body: JSON.stringify({ email: 'pin@example.test', purpose: 'recovery' })
    }, testEnv)
    const magicToken = testEnv.MAGIC_LINK_TEST_SINK[0]?.token ?? ''
    const verified = await fetchJson('/v1/identity/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: magicToken })
    }, testEnv)
    expect(verified.response.status).toBe(200)
    const verifiedToken = (verified.body as IdentityBundle).session?.token ?? ''

    const enableBeforePin = await fetchJson('/v1/identity/mode/child/enable', { method: 'POST', headers: { authorization: `Bearer ${verifiedToken}` } }, testEnv)
    expect(enableBeforePin.response.status).toBe(409)
    expect(enableBeforePin.body.error).toBe('pin_required')

    const setPin = await fetchJson('/v1/identity/pin', {
      method: 'POST',
      headers: { authorization: `Bearer ${verifiedToken}` },
      body: JSON.stringify({ pin: '2468' })
    }, testEnv)
    expect(setPin.response.status).toBe(200)
    expect((setPin.body as IdentityBundle).runtime).toEqual({ mode: 'parent', childModeEnabled: false, pinConfigured: true })
    expect(JSON.stringify(testEnv.IDENTITY_DB.subjects.get((verified.body as IdentityBundle).subject.id))).not.toContain('2468')

    const enable = await fetchJson('/v1/identity/mode/child/enable', { method: 'POST', headers: { authorization: `Bearer ${verifiedToken}` } }, testEnv)
    expect(enable.response.status).toBe(200)
    expect((enable.body as IdentityBundle).runtime).toEqual({ mode: 'parent', childModeEnabled: true, pinConfigured: true })

    const child = await fetchJson('/v1/identity/mode/child', { method: 'POST', headers: { authorization: `Bearer ${verifiedToken}` } }, testEnv)
    expect(child.response.status).toBe(200)
    expect((child.body as IdentityBundle).runtime).toEqual({ mode: 'child', childModeEnabled: true, pinConfigured: true })

    const badExit = await fetchJson('/v1/identity/mode/parent', {
      method: 'POST',
      headers: { authorization: `Bearer ${verifiedToken}` },
      body: JSON.stringify({ pin: '0000' })
    }, testEnv)
    expect(badExit.response.status).toBe(403)

    const grant = await fetchJson('/v1/identity/pin/verify', {
      method: 'POST',
      headers: { authorization: `Bearer ${verifiedToken}` },
      body: JSON.stringify({ pin: '2468', purpose: 'parent_mode' })
    }, testEnv)
    expect(grant.response.status).toBe(200)
    expect(grant.body.grant.token).toMatch(/^grt_/)

    const parent = await fetchJson('/v1/identity/mode/parent', {
      method: 'POST',
      headers: { authorization: `Bearer ${verifiedToken}` },
      body: JSON.stringify({ pin: '2468' })
    }, testEnv)
    expect(parent.response.status).toBe(200)
    expect((parent.body as IdentityBundle).runtime?.mode).toBe('parent')
  })

  it('supports canonical Profile Manager child-account management endpoints', async () => {
    const testEnv = env()
    const manager = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const managerBundle = manager.body as IdentityBundle
    const managerToken = managerBundle.session?.token ?? ''

    const denied = await fetchJson('/v1/identity/child-accounts', {
      method: 'POST',
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ name: 'Nope', code: '1234' })
    }, testEnv)
    expect(denied.response.status).toBe(403)

    await assignTestRole(testEnv.IDENTITY_DB, managerBundle.subject.id, 'profile_manager')
    const invalidCode = await fetchJson('/v1/identity/child-accounts', {
      method: 'POST',
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ name: 'Mila', code: '12345' })
    }, testEnv)
    expect(invalidCode.response.status).toBe(400)

    const created = await fetchJson('/v1/identity/child-accounts', {
      method: 'POST',
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ name: 'Mila', code: '4829' })
    }, testEnv)
    expect(created.response.status).toBe(201)
    expect(testEnv.IDENTITY_DB.managedCredentials.size).toBe(1)
    const childId = created.body.child.id

    const listed = await fetchJson('/v1/identity/child-accounts', { headers: { authorization: `Bearer ${managerToken}` } }, testEnv)
    expect(listed.response.status).toBe(200)
    expect(listed.body.childAccounts).toHaveLength(1)
    expect(listed.body.childAccounts[0]).toMatchObject({ id: childId, name: 'Mila' })

    const updated = await fetchJson(`/v1/identity/child-accounts/${childId}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ name: 'Mila Updated' })
    }, testEnv)
    expect(updated.response.status).toBe(200)
    expect(updated.body.child.name).toBe('Mila Updated')

    const reset = await fetchJson(`/v1/identity/child-accounts/${childId}/code/reset`, {
      method: 'POST',
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ code: '8642' })
    }, testEnv)
    expect(reset.response.status).toBe(200)
    const storedCredential = Array.from(testEnv.IDENTITY_DB.managedCredentials.values())[0]
    expect(JSON.stringify(storedCredential)).not.toContain('8642')

    const oldCodeLogin = await fetchJson('/v1/identity/child-accounts/login', { method: 'POST', body: JSON.stringify({ name: 'Mila', code: '4829' }) }, testEnv)
    expect(oldCodeLogin.response.status).toBe(401)
    const login = await fetchJson('/v1/identity/child-accounts/login', { method: 'POST', body: JSON.stringify({ name: 'Mila', code: '8642' }) }, testEnv)
    expect(login.response.status).toBe(200)
    expect((login.body as IdentityBundle).user?.accountType).toBe('child_account')
    expect((login.body as IdentityBundle).runtime?.mode).toBe('child')

    const deleted = await fetchJson(`/v1/identity/child-accounts/${childId}`, { method: 'DELETE', headers: { authorization: `Bearer ${managerToken}` } }, testEnv)
    expect(deleted.response.status).toBe(204)
    const afterDeleteLogin = await fetchJson('/v1/identity/child-accounts/login', { method: 'POST', body: JSON.stringify({ name: 'Mila', code: '8642' }) }, testEnv)
    expect(afterDeleteLogin.response.status).toBe(401)
  })

  it('creates managed child credentials and logs the child in with a stable access code', async () => {
    const testEnv = env()
    const manager = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const managerBundle = manager.body as IdentityBundle
    const managerToken = managerBundle.session?.token ?? ''
    await assignTestRole(testEnv.IDENTITY_DB, managerBundle.subject.id, 'profile_manager')

    const created = await fetchJson('/v1/identity/child-accounts', {
      method: 'POST',
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ name: 'Mila', code: '4829', language: 'en' })
    }, testEnv)

    expect(created.response.status).toBe(201)
    expect(created.body.child).toMatchObject({ managerSubjectId: managerBundle.subject.id, handle: 'Mila', displayName: 'Mila', roles: ['child'] })
    expect(testEnv.IDENTITY_DB.roles.some((role) => role.subject_id === created.body.child.subjectId && role.role === 'child')).toBe(true)
    const storedCredential = Array.from(testEnv.IDENTITY_DB.managedCredentials.values())[0]
    expect(storedCredential.code_hash).not.toBe('4829')
    expect(String(storedCredential.code_hash)).toMatch(/^sha256:/)

    const badLogin = await fetchJson('/v1/identity/managed/login', {
      method: 'POST',
      body: JSON.stringify({ handle: 'Mila', accessCode: '0000' })
    }, testEnv)
    expect(badLogin.response.status).toBe(401)
    expect(badLogin.body.error).toBe('invalid_managed_login')

    const login = await fetchJson('/v1/identity/managed/login', {
      method: 'POST',
      body: JSON.stringify({ handle: 'Mila', accessCode: '4829' })
    }, testEnv)

    expect(login.response.status).toBe(200)
    expect(login.body.subject.id).toBe(created.body.child.subjectId)
    expect(login.body.session.token).toMatch(/^ank_/)
    expect(login.body.roles).toContain('child')
    expect(login.body.user).toMatchObject({
      id: created.body.child.subjectId,
      displayName: 'Mila',
      accountType: 'child_account',
      mode: 'child',
      recoverable: false
    })
    expect(login.body.runtime).toEqual({ mode: 'child', childModeEnabled: true, pinConfigured: false })
    expect(login.body.capabilities).toMatchObject({
      canVerifyEmail: false,
      canUseParentMode: false,
      canUseChildMode: true,
      canManageChildAccounts: false,
      canDeleteAccount: false
    })
    expect(login.body.session.loginMethod).toBe('child_code')
    expect(login.body.managed).toMatchObject({ handle: 'Mila', displayName: 'Mila', managerSubjectId: managerBundle.subject.id })
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

  it('uses canonical email, OTP, and magic-link client paths', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const client = new IdentityClient({
      baseUrl: 'https://identity.test/v1',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} })
        return new Response(JSON.stringify({
          subject: { id: 'sub_1', kind: 'anonymous', product: 'tiko' },
          user: { id: 'sub_1', accountType: 'verified', recoverable: true },
          device: null,
          session: { id: 'ses_1', token: 'tok_1', transport: 'bearer', expiresAt: '2030-01-01T00:00:00.000Z' },
          runtime: { mode: 'parent', childModeEnabled: false, pinConfigured: false },
          capabilities: { canVerifyEmail: false, canUseParentMode: true, canUseChildMode: false, canManageChildAccounts: false, canDeleteAccount: true }
        }), { status: 200 })
      }
    })

    await client.requestEmailVerification({ email: 'caregiver@example.test', purpose: 'recovery' }, 'session-token')
    await client.requestOtp({ email: 'caregiver@example.test', purpose: 'login' })
    await client.verifyMagicLink('magic-token')
    await client.verifyOtp('123456')

    expect(calls.map((call) => call.url)).toEqual([
      'https://identity.test/v1/identity/email',
      'https://identity.test/v1/identity/otp/request',
      'https://identity.test/v1/identity/magic-links/verify',
      'https://identity.test/v1/identity/otp/verify'
    ])
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer session-token')
  })
})
