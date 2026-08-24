import { describe, expect, it, vi } from 'vitest'
import { useAdminApiKeys } from './useAdminApiKeys'

const authState = vi.hoisted(() => ({ token: { value: 'admin-token' } }))

vi.mock('../useAdminAuth', () => ({
  useAdminAuth: () => authState,
}))

describe('useAdminApiKeys', () => {
  it('creates, lists, and revokes media-upload keys through the admin API', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { keys: [{ id: 'key_1', name: 'Existing publisher', prefix: 'tiko_media_12345678', scopes: ['media:write'], createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-11-01T00:00:00.000Z', lastUsedAt: null }] },
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { id: 'key_2', key: 'tiko_media_secret', name: 'Codex publisher', prefix: 'tiko_media_abcdefgh', scopes: ['media:write'], createdAt: '2026-08-02T00:00:00.000Z', expiresAt: '2026-11-02T00:00:00.000Z', lastUsedAt: null },
      }), { status: 201, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'key_2', revoked: true } }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const apiKeys = useAdminApiKeys()
    await apiKeys.list()
    const created = await apiKeys.create({ name: 'Codex publisher', expiresInDays: 90 })
    await apiKeys.revoke(created.id)

    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe('/v1/admin/api-keys')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ name: 'Codex publisher', expiresInDays: 90 })
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'DELETE' })
    expect(apiKeys.keys.value).toEqual([{ id: 'key_1', name: 'Existing publisher', prefix: 'tiko_media_12345678', scopes: ['media:write'], createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-11-01T00:00:00.000Z', lastUsedAt: null }])
  })
})
