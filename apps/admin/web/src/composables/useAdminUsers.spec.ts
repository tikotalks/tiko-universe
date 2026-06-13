import { describe, expect, it, vi } from 'vitest'
import { useAdminUsers } from './useAdminUsers'

const authState = vi.hoisted(() => ({
  token: { value: 'admin-token' },
}))

vi.mock('./useAdminAuth', () => ({
  useAdminAuth: () => authState,
}))

describe('useAdminUsers', () => {
  it('loads paginated users and keeps pagination metadata reactive', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({
      data: {
        users: [{ id: 'sub_child', kind: 'account', email: 'child@example.test', roles: ['child'], createdAt: '', updatedAt: '', lastSeenAt: null, hasData: false, displayName: null, avatarUrl: null, color: null }],
        meta: { total: 32, page: 2, limit: 10, totalPages: 4 },
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const adminUsers = useAdminUsers()
    await adminUsers.list('child', { page: 2, limit: 10 })

    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]))
    expect(requestedUrl.pathname).toBe('/v1/admin/users')
    expect(requestedUrl.searchParams.get('q')).toBe('child')
    expect(requestedUrl.searchParams.get('page')).toBe('2')
    expect(requestedUrl.searchParams.get('limit')).toBe('10')
    expect(adminUsers.users.value[0].id).toBe('sub_child')
    expect(adminUsers.total.value).toBe(32)
    expect(adminUsers.page.value).toBe(2)
    expect(adminUsers.totalPages.value).toBe(4)
  })
})
