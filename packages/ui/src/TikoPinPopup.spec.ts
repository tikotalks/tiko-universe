import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TikoPinPopup from './TikoPinPopup.vue'

async function settlePinSubmit() {
  await vi.advanceTimersByTimeAsync(250)
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
  await nextTick()
}

describe('TikoPinPopup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not auto-submit a sparse setup code when a later digit is entered first', async () => {
    const wrapper = mount(TikoPinPopup)
    const inputs = wrapper.findAll<HTMLInputElement>('.tiko-pin-popup__digit')

    await inputs[2].setValue('7')
    await settlePinSubmit()

    expect(wrapper.emitted('set')).toBeUndefined()
    expect(wrapper.text()).toContain('Create a code')
    expect(wrapper.text()).not.toContain('Confirm code')
  })

  it('fails closed in verify mode when no verifier or existing hash is provided', async () => {
    const wrapper = mount(TikoPinPopup, {
      props: {
        mode: 'verify',
      },
    })
    const inputs = wrapper.findAll<HTMLInputElement>('.tiko-pin-popup__digit')

    await inputs[0].setValue('1234')
    await settlePinSubmit()

    expect(wrapper.emitted('set')).toBeUndefined()
    expect(wrapper.text()).toContain('Wrong code')
  })

  it('uses the provided digit accessibility label template', () => {
    const wrapper = mount(TikoPinPopup, {
      props: {
        labels: {
          createTitle: 'Create',
          createSubtitle: 'Create subtitle',
          confirmTitle: 'Confirm',
          confirmSubtitle: 'Confirm subtitle',
          enterTitle: 'Enter',
          enterSubtitle: 'Enter subtitle',
          codesDontMatch: 'Mismatch',
          wrongCode: 'Wrong',
          digitLabel: 'Ċifra {index} minn {total}',
          back: 'Lura',
          cancel: 'Ikkanċella',
        },
      },
    })

    expect(wrapper.findAll<HTMLInputElement>('.tiko-pin-popup__digit')[0].attributes('aria-label')).toBe('Ċifra 1 minn 4')
  })

  it('autofocuses the first digit when opened', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const wrapper = mount(TikoPinPopup, { attachTo: host })

    await Promise.resolve()
    await nextTick()

    expect(document.activeElement).toBe(wrapper.findAll<HTMLInputElement>('.tiko-pin-popup__digit')[0].element)
    wrapper.unmount()
    host.remove()
  })

})
