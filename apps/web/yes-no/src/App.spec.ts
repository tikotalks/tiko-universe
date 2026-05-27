import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from './App.vue'

describe('Yes No web app', () => {
  it('opens immediately with Yes and No choices and no login wall', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Yes No')
    expect(wrapper.text()).toContain('Yes')
    expect(wrapper.text()).toContain('No')
    expect(wrapper.text()).not.toContain('Log in')
    expect(wrapper.text()).not.toContain('Password')
  })

  it('records the latest answer locally after a choice is tapped', async () => {
    const wrapper = mount(App)

    await wrapper.findAll('[data-test="tiko-answer-button"]').find((button) => button.text().includes('Yes'))!.trigger('click')

    expect(wrapper.text()).toContain('Latest answer: Yes')
  })

  it('shows setup user as optional recovery, not a first-use blocker', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Setup user')
    expect(wrapper.text()).toContain('optional')
  })
})
