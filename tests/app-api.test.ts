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
  defaults = new Map<string, Row>()
  appConfig = new Map<string, Row>()

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

    // app_defaults table (global defaults)
    if (normalized.includes('FROM app_defaults') && normalized.startsWith('SELECT data_json')) {
      const key = `${values[0]}:${values[1]}`
      const row = this.defaults.get(key)
      return new MemoryResult(row ? [row] : [])
    }
    if (normalized.startsWith('INSERT INTO app_defaults')) {
      const [app, resource, dataJson, updatedAt, version] = values
      this.defaults.set(`${app}:${resource}`, { app, resource, data_json: dataJson, updated_at: updatedAt, version })
      return new MemoryResult()
    }

    // app_config table (admin-managed app identity)
    if (normalized.includes('FROM app_config') && normalized.startsWith('SELECT app, title')) {
      if (normalized.includes('WHERE app = ?')) {
        const row = this.appConfig.get(String(values[0]))
        return new MemoryResult(row ? [row] : [])
      }
      return new MemoryResult([...this.appConfig.values()])
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
    IDENTITY_SERVICE: {
      fetch: async () => new Response(JSON.stringify({ roles: ['admin'], capabilities: { canEditContent: true } }), {
        headers: { 'content-type': 'application/json' }
      })
    },
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

  it('returns public app config with static fallbacks', async () => {
    const { response, body } = await fetchJson('/v1/apps/config')

    expect(response.status).toBe(200)
    expect(body.configs.cards).toMatchObject({ id: 'cards', title: 'Cards', appColor: 'cards' })
    expect(body.configs.talk).toMatchObject({ id: 'talk', title: 'Talk', appColor: 'talk' })
  })

  it('returns stored public app config overrides', async () => {
    const testEnv = await env()
    testEnv.APP_DB.appConfig.set('cards', {
      app: 'cards',
      title: 'Tiles',
      app_color: 'cards',
      app_icon: 'custom/icon',
      app_icon_media_category: 'custom-media',
      app_icon_image_url: null,
      theme_color: '#123456',
      updated_at: '2026-01-01T00:00:00.000Z',
      version: 2
    })

    const { response, body } = await fetchJson('/v1/apps/config/cards', {}, testEnv)

    expect(response.status).toBe(200)
    expect(body.config).toMatchObject({ id: 'cards', title: 'Tiles', appIcon: 'custom/icon', themeColor: '#123456' })
    expect(body.version).toBe(2)
  })

  it('rejects unknown apps before reading app data', async () => {
    const { response, body } = await fetchJson('/v1/apps/not-an-app/settings', { headers: auth })

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

describe('global defaults endpoints', () => {
  it('returns built-in defaults when no global defaults are stored', async () => {
    const { response, body } = await fetchJson('/v1/apps/defaults/cards/state', { headers: auth })
    const radio = await fetchJson('/v1/apps/defaults/radio/state', { headers: auth })

    expect(response.status).toBe(200)
    expect(body.version).toBe(0)
    expect(body.updatedAt).toBeNull()
    expect(body.state).toEqual({})
    expect(radio.body.state.categories.map((category: { id: string }) => category.id)).toEqual(['animals', 'stories', 'bedtime', 'songs'])
  })

  it('allows unauthenticated GET of defaults', async () => {
    const { response, body } = await fetchJson('/v1/apps/defaults/yes-no/settings')
    expect(response.status).toBe(200)
    expect(body.settings).toBeDefined()
  })

  it('writes and reads back global defaults', async () => {
    const testEnv = await env()

    const write = await fetchJson('/v1/apps/defaults/cards/state', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ state: { collections: [{ id: 'animals', title: 'Animals', tiles: [{ id: 'dog', title: 'Dog', speech: 'Dog', type: 'item' }] }] }, version: 0 })
    }, testEnv)
    expect(write.response.status).toBe(200)
    expect(write.body.version).toBe(1)
    expect(write.body.state.collections[0].title).toBe('Animals')

    const read = await fetchJson('/v1/apps/defaults/cards/state', { headers: auth }, testEnv)
    expect(read.response.status).toBe(200)
    expect(read.body.state.collections[0].tiles[0].speech).toBe('Dog')
  })

  it('requires authentication for PUT', async () => {
    const { response } = await fetchJson('/v1/apps/defaults/cards/state', {
      method: 'PUT',
      body: JSON.stringify({ state: { collections: [] }, version: 0 })
    })
    expect(response.status).toBe(401)
  })

  it('enforces version conflict on defaults', async () => {
    const testEnv = await env()

    const write1 = await fetchJson('/v1/apps/defaults/cards/state', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ state: { collections: [] }, version: 0 })
    }, testEnv)
    expect(write1.body.version).toBe(1)

    const conflict = await fetchJson('/v1/apps/defaults/cards/state', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ state: { collections: [] }, version: 0 })
    }, testEnv)
    expect(conflict.response.status).toBe(409)
  })

  it('per-user data is independent of global defaults', async () => {
    const testEnv = await env()

    await fetchJson('/v1/apps/defaults/cards/state', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ state: { collections: [{ id: 'global', title: 'Global' }] }, version: 0 })
    }, testEnv)

    await fetchJson('/v1/apps/cards/state', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ state: { collections: [{ id: 'user', title: 'User' }] }, version: 0 })
    }, testEnv)

    const global = await fetchJson('/v1/apps/defaults/cards/state', { headers: auth }, testEnv)
    const user = await fetchJson('/v1/apps/cards/state', { headers: auth }, testEnv)

    expect(global.body.state.collections[0].id).toBe('global')
    expect(user.body.state.collections[0].id).toBe('user')
  }, 15000)

  it('uses global defaults for new user app data', async () => {
    const testEnv = await env()

    await fetchJson('/v1/apps/defaults/radio/state', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ state: { categories: [{ id: 'stories', name: 'Stories', icon: 'book', color: 'purple', order: 0 }] }, version: 0 })
    }, testEnv)

    const read = await fetchJson('/v1/apps/radio/state', { headers: auth }, testEnv)

    expect(read.response.status).toBe(200)
    expect(read.body.version).toBe(0)
    expect(read.body.state.categories[0]).toMatchObject({ id: 'stories', name: 'Stories' })
  })
})
