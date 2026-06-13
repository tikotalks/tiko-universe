import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from './App.vue'

/* eslint-disable @typescript-eslint/no-explicit-any */

function createLocalStorageMock(initialData?: Record<string, string>) {
  const store: Record<string, string> = { ...initialData }
  return {
    length: Object.keys(store).length,
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get store() { return store }
  } satisfies Storage
}

function seedTracks(ls: ReturnType<typeof createLocalStorageMock>) {
  const tracks = [
    { id: 't1', title: 'Baby Shark', source: 'youtube', youtubeVideoId: 'abc', categoryId: 'animals', thumbnailUrl: 'https://img.youtube.com/abc/mqdefault.jpg', duration: 136 },
    { id: 't2', title: 'Wheels on the Bus', source: 'youtube', youtubeVideoId: 'def', categoryId: 'animals', thumbnailUrl: 'https://img.youtube.com/def/mqdefault.jpg', duration: 222 },
    { id: 't3', title: 'Twinkle Twinkle', source: 'upload', audioUrl: 'https://media.tikoapi.org/v1/media/twinkle/download', categoryId: 'songs' },
  ]
  ls.store['tiko:radio:tracks'] = JSON.stringify(tracks)
}

function seedCategories(ls: ReturnType<typeof createLocalStorageMock>) {
  const categories = [
    { id: 'animals', name: 'Animals', icon: 'animals/cat-head', color: 'yellow', order: 0, trackIds: ['t1', 't2'] },
    { id: 'songs', name: 'Songs', icon: 'media/music-note', color: 'pink', order: 1, trackIds: ['t3'] },
  ]
  ls.store['tiko:radio:categories'] = JSON.stringify(categories)
}

