import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'

const sessionBundle = {
  user: { id: 'user-device', kind: 'device', recoverable: false },
  device: { id: 'device-1', secret: 'device-secret' },
  session: { token: 'session-token', expiresAt: '2099-01-01T00:00:00.000Z' }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function createFetchMock(options: {
  settings?: Record<string, unknown>
  state?: Record<string, unknown>
  failBootstrap?: boolean
  failTts?: boolean
} = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url.endsWith('/identity/session')) return jsonResponse(sessionBundle)
    if (url.endsWith('/identity/device')) {
      if (options.failBootstrap) return jsonResponse({ error: { code: 'offline', message: 'offline' } }, 503)
      return jsonResponse(sessionBundle)
    }

    if (url.endsWith('/apps/yes-no/settings') && method === 'GET') {
      return jsonResponse({ app: 'yes-no', updatedAt: null, version: 2, settings: options.settings ?? {} })
    }

    if (url.endsWith('/apps/yes-no/state') && method === 'GET') {
      return jsonResponse({ app: 'yes-no', updatedAt: null, version: 3, state: options.state ?? {} })
    }

    if (url.endsWith('/apps/yes-no/settings') && method === 'PUT') {
      return jsonResponse({ app: 'yes-no', updatedAt: 'now', version: 4, settings: JSON.parse(String(init?.body)).settings })
    }

    if (url.endsWith('/apps/yes-no/state') && method === 'PUT') {
      return jsonResponse({ app: 'yes-no', updatedAt: 'now', version: 5, state: JSON.parse(String(init?.body)).state })
    }

    if (url.endsWith('/generation/tts')) {
      if (options.failTts) return jsonResponse({ error: 'tts down' }, 503)
      return jsonResponse({ success: true, audioUrl: '/audio?key=audio%2Ftest.mp3' })
    }

    return jsonResponse({ error: { code: 'unexpected', message: url } }, 500)
  })
}

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('fetch', createFetchMock())
  vi.stubGlobal('Audio', vi.fn(function AudioMock() {
    return { play: vi.fn(async () => undefined) }
  }))
})

describe('Yes No web app', () => {
  it('opens immediately with Yes and No choices and no login wall while bootstrapping identity in the background', async () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Yes No')
    expect(wrapper.text()).toContain('Yes')
    expect(wrapper.text()).toContain('No')
    expect(wrapper.text()).not.toContain('Log in')
    expect(wrapper.text()).not.toContain('Password')

    await flushPromises()
    expect(fetch).toHaveBeenCalledWith('https://api.tikoapi.org/v1/identity/device', expect.objectContaining({ method: 'POST' }))
  })

  it('hydrates settings and answer state from the API after device bootstrap', async () => {
    vi.stubGlobal('fetch', createFetchMock({
      settings: { language: 'nl', colorMode: 'dark', spokenPrompt: 'Wil je eten?' },
      state: { lastAnswer: 'no', answerHistory: ['no', 'yes'] }
    }))

    const wrapper = mount(App)
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Ja')
    })
    expect(wrapper.text()).toContain('Nee')
    expect(wrapper.text()).toContain('Laatste antwoord: Nee')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Wil je eten?')
    expect(document.documentElement.dataset.colorMode).toBe('dark')
  })

  it('persists settings through @tiko/data and keeps a local fallback copy', async () => {
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('[data-test="tiko-header-action-settings"]').trigger('click')
    await wrapper.get('[data-test="tiko-settings-language"]').setValue('fr')
    await wrapper.get('[data-test="tiko-settings-color-mode"]').setValue('dark')
    await wrapper.get('textarea').setValue('Tu veux manger?')

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://api.tikoapi.org/v1/apps/yes-no/settings', expect.objectContaining({ method: 'PUT' }))
    })
    expect(window.localStorage.getItem('tiko:yes-no')).toContain('Tu veux manger?')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Oui')
    })
    expect(wrapper.text()).toContain('Non')
  })

  it('records the latest answer and history through @tiko/data after a choice is tapped and speaks it', async () => {
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.findAll('[data-test="tiko-answer-button"]').find((button) => button.text().includes('Yes'))!.trigger('click')
    await wrapper.get('[data-test="tiko-header-action-history"]').trigger('click')

    expect(wrapper.text()).toContain('Latest answer: Yes')
    expect(wrapper.text()).toContain('History')
    expect(fetchMock).toHaveBeenCalledWith('https://api.tikoapi.org/v1/generation/tts', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('Yes')
    }))
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://api.tikoapi.org/v1/apps/yes-no/state', expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"answerHistory":["yes"]')
      }))
    })
  })

  it('keeps setup/recovery chrome out of the first-use play flow', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).not.toContain('Setup user')
    expect(wrapper.text()).not.toContain('optional setup')
    expect(wrapper.find('[data-test="tiko-setup-card"]').exists()).toBe(false)
    expect(wrapper.find('.yes-no-app__sentence-card').exists()).toBe(false)
  })

  it('allows custom sentence speech and stores it in the local fallback', async () => {
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('textarea').setValue('Do you want music?')
    await wrapper.get('.yes-no-app__speak').trigger('click')

    expect(fetch).toHaveBeenCalledWith('https://api.tikoapi.org/v1/generation/tts', expect.objectContaining({
      body: expect.stringContaining('Do you want music?')
    }))
    expect(window.localStorage.getItem('tiko:yes-no')).toContain('Do you want music?')
  })

  it('falls back to the local child-facing flow if identity bootstrap is unavailable', async () => {
    vi.stubGlobal('fetch', createFetchMock({ failBootstrap: true, failTts: true }))
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.findAll('[data-test="tiko-answer-button"]').find((button) => button.text().includes('No'))!.trigger('click')

    expect(wrapper.text()).toContain('Latest answer: No')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Browser voice used')
    })
    expect(wrapper.text()).not.toContain('Log in')
  })

  it('renders open-icon names instead of emoji glyphs for visible app and choice icons', () => {
    const wrapper = mount(App)

    expect(wrapper.find('[data-icon="ui/check-fat"]').exists()).toBe(true)
    expect(wrapper.find('[data-icon="wayfinding/cross"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('👍')
    expect(wrapper.text()).not.toContain('👎')
  })
})
