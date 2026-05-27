import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, audioUrl: '/audio?key=audio%2Ftest.mp3' }), { status: 200 })))
  vi.stubGlobal('Audio', vi.fn(function AudioMock() {
    return { play: vi.fn(async () => undefined) }
  }))
})

describe('Yes No web app', () => {
  it('opens immediately with Yes and No choices and no login wall', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Yes No')
    expect(wrapper.text()).toContain('Yes')
    expect(wrapper.text()).toContain('No')
    expect(wrapper.text()).not.toContain('Log in')
    expect(wrapper.text()).not.toContain('Password')
  })

  it('records the latest answer locally after a choice is tapped and speaks it', async () => {
    const wrapper = mount(App)

    await wrapper.findAll('[data-test="tiko-answer-button"]').find((button) => button.text().includes('Yes'))!.trigger('click')

    expect(wrapper.text()).toContain('Latest answer: Yes')
    expect(fetch).toHaveBeenCalledWith('https://api.tikoapi.org/v1/generation/tts', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('Yes')
    }))
  })

  it('keeps setup/recovery chrome out of the first-use play flow', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).not.toContain('Setup user')
    expect(wrapper.text()).not.toContain('optional setup')
    expect(wrapper.find('[data-test="tiko-setup-card"]').exists()).toBe(false)
    expect(wrapper.find('.yes-no-app__sentence-card').exists()).toBe(false)
  })

  it('opens settings and updates language and color mode', async () => {
    const wrapper = mount(App)

    await wrapper.get('[data-test="tiko-header-action-settings"]').trigger('click')
    await wrapper.get('[data-test="tiko-settings-language"]').setValue('nl')
    await wrapper.get('[data-test="tiko-settings-color-mode"]').setValue('dark')

    expect(wrapper.text()).toContain('Ja')
    expect(wrapper.text()).toContain('Nee')
    expect(document.documentElement.dataset.colorMode).toBe('dark')
  })

  it('allows custom sentence speech and persists it locally', async () => {
    const wrapper = mount(App)

    await wrapper.get('textarea').setValue('Do you want music?')
    await wrapper.get('.yes-no-app__speak').trigger('click')

    expect(fetch).toHaveBeenCalledWith('https://api.tikoapi.org/v1/generation/tts', expect.objectContaining({
      body: expect.stringContaining('Do you want music?')
    }))
    expect(window.localStorage.getItem('tiko:yes-no')).toContain('Do you want music?')
  })

  it('shows answer history from the header action', async () => {
    const wrapper = mount(App)

    await wrapper.findAll('[data-test="tiko-answer-button"]').find((button) => button.text().includes('No'))!.trigger('click')
    await wrapper.get('[data-test="tiko-header-action-history"]').trigger('click')

    expect(wrapper.text()).toContain('History')
    expect(wrapper.text()).toContain('No')
  })
})
