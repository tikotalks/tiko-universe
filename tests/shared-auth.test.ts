import { describe, expect, it } from 'vitest'
import { authenticate } from '../workers/shared/auth'

type Row = Record<string, unknown>

class MemoryStatement {
  private values: unknown[] = []

  constructor(private db: MemoryAuthDb, private sql: string) {}

  bind(...values: unknown[]): MemoryStatement {
    this.values = values
    return this
  }

  async first<T = Row>(): Promise<T | null> {
    return this.db.first<T>(this.sql, this.values)
  }

  async all(): Promise<{ results: unknown[] }> {
    return { results: [] }
  }

  async run(): Promise<unknown> {
    this.db.run(this.sql, this.values)
    return {}
  }
}

class MemoryAuthDb {
  keys = new Map<string, Row>()
  lastUsedUpdates = 0

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql)
  }

  first<T>(sql: string, values: unknown[]): T | null {
    const normalized = sql.replace(/\s+/g, ' ').trim()
    if (normalized.startsWith('SELECT id, subject_id')) {
      return (this.keys.get(String(values[0])) as T | undefined) ?? null
    }
    throw new Error(`Unhandled SQL: ${normalized}`)
  }

  run(sql: string, _values: unknown[]): void {
    const normalized = sql.replace(/\s+/g, ' ').trim()
    if (normalized.startsWith('UPDATE identity_api_keys SET last_used_at')) {
      this.lastUsedUpdates += 1
      return
    }
    throw new Error(`Unhandled SQL: ${normalized}`)
  }
}

async function hashApiKey(token: string, pepper: string): Promise<string> {
  const material = `tiko:api-key:${pepper}:${token}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material))
  return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function request(token: string): Request {
  return new Request('https://worker.test', { headers: { authorization: `Bearer ${token}` } })
}

describe('shared worker auth API keys', () => {
  it('validates hashed identity api keys and records use', async () => {
    const db = new MemoryAuthDb()
    const hash = await hashApiKey('secret-key', 'pepper')
    db.keys.set(hash, {
      id: 'key_1',
      subject_id: 'sub_service',
      name: 'Service key',
      key_hash: hash,
      scopes_json: JSON.stringify(['generation:speech']),
      expires_at: null,
      revoked_at: null,
    })

    const auth = await authenticate(request('secret-key'), { AUTH_DB: db, TOKEN_PEPPER: 'pepper' }, { scopes: ['generation:speech'] })

    expect(auth).toMatchObject({ ok: true, method: 'api_key', subjectId: 'sub_service', scopes: ['generation:speech'] })
    expect(db.lastUsedUpdates).toBe(1)
  })

  it('rejects missing scopes and missing pepper', async () => {
    const db = new MemoryAuthDb()
    const hash = await hashApiKey('limited-key', 'pepper')
    db.keys.set(hash, {
      id: 'key_1',
      subject_id: 'sub_service',
      name: 'Service key',
      key_hash: hash,
      scopes_json: JSON.stringify(['media:read']),
      expires_at: null,
      revoked_at: null,
    })

    const wrongScope = await authenticate(request('limited-key'), { AUTH_DB: db, TOKEN_PEPPER: 'pepper' }, { scopes: ['generation:speech'] })
    const missingPepper = await authenticate(request('limited-key'), { AUTH_DB: db }, { scopes: ['media:read'] })

    expect(wrongScope.ok).toBe(false)
    expect(missingPepper.ok).toBe(false)
  })

  it('resolves the api-key pepper from a Secrets Store binding', async () => {
    const db = new MemoryAuthDb()
    const hash = await hashApiKey('secret-store-key', 'secret-store-pepper')
    let secretReads = 0
    db.keys.set(hash, {
      id: 'key_secret_store',
      subject_id: 'sub_secret_store',
      name: 'Secrets Store key',
      key_hash: hash,
      scopes_json: JSON.stringify(['atlas.run']),
      expires_at: null,
      revoked_at: null,
    })

    const auth = await authenticate(request('secret-store-key'), {
      AUTH_DB: db,
      PEPPER_SECRET: {
        async get() {
          secretReads += 1
          return 'secret-store-pepper'
        },
      },
    }, { scopes: ['atlas.run'] })

    expect(auth).toMatchObject({ ok: true, method: 'api_key', subjectId: 'sub_secret_store', scopes: ['atlas.run'] })
    expect(secretReads).toBe(1)
  })
})
