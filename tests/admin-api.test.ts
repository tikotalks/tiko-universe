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
  roles: Row[] = []
  prepare(sql: string) { return new MemoryStatement(this, sql) }
  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()
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
    if (normalized.startsWith('SELECT s.id') && normalized.includes('GROUP BY s.id')) {
      const product = String(values[0] ?? 'tiko')
      const q = String(values[2] ?? '').replace(/%/g, '').toLowerCase()
      const rows = Array.from(this.subjects.values())
        .filter((subject) => subject.product === product && !subject.disabled_at)
        .map((subject) => {
          const account = Array.from(this.accounts.values()).find((candidate) => candidate.subject_id === subject.id && !candidate.disabled_at && candidate.email_hash)
          if (!account) return null
          const roles = this.roles.filter((role) => role.subject_id === subject.id && role.product === product && !role.revoked_at).map((role) => role.role).sort()
          const kind = account.email_verified_at ? 'account' : subject.kind
          const displayName = subject.metadata_json ? JSON.parse(subject.metadata_json as string).displayName ?? '' : ''
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
        .filter((row) => !q || String(row.id).toLowerCase().includes(q) || String(row.email ?? '').toLowerCase().includes(q) || String(row.kind).toLowerCase().includes(q) || (row.metadata_json && String(JSON.parse(row.metadata_json).displayName ?? '').toLowerCase().includes(q)))
      return new MemoryResult(rows)
    }
    if (normalized.startsWith('SELECT role FROM identity_role_assignments')) {
      const rows = this.roles.filter((role) => role.subject_id === values[0] && role.product === values[1] && !role.revoked_at)
      return new MemoryResult(rows)
    }
    if (normalized.startsWith('SELECT COUNT(*) AS count FROM identity_role_assignments')) {
      const count = this.roles.filter((role) => role.product === values[0] && role.role === values[1] && !role.revoked_at).length
      return new MemoryResult([{ count }])
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
        if (assignment.subject_id === subjectId && assignment.product === product && assignment.role === role && !assignment.revoked_at) assignment.revoked_at = revokedAt
      }
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT key_hash')) return new MemoryResult([])
    throw new Error(`Unhandled SQL in admin-api test fake: ${normalized}`)
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
  db.subjects.set(subjectId, { id: subjectId, product: 'tiko', kind: 'account', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', disabled_at: null, metadata_json: '{}' })
  db.accounts.set('acc_admin', { id: 'acc_admin', subject_id: subjectId, product: 'tiko', email_hash: await ankoreEmailHash(email), email_plain: email, disabled_at: null })
  return {
    AUTH_DB: db as never,
    TOKEN_PEPPER: 'test-pepper',
    ADMIN_EMAIL: 'me@sil.mt',
    IDENTITY_SERVICE: identityService(subjectId)
  } as unknown as Partial<Env> & { AUTH_DB: AdminMemoryD1 }
}

async function fetchAdmin(path: string, env: Awaited<ReturnType<typeof makeEnv>>, token = 'ank_test') {
  return worker.fetch(new Request(`https://admin.test${path}`, { headers: { authorization: `Bearer ${token}` } }), env as never)
}

describe('admin-api role based access', () => {
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

    const revokeResponse = await worker.fetch(new Request('https://admin.test/v1/admin/users/sub_editor/roles/content_editor', {
      method: 'DELETE',
      headers: { authorization: 'Bearer ank_test' }
    }), testEnv as never)
    expect(revokeResponse.status).toBe(200)
    expect(testEnv.AUTH_DB.roles.some((role) => role.subject_id === 'sub_editor' && role.role === 'content_editor' && !role.revoked_at)).toBe(false)

    const revokeLastAdminResponse = await worker.fetch(new Request('https://admin.test/v1/admin/users/sub_admin/roles/admin', {
      method: 'DELETE',
      headers: { authorization: 'Bearer ank_test' }
    }), testEnv as never)
    const body = await revokeLastAdminResponse.json() as { error: { code: string } }
    expect(revokeLastAdminResponse.status).toBe(409)
    expect(body.error.code).toBe('last_admin_role')
  })
})
