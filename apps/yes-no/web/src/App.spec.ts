import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'

const sessionBundle = {
  subject: { id: 'user-device', kind: 'device', product: 'tiko' },
  user: { id: 'user-device', accountType: 'temporary', recoverable: false },
  device: { id: 'device-1', secret: 'device-secret' },
  account: null,
  session: { id: 'session-1', token: 'session-token', transport: 'bearer', expiresAt: '2099-01-01T00:00:00.000Z' },
  runtime: { mode: 'parent', childModeEnabled: false, pinConfigured: false },
  capabilities: { canVerifyEmail: true, canUseParentMode: false, canUseChildMode: false, canManageChildAccounts: false, canDeleteAccount: false }
}

function identityBundle(overrides: Record<string, unknown> = {}) {
  return { ...sessionBundle, ...overrides }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}


function createPopupServiceMock() {
  return {
    showPopup: vi.fn((_config: unknown) => 'popup-id'),
    closePopup: vi.fn(),
    closeAllPopups: vi.fn(),
    popups: { value: [] }
  }
}

function mountApp() {
  const popupService = createPopupServiceMock()
  const wrapper = mount(App, {
    global: {
      provide: { popupService }
    }
  })
  return { wrapper, popupService }
}

function createFetchMock(options: {
  settings?: Record<string, unknown>
  state?: Record<string, unknown>
  defaults?: Record<string, unknown>
  appConfig?: Record<string, unknown>
  failBootstrap?: boolean
  failCookieSession?: boolean
  failTts?: boolean
  identity?: Record<string, unknown>
} = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url.endsWith('/identity/session')) {
      if (options.failCookieSession && !(init?.headers as Record<string, string> | undefined)?.authorization) {
        return jsonResponse({ error: { code: 'unauthorized', message: 'unauthorized' } }, 401)
      }
      return jsonResponse(identityBundle(options.identity))
    }

    if (url.endsWith('/apps/config/yes-no') && method === 'GET') {
      return jsonResponse({
        config: options.appConfig ?? {
          id: 'yes-no',
          title: 'Yes No',
          appColor: 'yes-no',
          appIcon: 'ui/check-fat',
          appIconMediaCategory: 'emotions',
          themeColor: '#9b3fbd',
        },
        updatedAt: null,
        version: 0,
      })
    }

    if (url.endsWith('/identity/profile') && method === 'GET') {
      return jsonResponse({ profile: {} })
    }

    if (url.endsWith('/identity/profile') && method === 'PUT') {
      return jsonResponse({ profile: JSON.parse(String(init?.body)) })
    }

    if (url.endsWith('/identity/logout')) {
      return new Response(null, { status: 204 })
    }

    if (url.endsWith('/identity/device')) {
      if (options.failBootstrap) return jsonResponse({ error: { code: 'offline', message: 'offline' } }, 503)
      return jsonResponse(identityBundle(options.identity))
    }

    if (url.endsWith('/identity/pin') && method === 'POST') {
      return jsonResponse(identityBundle({ runtime: { mode: 'parent', childModeEnabled: false, pinConfigured: true } }))
    }

    if (url.endsWith('/identity/mode/child/enable') && method === 'POST') {
      return jsonResponse(identityBundle({ runtime: { mode: 'parent', childModeEnabled: true, pinConfigured: true } }))
    }

    if (url.endsWith('/identity/mode/child') && method === 'POST') {
      return jsonResponse(identityBundle({ runtime: { mode: 'child', childModeEnabled: true, pinConfigured: true } }))
    }

    if (url.endsWith('/identity/mode/parent') && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { pin?: string }
      if (body.pin !== '1234') return jsonResponse({ error: { code: 'invalid_pin', message: 'Wrong PIN' } }, 401)
      return jsonResponse(identityBundle({ runtime: { mode: 'parent', childModeEnabled: true, pinConfigured: true } }))
    }

    if (url.endsWith('/apps/yes-no/settings') && method === 'GET') {
      return jsonResponse({ app: 'yes-no', updatedAt: null, version: 2, settings: options.settings ?? {} })
    }

    if (url.endsWith('/apps/yes-no/state') && method === 'GET') {
      return jsonResponse({ app: 'yes-no', updatedAt: null, version: 3, state: options.state ?? {} })
    }

    if (url.endsWith('/apps/defaults/yes-no/state') && method === 'GET') {
      return jsonResponse({ app: 'yes-no', updatedAt: null, version: 1, state: options.defaults ?? {} })
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
    const { wrapper } = mountApp()

    expect(wrapper.text()).toContain('Yes No')
    expect(wrapper.text()).toContain('Yes')
    expect(wrapper.text()).toContain('No')
    expect(wrapper.text()).not.toContain('Log in')
    expect(wrapper.text()).not.toContain('Password')

    await flushPromises()
    expect(fetch).toHaveBeenCalledWith('https://id.tikoapps.org/v1/identity/session', expect.objectContaining({ method: 'GET', credentials: 'include' }))
  })

  it('falls back to device bootstrap on the browser identity origin when the shared cookie is missing', async () => {
    const fetchMock = createFetchMock({ failCookieSession: true })
    vi.stubGlobal('fetch', fetchMock)
    mountApp()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('https://id.tikoapps.org/v1/identity/session', expect.objectContaining({ method: 'GET', credentials: 'include' }))
    expect(fetchMock).toHaveBeenCalledWith('https://id.tikoapps.org/v1/identity/device', expect.objectContaining({ method: 'POST', credentials: 'include' }))
  })

  it('hydrates settings and answer state from the API after device bootstrap', async () => {
    vi.stubGlobal('fetch', createFetchMock({
      settings: { language: 'nl', colorMode: 'dark', spokenPrompt: 'Wil je eten?' },
      state: { lastAnswer: 'no', answerHistory: ['no', 'yes'] }
    }))

    const { wrapper } = mountApp()
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Ja')
    })
    expect(wrapper.text()).toContain('Nee')
    expect(wrapper.text()).toContain('Laatste antwoord: Nee')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Wil je eten?')
    expect(document.documentElement.dataset.colorMode).toBe('dark')
  })

  it('translates semantic default answer tiles from admin defaults when language changes', async () => {
    vi.stubGlobal('fetch', createFetchMock({
      settings: { language: 'nl', colorMode: 'system' },
      defaults: {
        answers: [
          { id: 'yes', label: 'Yes', speech: 'Yes', color: 'green' },
          { id: 'no', label: 'No', speech: 'No', color: 'red' }
        ]
      }
    }))

    const { wrapper } = mountApp()
    await flushPromises()

    await vi.waitFor(() => {
      const labels = wrapper.findAll('[data-test="tiko-answer-button"]').map(button => button.text())
      expect(labels).toContain('Ja')
      expect(labels).toContain('Nee')
      expect(labels).not.toContain('Yes')
      expect(labels).not.toContain('No')
    })
  })

  it('applies admin-managed app color and icon config at runtime', async () => {
    vi.stubGlobal('fetch', createFetchMock({
      appConfig: {
        id: 'yes-no',
        title: 'Custom Yes No',
        appColor: 'yes-no',
        appIcon: 'ui/question-mark-fat',
        appIconImageUrl: 'https://data.tikocdn.org/uploads/custom-icon.png',
        appIconMediaCategory: 'feelings',
        themeColor: '#123456',
      }
    }))

    const { wrapper } = mountApp()
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Custom Yes No')
      expect(wrapper.get('.tiko-app-shell').attributes('style')).toContain('#123456')
      expect(wrapper.get('.tiko-app-header__app-icon img').attributes('src')).toContain('custom-icon.png')
    })
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe('#123456')
  })

  it('persists settings through @tiko/data and keeps a local fallback copy', async () => {
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    const { wrapper } = mountApp()
    await flushPromises()

    await wrapper.get('[data-test="tiko-header-action-settings"]').trigger('click')
    await wrapper.get('[data-test="tiko-settings-language"]').setValue('fr')
    await wrapper.get('[data-test="tiko-settings-color-mode"]').setValue('dark')
    await wrapper.get('textarea').setValue('Tu veux manger?')

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://app.tikoapi.org/v1/apps/yes-no/settings', expect.objectContaining({ method: 'PUT' }))
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
    const { wrapper } = mountApp()
    await flushPromises()

    await wrapper.findAll('[data-test="tiko-answer-button"]').find((button) => button.text().includes('Yes'))!.trigger('click')
    await wrapper.get('[data-test="tiko-header-action-history"]').trigger('click')

    expect(wrapper.text()).toContain('Latest answer: Yes')
    expect(wrapper.text()).toContain('History')
    expect(fetchMock).toHaveBeenCalledWith('https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas/speech', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('Yes')
    }))
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://app.tikoapi.org/v1/apps/yes-no/state', expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"answerHistory":["yes"]')
      }))
    })
  })

  it('keeps setup/recovery chrome out of the first-use play flow', () => {
    const { wrapper } = mountApp()

    expect(wrapper.text()).not.toContain('Setup user')
    expect(wrapper.text()).not.toContain('optional setup')
    expect(wrapper.find('[data-test="tiko-setup-card"]').exists()).toBe(false)
    expect(wrapper.find('.yes-no-app__sentence-card').exists()).toBe(false)
  })

  it('allows custom sentence speech and stores it in the local fallback', async () => {
    const { wrapper } = mountApp()
    await flushPromises()

    await wrapper.get('textarea').setValue('Do you want music?')
    await wrapper.get('.yes-no-app__speak').trigger('click')

    expect(fetch).toHaveBeenCalledWith('https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas/speech', expect.objectContaining({
      body: expect.stringContaining('Do you want music?')
    }))
    expect(window.localStorage.getItem('tiko:yes-no')).toContain('Do you want music?')
  })

  it('falls back to the local child-facing flow if identity bootstrap is unavailable', async () => {
    vi.stubGlobal('fetch', createFetchMock({ failBootstrap: true, failTts: true }))
    const { wrapper } = mountApp()
    await flushPromises()

    await wrapper.findAll('[data-test="tiko-answer-button"]').find((button) => button.text().includes('No'))!.trigger('click')

    expect(wrapper.text()).toContain('Latest answer: No')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Browser voice used')
    })
    expect(wrapper.text()).not.toContain('Log in')
  })

  it('keeps the account avatar in the header and opens the iOS-style profile menu from it', async () => {
    const { wrapper, popupService } = mountApp()

    await flushPromises()
    const accountButton = wrapper.get('button[aria-label="Account"]')
    expect(accountButton.find('[data-icon="ui/avatar"]').exists()).toBe(true)

    await accountButton.trigger('click')

    expect(popupService.showPopup).toHaveBeenCalledWith(expect.objectContaining({
      props: expect.objectContaining({ parentMode: true })
    }))
    const popupConfig = popupService.showPopup.mock.calls[0][0] as { component: { __name?: string } }
    expect(popupConfig.component.__name).toBe('TikoProfileMenu')
    expect(wrapper.find('[data-test="tiko-settings-panel"]').exists()).toBe(false)
  })

  it('sets the API-backed parent PIN and enters child mode without local parent-code storage', async () => {
    const verifiedBundle = identityBundle({
      user: { id: 'user-device', accountType: 'verified', recoverable: true, emailVerified: true },
      account: { id: 'account-1', subjectId: 'user-device', email: 'parent@example.com', emailVerified: true },
      runtime: { mode: 'parent', childModeEnabled: false, pinConfigured: false }
    })
    const fetchMock = createFetchMock({ identity: verifiedBundle })
    vi.stubGlobal('fetch', fetchMock)
    window.localStorage.setItem('tiko:identity:device-session', JSON.stringify({ sessionToken: 'session-token', accountEmail: 'parent@example.com', accountEmailVerified: true }))

    const { wrapper, popupService } = mountApp()
    await flushPromises()
    await wrapper.get('button[aria-label="Account"]').trigger('click')

    const menuCall = popupService.showPopup.mock.calls[popupService.showPopup.mock.calls.length - 1]
    const menuConfig = menuCall[0] as { on: Record<string, () => unknown> }
    menuConfig.on['enter-child-mode']()
    const pinCall = popupService.showPopup.mock.calls[popupService.showPopup.mock.calls.length - 1]
    const pinConfig = pinCall[0] as { on: Record<string, (...args: unknown[]) => unknown> }
    await pinConfig.on.set('legacy-hash-not-used', '1234')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('https://id.tikoapps.org/v1/identity/pin', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"pin":"1234"')
    }))
    expect(fetchMock).toHaveBeenCalledWith('https://id.tikoapps.org/v1/identity/mode/child/enable', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenCalledWith('https://id.tikoapps.org/v1/identity/mode/child', expect.objectContaining({ method: 'POST' }))
    expect(window.localStorage.getItem('tiko:parent-mode')).toBeNull()
    expect(JSON.stringify([...fetchMock.mock.calls])).not.toContain('parentCodeHash')
  })

  it('renders open-icon names instead of emoji glyphs for visible app and choice icons', () => {
    const { wrapper } = mountApp()

    expect(wrapper.find('[data-icon="ui/check-fat"]').exists()).toBe(true)
    expect(wrapper.find('[data-icon="wayfinding/cross"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('👍')
    expect(wrapper.text()).not.toContain('👎')
  })
})
