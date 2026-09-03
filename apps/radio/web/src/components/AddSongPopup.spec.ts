import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AddSongPopup from './AddSongPopup.vue'

/* eslint-disable @typescript-eslint/no-explicit-any */

const collections = [
  { id: 'animals', name: 'Animals', icon: 'animals/cat-head', color: 'yellow' as const, order: 0 },
  { id: 'music', name: 'Music', icon: 'media/music-note', color: 'orange' as const, order: 1 },
]

const labels = {
  addSong: 'Add song',
  youtube: 'YouTube',
  youtubeHint: 'Search YouTube',
  upload: 'Upload File',
  uploadHint: 'MP3, WAV, M4A',
  uploadTitle: 'Upload audio',
  chooseFile: 'Tap to choose an audio file',
  searchYouTube: 'Search YouTube',
  searchPlaceholder: 'Search for songs, stories…',
  searchEmpty: 'Nothing found. Try other words.',
  searchUnavailable: 'Search is unavailable right now — paste a link instead.',
  pasteLink: 'Paste a YouTube link',
  pasteLinkPlaceholder: 'https://youtube.com/…',
  pasteServiceLink: 'Paste a song link',
  pasteServiceLinkPlaceholder: 'https://open.spotify.com/track/…',
  collection: 'Collections',
  toCollection: 'Add to {collection}',
  audioOnly: 'Only the sound plays — the video stays hidden.',
  linkNotRecognised: 'That link is not a song Radio can play.',
  addFrom: 'Add from {service}',
  back: 'Back',
  close: 'Close',
  services: 'Music services',
  servicesHint: 'Link a subscription',
}

function mountPopup(props: Record<string, unknown> = {}) {
  return mount(AddSongPopup, {
    props: { collections, linkedProviders: [], labels, ...props },
    global: {
      provide: { popupService: { showPopup: vi.fn(), close: vi.fn(), closeAllPopups: vi.fn(), popups: { value: [] } } },
      stubs: { 'sil-icon': { template: '<span class="sil-icon-stub" />' } },
    },
  })
}

async function flush() {
  for (let i = 0; i < 20; i += 1) await Promise.resolve()
  await nextTick()
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('AddSongPopup', () => {
  it('lists YouTube search results as the parent types', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      expect(String(url)).toContain('/youtube/search?q=lullaby')
      return {
        ok: true,
        json: async () => ({
          data: [{
            videoId: 'abcdefghijk',
            title: 'Sleepy lullaby',
            channelTitle: 'Tiko Songs',
            thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
            durationSeconds: 205,
          }],
        }),
      }
    }))

    const wrapper = mountPopup()
    await wrapper.find('[data-test="radio-add-source-youtube"]').trigger('click')
    await wrapper.find('[data-test="radio-youtube-search"]').setValue('lullaby')
    await vi.advanceTimersByTimeAsync(400)
    await flush()

    const results = wrapper.findAll('.add-song__result')
    expect(results).toHaveLength(1)
    expect(results[0].text()).toContain('Sleepy lullaby')
    expect(results[0].text()).toContain('3:25')
  })

  it('adds the picked video to the chosen collection, audio only', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{
          videoId: 'abcdefghijk',
          title: 'Sleepy lullaby',
          channelTitle: 'Tiko Songs',
          thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
          durationSeconds: 205,
        }],
      }),
    })))

    const wrapper = mountPopup({ collectionId: 'music' })
    await wrapper.find('[data-test="radio-add-source-youtube"]').trigger('click')
    await wrapper.find('[data-test="radio-youtube-search"]').setValue('lullaby')
    await vi.advanceTimersByTimeAsync(400)
    await flush()

    await wrapper.find('.add-song__result').trigger('click')
    await wrapper.find('[data-test="radio-add-youtube-submit"]').trigger('click')

    expect(wrapper.emitted('add')?.[0][0]).toEqual({
      title: 'Sleepy lullaby',
      artist: 'Tiko Songs',
      source: 'youtube',
      youtubeVideoId: 'abcdefghijk',
      thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
      duration: 205,
      categoryId: 'music',
    })
  })

  /**
   * The old flow said "Add to collection" on a screen that was not a collection.
   * The button now names the collection the song actually lands in.
   */
  it('names the target collection on the add button', async () => {
    const wrapper = mountPopup({ collectionId: 'animals' })
    await wrapper.find('[data-test="radio-add-source-youtube"]').trigger('click')

    expect(wrapper.find('[data-test="radio-add-youtube-submit"]').text()).toBe('Add to Animals')

    await wrapper.find('[data-test="radio-collection-chip-music"]').trigger('click')
    expect(wrapper.find('[data-test="radio-add-youtube-submit"]').text()).toBe('Add to Music')
  })

  it('offers link paste when search is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: { code: 'youtube_not_configured' } }),
    })))

    const wrapper = mountPopup({ collectionId: 'music' })
    await wrapper.find('[data-test="radio-add-source-youtube"]').trigger('click')
    await wrapper.find('[data-test="radio-youtube-search"]').setValue('lullaby')
    await vi.advanceTimersByTimeAsync(400)
    await flush()

    expect(wrapper.find('.add-song__note').text()).toBe(labels.searchUnavailable)
    expect(wrapper.find('[data-test="radio-youtube-url"]').exists()).toBe(true)
  })

  it('only offers a streaming service once its subscription is linked', async () => {
    expect(mountPopup().find('[data-test="radio-add-source-spotify"]').exists()).toBe(false)

    const linked = mountPopup({ linkedProviders: ['spotify'] })
    expect(linked.find('[data-test="radio-add-source-spotify"]').exists()).toBe(true)
    expect(linked.find('[data-test="radio-add-source-apple-music"]').exists()).toBe(false)
  })

  it('adds a Spotify song from a share link', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      expect(String(url)).toContain('/music/resolve?url=')
      return {
        ok: true,
        json: async () => ({
          data: {
            provider: 'spotify',
            externalId: '4uLU6hMCjMI75M1A2tKUQC',
            externalUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
            title: 'Twinkle Twinkle',
            artist: 'Tiko Songs',
            thumbnailUrl: 'https://i.scdn.co/image/twinkle',
            durationSeconds: 120,
          },
        }),
      }
    }))

    const wrapper = mountPopup({ collectionId: 'music', linkedProviders: ['spotify'] })
    await wrapper.find('[data-test="radio-add-source-spotify"]').trigger('click')
    await wrapper.find('[data-test="radio-service-url"]').setValue('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')
    await flush()

    await wrapper.find('[data-test="radio-add-service-submit"]').trigger('click')

    expect(wrapper.emitted('add')?.[0][0]).toMatchObject({
      title: 'Twinkle Twinkle',
      artist: 'Tiko Songs',
      source: 'spotify',
      externalId: '4uLU6hMCjMI75M1A2tKUQC',
      externalUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
      categoryId: 'music',
    })
  })
})
