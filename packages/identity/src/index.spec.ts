import { afterEach, describe, expect, it } from 'vitest'
import { IdentityClient } from './index'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('IdentityClient', () => {
  it('binds the default fetcher to globalThis for browser runtimes that require a Window receiver', async () => {
    const calls: Array<{ input: RequestInfo | URL, init?: RequestInit }> = []

    globalThis.fetch = function boundReceiverRequiredFetch(this: typeof globalThis, input: RequestInfo | URL, init?: RequestInit) {
      if (this !== globalThis) {
        throw new TypeError('Can only call Window.fetch on instances of Window')
      }
      calls.push({ input, init })
      return Promise.resolve(new Response(JSON.stringify({ ok: true, message: 'ok' }), {
        headers: { 'content-type': 'application/json' },
      }))
    } as typeof fetch

    const client = new IdentityClient({ baseUrl: 'https://api.test/v1' })

    await expect(client.createEmailChallenge({ email: 'sil@example.com', purpose: 'recover' })).resolves.toEqual({ ok: true, message: 'ok' })
    expect(calls).toHaveLength(1)
    expect(calls[0].input).toBe('https://api.test/v1/identity/email')
  })
})
