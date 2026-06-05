import { defineComponent, h, watch } from 'vue'
export { default as TikoLogo } from './TikoLogo.vue'
export { default as TikoProfileMenu } from './TikoProfileMenu.vue'
export { default as TikoPinPopup } from './TikoPinPopup.vue'
export { useParentMode, type ParentModeDeps } from './parent-mode'
import type { GenerationTtsRequest, LegacyTtsResponse } from '@tiko/media'
import { generationTtsCacheKey, isGenerationTtsResponse } from '@tiko/media'
import { Button, Icon } from '@sil/ui'
import './styles.scss'

export { Button as SilButton, Icon as SilIcon } from '@sil/ui'

export type TikoChoiceTone = 'primary' | 'secondary' | 'success' | 'danger'
export type TikoAppColor = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'radio' | 'media' | 'admin' | 'tiko' | 'todo' | 'talk'
export type TikoColorMode = 'light' | 'dark' | 'system'
export type { TikoTtsProvider } from '@tiko/media'

export const tikoAppColors: Record<TikoAppColor, { label: string; primary: string; dark: string }> = {
  'yes-no': { label: 'Yes No', primary: 'var(--color-primary)', dark: 'color-mix(in srgb, var(--color-primary), var(--color-foreground) 42%)' },
  type: { label: 'Type', primary: 'var(--color-secondary)', dark: 'color-mix(in srgb, var(--color-secondary), var(--color-foreground) 42%)' },
  cards: { label: 'Cards', primary: 'var(--color-accent)', dark: 'color-mix(in srgb, var(--color-accent), var(--color-foreground) 42%)' },
  sequence: { label: 'Sequence', primary: 'var(--color-tertiary)', dark: 'color-mix(in srgb, var(--color-tertiary), var(--color-foreground) 42%)' },
  timer: { label: 'Timer', primary: 'var(--color-warning)', dark: 'color-mix(in srgb, var(--color-warning), var(--color-foreground) 42%)' },
  radio: { label: 'Radio', primary: '#e84057', dark: 'color-mix(in srgb, #e84057, var(--color-foreground) 42%)' },
  media: { label: 'Media', primary: '#2dd4bf', dark: 'color-mix(in srgb, #2dd4bf, var(--color-foreground) 42%)' },
  admin: { label: 'Admin', primary: '#8b5cf6', dark: 'color-mix(in srgb, #8b5cf6, var(--color-foreground) 42%)' },
  tiko: { label: 'Tiko', primary: 'var(--color-error)', dark: 'color-mix(in srgb, var(--color-error), var(--color-foreground) 42%)' },
  todo: { label: 'Todo', primary: 'var(--color-info)', dark: 'color-mix(in srgb, var(--color-info), var(--color-foreground) 42%)' },
  talk: { label: 'Talk', primary: 'color-mix(in srgb, var(--color-foreground), var(--color-background) 30%)', dark: 'color-mix(in srgb, var(--color-foreground), var(--color-background) 18%)' }
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
  round?: boolean
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
  const workerUrl = normalizeBaseUrl(options.workerUrl ?? 'https://identity.tikoapi.org/v1')
  const cdnUrl = normalizeBaseUrl(options.cdnUrl ?? 'https://tts.tikocdn.org')
  const fetcher = options.fetcher ?? globalThis.fetch
  const memoryCache = new Map<string, TikoTtsResponse>()

  // Tikoapi.org splits APIs per-service subdomain. When the caller hands us
  // identity.tikoapi.org we still need to reach generation.tikoapi.org for
  // TTS — rewrite the host. Legacy hosts like api.tikotalks.com share a
  // single root so the existing `${workerUrl}/generation/tts` style works.
  function generationBase(): string {
    return workerUrl.replace('//identity.tikoapi.org/', '//generation.tikoapi.org/')
  }

  function cacheKey(request: TikoTtsRequest) {
    return generationTtsCacheKey(request)
  }

  function ttsEndpoint() {
    if (workerUrl.endsWith('/generate')) return workerUrl
    if (workerUrl.endsWith('/v1')) return `${generationBase()}/generation/tts`
    if (workerUrl.endsWith('/v1/generation')) return `${workerUrl}/tts`
    if (workerUrl.includes('tts.tikotalks.com')) return `${workerUrl}/generate`
    return `${workerUrl}/v1/generation/tts`
  }

  function toCdnUrl(audioUrl: string) {
    if (audioUrl.startsWith('http')) return audioUrl
    const key = audioUrl.match(/key=([^&]+)/)?.[1]
    if (key) return `${cdnUrl}/${decodeURIComponent(key)}`
    if (audioUrl.startsWith('/v1/generation/audio/')) return `${generationBase().replace(/\/v1$/, '')}${audioUrl}`
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
    actions: { type: Array as () => TikoHeaderAction[], default: () => [] },
    showBack: { type: Boolean, default: false },
  },
  emits: ['action', 'avatar-click', 'back-click', 'title-click'],
  setup(props, { emit }) {
    return () => h('header', { class: ['tiko-app-header', props.showBack ? 'tiko-app-header--has-back' : ''], 'data-test': 'tiko-app-header', 'data-app-color': props.appColor }, [
      h('div', { class: 'tiko-app-header__brand' }, [
        props.showBack
          ? h('button', {
              class: 'tiko-app-header__back-btn',
              'aria-label': 'Back',
              onClick: () => emit('back-click'),
            }, [iconSpan('arrows/arrow-left')])
          : h('span', { class: 'tiko-app-header__app-icon', 'aria-hidden': 'true' }, [iconSpan(props.appIcon)]),
        h('span', { class: 'tiko-app-header__title', 'data-test': 'tiko-shell-title', onClick: () => emit('title-click') }, props.appName)
      ]),
      h('div', { class: 'tiko-app-header__actions' }, [
        ...props.actions.filter(a => a.visible !== false).map(action => h(Button, {
          class: ['tiko-app-header__action', action.active ? 'tiko-app-header__action--active' : '', action.round ? 'tiko-app-header__action--round' : ''],
          variant: 'ghost',
          iconOnly: true,
          icon: action.icon,
          'aria-label': action.label,
          disabled: action.disabled,
          'data-test': `tiko-header-action-${action.id}`,
          onClick: () => emit('action', action.id)
        })),
        props.avatar ? h('button', {
          class: 'tiko-app-header__avatar',
          'aria-label': 'Account',
          onClick: () => emit('avatar-click'),
        }, [iconSpan(props.avatar)]) : null
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
    actions: { type: Array as () => TikoHeaderAction[], default: () => [] },
    showBack: { type: Boolean, default: false },
  },
  emits: ['headerAction', 'avatar-click', 'back-click', 'title-click'],
  setup(props, { slots, emit }) {
    return () => h('div', { class: 'tiko-app-shell', 'data-app-color': props.appColor }, [
      h(TikoAppHeader, {
        appName: props.appName,
        appIcon: props.appIcon,
        avatar: props.avatar,
        appColor: props.appColor,
        actions: props.actions,
        showBack: props.showBack,
        onAction: (id: string) => emit('headerAction', id),
        onAvatarClick: () => emit('avatar-click'),
        onBackClick: () => emit('back-click'),
        onTitleClick: () => emit('title-click'),
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
