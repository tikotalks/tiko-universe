import { describe, expect, it } from 'vitest'
import worker, { type Env } from '../workers/admin-api/src/index'

type Row = Record<string, unknown>

class MemoryResult {
  constructor(private rows: Row[] = []) {}
  async first<T = Row>(): Promise<T | null> { return (this.rows[0] as T | undefined) ?? null }
  async all<T = Row>(): Promise<{ results: T[] }> { return { results: this.rows as T[] } }
  async run(): Promise<{ success: true }> { return { success: true } }
}

class MemoryStatement {
  private values: unknown[] = []
  constructor(private db: AdminMemoryD1, private sql: string) {}
  bind(...values: unknown[]) { this.values = values; return this }
  first<T = Row>() { return this.db.execute(this.sql, this.values).first<T>() }
  all<T = Row>() { return this.db.execute(this.sql, this.values).all<T>() }
  run() { return this.db.execute(this.sql, this.values).run() }
}

class AdminMemoryD1 {
  subjects = new Map<string, Row>()
  accounts = new Map<string, Row>()
  sessions: Row[] = []
  roles: Row[] = []
  managedCredentials: Row[] = []
  auditEvents: Row[] = []
  apiKeys: Row[] = []
  entitlements: Row[] = []
  emailChallenges: Row[] = []
  devices: Row[] = []
  appSettings = new Set<string>()
  appState = new Set<string>()
  appProgress = new Set<string>()
  appConfig = new Map<string, Row>()
  appDefaults = new Map<string, Row>()
  serviceConfig = new Map<string, Row>()
  failIdentityDeleteFor = new Set<string>()
  prepare(sql: string) { return new MemoryStatement(this, sql) }
  async batch(statements: MemoryStatement[]): Promise<Array<{ success: true }>> {
    const results = []
    for (const statement of statements) results.push(await statement.run())
    return results
  }
  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()
    if (normalized.startsWith('SELECT app, title') && normalized.includes('FROM app_config')) {
      if (normalized.includes('WHERE app = ?')) {
        const row = this.appConfig.get(String(values[0]))
        return new MemoryResult(row ? [row] : [])
      }
      return new MemoryResult([...this.appConfig.values()])
    }
    if (normalized.startsWith('INSERT INTO app_config')) {
      const [app, title, appColor, appIcon, appIconMediaCategory, appIconImageUrl, themeColor, supportedLanguagesMode, supportedLanguagesJson, updatedAt] = values
      const key = String(app)
      const existing = this.appConfig.get(key)
      if (existing && normalized.includes('DO NOTHING')) return new MemoryResult()
      const version = existing && normalized.includes('DO UPDATE') ? Number(existing.version) + 1 : 1
      const row = {
        app,
        title,
        app_color: appColor,
        app_icon: appIcon,
        app_icon_media_category: appIconMediaCategory,
        app_icon_image_url: appIconImageUrl,
        theme_color: themeColor,
        supported_languages_mode: supportedLanguagesMode,
        supported_languages_json: supportedLanguagesJson,
        updated_at: updatedAt,
        version,
      }
      this.appConfig.set(key, row)
      return new MemoryResult(normalized.includes('RETURNING') ? [row] : [])
    }
    if (normalized.startsWith('UPDATE app_config')) {
      const [title, appColor, appIcon, appIconMediaCategory, appIconImageUrl, themeColor, supportedLanguagesMode, supportedLanguagesJson, updatedAt, app, expectedVersion] = values
      const key = String(app)
      const existing = this.appConfig.get(key)
      if (!existing || Number(existing.version) !== Number(expectedVersion)) return new MemoryResult()
      const row = {
        ...existing,
        title,
        app_color: appColor,
        app_icon: appIcon,
        app_icon_media_category: appIconMediaCategory,
        app_icon_image_url: appIconImageUrl,
        theme_color: themeColor,
        supported_languages_mode: supportedLanguagesMode,
        supported_languages_json: supportedLanguagesJson,
        updated_at: updatedAt,
        version: Number(existing.version) + 1,
      }
      this.appConfig.set(key, row)
      return new MemoryResult([row])
    }
    if (normalized.startsWith('SELECT data_json') && normalized.includes('FROM app_defaults')) {
      const row = this.appDefaults.get(`${values[0]}:${values[1]}`)
      return new MemoryResult(row ? [row] : [])
    }
    if (normalized.startsWith('INSERT INTO app_defaults')) {
      const [app, resource, dataJson, updatedAt] = values
      const key = `${app}:${resource}`
      const existing = this.appDefaults.get(key)
      if (existing && normalized.includes('DO NOTHING')) return new MemoryResult()
      const version = existing && normalized.includes('DO UPDATE') ? Number(existing.version) + 1 : 1
      const row = { app, resource, data_json: dataJson, updated_at: updatedAt, version }
      this.appDefaults.set(key, row)
      return new MemoryResult(normalized.includes('RETURNING') ? [row] : [])
    }
    if (normalized.startsWith('UPDATE app_defaults')) {
      const [dataJson, updatedAt, app, resource, expectedVersion] = values
      const key = `${app}:${resource}`
      const existing = this.appDefaults.get(key)
      if (!existing || Number(existing.version) !== Number(expectedVersion)) return new MemoryResult()
      const row = { ...existing, data_json: dataJson, updated_at: updatedAt, version: Number(existing.version) + 1 }
      this.appDefaults.set(key, row)
      return new MemoryResult([row])
    }
    if (normalized.startsWith('SELECT data_json') && normalized.includes('FROM atlas_service_config')) {
      const row = this.serviceConfig.get(String(values[0]))
      return new MemoryResult(row ? [row] : [])
    }
    if (normalized.startsWith('INSERT INTO atlas_service_config')) {
      const [service, dataJson, updatedAt] = values
      const key = String(service)
      const existing = this.serviceConfig.get(key)
      if (existing && normalized.includes('DO NOTHING')) return new MemoryResult()
      const version = existing && normalized.includes('DO UPDATE') ? Number(existing.version) + 1 : 1
      const row = { service, data_json: dataJson, updated_at: updatedAt, version }
      this.serviceConfig.set(key, row)
      return new MemoryResult(normalized.includes('RETURNING') ? [row] : [])
    }
    if (normalized.startsWith('UPDATE atlas_service_config')) {
      const [dataJson, updatedAt, service, expectedVersion] = values
      const key = String(service)
      const existing = this.serviceConfig.get(key)
      if (!existing || Number(existing.version) !== Number(expectedVersion)) return new MemoryResult()
      const row = { ...existing, data_json: dataJson, updated_at: updatedAt, version: Number(existing.version) + 1 }
      this.serviceConfig.set(key, row)
      return new MemoryResult([row])
    }
    if (normalized.startsWith('SELECT subject_id AS id, email_hash')) {
      const row = Array.from(this.accounts.values()).find((account) => account.subject_id === values[0] && !account.disabled_at)
      return new MemoryResult(row ? [{ id: row.subject_id, email_hash: row.email_hash, email_plain: row.email_plain }] : [])
    }
    if (normalized.startsWith('SELECT s.id') && normalized.includes('WHERE s.id = ?')) {
      const subjectId = String(values[1])
      const subject = this.subjects.get(subjectId)
      if (!subject || subject.disabled_at) return new MemoryResult([])
      const account = Array.from(this.accounts.values()).find((candidate) => candidate.subject_id === subject.id && !candidate.disabled_at)
      const roles = this.roles.filter((role) => role.subject_id === subject.id && role.product === 'tiko' && !role.revoked_at).map((role) => role.role).sort()
      return new MemoryResult([{
        id: subject.id,
        kind: account?.email_verified_at ? 'account' : subject.kind,
        email: account?.email_plain ?? null,
        created_at: subject.created_at,
        updated_at: subject.updated_at,
        last_seen_at: null,
        roles: JSON.stringify(roles),
        metadata_json: subject.metadata_json ?? null,
      }])
    }
    if (normalized.startsWith('SELECT s.id, MAX(COALESCE') && normalized.includes('NOT EXISTS ( SELECT 1 FROM identity_managed_credentials')) {
      const product = String(values[0] ?? 'tiko')
      const cutoff = String(values[1] ?? '')
      const rows = Array.from(this.subjects.values())
        .filter((subject) => subject.product === product && !subject.disabled_at)
        .filter((subject) => !Array.from(this.accounts.values()).some((account) => account.subject_id === subject.id && account.email_verified_at && !account.disabled_at))
        .filter((subject) => !this.managedCredentials.some((credential) => credential.product === subject.product && !credential.revoked_at && (credential.subject_id === subject.id || credential.manager_subject_id === subject.id)))
        .filter((subject) => !this.roles.some((role) => role.subject_id === subject.id && role.product === subject.product && role.role === 'child' && !role.revoked_at))
        .map((subject) => {
          const activeSessions = this.sessions.filter((session) => session.subject_id === subject.id && !session.revoked_at)
          const sessionTimes = activeSessions.map((session) => String(session.last_seen_at ?? session.created_at ?? subject.created_at))
          const lastSeen = [String(subject.created_at), ...sessionTimes].sort().at(-1) ?? null
          return { id: subject.id as string, last_seen: lastSeen }
        })
        .filter((row) => !row.last_seen || row.last_seen < cutoff)
      return new MemoryResult(rows)
    }
    if (normalized.startsWith('SELECT COUNT(DISTINCT s.id) AS count') && normalized.includes('FROM identity_subjects')) {
      const product = String(values[0] ?? 'tiko')
      const q = String(values[1] ?? '').replace(/%/g, '').toLowerCase()
      const count = this.accountBackedUserRows(product, q).length
      return new MemoryResult([{ count }])
    }
    if (normalized.startsWith('SELECT s.id') && normalized.includes('GROUP BY s.id')) {
      const product = String(values[0] ?? 'tiko')
      const q = String(values[2] ?? '').replace(/%/g, '').toLowerCase()
      const limit = Number(values[7] ?? 100)
      const offset = Number(values[8] ?? 0)
      return new MemoryResult(this.accountBackedUserRows(product, q).slice(offset, offset + limit))
    }
    if (normalized.startsWith('SELECT role FROM identity_role_assignments')) {
      const rows = this.roles.filter((role) => role.subject_id === values[0] && role.product === values[1] && !role.revoked_at)
      return new MemoryResult(rows)
    }
    if (normalized.startsWith('SELECT COUNT(*) AS count FROM identity_role_assignments')) {
      const count = this.roles.filter((role) => role.product === values[0] && role.role === values[1] && !role.revoked_at).length
      return new MemoryResult([{ count }])
    }
    if (normalized.startsWith('SELECT DISTINCT user_id FROM app_settings')) {
      const ids = new Set(values.map(String))
      const rows = new Set<string>()
      for (const id of this.appSettings) if (ids.has(id)) rows.add(id)
      for (const id of this.appState) if (ids.has(id)) rows.add(id)
      for (const id of this.appProgress) if (ids.has(id)) rows.add(id)
      return new MemoryResult(Array.from(rows).map((user_id) => ({ user_id })))
    }
    if (normalized.startsWith('INSERT INTO identity_role_assignments')) {
      const [id, subjectId, product, role, source, actorSubjectId, createdAt, revokedAt, metadataJson] = values
      if (!this.roles.some((existing) => existing.subject_id === subjectId && existing.product === product && existing.role === role && !existing.revoked_at)) {
        this.roles.push({ id, subject_id: subjectId, product, role, source, actor_subject_id: actorSubjectId, created_at: createdAt, revoked_at: revokedAt, metadata_json: metadataJson })
      }
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE identity_role_assignments SET revoked_at')) {
      const [revokedAt, subjectId, product, role] = values
      for (const assignment of this.roles) {
        if (normalized.includes('role <> ?')) {
          if (assignment.subject_id === subjectId && assignment.product === product && assignment.role !== role && !assignment.revoked_at) assignment.revoked_at = revokedAt
        } else if (assignment.subject_id === subjectId && assignment.product === product && assignment.role === role && !assignment.revoked_at) {
          assignment.revoked_at = revokedAt
        }
      }
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM app_settings WHERE user_id =')) {
      this.appSettings.delete(String(values[0]))
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM app_state WHERE user_id =')) {
      this.appState.delete(String(values[0]))
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM app_progress WHERE user_id =')) {
      this.appProgress.delete(String(values[0]))
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM identity_managed_credentials')) {
      const [subjectId, managerSubjectId] = values.map(String)
      this.managedCredentials = this.managedCredentials.filter((credential) => credential.subject_id !== subjectId && credential.manager_subject_id !== managerSubjectId)
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM identity_audit_events')) {
      const [subjectId, actorSubjectId] = values.map(String)
      this.auditEvents = this.auditEvents.filter((event) => event.subject_id !== subjectId && event.actor_subject_id !== actorSubjectId)
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM identity_api_keys')) {
      this.apiKeys = this.apiKeys.filter((key) => key.subject_id !== values[0])
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM identity_entitlements')) {
      this.entitlements = this.entitlements.filter((entitlement) => entitlement.subject_id !== values[0])
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM identity_role_assignments WHERE subject_id =')) {
      this.roles = this.roles.filter((role) => role.subject_id !== values[0])
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM identity_sessions WHERE subject_id =')) {
      this.sessions = this.sessions.filter((session) => session.subject_id !== values[0])
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM identity_email_challenges WHERE subject_id =')) {
      this.emailChallenges = this.emailChallenges.filter((challenge) => challenge.subject_id !== values[0])
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM identity_accounts WHERE subject_id =')) {
      for (const [id, account] of this.accounts) {
        if (account.subject_id === values[0]) this.accounts.delete(id)
      }
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM identity_devices WHERE subject_id =')) {
      const subjectId = String(values[0])
      if (this.failIdentityDeleteFor.has(subjectId)) throw new Error('simulated_fk_failure')
      this.devices = this.devices.filter((device) => device.subject_id !== subjectId)
      return new MemoryResult()
    }
    if (normalized.startsWith('DELETE FROM identity_subjects WHERE id =')) {
      this.subjects.delete(String(values[0]))
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT key_hash')) return new MemoryResult([])
    throw new Error(`Unhandled SQL in admin-api test fake: ${normalized}`)
  }

