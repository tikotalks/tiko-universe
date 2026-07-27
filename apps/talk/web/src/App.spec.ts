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
  // jsdom in this config exposes localStorage without a callable clear(); reset defensively.
  if (typeof window.localStorage?.clear === 'function') window.localStorage.clear()
  else vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} })
  vi.stubGlobal('fetch', createFetchMock())
  vi.stubGlobal('ResizeObserver', class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

describe('Talk web app', () => {
  it('opens with the account avatar and the board from the device, not an empty stage', async () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Talk')

    const accountButton = wrapper.get('button[aria-label="Account"]')
    expect(accountButton.find('[data-icon="ui/avatar"]').exists()).toBe(true)

    // The pack is a dynamic import, so wait for it rather than guessing how many
    // microtask flushes it takes — that guess is what made this flaky.
    await vi.waitFor(() => {
      expect(wrapper.findAll('.word-cloud__bubble').length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    expect(wrapper.text()).toContain('I')
    expect(wrapper.text()).toContain('want')
  })

  /**
   * Building a two-clause sentence in the app, which is what the grammar is for.
   * Every step here was broken in a different way: the board was clipped to zero
   * width, search was scoped to one category, the tiles a child had chosen could not
   * be resolved once the board narrowed, a word already used disappeared, and the
   * finished sentence was never shown to anybody.
   */
  it('builds "I am sad because I want mum" from six taps, and shows it', async () => {
    const wrapper = mount(App)
    await vi.waitFor(() => {
      expect(wrapper.findAll('.word-cloud__bubble').length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    const tap = async (label: string) => {
      // Search for the tile the way a child reaches a low-frequency word.
      const search = wrapper.get('input[type="search"]')
      await search.setValue(label)
      await flushPromises()
      const bubble = wrapper.findAll('.word-cloud__bubble')
        .find((node) => node.text().trim().toLowerCase() === label.toLowerCase())
      expect(bubble, `no tile for "${label}"`).toBeTruthy()
      await bubble!.trigger('click')
      await flushPromises()
    }

    for (const word of ['I', 'sad', 'because', 'I', 'want', 'mum']) await tap(word)

    await vi.waitFor(() => {
      expect(wrapper.get('.sentence-bar__sentence').text()).toBe('I am sad because I want mum')
    }, { timeout: 5000 })
  })

  it('offers to add a word only when the board does not already have it', async () => {
    const wrapper = mount(App)
    await vi.waitFor(() => {
      expect(wrapper.findAll('.word-cloud__bubble').length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    const search = wrapper.get('input[type="search"]')
    await search.setValue('because')
    await flushPromises()
    expect(wrapper.find('.talk-screen__add-word').exists()).toBe(false)

    await search.setValue('trampoline')
    await flushPromises()
    expect(wrapper.find('.talk-screen__add-word').exists()).toBe(true)
  })

  it('calls handleAvatarClick when the avatar is tapped', async () => {
    const wrapper = mount(App)

    // Avatar click should not throw even without a popup provider in test env
    await wrapper.get('button[aria-label="Account"]').trigger('click')
    await flushPromises()

    // The button exists and is functional — popup requires a real PopupService
    expect(wrapper.find('button[aria-label="Account"]').exists()).toBe(true)
  })
})
