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

    if (url.endsWith('/apps/timer/settings') && method === 'GET') {
      return jsonResponse({ app: 'timer', updatedAt: null, version: 2, settings: options.settings ?? {} })
    }

    if (url.endsWith('/apps/timer/state') && method === 'GET') {
      return jsonResponse({ app: 'timer', updatedAt: null, version: 3, state: options.state ?? {} })
    }

    if (url.endsWith('/apps/timer/settings') && method === 'PUT') {
      return jsonResponse({ app: 'timer', updatedAt: 'now', version: 4, settings: JSON.parse(String(init?.body)).settings })
    }

    if (url.endsWith('/apps/timer/state') && method === 'PUT') {
      return jsonResponse({ app: 'timer', updatedAt: 'now', version: 5, state: JSON.parse(String(init?.body)).state })
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
  vi.useFakeTimers()
})

describe('Timer web app', () => {
  it('opens immediately with timer display and no login wall', async () => {
    const wrapper = mount(App)

    // Should show app content immediately
    expect(wrapper.text()).toContain('Timer')
    expect(wrapper.find('.timer-app__time').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Log in')
    expect(wrapper.text()).not.toContain('Password')

    // Should show default time display (05:00 for 5 min default)
    expect(wrapper.find('.timer-app__time').text()).toBe('05:00')

    await flushPromises()
    expect(fetch).toHaveBeenCalledWith('https://api.tikoapi.org/v1/identity/device', expect.objectContaining({ method: 'POST' }))
  })

  it('starts countdown from set minutes and seconds', async () => {
    const wrapper = mount(App)
    await flushPromises()

    const minutesInput = wrapper.findAll('input').find(el => (el.element as HTMLInputElement).value === '5')
    const secondsInput = wrapper.findAll('input').find(el => (el.element as HTMLInputElement).value === '0')

    expect(minutesInput).toBeTruthy()
    expect(secondsInput).toBeTruthy()

    // Click start
    await wrapper.find('.timer-app__btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.timer-app__time').text()).toBe('05:00')
    expect(wrapper.text()).toContain('Running')

    // Advance 1 second
    vi.advanceTimersByTime(1000)
    await flushPromises()

    expect(wrapper.find('.timer-app__time').text()).toBe('04:59')
  })

  it('pauses and resumes the countdown', async () => {
    const wrapper = mount(App)
    await flushPromises()

    // Start
    await wrapper.find('.timer-app__btn').trigger('click')
    await flushPromises()

    vi.advanceTimersByTime(3000)
    await flushPromises()
    expect(wrapper.find('.timer-app__time').text()).toBe('04:57')

    // Pause
    const pauseBtn = wrapper.findAll('.timer-app__btn').find(b => b.text().includes('Pause'))
    expect(pauseBtn).toBeTruthy()
    await pauseBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Paused')

    // Time should not change while paused
    vi.advanceTimersByTime(5000)
    await flushPromises()
    expect(wrapper.find('.timer-app__time').text()).toBe('04:57')

    // Resume
    const resumeBtn = wrapper.findAll('.timer-app__btn').find(b => b.text().includes('Resume'))
    expect(resumeBtn).toBeTruthy()
    await resumeBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Running')

    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(wrapper.find('.timer-app__time').text()).toBe('04:55')
  })

  it('resets to initial state', async () => {
    const wrapper = mount(App)
    await flushPromises()

    // Start and let it run
    await wrapper.find('.timer-app__btn').trigger('click')
    await flushPromises()

    vi.advanceTimersByTime(5000)
    await flushPromises()

    // Pause so we can see reset button
    const pauseBtn = wrapper.findAll('.timer-app__btn').find(b => b.text().includes('Pause'))
    await pauseBtn!.trigger('click')
    await flushPromises()

    // Reset
    const resetBtn = wrapper.findAll('.timer-app__btn').find(b => b.text().includes('Reset'))
    expect(resetBtn).toBeTruthy()
    await resetBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.find('.timer-app__time').text()).toBe('05:00')
    expect(wrapper.text()).toContain('Ready')
  })

  it('persists timer state to localStorage as local fallback', async () => {
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.find('.timer-app__btn').trigger('click')
    await flushPromises()

    const stored = JSON.parse(window.localStorage.getItem('tiko:timer') ?? '{}')
    expect(stored.isRunning).toBe(true)
    expect(stored.targetTimestamp).toBeTruthy()
    expect(stored.totalSeconds).toBe(300)
  })

  it('shows expired state when timer reaches zero', async () => {
    const wrapper = mount(App)
    await flushPromises()

    // Set a short timer: 0 minutes, 2 seconds
    const inputs = wrapper.findAll('input')
    const minutesInput = inputs[0]
    const secondsInput = inputs[1]

    await minutesInput.setValue(0)
    await secondsInput.setValue(2)
    await flushPromises()

    // Start
    await wrapper.find('.timer-app__btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.timer-app__time').text()).toBe('00:02')

    // Advance past expiration
    vi.advanceTimersByTime(3000)
    await flushPromises()

    expect(wrapper.find('.timer-app__time').text()).toBe('00:00')
    expect(wrapper.find('.timer-app__time').classes()).toContain('timer-app__time--expired')
    expect(wrapper.text()).toContain('Time is up!')
  })

  it('keeps settings and setup chrome out of first-use play flow', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).not.toContain('Setup user')
    expect(wrapper.text()).not.toContain('optional setup')
    expect(wrapper.find('[data-test="tiko-setup-card"]').exists()).toBe(false)
  })

  it('cleans up interval on unmount to avoid duplicate timers', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    const wrapper = mount(App)
    await flushPromises()

    await wrapper.find('.timer-app__btn').trigger('click')
    await flushPromises()

    wrapper.unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
