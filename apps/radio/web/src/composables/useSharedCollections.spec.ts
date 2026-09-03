import { describe, expect, it, vi, afterEach } from 'vitest'
import type { RadioTrack } from '@tiko/data'
import {
  normalizeShareCode,
  shareCodeFromLocation,
  shareCodeFromScan,
  toRadioTracks,
  toSharedSongs,
  useSharedCollections,
  type SharedCollection,
} from './useSharedCollections'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.removeItem('tiko:radio:share-codes')
})

describe('share codes', () => {
  it('reads a code however a parent typed it', () => {
    expect(normalizeShareCode('K7M2Q9XR')).toBe('K7M2Q9XR')
    expect(normalizeShareCode('k7m2 q9xr')).toBe('K7M2Q9XR')
    expect(normalizeShareCode('K7M2-Q9XR')).toBe('K7M2Q9XR')
    // The alphabet has no I, L or O, so a misread one still lands on the code.
    expect(normalizeShareCode('K7M2Q9XO')).toBe('K7M2Q9X0')
    expect(normalizeShareCode('K7M2Q9Xl')).toBe('K7M2Q9X1')
  })

  it('rejects anything that is not a Tiko code', () => {
    expect(normalizeShareCode('short')).toBeNull()
    expect(normalizeShareCode('K7M2Q9XR9')).toBeNull()
    expect(normalizeShareCode('K7M2Q9X!')).toBeNull()
  })

  it('only reads a code the link explicitly carries', () => {
    expect(shareCodeFromLocation('https://radio.tikoapps.org/?collection=K7M2Q9XR')).toBe('K7M2Q9XR')
    expect(shareCodeFromLocation('https://radio.tikoapps.org/')).toBeNull()
    // A path that merely looks like a code is not one at boot.
    expect(shareCodeFromLocation('https://radio.tikoapps.org/settings')).toBeNull()
  })

  it('takes the code out of a scanned link or a bare code', () => {
    expect(shareCodeFromScan('https://radio.tikoapps.org/?collection=K7M2Q9XR')).toBe('K7M2Q9XR')
    expect(shareCodeFromScan('https://radio.tikoapps.org/c/K7M2Q9XR')).toBe('K7M2Q9XR')
    expect(shareCodeFromScan('  k7m2q9xr ')).toBe('K7M2Q9XR')
    expect(shareCodeFromScan('https://example.com/')).toBeNull()
    expect(shareCodeFromScan('')).toBeNull()
  })
})

