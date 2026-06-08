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

  it('calls canonical user-mode and child-account contracts', async () => {
    const calls: Array<{ input: RequestInfo | URL, init?: RequestInit }> = []
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init })
      return Promise.resolve(new Response(JSON.stringify({ subject: { id: 'sub', kind: 'account', product: 'tiko' }, runtime: { mode: 'parent', childModeEnabled: true, pinConfigured: true }, childAccounts: [], child: { id: 'child_1', subjectId: 'child_1', managerSubjectId: 'sub', handle: 'mila', name: 'Mila', displayName: 'Mila' }, ok: true, grant: { token: 'grt_test', purpose: 'parent_mode', expiresAt: '2030-01-01T00:00:00.000Z' } }), {
        headers: { 'content-type': 'application/json' }
      }))
    }) as typeof fetch

    const client = new IdentityClient({ baseUrl: 'https://api.test/v1' })
    await client.setPin('token', { pin: '1234' })
    await client.verifyPin('token', { pin: '1234', purpose: 'parent_mode' })
    await client.enableChildMode('token')
    await client.enterChildMode('token')
    await client.enterParentMode('token', '1234')
    await client.listChildAccounts('token')
    await client.createChildAccount('token', { name: 'Mila', code: '4829' })
    await client.updateChildAccount('token', 'child 1', { name: 'Mila Updated' })
    await client.resetChildAccountCode('token', 'child 1', '8642')
    await client.deleteChildAccount('token', 'child 1')
    await client.loginChildAccount({ name: 'Mila', code: '8642' })

    expect(calls.map(call => `${call.init?.method ?? 'GET'} ${call.input}`)).toEqual([
      'POST https://api.test/v1/identity/pin',
      'POST https://api.test/v1/identity/pin/verify',
      'POST https://api.test/v1/identity/mode/child/enable',
      'POST https://api.test/v1/identity/mode/child',
      'POST https://api.test/v1/identity/mode/parent',
      'GET https://api.test/v1/identity/child-accounts',
      'POST https://api.test/v1/identity/child-accounts',
      'PUT https://api.test/v1/identity/child-accounts/child%201',
      'POST https://api.test/v1/identity/child-accounts/child%201/code/reset',
      'DELETE https://api.test/v1/identity/child-accounts/child%201',
      'POST https://api.test/v1/identity/child-accounts/login'
    ])
  })
})
