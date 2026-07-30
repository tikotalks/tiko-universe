import { describe, expect, it, vi } from 'vitest'
import { useAdminMediaLibrary } from './useAdminMediaLibrary'

const authState = vi.hoisted(() => ({
  token: { value: 'admin-token' },
  config: { value: { mediaApiUrl: 'https://media.test/v1' } },
}))

vi.mock('./useAdminAuth', () => ({
  useAdminAuth: () => authState,
}))

function deferredResponse(body: unknown) {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((done) => {
    resolve = done
  })
  return {
    promise,
    resolve: () => resolve(new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })),
  }
}

describe('useAdminMediaLibrary', () => {
  it('ignores stale media list responses and aborts the previous request', async () => {
    const first = deferredResponse({
      data: [{ id: 'old-media', title: 'Old media' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    })
    const second = deferredResponse({
      data: [{ id: 'new-media', title: 'New media' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    })
    const responses = [first, second]
    const signals: AbortSignal[] = []
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal as AbortSignal)
      return responses.shift()!.promise
    })
    vi.stubGlobal('fetch', fetchMock)

    const media = useAdminMediaLibrary()
    const firstList = media.list({ search: 'old' })
    const secondList = media.list({ search: 'new' })

    expect(signals[0].aborted).toBe(true)

    second.resolve()
    await secondList
    expect(media.items.value).toEqual([{ id: 'new-media', title: 'New media', categories: [] }])

    first.resolve()
    await firstList
    expect(media.items.value).toEqual([{ id: 'new-media', title: 'New media', categories: [] }])
    expect(media.error.value).toBeNull()
    expect(media.loading.value).toBe(false)
  })

  it('forwards every filter to the media list endpoint', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))
    vi.stubGlobal('fetch', fetchMock)

    const media = useAdminMediaLibrary()
    await media.list({
      search: 'cat',
      type: 'image',
      category: 'animals',
      tag: 'pet',
      state: 'hidden',
      page: 3,
      includeInactive: true,
      includeHidden: true,
    })

    const requested = new URL(String(fetchMock.mock.calls[0][0]))
    expect(requested.pathname).toBe('/v1/media')
    expect(requested.searchParams.get('search')).toBe('cat')
    expect(requested.searchParams.get('type')).toBe('image')
    expect(requested.searchParams.get('category')).toBe('animals')
    expect(requested.searchParams.get('tags')).toBe('pet')
    expect(requested.searchParams.get('state')).toBe('hidden')
    expect(requested.searchParams.get('page')).toBe('3')
    expect(requested.searchParams.get('includeInactive')).toBe('true')
    expect(requested.searchParams.get('includeHidden')).toBe('true')
  })

  it('exposes the API `folder` value as a category', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify({
      data: [{ id: 'media-1', title: 'Cat', folder: 'animals', tags: ['cat'] }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))
    vi.stubGlobal('fetch', fetchMock)

    const media = useAdminMediaLibrary()
    await media.list()

    expect(media.items.value[0].category).toBe('animals')
    expect(media.items.value[0].categories).toEqual(['animals'])
  })
})
