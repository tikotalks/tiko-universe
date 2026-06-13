// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Miniflare } from 'miniflare'
import worker from '../workers/app-api/src/index'

interface TestRuntime {
  mf: Miniflare
  db: D1Database
  env: {
    APP_DB: D1Database
    IDENTITY_SERVICE: { fetch(input: Request | string, init?: RequestInit): Promise<Response> }
    TOKEN_PEPPER: string
    ALLOWED_ORIGINS: string
  }
}

const runtimes: TestRuntime[] = []

async function createRuntime(): Promise<TestRuntime> {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } }',
    d1Databases: { APP_DB: 'app-api-test-db' },
  })
  const db = await mf.getD1Database('APP_DB')
  await applyAppMigrations(db)

  const runtime: TestRuntime = {
    mf,
    db,
    env: {
      APP_DB: db,
      TOKEN_PEPPER: 'test-pepper',
      ALLOWED_ORIGINS: 'https://yesno.tiko.test',
      IDENTITY_SERVICE: {
        async fetch() {
          return Response.json({
            subject: { id: 'subject-real-d1' },
            roles: ['user'],
            capabilities: {},
          })
        },
      },
    },
  }
  runtimes.push(runtime)
  return runtime
}

async function applyAppMigrations(db: D1Database) {
  const migrationsDir = join(process.cwd(), 'workers/app-api/migrations')
  const migrations = [
    '0001_app_settings_state.sql',
    '0002_app_defaults.sql',
    '0003_app_config.sql',
    '0003_app_progress.sql',
    '0004_expand_app_ids.sql',
    '0005_app_config_languages.sql',
    '0006_timer_default_presets.sql',
    '0007_type_default_prompts.sql',
    '0008_radio_default_icon_names.sql',
    '0009_todo_default_items.sql',
  ]
  for (const migration of migrations) {
    const sql = await readFile(join(migrationsDir, migration), 'utf8')
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean)

    for (const statement of statements) {
      await db.prepare(statement).run()
    }
  }
}

async function fetchJson(runtime: TestRuntime, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', headers.get('content-type') ?? 'application/json')
  const request = new Request(`https://app-api.test${path}`, {
    ...init,
    headers,
  })
  const response = await worker.fetch(request, runtime.env as never, {} as never)
  const body = response.status === 204 ? {} : await response.json() as Record<string, any>
  return { response, body }
}

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.mf.dispose()))
})

describe('app-api with real D1 migrations', () => {
  it('persists settings with real D1 constraints and optimistic concurrency', async () => {
    const runtime = await createRuntime()
    const auth = { authorization: 'Bearer session-token' }

    const initial = await fetchJson(runtime, '/v1/apps/yes-no/settings', { headers: auth })
    expect(initial.response.status).toBe(200)
    expect(initial.body).toMatchObject({ app: 'yes-no', version: 0, updatedAt: null })
    expect(initial.body.settings.spokenPrompt).toBe('Make a choice.')

    const created = await fetchJson(runtime, '/v1/apps/yes-no/settings', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ settings: { language: 'mt', colorMode: 'dark', spokenPrompt: 'Agħżel.' }, version: 0 }),
    })
    expect(created.response.status).toBe(200)
    expect(created.body.version).toBe(1)
    expect(created.body.settings).toEqual({ language: 'mt', colorMode: 'dark', spokenPrompt: 'Agħżel.' })

    const stale = await fetchJson(runtime, '/v1/apps/yes-no/settings', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ settings: { language: 'en', colorMode: 'light' }, version: 0 }),
    })
    expect(stale.response.status).toBe(409)
    expect(stale.body.error.code).toBe('version_conflict')

    const stored = await runtime.db
      .prepare('SELECT user_id, app, data_json, version FROM app_settings WHERE user_id = ? AND app = ?')
      .bind('subject-real-d1', 'yes-no')
      .first<Record<string, unknown>>()
    expect(stored).toMatchObject({ user_id: 'subject-real-d1', app: 'yes-no', version: 1 })
    expect(JSON.parse(String(stored?.data_json))).toEqual({ language: 'mt', colorMode: 'dark', spokenPrompt: 'Agħżel.' })
  })

  it('serves seeded defaults from the migrated app_defaults table', async () => {
    const runtime = await createRuntime()

    const timer = await fetchJson(runtime, '/v1/apps/defaults/timer/state')
    const todo = await fetchJson(runtime, '/v1/apps/defaults/todo/state')

    expect(timer.response.status).toBe(200)
    expect(timer.body.version).toBeGreaterThan(0)
    expect(timer.body.state.presets).toHaveLength(4)
    expect(todo.response.status).toBe(200)
    expect(todo.body.state.items[0]).toMatchObject({ id: 'morning-routine', name: 'Morning routine' })
  })
})
