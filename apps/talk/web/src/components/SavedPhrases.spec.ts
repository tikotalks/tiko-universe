import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SavedPhrases from './SavedPhrases.vue'
import type { SavedPhrase } from '@tiko/talk-types'

const phrase: SavedPhrase = {
  id: 'phrase_water',
  sentence: 'I want water.',
  wordIds: ['i', 'want', 'water'],
  isAuto: false,
  usageCount: 3,
  label: 'Water please',
}

describe('SavedPhrases', () => {
  it('selects a saved phrase without triggering delete', async () => {
    const wrapper = mount(SavedPhrases, { props: { phrases: [phrase] } })

    await wrapper.get('[data-testid="saved-phrase-select"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[phrase]])
    expect(wrapper.emitted('delete')).toBeUndefined()
  })

  it('emits delete from a separate accessible control', async () => {
    const wrapper = mount(SavedPhrases, { props: { phrases: [phrase] } })

    await wrapper.get('[data-testid="saved-phrase-delete"]').trigger('click')

    expect(wrapper.emitted('delete')).toEqual([[phrase]])
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.get('[data-testid="saved-phrase-delete"]').attributes('aria-label')).toBe('Delete Water please')
  })
})
