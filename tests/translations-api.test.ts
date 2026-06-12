import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker from '../workers/translations-api/src/index'

type Env = {
  TRANSLATIONS_KV: MemoryKV
  LEZU_API_KEY: string
  LEZU_PROJECT_ID: string
  WEBHOOK_SECRET?: string
}

class MemoryKV {
  values = new Map<string, string>()
  deleted: string[] = []

  async get(key: string, type?: 'json') {
    const value = this.values.get(key) ?? null
    if (type === 'json') return value ? JSON.parse(value) : null
    return value
  }

  async put(key: string, value: string) {
    this.values.set(key, value)
  }

  async delete(key: string) {
    this.deleted.push(key)
    this.values.delete(key)
  }

  async list(options?: { prefix?: string }) {
    const prefix = options?.prefix ?? ''
    return {
      keys: Array.from(this.values.keys())
        .filter(name => name.startsWith(prefix))
        .map(name => ({ name })),
    }
  }
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    TRANSLATIONS_KV: new MemoryKV(),
    LEZU_API_KEY: 'lezu-key',
    LEZU_PROJECT_ID: 'project-1',
    WEBHOOK_SECRET: 'webhook-secret',
    ...overrides,
  }
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, any>>
}

describe('translations-api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exports from Lezu, caches locale bundles, and filters by app prefix', async () => {
    const env = makeEnv()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: {
        content: {
          'yesNo.appName': 'Yes No',
          'common.settings': 'Settings',
          'cards.appName': 'Cards',
        },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))

    const response = await worker.fetch(new Request('https://translations.test/v1/yes-no/en'), env)

    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toEqual({
      translations: {
        'yesNo.appName': 'Yes No',
        'common.settings': 'Settings',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(env.TRANSLATIONS_KV.values.has('locale:en')).toBe(true)

    const cached = await worker.fetch(new Request('https://translations.test/v1/cards/en'), env)
    await expect(json(cached)).resolves.toEqual({
      translations: {
        'cards.appName': 'Cards',
        'common.settings': 'Settings',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('purges cached locales with webhook or ApiKey authorization', async () => {
    const env = makeEnv()
    env.TRANSLATIONS_KV.values.set('locale:en', '{}')
    env.TRANSLATIONS_KV.values.set('locale:nl', '{}')

    const response = await worker.fetch(new Request('https://translations.test/v1/sync/en', {
      method: 'POST',
      headers: { 'X-Lezu-Webhook-Secret': 'webhook-secret' },
    }), env)

    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toEqual({ cleared: ['locale:en'] })
    expect(env.TRANSLATIONS_KV.deleted).toEqual(['locale:en'])

    const all = await worker.fetch(new Request('https://translations.test/v1/sync', {
      method: 'POST',
      headers: { Authorization: 'ApiKey lezu-key' },
    }), env)
    await expect(json(all)).resolves.toEqual({ cleared: ['locale:nl'] })
  })

  it('fails closed for webhook sync when the webhook secret is not configured', async () => {
    const env = makeEnv({ WEBHOOK_SECRET: undefined })
    env.TRANSLATIONS_KV.values.set('locale:en', '{}')

    const response = await worker.fetch(new Request('https://translations.test/v1/sync/en', {
      method: 'POST',
      headers: { 'X-Lezu-Webhook-Secret': 'anything' },
    }), env)

    expect(response.status).toBe(503)
    await expect(json(response)).resolves.toEqual({ error: 'Webhook secret is not configured' })
    expect(env.TRANSLATIONS_KV.values.has('locale:en')).toBe(true)
  })

  it('normalizes configured languages and creates missing Lezu locales', async () => {
    const env = makeEnv()
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 201 }))
      .mockResolvedValueOnce(new Response('{}', { status: 409 }))

    const response = await worker.fetch(new Request('https://translations.test/v1/languages', {
      method: 'PUT',
      headers: { Authorization: 'ApiKey lezu-key', 'content-type': 'application/json' },
      body: JSON.stringify({ languages: ['en-us', 'nl_NL', 'bad value', 'en-US'] }),
    }), env)

    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toMatchObject({
      success: true,
      languages: ['en-US', 'nl-NL'],
      created: ['en-US'],
      existing: ['nl-NL'],
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ code: 'en-US' })
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ code: 'nl-NL' })
  })
})
