import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GalleryPage from './GalleryPage.vue'

function mediaResponse() {
  return new Response(JSON.stringify({
    data: [],
    meta: { total: 0, page: 1, limit: 24, totalPages: 0 },
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

async function mountGallery(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: GalleryPage }],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(GalleryPage, {
    global: {
      plugins: [router],
      stubs: {
        MediaGrid: true,
        Pagination: true,
        SilIcon: true,
        TypeFilter: true,
      },
    },
  })
  await flushPromises()
  return { router, wrapper }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Media gallery search URL', () => {
  it('restores a search from the URL and sends it to the Media API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mediaResponse())
    const { wrapper } = await mountGallery('/?search=blue%20bird')

    expect(wrapper.get('input[type="search"]').element).toHaveProperty('value', 'blue bird')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('search')).toBe('blue bird')
  })

  it('writes searches to the URL and follows browser query navigation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mediaResponse())
    const { router, wrapper } = await mountGallery('/')
    const input = wrapper.get('input[type="search"]')

    await input.setValue('  red fox  ')
    await new Promise(resolve => setTimeout(resolve, 350))
    await flushPromises()

    expect(router.currentRoute.value.query.search).toBe('red fox')
    expect(new URL(String(fetchMock.mock.calls.at(-1)?.[0])).searchParams.get('search')).toBe('red fox')

    await router.push({ query: { search: 'quiet music' } })
    await flushPromises()

    expect(wrapper.get('input[type="search"]').element).toHaveProperty('value', 'quiet music')
    expect(new URL(String(fetchMock.mock.calls.at(-1)?.[0])).searchParams.get('search')).toBe('quiet music')
  })
})
