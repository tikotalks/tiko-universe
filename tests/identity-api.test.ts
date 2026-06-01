import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { hashToken } from '../workers/identity-api/src/index'
import { IdentityClient, type SessionBundle } from '@tiko/identity'

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
  users = new Map<string, Row>()
  devices = new Map<string, Row>()
  sessions = new Map<string, Row>()
  magicLinks = new Map<string, Row>()
  events: Row[] = []

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql)
  }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.startsWith('INSERT INTO users')) {
      const [id, kind, emailHash, displayName, createdAt, updatedAt] = values
      this.users.set(String(id), { id, kind, email_hash: emailHash, display_name: displayName, created_at: createdAt, updated_at: updatedAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE users SET kind')) {
      const [kind, emailHash, updatedAt, id] = values
      Object.assign(this.users.get(String(id)) ?? {}, { kind, email_hash: emailHash, updated_at: updatedAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT id, kind, email_hash, display_name FROM users WHERE id =')) {
      const user = this.users.get(String(values[0]))
      return new MemoryResult(user ? [user] : [])
    }
    if (normalized.startsWith('SELECT id, kind, email_hash, display_name FROM users WHERE email_hash =')) {
      const user = [...this.users.values()].find((row) => row.email_hash === values[0])
      return new MemoryResult(user ? [user] : [])
    }

    if (normalized.startsWith('INSERT INTO devices')) {
      const [id, userId, deviceSecretHash, name, platform, createdAt, lastSeenAt] = values
      this.devices.set(String(id), { id, user_id: userId, device_secret_hash: deviceSecretHash, name, platform, created_at: createdAt, last_seen_at: lastSeenAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE devices SET last_seen_at')) {
      const [lastSeenAt, name, platform, id] = values
      Object.assign(this.devices.get(String(id)) ?? {}, { last_seen_at: lastSeenAt, name, platform })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT id, user_id, device_secret_hash, name FROM devices WHERE id =')) {
      const device = this.devices.get(String(values[0]))
      return new MemoryResult(device ? [device] : [])
    }

    if (normalized.startsWith('INSERT INTO sessions')) {
      const [id, userId, deviceId, tokenHash, expiresAt, createdAt, lastSeenAt, revokedAt] = values
      this.sessions.set(String(id), { id, user_id: userId, device_id: deviceId, token_hash: tokenHash, expires_at: expiresAt, created_at: createdAt, last_seen_at: lastSeenAt, revoked_at: revokedAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE sessions SET revoked_at')) {
      const [revokedAt, tokenHash] = values
      const session = [...this.sessions.values()].find((row) => row.token_hash === tokenHash)
      if (session) session.revoked_at = revokedAt
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT s.id AS session_id')) {
      const tokenHash = values[0]
      const now = values[1]
      const session = [...this.sessions.values()].find((row) => row.token_hash === tokenHash && !row.revoked_at && String(row.expires_at) > String(now))
      if (!session) return new MemoryResult()
      const user = this.users.get(String(session.user_id))!
      const device = this.devices.get(String(session.device_id))!
      return new MemoryResult([{ session_id: session.id, user_id: user.id, user_kind: user.kind, email_hash: user.email_hash, display_name: user.display_name, device_id: device.id, device_name: device.name, expires_at: session.expires_at }])
    }

    if (normalized.startsWith('INSERT INTO magic_links')) {
      const [id, userId, emailHash, tokenHash, otpHash, purpose, expiresAt, createdAt, consumedAt] = values
      this.magicLinks.set(String(id), { id, user_id: userId, email_hash: emailHash, token_hash: tokenHash, otp_hash: otpHash, purpose, expires_at: expiresAt, created_at: createdAt, consumed_at: consumedAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE magic_links SET consumed_at')) {
      const [consumedAt, hashValue] = values
      const link = [...this.magicLinks.values()].find(
        (row) => row.token_hash === hashValue || row.otp_hash === hashValue
      )
      if (link) link.consumed_at = consumedAt
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT id, user_id, email_hash, otp_hash FROM magic_links WHERE otp_hash')) {
      const otpHash = values[0]
      const now = values[1]
      const link = [...this.magicLinks.values()].find((row) => row.otp_hash === otpHash && !row.consumed_at && String(row.expires_at) > String(now))
      return new MemoryResult(link ? [link] : [])
    }
    if (normalized.startsWith('SELECT id, user_id, email_hash, otp_hash FROM magic_links WHERE token_hash')) {
      const tokenHash = values[0]
      const now = values[1]
      const link = [...this.magicLinks.values()].find((row) => row.token_hash === tokenHash && !row.consumed_at && String(row.expires_at) > String(now))
      return new MemoryResult(link ? [link] : [])
    }

    if (normalized.startsWith('INSERT INTO user_profile_events')) {
      this.events.push({ values })
      return new MemoryResult()
    }

    throw new Error(`Unhandled SQL in test fake: ${normalized}`)
  }
}

function env(db = new MemoryD1Database()) {
  return {
    IDENTITY_DB: db,
    TOKEN_PEPPER: 'test-pepper',
    MAGIC_LINK_BASE_URL: 'https://example.test/magic',
    ALLOWED_ORIGINS: 'https://app.tiko.test,tiko://native',
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
  const body = response.status === 204 ? {} : await response.json() as JsonBody
  return { response, body, env: testEnv }
}

describe('identity-api token handling', () => {
  it('hashes tokens with the configured pepper without returning the raw token hash', async () => {
    const token = 'plain-session-token'
    const hash = await hashToken(token, 'pepper-a')

    expect(hash).not.toBe(token)
    expect(hash).toHaveLength(64)
    expect(await hashToken(token, 'pepper-a')).toBe(hash)
    expect(await hashToken(token, 'pepper-b')).not.toBe(hash)
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

    expect(allowed.response.headers.get('access-control-allow-origin')).toBe('https://app.tiko.test')
    expect(denied.response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('bootstraps a device user and stores only hashed session/device secrets', async () => {
    const testEnv = env()
    const { response, body } = await fetchJson('/v1/identity/device', {
      method: 'POST',
      body: JSON.stringify({ device: { name: 'Kitchen iPad', platform: 'ios' } })
    }, testEnv)

    expect(response.status).toBe(200)
    const bundle = body as SessionBundle
    expect(bundle.user.kind).toBe('device')
    expect(bundle.user.recoverable).toBe(false)
    expect(bundle.device.name).toBe('Kitchen iPad')
    expect(bundle.session.token).toMatch(/^tks_/)

    const db = testEnv.IDENTITY_DB
    const storedSession = [...db.sessions.values()][0]
    const storedDevice = [...db.devices.values()][0]
    expect(storedSession.token_hash).not.toBe(bundle.session.token)
    expect(String(storedSession.token_hash)).toHaveLength(64)
    expect(storedDevice.device_secret_hash).toHaveLength(64)
  })

  it('restores the same device with device credentials and creates a fresh session', async () => {
    const testEnv = env()
    const first = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const firstBundle = first.body as SessionBundle

    const second = await fetchJson('/v1/identity/device', {
      method: 'POST',
      body: JSON.stringify({ device: { id: firstBundle.device.id, secret: firstBundle.device.secret } })
    }, testEnv)
    const secondBundle = second.body as SessionBundle

    expect(second.response.status).toBe(200)
    expect(secondBundle.user.id).toBe(firstBundle.user.id)
    expect(secondBundle.device.id).toBe(firstBundle.device.id)
    expect(secondBundle.session.token).not.toBe(firstBundle.session.token)
  })

  it('looks up and logs out bearer sessions', async () => {
    const testEnv = env()
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const token = (created.body as SessionBundle).session.token

    const lookedUp = await fetchJson('/v1/identity/session', { headers: { authorization: `Bearer ${token}` } }, testEnv)
    expect(lookedUp.response.status).toBe(200)
    expect((lookedUp.body as SessionBundle).session.token).toBe(token)

    const loggedOut = await fetchJson('/v1/identity/logout', { method: 'POST', headers: { authorization: `Bearer ${token}` } }, testEnv)
    expect(loggedOut.response.status).toBe(204)

    const afterLogout = await fetchJson('/v1/identity/session', { headers: { authorization: `Bearer ${token}` } }, testEnv)
    expect(afterLogout.response.status).toBe(401)
    expect(afterLogout.body.error.code).toBe('unauthorized')
  })

  it('always returns a generic response for recovery email requests', async () => {
    const testEnv = env()
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const token = (created.body as SessionBundle).session.token

    const known = await fetchJson('/v1/identity/email', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'caregiver@example.test' })
    }, testEnv)
    const unknown = await fetchJson('/v1/identity/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'other@example.test' })
    }, testEnv)

    expect(known.response.status).toBe(202)
    expect(unknown.response.status).toBe(202)
    expect(known.body).toEqual(unknown.body)
    expect(known.body.message).not.toMatch(/exist|found|missing/i)
  })

  it('requests known-user magic-link delivery through communication-api when configured', async () => {
    const communicationFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { accepted: true, messageId: 'msg_1' } }), { status: 202 }))
    const testEnv = { ...env(), COMMUNICATION_API_URL: 'https://communication.test/v1/communication', COMMUNICATION_API_KEY: 'comm_test_key' }
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const token = (created.body as SessionBundle).session.token

    const response = await fetchJson('/v1/identity/email', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'caregiver@example.test' })
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
    expect(body.magicLinkUrl).toContain(testEnv.MAGIC_LINK_TEST_SINK[0].token)
    expect(body.otp).toBe(testEnv.MAGIC_LINK_TEST_SINK[0].otp)
    expect(body.otp).toMatch(/^\d{6}$/)
  })

  it('does not request delivery for unknown recovery addresses', async () => {
    const communicationFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { accepted: true } }), { status: 202 }))
    const testEnv = { ...env(), COMMUNICATION_API_URL: 'https://communication.test/v1/communication', COMMUNICATION_API_KEY: 'comm_test_key' }

    const response = await fetchJson('/v1/identity/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'unknown@example.test' })
    }, testEnv)

    expect(response.response.status).toBe(202)
    expect(communicationFetch).not.toHaveBeenCalled()
  })

  it('rejects bad magic-link tokens and consumes valid tokens', async () => {
    const testEnv = env()
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const token = (created.body as SessionBundle).session.token
    await fetchJson('/v1/identity/email', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'caregiver@example.test' })
    }, testEnv)
    const magicToken = testEnv.MAGIC_LINK_TEST_SINK[0].token

    const bad = await fetchJson('/v1/identity/magic-links/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'bad-token' })
    }, testEnv)
    expect(bad.response.status).toBe(401)
    expect(bad.body.error.code).toBe('invalid_magic_link')

    const good = await fetchJson('/v1/identity/magic-links/verify', {
      method: 'POST',
      body: JSON.stringify({ token: magicToken })
    }, testEnv)
    expect(good.response.status).toBe(200)
    expect((good.body as SessionBundle).user.kind).toBe('recoverable')

    const replay = await fetchJson('/v1/identity/magic-links/verify', {
      method: 'POST',
      body: JSON.stringify({ token: magicToken })
    }, testEnv)
    expect(replay.response.status).toBe(401)
  })

  it('verifies magic link via OTP code', async () => {
    const testEnv = env()
    const created = await fetchJson('/v1/identity/device', { method: 'POST', body: JSON.stringify({}) }, testEnv)
    const token = (created.body as SessionBundle).session.token
    await fetchJson('/v1/identity/email', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'caregiver@example.test' })
    }, testEnv)
    const otp = testEnv.MAGIC_LINK_TEST_SINK[0].otp

    const good = await fetchJson('/v1/identity/magic-links/verify', {
      method: 'POST',
      body: JSON.stringify({ otp })
    }, testEnv)
    expect(good.response.status).toBe(200)
    expect((good.body as SessionBundle).user.kind).toBe('recoverable')

    const replay = await fetchJson('/v1/identity/magic-links/verify', {
      method: 'POST',
      body: JSON.stringify({ otp })
    }, testEnv)
    expect(replay.response.status).toBe(401)
  })
})

describe('@tiko/identity client', () => {
  it('calls the shared identity contracts with bearer sessions', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const client = new IdentityClient({
      baseUrl: 'https://identity.test/v1',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} })
        return new Response(JSON.stringify({ user: { id: 'usr_1', kind: 'device', recoverable: false }, device: { id: 'dev_1' }, session: { token: 'tok_1', expiresAt: '2030-01-01T00:00:00.000Z' } }), { status: 200 })
      }
    })

    await client.getSession('session-token')

    expect(calls[0].url).toBe('https://identity.test/v1/identity/session')
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer session-token')
  })
})
