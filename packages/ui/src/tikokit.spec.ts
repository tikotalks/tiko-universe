import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import {
  TikoAnswerButton,
  TikoAppHeader,
  TikoAppShell,
  TikoChoiceGrid,
  createTikoChoice,
  createTikoTtsClient,
  tikoAppColors,
  tikoKitComponents
} from './index'

describe('TikoKit component contract', () => {
  it('exports the initial reusable Yes No building blocks including the reusable app header', () => {
    expect(tikoKitComponents).toEqual([
      'TikoAppHeader',
      'TikoAppShell',
      'TikoAnswerButton',
      'TikoChoiceGrid',
      'TikoSettingsPanel',
      'tikoAppColors'
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

  it('keeps one canonical app-color palette with a different primary for each project', () => {
    const primaryColors = Object.values(tikoAppColors).map((color) => color.primary)

    expect(tikoAppColors['yes-no'].primary).toBe('var(--color-primary)')
    expect(new Set(primaryColors).size).toBe(primaryColors.length)
  })

  it('renders the design header with open-icon action names and app color token', async () => {
    const wrapper = mount(TikoAppHeader, {
      props: {
        appName: 'Yes No',
        appIcon: '👍',
        appColor: 'yes-no',
        actions: [
          { id: 'history', label: 'History', icon: 'ui/clock' },
          { id: 'settings', label: 'Settings', icon: 'ui/settings-dual' }
        ]
      }
    })

    expect(wrapper.get('[data-test="tiko-app-header"]').attributes('data-app-color')).toBe('yes-no')
    expect(wrapper.get('[data-test="tiko-app-header"]').text()).toContain('Yes No')
    await wrapper.get('[data-test="tiko-header-action-settings"]').trigger('click')
    expect(wrapper.emitted('action')).toEqual([['settings']])
  })

  it('renders app shell title and default slot', () => {
    const wrapper = mount(TikoAppShell, {
      props: { appName: 'Yes No' },
      slots: { default: '<p data-test="content">Ready</p>' }
    })

    expect(wrapper.get('.tiko-app-shell').attributes('data-app-color')).toBe('yes-no')
    expect(wrapper.get('[data-test="tiko-shell-title"]').text()).toBe('Yes No')
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


  it('posts speech text to Atlas and rewrites Atlas asset URLs to the configured API host', async () => {
    const play = vi.fn()
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'asset-yes',
        audioUrl: '/v1/atlas/assets/asset-yes',
        contentType: 'audio/mpeg',
        cached: false,
        provider: { name: 'openai', model: 'tts-1', voice: 'nova' }
      },
      meta: { cached: false, schemaVersion: 1, requestId: 'atlas-req-1' }
    }), { status: 200 })) as unknown as typeof fetch
    const client = createTikoTtsClient({ fetcher, audioFactory: () => ({ play }) })

    const result = await client.speak({ text: 'Yes', language: 'en', provider: 'auto' })

    expect(fetcher).toHaveBeenCalledWith('https://api.tikotalks.com/v1/atlas/speech', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse((fetcher as any).mock.calls[0][1].body)).toMatchObject({ app: 'tiko-ui', purpose: 'speech-playback', text: 'Yes', language: 'en', provider: 'auto' })
    expect(result.audioUrl).toBe('https://api.tikotalks.com/v1/atlas/assets/asset-yes')
    expect(result.metadata).toMatchObject({ id: 'asset-yes', provider: 'openai', model: 'tts-1', voice: 'nova', requestId: 'atlas-req-1' })
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('accepts the Atlas speech response envelope for browser playback', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'asset-1',
        audioUrl: '/v1/atlas/assets/asset-1',
        contentType: 'audio/mpeg',
        cached: true,
        provider: { name: 'elevenlabs', model: 'eleven_multilingual_v2', voice: '21m00Tcm4TlvDq8ikWAM' }
      },
      meta: { cached: true, schemaVersion: 1, requestId: 'atlas-req-2' }
    }), { status: 200 })) as unknown as typeof fetch
    const client = createTikoTtsClient({ fetcher, audioFactory: () => ({ play: vi.fn() }) })

    const result = await client.getAudio({ text: 'Yes', language: 'en' })

    expect(result.success).toBe(true)
    expect(result.audioUrl).toBe('https://api.tikotalks.com/v1/atlas/assets/asset-1')
    expect(result.cached).toBe(true)
    expect(result.metadata).toMatchObject({ id: 'asset-1', provider: 'elevenlabs', schemaVersion: 1, requestId: 'atlas-req-2' })
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