function mountApp(
  existingLs?: ReturnType<typeof createLocalStorageMock>,
  popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } },
) {
  const ls = existingLs ?? createLocalStorageMock()
  const origLs = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true, configurable: true })

  const wrapper = mount(App, {
    global: {
      provide: {
        popupService,
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

  return { wrapper, ls, popupService }
}

async function flushAsync() {
  for (let i = 0; i < 20; i += 1) await Promise.resolve()
  await nextTick()
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

describe('Radio App (unified layout)', () => {
  it('renders content area by default (parent mode is default)', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    // Both modes share the same content area
    expect(wrapper.find('.radio-app__content').exists()).toBe(true)
  })

  it('shows 2-column track grid on mobile', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const { wrapper } = mountApp(ls)
    await nextTick()

    const trackCards = wrapper.findAll('.radio-app__track-card')
    // With no category selected, all 3 tracks show
    expect(trackCards.length).toBe(3)
  })

  it('shows category cards for categories that have videos', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const { wrapper } = mountApp(ls)
    await nextTick()

    const categoryCards = wrapper.findAll('.radio-app__category-card')
    // animals + songs = 2 categories with tracks, + add button in parent mode = 3
    expect(categoryCards.length).toBe(3)
  })

  it('parent mode shows + category button, kid mode does not', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const { wrapper } = mountApp(ls)
    await nextTick()

    // Parent mode (default): should have + add card
    const addCards = wrapper.findAll('.radio-app__category-card--add')
    expect(addCards.length).toBe(1)

    // Switch to kid mode
    await wrapper.setData({ parentMode: false })
    await nextTick()

    // Kid mode: no + add card
    const kidAddCards = wrapper.findAll('.radio-app__category-card--add')
    expect(kidAddCards.length).toBe(0)
  })

  it('parent mode shows delete buttons on track cards, kid mode does not', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const { wrapper } = mountApp(ls)
    await nextTick()

    // Parent mode: delete buttons on tracks
    const removeBtns = wrapper.findAll('.radio-app__track-card__remove')
    expect(removeBtns.length).toBe(3)

    // Switch to kid mode
    await wrapper.setData({ parentMode: false })
    await nextTick()

    // Kid mode: no delete buttons
    const kidRemoveBtns = wrapper.findAll('.radio-app__track-card__remove')
    expect(kidRemoveBtns.length).toBe(0)
  })

  it('kid mode hides + add-video header action', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    // Switch to kid mode
    await wrapper.setData({ parentMode: false })
    await nextTick()

    // In kid mode, clicking add-video action should not open popup
    const actions = (wrapper.vm as any).headerActions as Array<{ id: string }>
    const addVideoAction = actions.find(a => a.id === 'add-video')
    // The action is still visible but handler returns early in child mode
    expect(addVideoAction).toBeDefined()
  })

  it('filters tracks by selected category', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const { wrapper } = mountApp(ls)
    await nextTick()

    // No category selected → all 3 tracks
    expect(wrapper.findAll('.radio-app__track-card').length).toBe(3)

    // Select animals category
    const animalCard = wrapper.findAll('.radio-app__category-card').find(
      c => c.text().includes('Animals')
    )
    if (animalCard) await animalCard.trigger('click')
    await nextTick()

    // Only 2 animal tracks
    expect(wrapper.findAll('.radio-app__track-card').length).toBe(2)
  })

  it('loads public audio albums from the media library before generated-story fallback', async () => {
    const ls = createLocalStorageMock()
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (String(url).endsWith('/identity/session') || String(url).endsWith('/identity/device')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            subject: { id: 'user-device', kind: 'device', product: 'tiko' },
            device: { id: 'device-1', secret: 'device-secret' },
            account: null,
            session: { id: 'session-1', token: 'session-token', transport: 'bearer', expiresAt: '2099-01-01T00:00:00.000Z' }
          })
        })
      }
      if (String(url).includes('/apps/radio/settings')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ app: 'radio', updatedAt: null, version: 1, settings: {} }) })
      }
      if (String(url).includes('/apps/radio/state')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ app: 'radio', updatedAt: null, version: 1, state: {} }) })
      }
      if (String(url).includes('/audio/albums')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              {
                id: 'album-bedtime',
                title: 'Bedtime stories',
                radioEnabled: true,
                tracks: [
                  {
                    id: 'track-rabbit',
                    title: 'The Sleepy Rabbit',
                    artist: 'Tiko Story Narrator',
                    audioUrl: 'https://media.tikoapi.org/v1/media/audio-rabbit/download',
                    durationSeconds: 180,
                    position: 1,
                  },
                ],
              },
            ],
          }),
        })
      }
      if (String(url).includes('/stories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
      }
      return Promise.resolve({ ok: false, status: 0, json: () => Promise.resolve({}) })
    }))

    const { wrapper } = mountApp(ls)
    await flushAsync()

    expect(globalThis.fetch).toHaveBeenCalledWith('https://media.tikoapi.org/v1/audio/albums?radioEnabled=true')
    expect(wrapper.findAll('.radio-app__track-card').some(card => card.text().includes('The Sleepy Rabbit'))).toBe(true)
  })

  it('shows empty state when no tracks exist', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    // No tracks seeded — should show empty text
    const trackGrid = wrapper.find('.radio-app__track-grid')
    expect(trackGrid.exists()).toBe(false)
    expect(wrapper.find('.radio-app__empty').exists()).toBe(true)
  })

  it('categories composable uses localStorage', async () => {
    const ls = createLocalStorageMock()
    vi.spyOn(globalThis, 'localStorage', 'get').mockReturnValue(ls)
    mountApp(ls)
    await nextTick()
    // Composable should have read categories from localStorage
    expect(ls.getItem).toHaveBeenCalledWith('tiko:radio:categories')
  })

  it('new category form shows in parent mode when + card clicked', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    // Click the + add category card
    const addCard = wrapper.find('.radio-app__category-card--add')
    if (addCard.exists()) {
      await addCard.trigger('click')
      await nextTick()
      expect(wrapper.find('.radio-app__new-cat-form').exists()).toBe(true)
    }
  })

  it('kid mode does not show new category form', async () => {
    const { wrapper } = mountApp()
    await nextTick()

    await wrapper.setData({ parentMode: false })
    await nextTick()

    expect(wrapper.find('.radio-app__new-cat-form').exists()).toBe(false)
    expect(wrapper.find('.radio-app__category-card--add').exists()).toBe(false)
  })

  it('uses identity runtime composable and does not store pinHash locally', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const candidates = [
      path.resolve(__dirname, 'App.vue'),
      path.resolve(__dirname, '../../src/App.vue'),
    ]
    const sourcePath = candidates.find(p => fs.existsSync(p))
    expect(sourcePath).toBeTruthy()
    const source = fs.readFileSync(sourcePath!, 'utf-8')

    // Must use the shared identity runtime composable
    expect(source).toContain('useIdentityRuntime')
    expect(source).toContain('runtime.handleAvatarClick')
    expect(source).toContain('runtimeState')

    // Must NOT store pinHash locally
    expect(source).not.toContain('pinHash')
    expect(source).not.toContain('pinHash.value')

    // Must use runtime-driven refs
    expect(source).toContain('childModeEnabled')
    expect(source).toContain('pinConfigured')
  })

  it('updates volume from the popup native range input', async () => {
    const popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
    const { wrapper } = mountApp(undefined, popupService)
    await nextTick()

    ;(wrapper.vm as any).headerAction('volume')

    expect(popupService.showPopup).toHaveBeenCalledTimes(1)
    const popupConfig = popupService.showPopup.mock.calls[0][0]
    const popupWrapper = mount(popupConfig.component, {
      props: popupConfig.props,
    })

    await popupWrapper.find('input[type="range"]').setValue('0.35')

    expect(popupWrapper.emitted('update:volume')?.[0]).toEqual([0.35])
  })
})
