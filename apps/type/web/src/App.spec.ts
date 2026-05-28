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

    if (url.endsWith('/apps/type/settings') && method === 'GET') {
      return jsonResponse({ app: 'type', updatedAt: null, version: 2, settings: options.settings ?? {} })
    }

    if (url.endsWith('/apps/type/state') && method === 'GET') {
      return jsonResponse({ app: 'type', updatedAt: null, version: 3, state: options.state ?? {} })
    }

    if (url.endsWith('/apps/type/settings') && method === 'PUT') {
      return jsonResponse({ app: 'type', updatedAt: 'now', version: 4, settings: JSON.parse(String(init?.body)).settings })
    }

    if (url.endsWith('/apps/type/state') && method === 'PUT') {
      return jsonResponse({ app: 'type', updatedAt: 'now', version: 5, state: JSON.parse(String(init?.body)).state })
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

describe('Type web app', () => {
  it('opens immediately with compose area and no login wall while bootstrapping identity in the background', async () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Type')
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Log in')
    expect(wrapper.text()).not.toContain('Password')

    await flushPromises()
    expect(fetch).toHaveBeenCalledWith('https://api.tikoapi.org/v1/identity/device', expect.objectContaining({ method: 'POST' }))
  })

  it('typing text and clicking speak triggers TTS', async () => {
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('textarea').setValue('Hello world')
    await wrapper.get('.type-app__speak').trigger('click')

    expect(fetchMock).toHaveBeenCalledWith('https://api.tikoapi.org/v1/generation/tts', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('Hello world')
    }))
  })

  it('clear button resets the compose area', async () => {
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('textarea').setValue('Some text here')
    await wrapper.get('.type-app__clear').trigger('click')

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('spoken phrases are saved to history', async () => {
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('textarea').setValue('I want water')
    await wrapper.get('.type-app__speak').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="tiko-header-action-phrases"]').trigger('click')
    expect(wrapper.text()).toContain('I want water')
  })

  it('settings persist to localStorage as local fallback', async () => {
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('[data-test="tiko-header-action-settings"]').trigger('click')
    await wrapper.get('[data-test="tiko-settings-language"]').setValue('nl')
    await wrapper.get('[data-test="tiko-settings-color-mode"]').setValue('dark')

    await vi.waitFor(() => {
      expect(window.localStorage.getItem('tiko:type')).toContain('"colorMode":"dark"')
    })
    expect(window.localStorage.getItem('tiko:type')).toContain('"language":"nl"')
    expect(document.documentElement.dataset.colorMode).toBe('dark')
  })

  it('falls back to local flow when API is unavailable', async () => {
    vi.stubGlobal('fetch', createFetchMock({ failBootstrap: true, failTts: true }))
    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Log in')

    await wrapper.get('textarea').setValue('Local test')
    await wrapper.get('.type-app__speak').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Browser voice used')
    })
    expect(window.localStorage.getItem('tiko:type')).toContain('Local test')
  })
})
