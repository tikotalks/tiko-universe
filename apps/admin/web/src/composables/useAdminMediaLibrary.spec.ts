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
    expect(media.items.value).toEqual([{ id: 'new-media', title: 'New media' }])

    first.resolve()
    await firstList
    expect(media.items.value).toEqual([{ id: 'new-media', title: 'New media' }])
    expect(media.error.value).toBeNull()
    expect(media.loading.value).toBe(false)
  })
})
