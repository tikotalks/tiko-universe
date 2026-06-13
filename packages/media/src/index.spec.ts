import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTikoMedia } from './index'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('@tiko/media', () => {
  it('fetches multiple media categories with one media-api request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: [
        { id: 'media_cards', title: 'Cards image', original_url: 'https://data.tikocdn.org/uploads/cards.png' },
        { id: 'media_animals', title: 'Animal image', original_url: 'https://data.tikocdn.org/uploads/animal.png' },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const media = useTikoMedia()
    const results = await media.fetchByCategory(['cards', 'animals', 'cards'], { limit: 12 })

    expect(results.map(item => item.id)).toEqual(['media_cards', 'media_animals'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const firstCall = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL]
    const url = new URL(String(firstCall[0]))
    expect(url.pathname).toBe('/v1/media')
    expect(url.searchParams.get('type')).toBe('image')
    expect(url.searchParams.get('category')).toBe('cards,animals')
    expect(url.searchParams.get('limit')).toBe('12')
  })
})
