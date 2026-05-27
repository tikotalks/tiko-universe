import { defineComponent, h, watch } from 'vue'
import type { GenerationTtsRequest, LegacyTtsResponse } from '@tiko/media'
import { generationTtsCacheKey, isGenerationTtsResponse } from '@tiko/media'
import { Button, Icon } from '@sil/ui'
import './styles.css'

export { Button as SilButton, Icon as SilIcon } from '@sil/ui'

export type TikoChoiceTone = 'primary' | 'secondary' | 'success' | 'danger'
export type TikoAppColor = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'tiko'
export type TikoColorMode = 'light' | 'dark' | 'system'
export type { TikoTtsProvider } from '@tiko/media'

export const tikoAppColors: Record<TikoAppColor, { label: string; primary: string; dark: string }> = {
  'yes-no': { label: 'Yes No', primary: '#9b3fbd', dark: '#49125e' },
  type: { label: 'Type', primary: '#2488ff', dark: '#0d3f91' },
  cards: { label: 'Cards', primary: '#ff8a1f', dark: '#9a3d00' },
  sequence: { label: 'Sequence', primary: '#16b8a6', dark: '#08665d' },
  timer: { label: 'Timer', primary: '#f8c22e', dark: '#8a5d00' },
  tiko: { label: 'Tiko', primary: '#ef4f8f', dark: '#8d1c4f' }
}

export interface TikoChoiceInput {
  id: string
  label: string
  tone?: TikoChoiceTone
  disabled?: boolean
  speechText?: string
  imageSrc?: string
  icon?: string
}

export interface TikoChoice {
  id: string
  label: string
  tone: TikoChoiceTone
  disabled: boolean
  speechText?: string
  imageSrc?: string
  icon?: string
}

export interface TikoHeaderAction {
  id: string
  label: string
  icon: string
  active?: boolean
  disabled?: boolean
  visible?: boolean
}

export interface TikoTtsRequest extends GenerationTtsRequest {}

export interface TikoTtsResponse {
  success: boolean
  audioUrl?: string
  cached?: boolean
  metadata?: Record<string, unknown>
  error?: string
}

export interface TikoTtsClientOptions {
  workerUrl?: string
  cdnUrl?: string
  fetcher?: typeof fetch
  audioFactory?: (url: string) => { play: () => Promise<void> | void }
  speechSynthesis?: SpeechSynthesis
}

export const tikoKitComponents = [
  'TikoAppHeader',
  'TikoAppShell',
  'TikoAnswerButton',
  'TikoChoiceGrid',
  'TikoSettingsPanel',
  'tikoAppColors'
]

export function createTikoChoice(input: TikoChoiceInput): TikoChoice {
  return {
    id: input.id,
    label: input.label,
    tone: input.tone ?? 'primary',
    disabled: input.disabled ?? false,
    ...(input.speechText ? { speechText: input.speechText } : {}),
    ...(input.imageSrc ? { imageSrc: input.imageSrc } : {}),
    ...(input.icon ? { icon: input.icon } : {})
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '')
}

function createBrowserFallback(fallbackUsed = false, error?: string): TikoTtsResponse {
  return {
    success: true,
    cached: false,
    ...(error ? { error } : {}),
    metadata: { provider: 'browser', ...(fallbackUsed ? { fallbackUsed: true } : {}) }
  }
}

