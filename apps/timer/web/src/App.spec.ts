import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, effectScope } from 'vue'
import { createWebAppFetchHandler } from '@tiko/testing'
import App from './App.vue'
import { useTimer } from './composables/useTimer'

function createLocalStorageMock() {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    get store() { return store }
  }
}

function mountApp(localStorageOverride?: Record<string, string>) {
  const ls = createLocalStorageMock()
  if (localStorageOverride) {
    Object.entries(localStorageOverride).forEach(([k, v]) => { ls.store[k] = v })
  }

  const originalWindow = globalThis.window
  const originalDocument = globalThis.document

  // Ensure window/document exist for jsdom
  const win = globalThis.window as any
  if (win) {
    win.localStorage = ls
  }

  const wrapper = mount(App, {
    global: {
      stubs: {
        'tiko-app-shell': {
          name: 'TikoAppShell',
          template: '<div class="tiko-app-shell-stub"><slot /></div>',
          props: ['appName', 'appIcon', 'appColor', 'actions'],
          emits: ['headerAction']
        },
        'tiko-settings-panel': {
          template: '<div class="tiko-settings-panel-stub" />',
          props: ['modelValue', 'colorMode']
        },
        'sil-button': {
          template: '<button class="sil-button-stub" @click="$emit(\'click\')"><slot /></button>',
          props: ['variant', 'icon'],
          emits: ['click']
        }
      }
    }
  })

  return { wrapper, ls }
}

