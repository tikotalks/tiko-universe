import { describe, expect, it } from 'vitest'
import worker, { hashToken } from '../workers/app-api/src/index'
import { TikoDataClient, TikoDataError, type AppSettingsResponse, type YesNoSettings } from '@tiko/data'

type Row = Record<string, unknown>
type JsonBody = Record<string, any>

class MemoryResult {
  constructor(private rows: Row[] = []) {}

  first<T = Row>(): T | null {
    return (this.rows[0] as T | undefined) ?? null
  }

  all<T = Row>(): { results: T[]; success: true; meta: Record<string, unknown> } {
    return { results: this.rows as T[], success: true, meta: {} }
  }

  run(): { success: true; meta: Record<string, unknown> } {
    return { success: true, meta: {} }
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
  sessions = new Map<string, Row>()
  settings = new Map<string, Row>()
  state = new Map<string, Row>()

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql)
  }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.startsWith('SELECT s.subject_id AS user_id')) {
      const tokenHash = values[0]
      const now = values[1]
      const session = [...this.sessions.values()].find((row) => row.token_hash === tokenHash && !row.revoked_at && String(row.expires_at) > String(now))
      if (!session) return new MemoryResult()
      const subject = this.subjects.get(String(session.subject_id))
      if (!subject) return new MemoryResult()
      return new MemoryResult([{ user_id: session.subject_id, device_id: session.device_id, expires_at: session.expires_at }])
    }

    if (normalized.includes('FROM app_settings') && normalized.startsWith('SELECT data_json')) {
      const key = `${values[0]}:${values[1]}`
      const row = this.settings.get(key)
      return new MemoryResult(row ? [row] : [])
    }
    if (normalized.includes('FROM app_state') && normalized.startsWith('SELECT data_json')) {
      const key = `${values[0]}:${values[1]}`
      const row = this.state.get(key)
      return new MemoryResult(row ? [row] : [])
    }
    if (normalized.startsWith('INSERT INTO app_settings')) {
      const [userId, app, dataJson, updatedAt, version] = values
      this.settings.set(`${userId}:${app}`, { user_id: userId, app, data_json: dataJson, updated_at: updatedAt, version })
      return new MemoryResult()
    }
    if (normalized.startsWith('INSERT INTO app_state')) {
      const [userId, app, dataJson, updatedAt, version] = values
      this.state.set(`${userId}:${app}`, { user_id: userId, app, data_json: dataJson, updated_at: updatedAt, version })
      return new MemoryResult()
    }

    throw new Error(`Unhandled SQL in test fake: ${normalized}`)
  }
}

async function env() {
  const identity = new MemoryD1Database()
  identity.subjects.set('sub_1', { id: 'sub_1', kind: 'anonymous', product: 'tiko' })
  identity.sessions.set('ses_1', {
    id: 'ses_1',
    subject_id: 'sub_1',
    device_id: 'dev_1',
    token_hash: await hashToken('session-token', 'test-pepper'),
    expires_at: '2999-01-01T00:00:00.000Z',
    revoked_at: null
  })

  return {
    APP_DB: new MemoryD1Database(),
    IDENTITY_DB: identity,
    TOKEN_PEPPER: 'test-pepper',
    ALLOWED_ORIGINS: 'https://yesno.tiko.test'
  }
}

