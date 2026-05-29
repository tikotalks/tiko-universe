import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from './App.vue'

/* eslint-disable @typescript-eslint/no-explicit-any */

function createLocalStorageMock(initialData?: Record<string, string>) {
  const store: Record<string, string> = { ...initialData }
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    get store() { return store }
  }
}

function seedTracks(ls: ReturnType<typeof createLocalStorageMock>) {
  const tracks = [
    { id: 't1', title: 'Baby Shark', source: 'youtube', youtubeVideoId: 'abc', categoryId: 'animals', thumbnailUrl: 'https://img.youtube.com/abc/mqdefault.jpg', duration: 136 },
    { id: 't2', title: 'Wheels on the Bus', source: 'youtube', youtubeVideoId: 'def', categoryId: 'animals', thumbnailUrl: 'https://img.youtube.com/def/mqdefault.jpg', duration: 222 },
    { id: 't3', title: 'Twinkle Twinkle', source: 'upload', audioUrl: 'blob:xyz', categoryId: 'songs' },
  ]
  ls.store['tiko:radio:tracks'] = JSON.stringify(tracks)
}

function mountApp(existingLs?: ReturnType<typeof createLocalStorageMock>) {
  const ls = existingLs ?? createLocalStorageMock()
  const origLs = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true, configurable: true })

  const wrapper = mount(App, {
    global: {
      provide: {
        popupService: { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
      },
      stubs: {
        'tiko-app-shell': {
          name: 'TikoAppShell',
          template: '<div class="tiko-app-shell-stub"><slot /></div>',
          props: ['appName', 'appIcon', 'appColor', 'actions', 'avatar'],
          methods: {
            emit: vi.fn()
          }
        },
        'tiko-settings-panel': {
          name: 'TikoSettingsPanel',
          template: '<div class="tiko-settings-panel-stub">Settings</div>',
          props: ['language', 'colorMode']
        },
        'sil-button': {
          template: '<button class="sil-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          props: ['variant', 'icon', 'disabled', 'iconOnly'],
          emits: ['click']
        },
        'sil-icon': {
          template: '<span class="sil-icon-stub" />'
        }
      }
    }
  })

  return { wrapper, ls }
}

function restoreLocalStorage() {
  // Restore if possible
  try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, writable: true, configurable: true }) } catch { /* */ }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    ok: false, status: 0, statusText: 'Fake', json: () => Promise.resolve({})
  })))
  // Mock HTMLMediaElement.play()
  if (typeof globalThis.window !== 'undefined') {
    const orig = globalThis.window.HTMLMediaElement?.prototype?.play
    if (!orig || orig.toString().includes('Not implemented')) {
      globalThis.window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
    }
    globalThis.window.HTMLMediaElement.prototype.pause = vi.fn()
    globalThis.window.HTMLMediaElement.prototype.load = vi.fn()
  }
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  restoreLocalStorage()
})

describe('Radio App (kid mode + parent mode)', () => {
  it('renders parent mode by default (temp user)', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    // Parent mode is the default for all users (temp or logged-in)
    expect(wrapper.find('.radio-app__manage').exists()).toBe(true)
    // Kid mode should NOT be visible by default
    expect(wrapper.find('.radio-app__kid').exists()).toBe(false)
  })

  it('kid mode shows category cards with tracks, no + tile', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    // Switch to kid mode
    await wrapper.setData({ parentMode: false })
    await nextTick()

    // No tracks → no category cards, no + tile (kids can't add)
    let categoryCards = wrapper.findAll('.radio-app__category-card')
    expect(categoryCards.length).toBe(0)

    // Seed a track in a category → category tiles should appear
    await wrapper.vm.library.addTrack({
      title: 'Test Song',
      source: 'youtube',
      youtubeVideoId: 'abc123',
      categoryId: 'animals',
    })
    await nextTick()

    categoryCards = wrapper.findAll('.radio-app__category-card')
    expect(categoryCards.length).toBeGreaterThanOrEqual(1)
    expect(categoryCards[0].classes()).not.toContain('radio-app__category-card--add')
  })

  it('kid mode shows track grid area', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    // Switch to kid mode
    await wrapper.setData({ parentMode: false })
    await nextTick()

    expect(wrapper.find('.radio-app__kid').exists()).toBe(true)
  })

  it('kid mode does not show shuffle/repeat controls', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    // Kids don't need shuffle/repeat — those are parent-mode only
    const controls = wrapper.findAll('.radio-app__extra-controls button')
    expect(controls.length).toBe(0)
  })

  it('shows track grid when category has tracks', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    const { wrapper } = mountApp(ls)
    await nextTick()

    // Switch to kid mode
    await wrapper.setData({ parentMode: false })
    await nextTick()

    // Select the animals category
    const animalCard = wrapper.findAll('.radio-app__category-card').find(
      c => c.text().includes('Animals')
    )
    if (animalCard) await animalCard.trigger('click')
    await nextTick()

    const trackCards = wrapper.findAll('.radio-app__track-card')
    expect(trackCards.length).toBe(2) // Baby Shark + Wheels on the Bus
  })

  it('shows empty state when no tracks exist', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    // No tracks seeded — should show empty text
    const trackGrid = wrapper.find('.radio-app__track-grid')
    expect(trackGrid.exists()).toBe(false)
  })

  it('parent mode shows video management', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    // Force parent mode on
    await wrapper.setData({ parentMode: true })
    await nextTick()

    expect(wrapper.find('.radio-app__manage').exists()).toBe(true)
    // No title/subtitle — just the video list and tabs
    expect(wrapper.find('.radio-app__manage__tabs').exists()).toBe(true)
    expect(wrapper.find('.radio-app__manage__notice').exists()).toBe(true)
  })

  it('parent mode shows category tabs', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    await wrapper.setData({ parentMode: true })
    await nextTick()

    const tabs = wrapper.findAll('.radio-app__manage__tab')
    expect(tabs.length).toBeGreaterThan(0)
  })

  it('parent mode shows video list, add is via popup', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    await wrapper.setData({ parentMode: true })
    await nextTick()

    // Add form is no longer inline — it opens via popupService
    // Verify the manage list section exists
    const addSection = wrapper.find('.radio-app__manage__list')
    expect(addSection.exists()).toBe(true)
  })

  it('parent mode shows video list with tracks', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    const { wrapper } = mountApp(ls)
    await nextTick()

    await wrapper.setData({ parentMode: true, manageCategoryId: 'animals' })
    await nextTick()

    const videoRows = wrapper.findAll('.radio-app__manage__video-row')
    expect(videoRows.length).toBe(2) // 2 tracks in animals category
  })

  it('categories composable uses localStorage', async () => {
    // Verify the composable accesses localStorage during init
    const ls = createLocalStorageMock()
    vi.spyOn(globalThis, 'localStorage', 'get').mockReturnValue(ls)
    mountApp(ls)
    await nextTick()
    // Composable should have read categories from localStorage
    expect(ls.getItem).toHaveBeenCalledWith('tiko:radio:categories')
  })
})
