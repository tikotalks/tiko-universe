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
  accounts = new Map<string, Row>()
  roles: Row[] = []
  prepare(sql: string) { return new MemoryStatement(this, sql) }
  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()
    if (normalized.startsWith('SELECT subject_id AS id, email_hash')) {
      const row = Array.from(this.accounts.values()).find((account) => account.subject_id === values[0] && !account.disabled_at)
      return new MemoryResult(row ? [{ id: row.subject_id, email_hash: row.email_hash, email_plain: row.email_plain }] : [])
    }
    if (normalized.startsWith('SELECT role FROM identity_role_assignments')) {
      const rows = this.roles.filter((role) => role.subject_id === values[0] && role.product === values[1] && !role.revoked_at)
      return new MemoryResult(rows)
    }
    if (normalized.startsWith('SELECT 1 FROM identity_role_assignments')) {
      const row = this.roles.find((role) => role.subject_id === values[0] && role.product === values[1] && role.role === values[2] && !role.revoked_at)
      return new MemoryResult(row ? [{ ok: 1 }] : [])
    }
    if (normalized.startsWith('INSERT INTO identity_role_assignments')) {
      const [id, subjectId, product, role, source, actorSubjectId, createdAt, revokedAt, metadataJson] = values
      this.roles.push({ id, subject_id: subjectId, product, role, source, actor_subject_id: actorSubjectId, created_at: createdAt, revoked_at: revokedAt, metadata_json: metadataJson })
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
})
