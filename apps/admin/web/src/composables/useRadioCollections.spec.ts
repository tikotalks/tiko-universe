import { describe, expect, it, vi, afterEach } from 'vitest'
import { useRadioCollections } from './useRadioCollections'

const authState = vi.hoisted(() => ({
  token: { value: 'admin-token' },
  config: { value: { mediaApiUrl: 'https://media.test/v1' } },
}))

vi.mock('./useAdminAuth', () => ({
  useAdminAuth: () => authState,
}))

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const disney = {
  code: 'K7M2Q9XR',
  name: 'Disney',
  color: 'purple',
  songs: [{ title: 'Let It Go', source: 'youtube', youtubeVideoId: 'abcdefghijk' }],
  songCount: 1,
  featured: true,
  shareUrl: 'https://radio.tikoapps.org/?collection=K7M2Q9XR',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useRadioCollections', () => {
  it('publishes a curated set as featured and keeps its share code', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: disney }, 201))
    vi.stubGlobal('fetch', fetchMock)

    const api = useRadioCollections()
    const created = await api.create({
      name: 'Disney',
      color: 'purple',
      songs: [{ title: 'Let It Go', source: 'youtube', youtubeVideoId: 'abcdefghijk' }],
      featured: true,
    })

    expect(created?.shareUrl).toBe('https://radio.tikoapps.org/?collection=K7M2Q9XR')
    expect(api.collections.value).toEqual([disney])

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://media.test/v1/radio/collections')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer admin-token')
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Disney', featured: true })
  })

  it('surfaces the API message when publishing is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: { message: 'Required role is missing.' } }, 403)))

    const api = useRadioCollections()
    const created = await api.create({ name: 'Disney', color: 'purple', songs: [], featured: true })

    expect(created).toBeNull()
    expect(api.error.value).toBe('Required role is missing.')
  })

  it('drops a removed collection from the published list', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => (
      init?.method === 'DELETE'
        ? jsonResponse({ data: { code: 'K7M2Q9XR' } })
        : jsonResponse({ data: [disney] })
    )))

    const api = useRadioCollections()
    await api.list()
    expect(api.collections.value).toHaveLength(1)

    expect(await api.remove('K7M2Q9XR')).toBe(true)
    expect(api.collections.value).toHaveLength(0)
  })

  it('searches YouTube through the same endpoint the app uses', async () => {
    const requestedUrls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input))
      return jsonResponse({
        data: [{ videoId: 'abcdefghijk', title: 'Let It Go', channelTitle: 'Tiko Songs', thumbnailUrl: 'https://i.ytimg.com/x.jpg' }],
      })
    }))

    const api = useRadioCollections()
    const results = await api.searchYouTube('let it go')

    expect(results).toHaveLength(1)
    const requested = new URL(requestedUrls[0])
    expect(requested.pathname).toBe('/v1/youtube/search')
    expect(requested.searchParams.get('q')).toBe('let it go')
  })
})