export function createTikoTtsClient(options: TikoTtsClientOptions = {}) {
  const workerUrl = normalizeBaseUrl(options.workerUrl ?? 'https://api.tikoapi.org/v1')
  const cdnUrl = normalizeBaseUrl(options.cdnUrl ?? 'https://tts.tikocdn.org')
  const fetcher = options.fetcher ?? globalThis.fetch
  const memoryCache = new Map<string, TikoTtsResponse>()

  function cacheKey(request: TikoTtsRequest) {
    return generationTtsCacheKey(request)
  }

  function ttsEndpoint() {
    if (workerUrl.endsWith('/generate')) return workerUrl
    if (workerUrl.endsWith('/v1')) return `${workerUrl}/generation/tts`
    if (workerUrl.endsWith('/v1/generation')) return `${workerUrl}/tts`
    if (workerUrl.includes('tts.tikoapi.org')) return `${workerUrl}/generate`
    return `${workerUrl}/v1/generation/tts`
  }

  function toCdnUrl(audioUrl: string) {
    if (audioUrl.startsWith('http')) return audioUrl
    const key = audioUrl.match(/key=([^&]+)/)?.[1]
    if (key) return `${cdnUrl}/${decodeURIComponent(key)}`
    if (audioUrl.startsWith('/v1/generation/audio/')) return `${workerUrl.replace(/\/v1$/, '')}${audioUrl}`
    return `${cdnUrl}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`
  }

  function normalizeTtsResponse(data: unknown): TikoTtsResponse {
    if (isGenerationTtsResponse(data)) {
      return {
        success: true,
        audioUrl: toCdnUrl(data.data.audioUrl),
        cached: data.meta?.cached ?? false,
        metadata: {
          id: data.data.id,
          provider: data.data.provider,
          language: data.data.language,
          voice: data.data.voice,
          model: data.data.model,
          schemaVersion: data.meta?.schemaVersion
        }
      }
    }

    const legacy = data as LegacyTtsResponse
    return legacy.audioUrl ? { ...legacy, audioUrl: toCdnUrl(legacy.audioUrl) } : legacy
  }

  async function getAudio(request: TikoTtsRequest): Promise<TikoTtsResponse> {
    const key = cacheKey(request)
    const cached = memoryCache.get(key)
    if (cached) return { ...cached, cached: true }

    if (!fetcher) return createBrowserFallback()

    try {
      const response = await fetcher(ttsEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: request.text,
          language: request.language,
          provider: request.provider,
          voice: request.voice,
          model: request.model,
          speed: request.speed,
          pitch: request.pitch
        })
      })

      if (!response.ok) return createBrowserFallback(true, `tts_http_${response.status}`)

      const data = await response.json()
      const normalized = normalizeTtsResponse(data)
      memoryCache.set(key, normalized)
      return normalized
    } catch (error) {
      return createBrowserFallback(true, error instanceof Error ? error.message : 'tts_fetch_failed')
    }
  }

  async function speak(request: TikoTtsRequest): Promise<TikoTtsResponse> {
    const result = await getAudio(request)
    if (result.audioUrl) {
      try {
        const audio = options.audioFactory ? options.audioFactory(result.audioUrl) : new Audio(result.audioUrl)
        await audio.play()
        return result
      } catch (error) {
        const fallback = createBrowserFallback(true, error instanceof Error ? error.message : 'audio_play_failed')
        speakWithBrowser(request)
        return fallback
      }
    }

    speakWithBrowser(request)
    return result
  }

  function speakWithBrowser(request: TikoTtsRequest) {
    const synth = options.speechSynthesis ?? globalThis.speechSynthesis
    if (synth && 'SpeechSynthesisUtterance' in globalThis) {
      const utterance = new SpeechSynthesisUtterance(request.text)
      utterance.lang = request.language
      utterance.rate = request.speed ?? 1
      synth.cancel()
      synth.speak(utterance)
    }
  }

  return { getAudio, speak, clearCache: () => memoryCache.clear(), cacheSize: () => memoryCache.size }
}

function iconSpan(icon: string) {
  if (icon.includes('/')) {
    return h(Icon, { class: 'tiko-icon', name: icon, size: 'medium', 'aria-hidden': 'true', 'data-icon': icon })
  }
  return h('span', { class: 'tiko-icon', 'aria-hidden': 'true', 'data-icon': icon }, icon)
}

export const TikoAppHeader = defineComponent({
  name: 'TikoAppHeader',
  props: {
    appName: { type: String, required: true },
    appIcon: { type: String, default: 'ui/check-fat' },
    avatar: { type: String, default: '' },
    appColor: { type: String as () => TikoAppColor, default: 'yes-no' },
    actions: { type: Array as () => TikoHeaderAction[], default: () => [] }
  },
  emits: ['action'],
  setup(props, { emit }) {
    return () => h('header', { class: 'tiko-app-header', 'data-test': 'tiko-app-header', 'data-app-color': props.appColor }, [
      h('div', { class: 'tiko-app-header__brand' }, [
        h('span', { class: 'tiko-app-header__app-icon', 'aria-hidden': 'true' }, [iconSpan(props.appIcon)]),
        h('span', { class: 'tiko-app-header__title', 'data-test': 'tiko-shell-title' }, props.appName)
      ]),
      h('div', { class: 'tiko-app-header__actions' }, [
        ...props.actions.filter(a => a.visible !== false).map(action => h(Button, {
          class: ['tiko-app-header__action', action.active ? 'tiko-app-header__action--active' : ''],
          variant: 'ghost',
          iconOnly: true,
          icon: action.icon,
          'aria-label': action.label,
          disabled: action.disabled,
          'data-test': `tiko-header-action-${action.id}`,
          onClick: () => emit('action', action.id)
        })),
        props.avatar ? h('span', { class: 'tiko-app-header__avatar', 'aria-hidden': 'true' }, [iconSpan(props.avatar)]) : null
      ])
    ])
  }
})

