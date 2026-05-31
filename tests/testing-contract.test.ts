import { describe, expect, it } from 'vitest'
import {
  assertApiError,
  assertJsonResponse,
  bearerAuth,
  createAppSmokeChecklist,
  createDeviceSessionFixture,
  createJsonRequest,
  createTtsFallbackSmoke,
  jsonHeaders,
  mockD1,
  mockR2,
  parseJsonResponse,
  requestBuilder,
  type YesNoSmokeEvidence,
} from '@tiko/testing'

describe('@tiko/testing API contract helpers', () => {
  it('builds JSON requests with base URLs, bearer sessions, and device fixtures', async () => {
    const session = createDeviceSessionFixture({ sessionToken: 'tks_test', deviceId: 'dev_test', userId: 'usr_test' })
    const build = requestBuilder('https://identity.test/v1')

    const request = build('/identity/device', {
      method: 'POST',
      auth: bearerAuth(session.session.token),
      json: { device: { id: session.device.id, secret: session.device.secret } },
    })

    expect(request.url).toBe('https://identity.test/v1/identity/device')
    expect(request.method).toBe('POST')
    expect(request.headers.get('content-type')).toBe(jsonHeaders['content-type'])
    expect(request.headers.get('authorization')).toBe('Bearer tks_test')
    await expect(request.json()).resolves.toEqual({ device: { id: 'dev_test', secret: session.device.secret } })
  })

  it('parses JSON responses and asserts success and error envelopes', async () => {
    const ok = await parseJsonResponse(new Response(JSON.stringify({ data: { ok: true }, meta: { schemaVersion: 1 } }), { status: 201 }))
    assertJsonResponse(ok, 201)
    expect(ok.body).toEqual({ data: { ok: true }, meta: { schemaVersion: 1 } })

    const error = await parseJsonResponse(new Response(JSON.stringify({ error: { code: 'missing_text', message: 'Text is required.', field: 'text' } }), { status: 400 }))
    assertApiError(error, { status: 400, code: 'missing_text', field: 'text' })
  })

  it('provides Cloudflare-style D1 and R2 mocks for contract tests without deployed resources', async () => {
    const db = mockD1({
      handlers: [
        {
          match: /SELECT value FROM settings WHERE id = \?/,
          rows: ({ values }) => [{ id: values[0], value: 'stored' }],
        },
        {
          match: /INSERT INTO settings/,
          run: ({ values }) => ({ meta: { insertedId: values[0] } }),
        },
      ],
    })

    const selected = await db.prepare('SELECT value FROM settings WHERE id = ?').bind('yes-no').first<{ value: string }>()
    const inserted = await db.prepare('INSERT INTO settings VALUES (?)').bind('yes-no').run()

    expect(selected?.value).toBe('stored')
    expect(inserted.meta.insertedId).toBe('yes-no')
    expect(db.history.map((entry) => entry.sql)).toEqual([
      'SELECT value FROM settings WHERE id = ?',
      'INSERT INTO settings VALUES (?)',
    ])

    const bucket = mockR2()
    await bucket.put('audio/test.mp3', new Uint8Array([1, 2, 3]), { httpMetadata: { contentType: 'audio/mpeg' } })
    const object = await bucket.get('audio/test.mp3')
    expect(object?.httpMetadata?.contentType).toBe('audio/mpeg')
    expect(new Uint8Array(await object!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })
})

describe('@tiko/testing Yes-No smoke helpers', () => {
  it('creates a Yes-No proof-app smoke checklist with hard yes/no outcomes', () => {
    const evidence: YesNoSmokeEvidence = {
      appRenderedWithoutLoginWall: true,
      deviceBootstrapRequest: createJsonRequest('https://identity.test/v1/identity/device', { method: 'POST', json: { device: { platform: 'web' } } }),
      settingsRequest: createJsonRequest('https://app-api.test/v1/apps/yes-no/settings', { auth: bearerAuth('tks_test') }),
      stateRequest: createJsonRequest('https://app-api.test/v1/apps/yes-no/state', { method: 'PUT', auth: bearerAuth('tks_test'), json: { state: { lastAnswer: 'yes' }, version: 0 } }),
      ttsFallback: createTtsFallbackSmoke({ attemptedPlatformTts: true, fallbackMode: 'browser-speech' }),
    }

    const checklist = createAppSmokeChecklist('yes-no', evidence)

    expect(checklist.every((item) => item.answer === 'yes')).toBe(true)
    expect(checklist.map((item) => item.id)).toEqual([
      'no-login-wall',
      'device-bootstrap-hook',
      'settings-path',
      'state-path',
      'tts-fallback-path',
    ])
    expect(checklist[1].evidence).toContain('POST https://identity.test/v1/identity/device')
    expect(checklist[4].evidence).toContain('browser-speech')
  })
})
