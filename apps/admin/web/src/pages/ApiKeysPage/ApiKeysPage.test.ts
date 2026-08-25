import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ApiKeysPage from './ApiKeysPage.vue'

const apiKeysState = vi.hoisted(() => ({
  keys: { value: [] },
  loading: { value: false },
  saving: { value: false },
  error: { value: null },
  list: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('../../composables/useAdminApiKeys', () => ({
  useAdminApiKeys: () => apiKeysState,
}))

vi.mock('@sil/ui', () => ({
  Button: { template: '<button><slot /></button>' },
  InputText: { props: ['modelValue'], template: '<input :value="modelValue" />' },
}))

describe('ApiKeysPage', () => {
  it('explains the one-time key reveal and creates a scoped media key', async () => {
    apiKeysState.create.mockResolvedValue({ id: 'key_1', key: 'tiko_media_secret', name: 'Codex media publisher', prefix: 'tiko_media_12345678', scopes: ['media:write'], createdAt: '', expiresAt: '', lastUsedAt: null })
    const wrapper = mount(ApiKeysPage, {
      global: { stubs: {} },
    })

    await wrapper.get('form').trigger('submit')

    expect(apiKeysState.list).toHaveBeenCalled()
    expect(apiKeysState.create).toHaveBeenCalledWith({ name: 'Codex media publisher', expiresInDays: 90 })
    expect(wrapper.text()).toContain('Save this key now')
    expect(wrapper.text()).toContain('tiko_media_secret')
  })
})