export const TikoAppShell = defineComponent({
  name: 'TikoAppShell',
  props: {
    appName: { type: String, required: true },
    appIcon: { type: String, default: 'ui/check-fat' },
    appColor: { type: String as () => TikoAppColor, default: 'yes-no' },
    avatar: { type: String, default: '' },
    actions: { type: Array as () => TikoHeaderAction[], default: () => [] }
  },
  emits: ['headerAction'],
  setup(props, { slots, emit }) {
    return () => h('div', { class: 'tiko-app-shell', 'data-app-color': props.appColor }, [
      h(TikoAppHeader, {
        appName: props.appName,
        appIcon: props.appIcon,
        avatar: props.avatar,
        appColor: props.appColor,
        actions: props.actions,
        onAction: (id: string) => emit('headerAction', id)
      }),
      h('main', { class: 'tiko-app-shell__main' }, slots.default?.())
    ])
  }
})

export const TikoAnswerButton = defineComponent({
  name: 'TikoAnswerButton',
  props: { choice: { type: Object as () => TikoChoice, required: true } },
  emits: ['answer'],
  setup(props, { emit }) {
    return () => h(Button, {
      class: ['tiko-answer-button', `tiko-answer-button--${props.choice.tone}`],
      variant: 'ghost',
      disabled: props.choice.disabled,
      'data-test': 'tiko-answer-button',
      onClick: () => !props.choice.disabled && emit('answer', props.choice.id)
    }, () => [
      h('span', { class: 'tiko-answer-button__tile', 'aria-hidden': 'true' }, [iconSpan(props.choice.icon ?? (props.choice.id === 'no' ? 'ui/cross' : 'ui/check'))]),
      h('span', { class: 'tiko-answer-button__label' }, props.choice.label)
    ])
  }
})

export const TikoChoiceGrid = defineComponent({
  name: 'TikoChoiceGrid',
  props: { choices: { type: Array as () => TikoChoice[], required: true } },
  emits: ['answer'],
  setup(props, { emit }) {
    return () => h('div', { class: 'tiko-choice-grid' }, props.choices.map(choice =>
      h(TikoAnswerButton, { choice, onAnswer: (id: string) => emit('answer', id), key: choice.id })
    ))
  }
})

export const TikoSettingsPanel = defineComponent({
  name: 'TikoSettingsPanel',
  props: {
    language: { type: String, required: true },
    colorMode: { type: String as () => TikoColorMode, required: true }
  },
  emits: ['update:language', 'update:colorMode'],
  setup(props, { emit }) {
    watch(() => props.colorMode, (mode) => {
      if (!['light', 'dark', 'system'].includes(mode)) emit('update:colorMode', 'system')
    }, { immediate: true })

    return () => h('section', { class: 'tiko-settings-panel', 'data-test': 'tiko-settings-panel', 'aria-label': 'Settings' }, [
      h('label', {}, ['Language', h('select', { value: props.language, class: 'tiko-settings-panel__select', 'data-test': 'tiko-settings-language', onChange: (e: Event) => emit('update:language', (e.target as HTMLSelectElement).value) }, [
        h('option', { value: 'en' }, 'English'),
        h('option', { value: 'nl' }, 'Nederlands'),
        h('option', { value: 'fr' }, 'Français'),
        h('option', { value: 'es' }, 'Español')
      ])]),
      h('label', {}, ['Color mode', h('select', { value: props.colorMode, class: 'tiko-settings-panel__select', 'data-test': 'tiko-settings-color-mode', onChange: (e: Event) => emit('update:colorMode', (e.target as HTMLSelectElement).value) }, [
        h('option', { value: 'light' }, 'Light'),
        h('option', { value: 'dark' }, 'Dark'),
        h('option', { value: 'system' }, 'System')
      ])])
    ])
  }
})
