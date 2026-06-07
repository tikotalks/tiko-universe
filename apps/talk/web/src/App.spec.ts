import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'

const identityBundle = {
  subject: { id: 'talk-device', kind: 'device', product: 'tiko' },
  device: { id: 'device-1', secret: 'device-secret' },
  account: null,
  session: { id: 'session-1', token: 'session-token', transport: 'bearer', expiresAt: '2099-01-01T00:00:00.000Z' },
  runtime: { mode: 'parent', childModeEnabled: false, pinConfigured: false },
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function createFetchMock() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/identity/device') || url.endsWith('/identity/session')) return jsonResponse(identityBundle)
    if (url.includes('/v1/sentence/start')) return jsonResponse({ error: { message: 'offline' } }, 503)
    return jsonResponse({ error: { message: url } }, 404)
  }) as unknown as typeof fetch
}

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('fetch', createFetchMock())
  vi.stubGlobal('ResizeObserver', class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

describe('Talk web app', () => {
  it('opens with account avatar and offline fallback words instead of an empty stage', async () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Talk')

    const accountButton = wrapper.get('button[aria-label="Account"]')
    expect(accountButton.find('[data-icon="ui/avatar"]').exists()).toBe(true)

    await flushPromises()

    expect(wrapper.text()).toContain('I')
    expect(wrapper.text()).toContain('want')
    expect(wrapper.findAll('.word-cloud__bubble').length).toBeGreaterThan(0)
  })

  it('opens the profile menu when the avatar is tapped', async () => {
    const wrapper = mount(App)

    await wrapper.get('button[aria-label="Account"]').trigger('click')
    await flushPromises()

    // The identity runtime opens the profile menu popup
    expect(wrapper.find('[data-test="tiko-profile-menu"]').exists()).toBe(true)
  })
})
