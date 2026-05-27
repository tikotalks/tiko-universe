import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import {
  TikoAnswerButton,
  TikoAppHeader,
  TikoAppShell,
  TikoChoiceGrid,
  TikoSetupCard,
  createTikoChoice,
  createTikoTtsClient,
  tikoKitComponents
} from './index'

describe('TikoKit component contract', () => {
  it('exports the initial reusable Yes No building blocks including the reusable app header', () => {
    expect(tikoKitComponents).toEqual([
      'TikoAppHeader',
      'TikoAppShell',
      'TikoAnswerButton',
      'TikoChoiceGrid',
      'TikoSetupCard',
      'TikoSettingsPanel'
    ])
  })

  it('normalizes a choice into a stable reusable button model', () => {
    expect(createTikoChoice({ id: 'yes', label: 'Yes' })).toEqual({
      id: 'yes',
      label: 'Yes',
      tone: 'primary',
      disabled: false
    })
  })

  it('renders the design header with open-icon action names', async () => {
    const wrapper = mount(TikoAppHeader, {
      props: {
        appName: 'Yes No',
        appIcon: '👍',
        actions: [
          { id: 'history', label: 'History', icon: 'ui/clock' },
          { id: 'settings', label: 'Settings', icon: 'ui/settings-dual' }
        ]
      }
    })

    expect(wrapper.get('[data-test="tiko-app-header"]').text()).toContain('Yes No')
    await wrapper.get('[data-test="tiko-header-action-settings"]').trigger('click')
    expect(wrapper.emitted('action')).toEqual([['settings']])
  })

  it('renders app shell title and default slot', () => {
    const wrapper = mount(TikoAppShell, {
      props: { appName: 'Yes No', eyebrow: 'Tiko' },
      slots: { default: '<p data-test="content">Ready</p>' }
    })

    expect(wrapper.get('[data-test="tiko-shell-title"]').text()).toBe('Yes No')
    expect(wrapper.get('[data-test="tiko-shell-eyebrow"]').text()).toBe('Tiko')
    expect(wrapper.get('[data-test="content"]').text()).toBe('Ready')
  })

  it('emits answer when an answer button is tapped', async () => {
    const wrapper = mount(TikoAnswerButton, {
      props: { choice: createTikoChoice({ id: 'no', label: 'No', tone: 'secondary' }) }
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('answer')).toEqual([['no']])
  })

  it('renders a two-choice grid and emits selected choice ids', async () => {
    const wrapper = mount(TikoChoiceGrid, {
      props: {
        choices: [
          createTikoChoice({ id: 'yes', label: 'Yes' }),
          createTikoChoice({ id: 'no', label: 'No', tone: 'secondary' })
        ]
      }
    })

    expect(wrapper.findAll('[data-test="tiko-answer-button"]')).toHaveLength(2)
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('answer')).toEqual([['no']])
  })

  it('renders setup card with optional recovery action', async () => {
    const wrapper = mount(TikoSetupCard, {
      props: {
        title: 'Make this device recoverable',
        description: 'Add caregiver email later without blocking play.',
        actionLabel: 'Setup user'
      }
    })

    expect(wrapper.text()).toContain('Make this device recoverable')
    expect(wrapper.text()).toContain('Add caregiver email later without blocking play.')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('setup')).toEqual([[]])
  })

  it('posts speech text to the old Tiko TTS worker and rewrites relative audio URLs to the CDN', async () => {
    const play = vi.fn()
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true, audioUrl: '/audio?key=audio%2Fyes.mp3' }), { status: 200 })) as unknown as typeof fetch
    const client = createTikoTtsClient({ fetcher, audioFactory: () => ({ play }) })

    const result = await client.speak({ text: 'Yes', language: 'en', provider: 'auto' })

    expect(fetcher).toHaveBeenCalledWith('https://tts.tikoapi.org/generate', expect.objectContaining({ method: 'POST' }))
    expect(result.audioUrl).toBe('https://tts.tikocdn.org/audio/yes.mp3')
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('keeps a local audio response cache to avoid repeated TTS generation calls', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true, audioUrl: 'https://tts.tikocdn.org/audio/no.mp3' }), { status: 200 })) as unknown as typeof fetch
    const client = createTikoTtsClient({ fetcher, audioFactory: () => ({ play: vi.fn() }) })

    await client.getAudio({ text: 'No', language: 'en' })
    const second = await client.getAudio({ text: 'No', language: 'en' })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(second.cached).toBe(true)
  })
})
