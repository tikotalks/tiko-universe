import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SpeakButton from './SpeakButton.vue'

describe('SpeakButton', () => {
  it('emits speak when enabled', async () => {
    const wrapper = mount(SpeakButton, { props: { label: 'Speak sentence' } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('speak')).toHaveLength(1)
    expect(wrapper.text()).toContain('Speak sentence')
  })

  it('blocks clicks while disabled or loading', async () => {
    const disabled = mount(SpeakButton, { props: { disabled: true } })
    await disabled.trigger('click')
    expect(disabled.emitted('speak')).toBeUndefined()

    const loading = mount(SpeakButton, { props: { loading: true, loadingLabel: 'Speaking' } })
    await loading.trigger('click')
    expect(loading.emitted('speak')).toBeUndefined()
    expect(loading.text()).toContain('Speaking')
  })

  it('shows cached audio state', () => {
    const wrapper = mount(SpeakButton, { props: { cached: true, cachedLabel: 'Audio ready' } })

    expect(wrapper.text()).toContain('Audio ready')
  })
})