describe('publishing a collection', () => {
  const youtubeSong: RadioTrack = {
    id: 't1', title: 'Let It Go', source: 'youtube', youtubeVideoId: 'abcdefghijk', categoryId: 'disney',
  }
  const uploadedSong: RadioTrack = {
    id: 't2', title: 'Hummed at home', source: 'upload', audioUrl: 'blob:https://radio.test/1', categoryId: 'disney',
  }

  it('leaves out songs that only exist on this device', () => {
    const { songs, skipped } = toSharedSongs([youtubeSong, uploadedSong])

    expect(songs).toEqual([expect.objectContaining({ title: 'Let It Go', youtubeVideoId: 'abcdefghijk' })])
    expect(skipped).toBe(1)
  })

  it('posts the collection with the session and reports what was left out', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: { code: 'K7M2Q9XR', name: 'Disney', color: 'purple', songs: [], songCount: 1, featured: false, shareUrl: 'https://radio.tikoapps.org/?collection=K7M2Q9XR' },
        meta: { skippedSongs: 0 },
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const shared = useSharedCollections('https://media.test/v1')
    const result = await shared.publish(
      { id: 'disney', name: 'Disney', color: 'purple', imageUrl: 'https://data.tikocdn.org/uploads/castle.png' },
      [youtubeSong, uploadedSong],
      'session-token',
    )

    expect(result?.collection.code).toBe('K7M2Q9XR')
    // One song was dropped here, none by the server.
    expect(result?.skippedSongs).toBe(1)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://media.test/v1/radio/collections')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer session-token')
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Disney', color: 'purple' })
  })

  it('refuses to publish a collection with nothing shareable in it', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const shared = useSharedCollections('https://media.test/v1')
    const result = await shared.publish({ id: 'recordings', name: 'Recordings', color: 'red' }, [uploadedSong], 'session-token')

    expect(result).toBeNull()
    expect(shared.error.value).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('republishes under the code this device already shared', async () => {
    const calls: Array<{ url: string; method?: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method })
      return {
        ok: true,
        json: async () => ({
          data: { code: 'K7M2Q9XR', name: 'Disney', color: 'purple', songs: [], songCount: 1, featured: false, shareUrl: 'https://radio.tikoapps.org/?collection=K7M2Q9XR' },
          meta: { skippedSongs: 0 },
        }),
      }
    }))

    const shared = useSharedCollections('https://media.test/v1')
    const collection = { id: 'disney', name: 'Disney', color: 'purple' as const }

    await shared.publish(collection, [youtubeSong], 'session-token')
    await shared.publish(collection, [youtubeSong], 'session-token')

    expect(calls[0]).toMatchObject({ url: 'https://media.test/v1/radio/collections', method: 'POST' })
    // The QR on the fridge keeps working: the second share updates the same code.
    expect(calls[1]).toMatchObject({ url: 'https://media.test/v1/radio/collections/K7M2Q9XR', method: 'PUT' })
  })

  it('makes a new code when the remembered share is gone', async () => {
    window.localStorage.setItem('tiko:radio:share-codes', JSON.stringify({ disney: 'K7M2Q9XR' }))
    const calls: Array<{ url: string; method?: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method })
      if (init?.method === 'PUT') {
        return { ok: false, status: 404, json: async () => ({ error: { message: 'No collection is shared under that code.' } }) }
      }
      return {
        ok: true,
        json: async () => ({
          data: { code: 'ABCD2345', name: 'Disney', color: 'purple', songs: [], songCount: 1, featured: false, shareUrl: 'https://radio.tikoapps.org/?collection=ABCD2345' },
        }),
      }
    }))

    const shared = useSharedCollections('https://media.test/v1')
    const result = await shared.publish({ id: 'disney', name: 'Disney', color: 'purple' }, [youtubeSong], 'session-token')

    expect(calls.map(call => call.method)).toEqual(['PUT', 'POST'])
    expect(result?.collection.code).toBe('ABCD2345')
    expect(shared.error.value).toBeNull()
  })

  it('never asks the server about a code that cannot be one', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const shared = useSharedCollections('https://media.test/v1')

    expect(await shared.fetchByCode('nope')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('importing a collection', () => {
  it('turns shared songs into library tracks with stable ids', () => {
    const collection: SharedCollection = {
      code: 'K7M2Q9XR',
      name: 'Disney',
      color: 'purple',
      songCount: 2,
      featured: true,
      shareUrl: 'https://radio.tikoapps.org/?collection=K7M2Q9XR',
      songs: [
        { title: 'Let It Go', source: 'youtube', youtubeVideoId: 'abcdefghijk', artist: 'Tiko Songs' },
        { title: 'Lullaby', source: 'spotify', externalId: '4uLU6hMCjMI75M1A2tKUQC', externalUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' },
      ],
    }

    const tracks = toRadioTracks(collection, 'disney')

    expect(tracks).toHaveLength(2)
    expect(tracks[0]).toMatchObject({
      id: 'shared:disney:abcdefghijk',
      title: 'Let It Go',
      source: 'youtube',
      categoryId: 'disney',
    })
    expect(tracks[1]).toMatchObject({ source: 'spotify', externalId: '4uLU6hMCjMI75M1A2tKUQC' })
    // Re-scanning into the same shelf replaces its songs rather than doubling them.
    expect(toRadioTracks(collection, 'disney')[0].id).toBe(tracks[0].id)
    // A second shelf keeps its own copies, so importing twice does not empty the first.
    expect(toRadioTracks(collection, 'disney-2')[0].id).not.toBe(tracks[0].id)
  })
})