  private accountBackedUserRows(product: string, q: string): Row[] {
    return Array.from(this.subjects.values())
      .filter((subject) => subject.product === product && !subject.disabled_at)
      .map((subject) => {
        const account = Array.from(this.accounts.values()).find((candidate) => candidate.subject_id === subject.id && !candidate.disabled_at && candidate.email_hash)
        if (!account) return null
        const roles = this.roles.filter((role) => role.subject_id === subject.id && role.product === product && !role.revoked_at).map((role) => role.role).sort()
        const kind = account.email_verified_at ? 'account' : subject.kind
        return {
          id: subject.id,
          kind,
          email: account.email_plain ?? null,
          created_at: subject.created_at,
          updated_at: subject.updated_at,
          last_seen_at: null,
          roles: JSON.stringify(roles),
          metadata_json: subject.metadata_json ?? null,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .filter((row) => {
        const displayName = row.metadata_json ? String((JSON.parse(row.metadata_json as string) as { displayName?: string }).displayName ?? '').toLowerCase() : ''
        return !q || String(row.id).toLowerCase().includes(q) || String(row.email ?? '').toLowerCase().includes(q) || String(row.kind).toLowerCase().includes(q) || displayName.includes(q)
      })
  }
}

async function ankoreEmailHash(email: string, pepper = 'test-pepper') {
  const material = `tiko:email:${pepper}:${email.trim().toLowerCase()}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material))
  return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function identityService(subjectId: string) {
  return {
    fetch: async () => Response.json({ subject: { id: subjectId, product: 'tiko', kind: 'anonymous' }, session: { token: 'ank_test', expiresAt: '2099-01-01T00:00:00.000Z' } })
  }
}

async function makeEnv(subjectId = 'sub_admin', email = 'me@sil.mt') {
  const db = new AdminMemoryD1()
  const appDb = new AdminMemoryD1()
  db.subjects.set(subjectId, { id: subjectId, product: 'tiko', kind: 'account', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', disabled_at: null, metadata_json: '{}' })
  db.accounts.set('acc_admin', { id: 'acc_admin', subject_id: subjectId, product: 'tiko', email_hash: await ankoreEmailHash(email), email_plain: email, disabled_at: null })
  return {
    AUTH_DB: db as never,
    APP_DB: appDb as never,
    TOKEN_PEPPER: 'test-pepper',
    ADMIN_EMAIL: 'me@sil.mt',
    IDENTITY_SERVICE: identityService(subjectId)
  } as unknown as Partial<Env> & { AUTH_DB: AdminMemoryD1; APP_DB: AdminMemoryD1 }
}

async function fetchAdmin(path: string, env: Awaited<ReturnType<typeof makeEnv>>, token = 'ank_test') {
  return worker.fetch(new Request(`https://admin.test${path}`, { headers: { authorization: `Bearer ${token}` } }), env as never)
}

describe('admin-api role based access', () => {
  it('allows only configured admin origins in CORS preflight responses', async () => {
    const testEnv = await makeEnv()
    const allowed = await worker.fetch(new Request('https://admin.test/v1/admin/me', {
      method: 'OPTIONS',
      headers: { origin: 'https://admin.tikoapps.org' },
    }), testEnv as never)
    const denied = await worker.fetch(new Request('https://admin.test/v1/admin/me', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    }), testEnv as never)

    expect(allowed.status).toBe(204)
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://admin.tikoapps.org')
    expect(denied.status).toBe(403)
    expect(denied.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('bootstraps the configured first admin email into a role assignment', async () => {
    const testEnv = await makeEnv()
    const response = await fetchAdmin('/v1/admin/me', testEnv)
    const body = await response.json() as { data: { userId: string; roles: string[]; role: string } }

    expect(response.status).toBe(200)
    expect(body.data.userId).toBe('sub_admin')
    expect(body.data.role).toBe('admin')
    expect(body.data.roles).toContain('admin')
    expect(testEnv.AUTH_DB.roles).toHaveLength(1)
    expect(testEnv.AUTH_DB.roles[0]).toMatchObject({ subject_id: 'sub_admin', product: 'tiko', role: 'admin', source: 'bootstrap' })
  })

  it('allows a subject with an explicit admin role even when the email is not the bootstrap address', async () => {
    const testEnv = await makeEnv('sub_other', 'other@example.test')
    testEnv.AUTH_DB.roles.push({ id: 'role_1', subject_id: 'sub_other', product: 'tiko', role: 'admin', source: 'manual', actor_subject_id: 'sub_admin', created_at: new Date().toISOString(), revoked_at: null, metadata_json: '{}' })

    const response = await fetchAdmin('/v1/admin/me', testEnv)
    const body = await response.json() as { data: { userId: string; roles: string[]; email: string } }

    expect(response.status).toBe(200)
    expect(body.data.userId).toBe('sub_other')
    expect(body.data.email).toBe('other@example.test')
    expect(body.data.roles).toEqual(['admin'])
  })

  it('rejects valid sessions without the admin role after bootstrap mismatch', async () => {
    const testEnv = await makeEnv('sub_child', 'child@example.test')
    const response = await fetchAdmin('/v1/admin/me', testEnv)
    const body = await response.json() as { error: { code: string } }

    expect(response.status).toBe(403)
    expect(body.error.code).toBe('forbidden')
    expect(testEnv.AUTH_DB.roles).toHaveLength(0)
  })

  it('lists identity subjects with account email and active product roles', async () => {
    const testEnv = await makeEnv()
    testEnv.AUTH_DB.roles.push({ id: 'role_admin', subject_id: 'sub_admin', product: 'tiko', role: 'admin', source: 'manual', actor_subject_id: null, created_at: '2026-01-01T00:00:00.000Z', revoked_at: null, metadata_json: '{}' })
    testEnv.AUTH_DB.subjects.set('sub_child', { id: 'sub_child', product: 'tiko', kind: 'account', created_at: '2026-01-02T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z', disabled_at: null, metadata_json: '{}' })
    testEnv.AUTH_DB.accounts.set('acc_child', { id: 'acc_child', subject_id: 'sub_child', product: 'tiko', email_hash: await ankoreEmailHash('child@example.test'), email_plain: 'child@example.test', disabled_at: null })
    testEnv.AUTH_DB.roles.push({ id: 'role_child', subject_id: 'sub_child', product: 'tiko', role: 'child', source: 'manual', actor_subject_id: 'sub_admin', created_at: '2026-01-02T00:00:00.000Z', revoked_at: null, metadata_json: '{}' })

    const response = await fetchAdmin('/v1/admin/users?q=child', testEnv)
    const body = await response.json() as { data: { users: Array<{ id: string; email: string | null; roles: string[] }> } }

    expect(response.status).toBe(200)
    expect(body.data.users).toHaveLength(1)
    expect(body.data.users[0]).toMatchObject({ id: 'sub_child', email: 'child@example.test', roles: ['child'] })
  })

  it('paginates identity subject lists with metadata', async () => {
    const testEnv = await makeEnv()
    testEnv.AUTH_DB.roles.push({ id: 'role_admin', subject_id: 'sub_admin', product: 'tiko', role: 'admin', source: 'manual', actor_subject_id: null, created_at: '2026-01-01T00:00:00.000Z', revoked_at: null, metadata_json: '{}' })
    for (let index = 1; index <= 3; index += 1) {
      testEnv.AUTH_DB.subjects.set(`sub_user_${index}`, { id: `sub_user_${index}`, product: 'tiko', kind: 'account', created_at: `2026-01-0${index + 1}T00:00:00.000Z`, updated_at: `2026-01-0${index + 1}T00:00:00.000Z`, disabled_at: null, metadata_json: '{}' })
      testEnv.AUTH_DB.accounts.set(`acc_user_${index}`, { id: `acc_user_${index}`, subject_id: `sub_user_${index}`, product: 'tiko', email_hash: await ankoreEmailHash(`user${index}@example.test`), email_plain: `user${index}@example.test`, disabled_at: null })
    }

    const response = await fetchAdmin('/v1/admin/users?page=2&limit=2', testEnv)
    const body = await response.json() as { data: { users: Array<{ id: string }>; meta: { total: number; page: number; limit: number; totalPages: number } } }

    expect(response.status).toBe(200)
    expect(body.data.meta).toMatchObject({ total: 4, page: 2, limit: 2, totalPages: 2 })
    expect(body.data.users.map((user) => user.id)).toEqual(['sub_user_2', 'sub_user_3'])
  })

  it('keeps the signed-in admin visible in the default and matching user list', async () => {
    const testEnv = await makeEnv()
    testEnv.AUTH_DB.subjects.get('sub_admin')!.product = 'other'
    testEnv.AUTH_DB.roles.push({ id: 'role_admin', subject_id: 'sub_admin', product: 'tiko', role: 'admin', source: 'manual', actor_subject_id: null, created_at: '2026-01-01T00:00:00.000Z', revoked_at: null, metadata_json: '{}' })

    const defaultResponse = await fetchAdmin('/v1/admin/users', testEnv)
    const defaultBody = await defaultResponse.json() as { data: { users: Array<{ id: string; email: string | null; roles: string[] }> } }
    expect(defaultResponse.status).toBe(200)
    expect(defaultBody.data.users[0]).toMatchObject({ id: 'sub_admin', email: 'me@sil.mt', roles: ['admin'] })

    const matchingResponse = await fetchAdmin('/v1/admin/users?q=me@sil.mt', testEnv)
    const matchingBody = await matchingResponse.json() as { data: { users: Array<{ id: string; email: string | null; roles: string[] }> } }
    expect(matchingResponse.status).toBe(200)
    expect(matchingBody.data.users[0]?.id).toBe('sub_admin')

    const unrelatedResponse = await fetchAdmin('/v1/admin/users?q=child', testEnv)
    const unrelatedBody = await unrelatedResponse.json() as { data: { users: Array<{ id: string }> } }
    expect(unrelatedResponse.status).toBe(200)
    expect(unrelatedBody.data.users).toHaveLength(0)
  })

  it('uses atomic version checks for app config writes', async () => {
    const testEnv = await makeEnv()
    const write1 = await worker.fetch(new Request('https://admin.test/v1/admin/apps/config/cards', {
      method: 'PUT',
      headers: { authorization: 'Bearer ank_test', 'content-type': 'application/json' },
      body: JSON.stringify({ config: { title: 'Cards One' }, version: 0 }),
    }), testEnv as never)
    const conflict = await worker.fetch(new Request('https://admin.test/v1/admin/apps/config/cards', {
      method: 'PUT',
      headers: { authorization: 'Bearer ank_test', 'content-type': 'application/json' },
      body: JSON.stringify({ config: { title: 'Cards Two' }, version: 0 }),
    }), testEnv as never)
    const write2 = await worker.fetch(new Request('https://admin.test/v1/admin/apps/config/cards', {
      method: 'PUT',
      headers: { authorization: 'Bearer ank_test', 'content-type': 'application/json' },
      body: JSON.stringify({ config: { title: 'Cards Two' }, version: 1 }),
    }), testEnv as never)
    const body1 = await write1.json() as { data: { version: number } }
    const conflictBody = await conflict.json() as { error: { code: string } }
    const body2 = await write2.json() as { data: { config: { title: string }, version: number } }

    expect(write1.status).toBe(200)
    expect(body1.data.version).toBe(1)
    expect(conflict.status).toBe(409)
    expect(conflictBody.error.code).toBe('version_conflict')
    expect(write2.status).toBe(200)
    expect(body2.data).toMatchObject({ config: { title: 'Cards Two' }, version: 2 })
  })

  it('uses atomic version checks for Tiko settings and speech service writes', async () => {
    const testEnv = await makeEnv()
    const tiko1 = await worker.fetch(new Request('https://admin.test/v1/admin/tiko/settings', {
      method: 'PUT',
      headers: { authorization: 'Bearer ank_test', 'content-type': 'application/json' },
      body: JSON.stringify({ settings: { supportedLanguages: ['en', 'mt'] }, version: 0 }),
    }), testEnv as never)
    const tikoConflict = await worker.fetch(new Request('https://admin.test/v1/admin/tiko/settings', {
      method: 'PUT',
      headers: { authorization: 'Bearer ank_test', 'content-type': 'application/json' },
      body: JSON.stringify({ settings: { supportedLanguages: ['en'] }, version: 0 }),
    }), testEnv as never)
    const speech1 = await worker.fetch(new Request('https://admin.test/v1/admin/services/speech', {
      method: 'PUT',
      headers: { authorization: 'Bearer ank_test', 'content-type': 'application/json' },
      body: JSON.stringify({ settings: { providers: ['browser'], models: { fallback: 'local' }, narakeetVoices: {} }, version: 0 }),
    }), testEnv as never)
    const speechConflict = await worker.fetch(new Request('https://admin.test/v1/admin/services/speech', {
      method: 'PUT',
      headers: { authorization: 'Bearer ank_test', 'content-type': 'application/json' },
      body: JSON.stringify({ settings: { providers: ['browser'], models: { fallback: 'local' }, narakeetVoices: {} }, version: 0 }),
    }), testEnv as never)
    const tikoBody = await tiko1.json() as { data: { version: number } }
    const speechBody = await speech1.json() as { data: { version: number } }
    const tikoConflictBody = await tikoConflict.json() as { error: { code: string } }
    const speechConflictBody = await speechConflict.json() as { error: { code: string } }

    expect(tiko1.status).toBe(200)
    expect(tikoBody.data.version).toBe(1)
    expect(tikoConflict.status).toBe(409)
    expect(tikoConflictBody.error.code).toBe('version_conflict')
    expect(speech1.status).toBe(200)
    expect(speechBody.data.version).toBe(1)
    expect(speechConflict.status).toBe(409)
    expect(speechConflictBody.error.code).toBe('version_conflict')
  })

  it('assigns and revokes roles while preventing removal of the final active admin', async () => {
    const testEnv = await makeEnv()
    testEnv.AUTH_DB.roles.push({ id: 'role_admin', subject_id: 'sub_admin', product: 'tiko', role: 'admin', source: 'manual', actor_subject_id: null, created_at: '2026-01-01T00:00:00.000Z', revoked_at: null, metadata_json: '{}' })
    testEnv.AUTH_DB.subjects.set('sub_editor', { id: 'sub_editor', product: 'tiko', kind: 'account', created_at: '2026-01-03T00:00:00.000Z', updated_at: '2026-01-03T00:00:00.000Z', disabled_at: null, metadata_json: '{}' })

    const assignResponse = await worker.fetch(new Request('https://admin.test/v1/admin/users/sub_editor/roles', {
      method: 'POST',
      headers: { authorization: 'Bearer ank_test', 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'content_editor' })
    }), testEnv as never)
    expect(assignResponse.status).toBe(200)
    expect(testEnv.AUTH_DB.roles.some((role) => role.subject_id === 'sub_editor' && role.role === 'content_editor' && !role.revoked_at)).toBe(true)

    const setResponse = await worker.fetch(new Request('https://admin.test/v1/admin/users/sub_editor/roles', {
      method: 'PUT',
      headers: { authorization: 'Bearer ank_test', 'content-type': 'application/json' },
      body: JSON.stringify({ roles: ['profile_manager'] })
    }), testEnv as never)
    const setBody = await setResponse.json() as { data: { roles: string[] } }
    expect(setResponse.status).toBe(200)
    expect(setBody.data.roles).toEqual(['profile_manager'])
    expect(testEnv.AUTH_DB.roles.some((role) => role.subject_id === 'sub_editor' && role.role === 'content_editor' && !role.revoked_at)).toBe(false)
    expect(testEnv.AUTH_DB.roles.some((role) => role.subject_id === 'sub_editor' && role.role === 'profile_manager' && !role.revoked_at)).toBe(true)

    const revokeResponse = await worker.fetch(new Request('https://admin.test/v1/admin/users/sub_editor/roles/content_editor', {
      method: 'DELETE',
      headers: { authorization: 'Bearer ank_test' }
    }), testEnv as never)
    expect(revokeResponse.status).toBe(200)
    expect(testEnv.AUTH_DB.roles.some((role) => role.subject_id === 'sub_editor' && role.role === 'profile_manager' && !role.revoked_at)).toBe(true)

    const revokeLastAdminResponse = await worker.fetch(new Request('https://admin.test/v1/admin/users/sub_admin/roles/admin', {
      method: 'DELETE',
      headers: { authorization: 'Bearer ank_test' }
    }), testEnv as never)
    const body = await revokeLastAdminResponse.json() as { error: { code: string } }
    expect(revokeLastAdminResponse.status).toBe(409)
    expect(body.error.code).toBe('last_admin_role')

    const replaceLastAdminResponse = await worker.fetch(new Request('https://admin.test/v1/admin/users/sub_admin/roles', {
      method: 'PUT',
      headers: { authorization: 'Bearer ank_test', 'content-type': 'application/json' },
      body: JSON.stringify({ roles: ['content_editor'] })
    }), testEnv as never)
    const replaceBody = await replaceLastAdminResponse.json() as { error: { code: string } }
    expect(replaceLastAdminResponse.status).toBe(409)
    expect(replaceBody.error.code).toBe('last_admin_role')
  })

  it('scheduled cleanup skips managed children and continues after one subject fails', async () => {
    const authDb = new AdminMemoryD1()
    const appDb = new AdminMemoryD1()
    const createdAt = '2026-01-01T00:00:00.000Z'
    authDb.subjects.set('sub_fails', { id: 'sub_fails', product: 'tiko', kind: 'anonymous', created_at: createdAt, updated_at: createdAt, disabled_at: null, metadata_json: '{}' })
    authDb.subjects.set('sub_deleted', { id: 'sub_deleted', product: 'tiko', kind: 'anonymous', created_at: createdAt, updated_at: createdAt, disabled_at: null, metadata_json: '{}' })
    authDb.subjects.set('sub_child', { id: 'sub_child', product: 'tiko', kind: 'account', created_at: createdAt, updated_at: createdAt, disabled_at: null, metadata_json: '{}' })
    authDb.subjects.set('sub_manager', { id: 'sub_manager', product: 'tiko', kind: 'account', created_at: createdAt, updated_at: createdAt, disabled_at: null, metadata_json: '{}' })
    authDb.managedCredentials.push({ id: 'credential_1', subject_id: 'sub_child', manager_subject_id: 'sub_manager', product: 'tiko', revoked_at: null })
    authDb.auditEvents.push({ id: 'audit_1', subject_id: 'sub_deleted', actor_subject_id: 'sub_deleted' })
    authDb.apiKeys.push({ id: 'key_1', subject_id: 'sub_deleted' })
    authDb.entitlements.push({ id: 'entitlement_1', subject_id: 'sub_deleted' })
    authDb.failIdentityDeleteFor.add('sub_fails')
    appDb.appSettings.add('sub_fails')
    appDb.appSettings.add('sub_deleted')

    await worker.scheduled({ cron: '0 2 * * *' }, {
      AUTH_DB: authDb as never,
      APP_DB: appDb as never,
      TOKEN_PEPPER: 'test-pepper',
      IDENTITY_SERVICE: identityService('sub_admin'),
    } as never)

    expect(authDb.subjects.has('sub_fails')).toBe(true)
    expect(authDb.subjects.has('sub_deleted')).toBe(false)
    expect(authDb.subjects.has('sub_child')).toBe(true)
    expect(authDb.subjects.has('sub_manager')).toBe(true)
    expect(authDb.auditEvents).toEqual([])
    expect(authDb.apiKeys).toEqual([])
    expect(authDb.entitlements).toEqual([])
    expect(appDb.appSettings.has('sub_deleted')).toBe(false)
  })
})
