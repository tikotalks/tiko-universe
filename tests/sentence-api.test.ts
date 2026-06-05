import { describe, expect, it } from 'vitest'
import worker, { type Env } from '../workers/sentence-api/src/index'

class MemoryStatement {
  bind(): MemoryStatement { return this }
  first<T = unknown>(): T | null { return null }
  all<T = unknown>(): { results: T[]; success: true; meta: Record<string, unknown> } { return { results: [], success: true, meta: {} } }
  run(): { success: true; meta: Record<string, unknown> } { return { success: true, meta: {} } }
}

class MemoryD1Database {
  prepare(): MemoryStatement { return new MemoryStatement() }
}

class MemoryKVNamespace {
  async get(): Promise<string | null> { return null }
  async put(): Promise<void> {}
  async delete(): Promise<void> {}
}

const service = { fetch: async () => new Response('{}', { headers: { 'content-type': 'application/json' } }) }

function env(): Env {
  return {
    DB: new MemoryD1Database(),
    CACHE: new MemoryKVNamespace(),
    IDENTITY_SERVICE: service,
    GENERATION_SERVICE: service,
    ALLOWED_ORIGINS: 'https://talk.tiko.test,http://localhost:3066',
    TIKO_ENVIRONMENT: 'test',
  }
}

async function fetchJson(path: string, init: RequestInit = {}) {
  const request = new Request(`https://sentence-api.test${path}`, init)
  const response = await worker.fetch(request, env(), {} as never)
  const body = response.status === 204 ? {} : await response.json() as Record<string, any>
  return { response, body }
}

describe('sentence-api foundation', () => {
  it('allows only configured origins in CORS preflight responses', async () => {
    const allowed = await fetchJson('/v1/sentence/start?locale=en', {
      method: 'OPTIONS',
      headers: { origin: 'https://talk.tiko.test' },
    })
    const denied = await fetchJson('/v1/sentence/start?locale=en', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    })

    expect(allowed.response.status).toBe(204)
    expect(allowed.response.headers.get('access-control-allow-origin')).toBe('https://talk.tiko.test')
    expect(denied.response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('returns health metadata', async () => {
    const { response, body } = await fetchJson('/v1/sentence/health')

    expect(response.status).toBe(200)
    expect(body.data).toEqual({ ok: true, service: 'sentence-api', environment: 'test' })
  })

  it('requires locale for the start endpoint', async () => {
    const { response, body } = await fetchJson('/v1/sentence/start')

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('missing_locale')
  })

  it('returns a typed empty start shell until pack-backed v1a lands', async () => {
    const { response, body } = await fetchJson('/v1/sentence/start?locale=en', {
      headers: { origin: 'https://talk.tiko.test' },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://talk.tiko.test')
    expect(body).toMatchObject({
      locale: 'en',
      templates: [],
      initialCategories: [],
      initialWords: [],
      savedPhrases: [],
      stripState: { words: [], validNext: [], canComplete: false },
    })
  })

  it('returns JSON 404 and method errors', async () => {
    const missing = await fetchJson('/v1/nope')
    const wrongMethod = await fetchJson('/v1/sentence/start?locale=en', { method: 'POST' })

    expect(missing.response.status).toBe(404)
    expect(missing.body.error.code).toBe('not_found')
    expect(wrongMethod.response.status).toBe(405)
    expect(wrongMethod.body.error.code).toBe('method_not_allowed')
  })
})