describe('Timer App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    vi.stubGlobal('fetch', vi.fn(createWebAppFetchHandler({ appId: 'timer' })))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('updates the displayed countdown while running', async () => {
    const scope = effectScope()
    const timer = scope.run(() => useTimer())

    expect(timer).toBeTruthy()
    timer!.start(60_000)
    expect(timer!.displayTime.value).toBe('01:00')

    vi.advanceTimersByTime(1_000)
    await nextTick()

    expect(timer!.displayTime.value).toBe('00:59')
    scope.stop()
  })

  it('restores running progress with the original total duration', async () => {
    const scope = effectScope()
    const timer = scope.run(() => useTimer())

    expect(timer).toBeTruthy()
    timer!.restoreFromState({
      mode: 'running',
      targetMs: Date.now() + 30_000,
      remainingMs: 30_000,
      totalDurationMs: 60_000,
      startedAt: Date.now() - 30_000,
    })
    await nextTick()

    expect(timer!.displayTime.value).toBe('00:30')
    expect(timer!.progress.value).toBeCloseTo(0.5, 2)
    scope.stop()
  })

  it('opens immediately with timer UI, no login wall', () => {
    const { wrapper } = mountApp()
    expect(wrapper.find('.timer-app').exists()).toBe(true)
    expect(wrapper.find('.timer-app__ring-wrap').exists()).toBe(true)
    expect(wrapper.find('.timer-app__time').exists()).toBe(true)
  })

  it('shows default 00:00 when idle', () => {
    const { wrapper } = mountApp()
    expect(wrapper.find('.timer-app__time').text()).toBe('00:00')
  })

  it('preset buttons are visible when idle', () => {
    const { wrapper } = mountApp()
    const presetBtns = wrapper.findAll('.timer-app__preset-btn')
    expect(presetBtns.length).toBe(4)
  })

  it('renders timer presets from persisted/default state', () => {
    const { wrapper } = mountApp({
      'tiko:timer': JSON.stringify({
        presets: [
          { id: 'short', label: 'Short break', seconds: 30 },
          { id: 'focus', label: 'Focus', seconds: 900 },
        ],
      }),
    })
    const presetBtns = wrapper.findAll('.timer-app__preset-btn')
    expect(presetBtns.map(button => button.text())).toEqual(['Short break', 'Focus'])
  })

  it('start button is visible when idle', () => {
    const { wrapper } = mountApp()
    const startBtn = wrapper.findAll('.timer-app__control-btn').find(b => b.text().includes('Start'))
    expect(startBtn).toBeTruthy()
  })

  it('setting a preset starts the timer', async () => {
    const { wrapper } = mountApp()
    const presetBtns = wrapper.findAll('.timer-app__preset-btn')
    // Click "1 min" preset
    await presetBtns[0].trigger('click')
    await nextTick()
    // Timer should now be running — start button should disappear, pause button should appear
    const pauseBtn = wrapper.findAll('.timer-app__control-btn').find(b => b.text().includes('Pause'))
    expect(pauseBtn).toBeTruthy()
  })

  it('pause and resume cycle works', async () => {
    const { wrapper } = mountApp()
    const presetBtns = wrapper.findAll('.timer-app__preset-btn')
    // Start with 1 min
    await presetBtns[0].trigger('click')
    await nextTick()

    // Pause
    const pauseBtn = wrapper.findAll('.timer-app__control-btn').find(b => b.text().includes('Pause'))
    expect(pauseBtn).toBeTruthy()
    await pauseBtn!.trigger('click')
    await nextTick()

    // Resume button should be visible
    const resumeBtn = wrapper.findAll('.timer-app__control-btn').find(b => b.text().includes('Resume'))
    expect(resumeBtn).toBeTruthy()

    // Resume
    await resumeBtn!.trigger('click')
    await nextTick()

    // Pause button should be back
    const pauseBtnAgain = wrapper.findAll('.timer-app__control-btn').find(b => b.text().includes('Pause'))
    expect(pauseBtnAgain).toBeTruthy()
  })

  it('reset returns to idle', async () => {
    const { wrapper } = mountApp()
    const presetBtns = wrapper.findAll('.timer-app__preset-btn')
    await presetBtns[0].trigger('click')
    await nextTick()

    // Find reset button
    const resetBtn = wrapper.findAll('.timer-app__control-btn').find(b => b.text().includes('Reset'))
    expect(resetBtn).toBeTruthy()
    await resetBtn!.trigger('click')
    await nextTick()

    // Should be back to idle — presets visible again
    expect(wrapper.findAll('.timer-app__preset-btn').length).toBe(4)
    expect(wrapper.find('.timer-app__time').text()).toBe('00:00')
  })

  it('persists timer state to localStorage', async () => {
    const { wrapper, ls } = mountApp()
    const presetBtns = wrapper.findAll('.timer-app__preset-btn')
    await presetBtns[0].trigger('click')
    await nextTick()

    expect(ls.setItem).toHaveBeenCalledWith('tiko:timer', expect.any(String))
    const saved = JSON.parse(ls.store['tiko:timer'])
    expect(saved.mode).toBe('running')
  })

  it('expired state shows correctly', async () => {
    // Start a 1-second timer
    const { wrapper } = mountApp()
    const presetBtns = wrapper.findAll('.timer-app__preset-btn')

    // We need to start with custom time of 1 second
    // Let's use the composable directly via a different approach:
    // Mount and find the timer ring, check the expired label is hidden initially
    expect(wrapper.find('.timer-app__expired-label').exists()).toBe(false)

    // Start a preset, then advance time far enough
    await presetBtns[0].trigger('click')
    await nextTick()

    // Advance past 60 seconds
    vi.advanceTimersByTime(61_000)
    await nextTick()

    // After expiry, expired label should show
    const expiredLabel = wrapper.find('.timer-app__expired-label')
    expect(expiredLabel.exists()).toBe(true)
  })

  it('settings panel opens and closes', async () => {
    const { wrapper } = mountApp()
    // Settings panel not visible initially
    expect(wrapper.find('.tiko-settings-panel-stub').exists()).toBe(false)

    // The settings action is handled via headerAction — we'd need to emit header-action
    // Since we stub TikoAppShell, we can emit directly
    const shell = wrapper.findComponent({ name: 'TikoAppShell' })
    shell.vm.$emit('headerAction', 'settings')
    await nextTick()

    expect(wrapper.find('.tiko-settings-panel-stub').exists()).toBe(true)
  })
})
