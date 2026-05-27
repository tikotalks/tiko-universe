import { defineComponent, h, watch } from 'vue'
import { Button, Card, Colors, Icon } from '@sil/ui'

export { Button as SilButton, Card as SilCard, Colors as SilColors, Icon as SilIcon } from '@sil/ui'

export type TikoChoiceTone = 'primary' | 'secondary' | 'success' | 'danger'
export type TikoColorMode = 'light' | 'dark' | 'system'
export type TikoTtsProvider = 'openai' | 'azure' | 'browser' | 'auto'

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

export interface TikoTtsRequest {
  text: string
  language: string
  provider?: TikoTtsProvider
  voice?: string
  model?: string
  speed?: number
  pitch?: number
}

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
  'TikoSetupCard',
  'TikoSettingsPanel'
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
  const workerUrl = normalizeBaseUrl(options.workerUrl ?? 'https://tts.tikoapi.org')
  const cdnUrl = normalizeBaseUrl(options.cdnUrl ?? 'https://tts.tikocdn.org')
  const fetcher = options.fetcher ?? globalThis.fetch
  const memoryCache = new Map<string, TikoTtsResponse>()

  function cacheKey(request: TikoTtsRequest) {
    return [
      request.language,
      request.provider ?? 'auto',
      request.voice ?? '',
      request.model ?? 'tts-1',
      request.speed ?? 1,
      request.pitch ?? 0,
      request.text
    ].join('|')
  }

  function toCdnUrl(audioUrl: string) {
    if (audioUrl.startsWith('http')) return audioUrl
    const key = audioUrl.match(/key=([^&]+)/)?.[1]
    if (key) return `${cdnUrl}/${decodeURIComponent(key)}`
    return `${cdnUrl}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`
  }

  async function getAudio(request: TikoTtsRequest): Promise<TikoTtsResponse> {
    const key = cacheKey(request)
    const cached = memoryCache.get(key)
    if (cached) return { ...cached, cached: true }

    if (!fetcher) return createBrowserFallback()

    try {
      const response = await fetcher(`${workerUrl}/generate`, {
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

      const data = await response.json() as TikoTtsResponse
      const normalized = data.audioUrl ? { ...data, audioUrl: toCdnUrl(data.audioUrl) } : data
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
    appIcon: { type: String, default: '👍' },
    avatar: { type: String, default: '🐷' },
    actions: { type: Array as () => TikoHeaderAction[], default: () => [] }
  },
  emits: ['action'],
  setup(props, { emit }) {
    return () => h('header', { class: 'tiko-app-header', 'data-test': 'tiko-app-header' }, [
      h('div', { class: 'tiko-app-header__brand' }, [
        h('span', { class: 'tiko-app-header__app-icon', 'aria-hidden': 'true' }, props.appIcon),
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
        h('span', { class: 'tiko-app-header__avatar', 'aria-hidden': 'true' }, props.avatar)
      ])
    ])
  }
})

export const TikoAppShell = defineComponent({
  name: 'TikoAppShell',
  props: {
    appName: { type: String, required: true },
    eyebrow: { type: String, default: '' },
    appIcon: { type: String, default: '👍' },
    actions: { type: Array as () => TikoHeaderAction[], default: () => [] }
  },
  emits: ['headerAction'],
  setup(props, { slots, emit }) {
    return () => h('div', { class: 'tiko-app-shell' }, [
      h(TikoAppHeader, {
        appName: props.appName,
        appIcon: props.appIcon,
        actions: props.actions,
        onAction: (id: string) => emit('headerAction', id)
      }),
      props.eyebrow ? h('p', { class: 'tiko-app-shell__eyebrow', 'data-test': 'tiko-shell-eyebrow' }, props.eyebrow) : null,
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
      h('span', { class: 'tiko-answer-button__tile', 'aria-hidden': 'true' }, props.choice.icon ?? (props.choice.id === 'no' ? '👎' : '👍')),
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

export const TikoSetupCard = defineComponent({
  name: 'TikoSetupCard',
  props: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    actionLabel: { type: String, default: '' }
  },
  emits: ['setup'],
  setup(props, { emit }) {
    return () => h(Card, { class: 'tiko-setup-card', variant: 'elevated', color: Colors.BACKGROUND, tag: 'aside', 'data-test': 'tiko-setup-card' }, {
      default: () => [
      h('strong', {}, props.title),
      h('p', {}, props.description),
      props.actionLabel ? h(Button, { variant: 'primary', onClick: () => emit('setup') }, () => props.actionLabel) : null
      ]
    })
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

    return () => h(Card, { class: 'tiko-settings-panel', variant: 'elevated', color: Colors.BACKGROUND, tag: 'section', 'data-test': 'tiko-settings-panel', 'aria-label': 'Settings' }, {
      default: () => [
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
      ]
    })
  }
})
