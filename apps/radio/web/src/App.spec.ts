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

  it('shows a card per collection, with its song count', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const { wrapper } = mountApp(ls)
    await nextTick()

    const categoryCards = wrapper.findAll('.radio-app__category-card')
    expect(categoryCards.length).toBe(2)
    expect(categoryCards[0].text()).toContain('Animals')
    expect(categoryCards[0].text()).toContain('2 songs')
  })

  it('renders Tiko Media artwork on a collection card', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const { wrapper } = mountApp(ls)
    await nextTick()

    const artwork = wrapper.find('.radio-app__category-card__image')
    expect(artwork.exists()).toBe(true)
    expect(artwork.attributes('src')).toContain('data.tikocdn.org')
  })

  it('hides empty collections from a child but keeps them for a parent', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    ls.store['tiko:radio:categories'] = JSON.stringify([
      ...JSON.parse(ls.store['tiko:radio:categories']),
      { id: 'empty', name: 'Empty', icon: 'media/music-note', color: 'blue', order: 2 },
    ])
    const { wrapper } = mountApp(ls)
    await nextTick()

    expect(wrapper.findAll('.radio-app__category-card').length).toBe(3)

    ;(wrapper.vm as any).parentMode = false
    await nextTick()

    const childCards = wrapper.findAll('.radio-app__category-card')
    expect(childCards.length).toBe(2)
    expect(childCards.some(card => card.text().includes('Empty'))).toBe(false)
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

  it('kid mode ignores the + header action', async () => {
    const popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
    const { wrapper } = mountApp(undefined, popupService)
    await nextTick()

    const actions = (wrapper.vm as any).headerActions as Array<{ id: string }>
    expect(actions.find(action => action.id === 'add')).toBeDefined()

    ;(wrapper.vm as any).parentMode = false
    await nextTick()
    ;(wrapper.vm as any).headerAction('add')

    expect(popupService.showPopup).not.toHaveBeenCalled()
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

  it('seeds starter songs from the curated channel on a first run', async () => {
    const ls = createLocalStorageMock()
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (String(url).includes('/youtube/search')) {
        expect(String(url)).toContain('channelId=UCLXC88sF7_PSymrmXrw5f5w')
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [{
              videoId: 'abcdefghijk',
              title: 'Sleepy lullaby',
              channelTitle: 'Tiko Songs',
              thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
              durationSeconds: 205,
            }],
          }),
        })
      }
      return Promise.resolve({ ok: false, status: 0, json: () => Promise.resolve({}) })
    }))

    const { wrapper } = mountApp(ls)
    await flushAsync()

    expect(wrapper.findAll('.radio-app__track-card').some(card => card.text().includes('Sleepy lullaby'))).toBe(true)
    expect(JSON.parse(ls.store['tiko:radio:tracks'])[0]).toMatchObject({
      id: 'youtube:abcdefghijk',
      source: 'youtube',
      categoryId: 'music',
    })
    expect(ls.store['tiko:radio:default-songs-seeded']).toBeTruthy()
  })

  it('does not seed starter songs over an existing library', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const requested: string[] = []
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      requested.push(String(url))
      return Promise.resolve({ ok: false, status: 0, json: () => Promise.resolve({}) })
    }))

    mountApp(ls)
    await flushAsync()

    expect(requested.some(url => url.includes('/youtube/search'))).toBe(false)
  })

  it('seeds the default collections with their Tiko Media artwork', async () => {
    const ls = createLocalStorageMock()
    mountApp(ls)
    await flushAsync()

    const seeded = JSON.parse(ls.store['tiko:radio:categories']) as Array<{ id: string; imageUrl?: string }>
    expect(seeded.map(collection => collection.id)).toEqual(['animals', 'stories', 'music', 'calm', 'favorites'])
    expect(seeded.every(collection => Boolean(collection.imageUrl))).toBe(true)
  })

  it('links and unlinks a music subscription from the services popup', async () => {
    const popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
    const { wrapper, ls } = mountApp(undefined, popupService)
    await nextTick()

    ;(wrapper.vm as any).openServicesPopup()
    const services = popupService.showPopup.mock.calls[0][0]
    services.on.link('spotify')
    await nextTick()

    expect(JSON.parse(ls.store['tiko:radio:subscriptions'])).toEqual([
      expect.objectContaining({ provider: 'spotify' }),
    ])

    services.on.unlink('spotify')
    await nextTick()
    expect(JSON.parse(ls.store['tiko:radio:subscriptions'])).toEqual([])
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

  it('the + header action offers adding a song or a collection', async () => {
    const popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
    const { wrapper } = mountApp(undefined, popupService)
    await nextTick()

    ;(wrapper.vm as any).headerAction('add')

    expect(popupService.showPopup).toHaveBeenCalledTimes(1)
    const menu = popupService.showPopup.mock.calls[0][0]
    expect(menu.props.items.map((item: { id: string }) => item.id)).toEqual(['song', 'collection'])
  })

  it('choosing "add collection" from the + menu opens the collection form', async () => {
    const popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
    const { wrapper } = mountApp(undefined, popupService)
    await nextTick()

    ;(wrapper.vm as any).headerAction('add')
    popupService.showPopup.mock.calls[0][0].on.select('collection')
    await nextTick()

    const form = popupService.showPopup.mock.calls[1][0]
    expect(form.props.title).toBe('Add collection')
    expect(form.props.submitLabel).toBe('Create')
  })

  it('choosing "add song" targets the collection the child is looking at', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
    const { wrapper } = mountApp(ls, popupService)
    await nextTick()

    ;(wrapper.vm as any).selectCategory('songs')
    ;(wrapper.vm as any).headerAction('add')
    popupService.showPopup.mock.calls[0][0].on.select('song')
    await nextTick()

    const addSong = popupService.showPopup.mock.calls[1][0]
    expect(addSong.props.collectionId).toBe('songs')
    expect(addSong.props.collections.map((collection: { id: string }) => collection.id)).toEqual(['animals', 'songs'])
  })

  it('long-pressing a collection offers edit and delete', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
    const { wrapper } = mountApp(ls, popupService)
    await nextTick()

    const card = wrapper.find('[data-test="radio-collection-animals"]')
    await card.trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await nextTick()

    const menu = popupService.showPopup.mock.calls[0][0]
    expect(menu.props.title).toBe('Animals')
    expect(menu.props.items.map((item: { id: string }) => item.id)).toEqual(['edit', 'delete'])
    expect(menu.props.items[1].destructive).toBe(true)

    // The press that opened the menu must not also select the collection.
    await card.trigger('click')
    await nextTick()
    expect(wrapper.findAll('.radio-app__track-card').length).toBe(3)
  })

  it('a child cannot open the collection menu', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
    const { wrapper } = mountApp(ls, popupService)
    await nextTick()

    ;(wrapper.vm as any).parentMode = false
    await nextTick()

    await wrapper.find('[data-test="radio-collection-animals"]').trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await nextTick()

    expect(popupService.showPopup).not.toHaveBeenCalled()
  })

  it('warns that deleting a collection removes its songs, then removes both', async () => {
    const ls = createLocalStorageMock()
    seedTracks(ls)
    seedCategories(ls)
    const popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
    const { wrapper } = mountApp(ls, popupService)
    await nextTick()

    await wrapper.find('[data-test="radio-collection-animals"]').trigger('pointerdown')
    vi.advanceTimersByTime(600)
    popupService.showPopup.mock.calls[0][0].on.select('delete')
    await nextTick()

    const confirm = popupService.showPopup.mock.calls[1][0]
    expect(confirm.props.message).toBe('Deleting \u201cAnimals\u201d also removes its 2 songs.')
    expect(confirm.props.destructive).toBe(true)

    confirm.on.confirm()
    await nextTick()

    expect(wrapper.findAll('.radio-app__category-card').length).toBe(1)
    // Only the song from the other collection survives.
    expect(wrapper.findAll('.radio-app__track-card').length).toBe(1)
  })

  it('warns without a song count when the collection is empty', async () => {
    const ls = createLocalStorageMock()
    seedCategories(ls)
    const popupService = { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } }
    const { wrapper } = mountApp(ls, popupService)
    await nextTick()

    ;(wrapper.vm as any).confirmDeleteCollection({ id: 'animals', name: 'Animals', icon: 'x', color: 'red', order: 0 })
    await nextTick()

    expect(popupService.showPopup.mock.calls[0][0].props.message).toBe('Delete \u201cAnimals\u201d?')
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
