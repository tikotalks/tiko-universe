import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from './App.vue'

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
          props: ['variant', 'icon', 'disabled'],
          emits: ['click']
        }
      }
    }
  })

  return { wrapper, ls }
}

describe('Radio App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('opens immediately with player UI, no login wall', () => {
    const { wrapper } = mountApp()
    expect(wrapper.find('.radio-app').exists()).toBe(true)
    expect(wrapper.find('.radio-app__now-playing').exists()).toBe(true)
    expect(wrapper.find('.radio-app__track-name').exists()).toBe(true)
  })

  it('transport controls visible (play/pause, next, previous)', () => {
    const { wrapper } = mountApp()
    const controlBtns = wrapper.findAll('.radio-app__control-btn')
    // Should have at least previous, play, next
    expect(controlBtns.length).toBeGreaterThanOrEqual(3)
  })

  it('playlist shows sample tracks', () => {
    const { wrapper } = mountApp()
    const items = wrapper.findAll('.radio-app__playlist-item')
    expect(items.length).toBe(3)
    expect(items[0].text()).toContain('Sample Track 1')
    expect(items[1].text()).toContain('Sample Track 2')
    expect(items[2].text()).toContain('Sample Track 3')
  })

  it('clicking a track selects it', async () => {
    const { wrapper } = mountApp()
    const items = wrapper.findAll('.radio-app__playlist-item')

    // First track should be active by default
    expect(items[0].classes()).toContain('radio-app__playlist-item--active')

    // Click the second track
    await items[1].trigger('click')
    await nextTick()

    // Second track should now be active, first should not
    const updatedItems = wrapper.findAll('.radio-app__playlist-item')
    expect(updatedItems[1].classes()).toContain('radio-app__playlist-item--active')
    expect(updatedItems[0].classes()).not.toContain('radio-app__playlist-item--active')
  })

  it('next cycles through tracks', async () => {
    const { wrapper } = mountApp()
    const controlBtns = wrapper.findAll('.radio-app__control-btn')

    // Find the next button
    const nextBtn = controlBtns.find(b => b.text().includes('Next'))
    expect(nextBtn).toBeTruthy()

    // Click next — should go from index 0 to 1
    await nextBtn!.trigger('click')
    await nextTick()

    const items = wrapper.findAll('.radio-app__playlist-item')
    expect(items[1].classes()).toContain('radio-app__playlist-item--active')
  })

  it('previous cycles through tracks', async () => {
    const { wrapper } = mountApp()
    const controlBtns = wrapper.findAll('.radio-app__control-btn')

    // Find the previous button
    const prevBtn = controlBtns.find(b => b.text().includes('Previous'))
    expect(prevBtn).toBeTruthy()

    // Click previous from index 0 — should wrap to last track
    await prevBtn!.trigger('click')
    await nextTick()

    const items = wrapper.findAll('.radio-app__playlist-item')
    expect(items[2].classes()).toContain('radio-app__playlist-item--active')
  })

  it('localStorage persistence works', async () => {
    const { wrapper, ls } = mountApp()
    const controlBtns = wrapper.findAll('.radio-app__control-btn')

    // Click next to change state
    const nextBtn = controlBtns.find(b => b.text().includes('Next'))
    await nextBtn!.trigger('click')
    await nextTick()

    expect(ls.setItem).toHaveBeenCalledWith('tiko:radio', expect.any(String))
    const saved = JSON.parse(ls.store['tiko:radio'])
    expect(saved.currentTrackIndex).toBe(1)
  })

  it('settings panel opens and closes', async () => {
    const { wrapper } = mountApp()

    // Settings panel not visible initially
    expect(wrapper.find('.tiko-settings-panel-stub').exists()).toBe(false)

    // Emit header-action to open settings
    const shell = wrapper.findComponent({ name: 'TikoAppShell' })
    shell.vm.$emit('headerAction', 'settings')
    await nextTick()

    expect(wrapper.find('.tiko-settings-panel-stub').exists()).toBe(true)

    // Emit again to close
    shell.vm.$emit('headerAction', 'settings')
    await nextTick()

    expect(wrapper.find('.tiko-settings-panel-stub').exists()).toBe(false)
  })
})