async function fetchJson(path: string, init: RequestInit = {}, testEnv?: Awaited<ReturnType<typeof env>>) {
  const request = new Request(`https://app-api.test${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }
  })
  const response = await worker.fetch(request, (testEnv ?? await env()) as never, {} as never)
  const body = response.status === 204 ? {} : await response.json() as JsonBody
  return { response, body }
}

const auth = { authorization: 'Bearer session-token' }

describe('app-api settings/state endpoints', () => {
  it('allows only configured origins in CORS preflight responses', async () => {
    const allowed = await fetchJson('/v1/apps/yes-no/settings', {
      method: 'OPTIONS',
      headers: { origin: 'https://yesno.tiko.test' }
    })
    const denied = await fetchJson('/v1/apps/yes-no/settings', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' }
    })

    expect(allowed.response.headers.get('access-control-allow-origin')).toBe('https://yesno.tiko.test')
    expect(denied.response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('rejects requests without a bearer session', async () => {
    const { response, body } = await fetchJson('/v1/apps/yes-no/settings')

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
  })

  it('rejects unknown apps before reading app data', async () => {
    const { response, body } = await fetchJson('/v1/apps/radio/settings', { headers: auth })

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('unknown_app')
  })

  it('reads app defaults for settings and state', async () => {
    const testEnv = await env()
    const settings = await fetchJson('/v1/apps/yes-no/settings', { headers: auth }, testEnv)
    const state = await fetchJson('/v1/apps/type/state', { headers: auth }, testEnv)

    expect(settings.response.status).toBe(200)
    expect(settings.body).toMatchObject({ app: 'yes-no', version: 0, updatedAt: null })
    expect(settings.body.settings.spokenPrompt).toBe('Make a choice.')
    expect(state.response.status).toBe(200)
    expect(state.body.state.completedPrompts).toEqual([])
  })

  it('writes and reads back settings and state with version increments', async () => {
    const testEnv = await env()

    const writeSettings = await fetchJson('/v1/apps/yes-no/settings', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ settings: { language: 'nl', colorMode: 'dark', spokenPrompt: 'Kies.' }, version: 0 })
    }, testEnv)
    const writeState = await fetchJson('/v1/apps/yes-no/state', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ state: { prompt: 'Ja of nee?', lastAnswer: 'yes' }, version: 0 })
    }, testEnv)
    const readSettings = await fetchJson('/v1/apps/yes-no/settings', { headers: auth }, testEnv)
    const readState = await fetchJson('/v1/apps/yes-no/state', { headers: auth }, testEnv)

    expect(writeSettings.response.status).toBe(200)
    expect(writeSettings.body.version).toBe(1)
    expect(writeState.body.version).toBe(1)
    expect(readSettings.body.settings).toEqual({ language: 'nl', colorMode: 'dark', spokenPrompt: 'Kies.' })
    expect(readState.body.state).toEqual({ prompt: 'Ja of nee?', lastAnswer: 'yes' })

    const conflict = await fetchJson('/v1/apps/yes-no/settings', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ settings: { language: 'en' }, version: 0 })
    }, testEnv)
    expect(conflict.response.status).toBe(409)
    expect(conflict.body.error.code).toBe('version_conflict')
  })

  it('rejects malformed JSON and non-object resource bodies', async () => {
    const malformed = await fetchJson('/v1/apps/yes-no/settings', {
      method: 'PUT',
      headers: auth,
      body: '{not-json'
    })
    const nonObject = await fetchJson('/v1/apps/yes-no/state', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ state: [] })
    })

    expect(malformed.response.status).toBe(400)
    expect(malformed.body.error.code).toBe('invalid_json')
    expect(nonObject.response.status).toBe(400)
    expect(nonObject.body.error.field).toBe('state')
  })
})

describe('@tiko/data client', () => {
  it('calls settings/state contracts with bearer sessions and typed payloads', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const client = new TikoDataClient({
      baseUrl: 'https://app-api.test/v1',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} })
        return new Response(JSON.stringify({ app: 'yes-no', settings: { language: 'en' }, updatedAt: null, version: 0 } satisfies AppSettingsResponse<YesNoSettings>), { status: 200 })
      }
    })

    await client.putSettings('yes-no', 'session-token', { language: 'en', colorMode: 'system' }, { version: 0 })

    expect(calls[0].url).toBe('https://app-api.test/v1/apps/yes-no/settings')
    expect(calls[0].init.method).toBe('PUT')
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer session-token')
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ settings: { language: 'en', colorMode: 'system' }, version: 0 })
  })

  it('surfaces typed API errors', async () => {
    const client = new TikoDataClient({
      baseUrl: 'https://app-api.test/v1',
      fetch: async () => new Response(JSON.stringify({ error: { code: 'version_conflict', message: 'Stored version does not match requested version.', field: 'version' } }), { status: 409 })
    })

    await expect(client.getSettings('yes-no', 'session-token')).rejects.toMatchObject({ status: 409, code: 'version_conflict', field: 'version' })
  })
})
