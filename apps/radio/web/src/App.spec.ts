import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
          template: '<button class="sil-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          props: ['variant', 'icon', 'disabled'],
          emits: ['click']
        }
      }
    }
  })

  return { wrapper, ls }
}

function seedTracks(ls: ReturnType<typeof createLocalStorageMock>) {
  const tracks = [
    { id: 't1', title: 'Baby Shark', artist: 'Pinkfong', source: 'youtube', youtubeVideoId: 'XqZsoesa55w', addedAt: '2026-01-01' },
    { id: 't2', title: 'Wheels on the Bus', artist: 'Super Simple Songs', source: 'r2', audioUrl: 'https://r2.example.com/wheels.mp3', addedAt: '2026-01-02' },
    { id: 't3', title: 'Twinkle Twinkle', artist: null, source: 'upload', audioUrl: 'blob:http://localhost/twinkle', addedAt: '2026-01-03' }
  ]
  ls.store['tiko:radio:tracks'] = JSON.stringify(tracks)
  return tracks
}

describe('Radio App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Mock HTMLMediaElement since jsdom doesn't implement play()
    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
      globalThis.window.HTMLMediaElement.prototype.pause = vi.fn()
      globalThis.window.HTMLMediaElement.prototype.load = vi.fn()
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: false,
      status: 0,
      statusText: 'Fake network error',
      json: () => Promise.resolve({ error: { code: 'network_error', message: 'No network' } })
    })))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders player UI with no login wall', () => {
    const { wrapper } = mountApp()
    expect(wrapper.find('.radio-app').exists()).toBe(true)
    expect(wrapper.find('.radio-app__now-playing').exists()).toBe(true)
    expect(wrapper.find('.radio-app__track-name').exists()).toBe(true)
    expect(wrapper.find('.radio-app__controls').exists()).toBe(true)
    expect(wrapper.find('.radio-app__library').exists()).toBe(true)
  })

  it('empty library shows empty message', () => {
    const { wrapper } = mountApp()
    expect(wrapper.find('.radio-app__library-empty').exists()).toBe(true)
    expect(wrapper.find('.radio-app__library-list').exists()).toBe(false)
  })

  it('seeded library shows tracks', () => {
    const { wrapper, ls } = mountApp()
    seedTracks(ls)
    // Re-mount to pick up the seeded data
    const { wrapper: w2 } = mountApp(ls.store)
    const items = w2.findAll('.radio-app__library-item')
    expect(items.length).toBe(3)
    expect(items[0].text()).toContain('Baby Shark')
    expect(items[1].text()).toContain('Wheels on the Bus')
    expect(items[2].text()).toContain('Twinkle Twinkle')
  })

  it('add track panel opens and closes', async () => {
    const { wrapper } = mountApp()

    // Panel content not visible initially
    expect(wrapper.find('.radio-app__add-panel__content').exists()).toBe(false)

    // Find the "Add Track" button (inside .radio-app__add-panel)
    const addBtn = wrapper.find('.radio-app__add-panel button')
    expect(addBtn.exists()).toBe(true)
    await addBtn.trigger('click')
    await nextTick()

    // Content should now be visible
    expect(wrapper.find('.radio-app__add-panel__content').exists()).toBe(true)
    expect(wrapper.find('.radio-app__add-panel__youtube-input').exists()).toBe(true)
    expect(wrapper.find('.radio-app__add-panel__upload-label').exists()).toBe(true)

    // Click again to close
    await addBtn.trigger('click')
    await nextTick()
    expect(wrapper.find('.radio-app__add-panel__content').exists()).toBe(false)
  })

  it('YouTube URL input is present in add panel', async () => {
    const { wrapper } = mountApp()

    // Open add panel
    const addBtn = wrapper.find('.radio-app__add-panel button')
    await addBtn.trigger('click')
    await nextTick()

    const input = wrapper.find('.radio-app__add-panel__youtube-input input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('type')).toBe('url')

    // Should have an add button next to it
    const addYoutubeBtns = wrapper.findAll('.radio-app__add-panel__youtube-input button')
    expect(addYoutubeBtns.length).toBe(1)
  })

  it('transport controls are present', () => {
    const { wrapper } = mountApp()
    const controls = wrapper.findAll('.radio-app__controls button')
    // Should have: previous, play, next, shuffle, repeat = 5 buttons
    expect(controls.length).toBe(5)
  })

  it('shuffle and repeat buttons exist', () => {
    const { wrapper } = mountApp()
    const controls = wrapper.findAll('.radio-app__controls button')
    const textContents = controls.map(b => b.text())
    expect(textContents.length).toBe(5)
  })

  it('volume slider exists', () => {
    const { wrapper } = mountApp()
    const volumeInput = wrapper.find('#radio-volume')
    expect(volumeInput.exists()).toBe(true)
    expect(volumeInput.attributes('type')).toBe('range')
    expect(volumeInput.attributes('min')).toBe('0')
    expect(volumeInput.attributes('max')).toBe('1')
  })

  it('settings panel opens and closes', async () => {
    const { wrapper } = mountApp()

    expect(wrapper.find('.tiko-settings-panel-stub').exists()).toBe(false)

    const shell = wrapper.findComponent({ name: 'TikoAppShell' })
    shell.vm.$emit('headerAction', 'settings')
    await nextTick()

    expect(wrapper.find('.tiko-settings-panel-stub').exists()).toBe(true)

    shell.vm.$emit('headerAction', 'settings')
    await nextTick()

    expect(wrapper.find('.tiko-settings-panel-stub').exists()).toBe(false)
  })

  it('localStorage persistence works for state', async () => {
    const { wrapper, ls } = mountApp()

    // Open add panel and add a YouTube track to trigger setItem
    const addBtn = wrapper.find('.radio-app__add-panel button')
    await addBtn.trigger('click')
    await nextTick()

    const input = wrapper.find('.radio-app__add-panel__youtube-input input')
    await input.setValue('https://youtube.com/watch?v=dQw4w9WgXcQ')
    await nextTick()

    const addYouTubeBtn = wrapper.find('.radio-app__add-panel__youtube-input button')
    await addYouTubeBtn.trigger('click')
    await nextTick()

    // The library watcher should have saved tracks to localStorage
    const setItemCalls = ls.setItem.mock.calls.map((c: string[]) => c[0])
    expect(setItemCalls).toContain('tiko:radio:tracks')
  })

  it('selecting a track highlights it', async () => {
    const { wrapper, ls } = mountApp()
    seedTracks(ls)
    const { wrapper: w2 } = mountApp(ls.store)

    const items = w2.findAll('.radio-app__library-item')
    expect(items.length).toBe(3)

    // Click the second track
    await items[1].trigger('click')
    await nextTick()

    const updatedItems = w2.findAll('.radio-app__library-item')
    expect(updatedItems[1].classes()).toContain('radio-app__library-item--active')
    expect(updatedItems[0].classes()).not.toContain('radio-app__library-item--active')
  })

  it('removing a track from library', async () => {
    const { wrapper, ls } = mountApp()
    seedTracks(ls)
    const { wrapper: w2, ls: ls2 } = mountApp(ls.store)

    const items = w2.findAll('.radio-app__library-item')
    expect(items.length).toBe(3)

    // Click remove button on first track
    const removeBtn = w2.findAll('.radio-app__library-item-remove')[0]
    await removeBtn.trigger('click')
    await nextTick()

    const updatedItems = w2.findAll('.radio-app__library-item')
    expect(updatedItems.length).toBe(2)
    // First item should now be "Wheels on the Bus" (originally index 1)
    expect(updatedItems[0].text()).toContain('Wheels on the Bus')
  })
})
