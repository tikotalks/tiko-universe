import { defineComponent, h, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
export { default as TikoLogo } from './TikoLogo.vue'
export { default as TikoChildAccountsPanel } from './TikoChildAccountsPanel.vue'
export { default as TikoProfileMenu } from './TikoProfileMenu.vue'
export { default as TikoPinPopup } from './TikoPinPopup.vue'
export { default as TikoSquareTile } from './TikoSquareTile.vue'
export { default as TikoPagedTileGrid } from './TikoPagedTileGrid.vue'
export { default as TikoSheet } from './TikoSheet.vue'
export { default as TikoField } from './TikoField.vue'
export { default as TikoColorPicker } from './TikoColorPicker.vue'
export { default as TikoToggleRow } from './TikoToggleRow.vue'
export { default as TikoSegmentedControl } from './TikoSegmentedControl.vue'
export { default as TikoSelectionBadge } from './TikoSelectionBadge.vue'
export { default as TikoEditBadge } from './TikoEditBadge.vue'
export { useIdentityRuntime, type UseIdentityRuntimeOptions, type IdentityRuntimeState, type StoredIdentity } from './identity-runtime'
export { useParentMode, type ParentModeDeps } from './parent-mode'
import type { GenerationTtsRequest, LegacyTtsResponse } from '@tiko/media'
import { generationTtsCacheKey, isGenerationTtsResponse } from '@tiko/media'
import { Button, Icon } from '@sil/ui'
import './styles.scss'

export { Button as SilButton, Icon as SilIcon } from '@sil/ui'

export type TikoChoiceTone = 'primary' | 'secondary' | 'success' | 'danger'
export type TikoAppColor = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'radio' | 'media' | 'admin' | 'tiko' | 'todo' | 'talk'
export type TikoColorMode = 'light' | 'dark' | 'system'
export type TikoSupportedLanguagesMode = 'tiko-defaults' | 'custom'
export type { TikoTtsProvider } from '@tiko/media'

export interface TikoAppConfig {
  id: TikoAppColor
  title: string
  appColor: TikoAppColor
  appIcon: string
  appIconMediaCategory?: string
  appIconImageUrl?: string
  themeColor?: string
  supportedLanguagesMode?: TikoSupportedLanguagesMode
  supportedLanguages?: string[]
}

export const tikoAppConfigs: Record<TikoAppColor, TikoAppConfig> = {
  'yes-no': { id: 'yes-no', title: 'Yes No', appColor: 'yes-no', appIcon: 'ui/check-fat', appIconMediaCategory: 'emotions', themeColor: '#9b3fbd' },
  type: { id: 'type', title: 'Type', appColor: 'type', appIcon: 'ui/type', appIconMediaCategory: 'letters', themeColor: '#2488ff' },
  cards: { id: 'cards', title: 'Cards', appColor: 'cards', appIcon: 'education/book-2', appIconMediaCategory: 'animals', themeColor: '#ff8a1f' },
  sequence: { id: 'sequence', title: 'Sequence', appColor: 'sequence', appIcon: 'ui/list', appIconMediaCategory: 'routines', themeColor: '#16b8a6' },
  timer: { id: 'timer', title: 'Timer', appColor: 'timer', appIcon: 'ui/timer', appIconMediaCategory: 'transport', themeColor: '#f8c22e' },
  radio: { id: 'radio', title: 'Radio', appColor: 'radio', appIcon: 'media/headphones', appIconMediaCategory: 'music', themeColor: '#e84057' },
  media: { id: 'media', title: 'Media', appColor: 'media', appIcon: 'media/image', appIconMediaCategory: 'art', themeColor: '#2dd4bf' },
  admin: { id: 'admin', title: 'Admin', appColor: 'admin', appIcon: 'ui/settings', appIconMediaCategory: 'tools', themeColor: '#8b5cf6' },
  tiko: { id: 'tiko', title: 'Tiko', appColor: 'tiko', appIcon: 'ui/heart', appIconMediaCategory: 'tiko', themeColor: '#ef4f8f' },
  todo: { id: 'todo', title: 'Todo', appColor: 'todo', appIcon: 'ui/check-list', appIconMediaCategory: 'routines', themeColor: '#2488ff' },
  talk: { id: 'talk', title: 'Talk', appColor: 'talk', appIcon: 'ui/talk', appIconMediaCategory: 'communication', themeColor: '#17131c' }
}


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

export const TIKO_PALETTE: string[] = [
  '#9b3fbd', // yes-no purple
  '#2488ff', // type blue
  '#ff8a1f', // cards orange
  '#16b8a6', // sequence teal
  '#f8c22e', // timer yellow
  '#e84057', // radio red
  '#2dd4bf', // media cyan
  '#8b5cf6', // admin violet
  '#ef4f8f', // tiko pink
  '#FFB347', // warm orange
  '#FF6B6B', // coral
  '#4ECDC4', // turquoise
  '#A8E6CF', // mint
  '#DDA0DD', // plum
  '#FFD93D', // gold
  '#82B1FF', // periwinkle
  '#87CEEB', // sky blue
  '#98D8C8', // seafoam
]

export { tikoColors, type TikoColorEntry } from './tikoColors'

export interface TikoOpenIconOption {
  name: string
  label: string
}

export interface TikoSettingsPanelLabels {
  settings?: string
  language?: string
  colorMode?: string
  light?: string
  dark?: string
  system?: string
}

export interface TikoSettingsPanelLanguage {
  value: string
  nativeLabel: string
}

export const tikoOpenIcons: TikoOpenIconOption[] = [
  { name: 'ui/check-fat', label: 'Check' },
  { name: 'wayfinding/cross', label: 'Cross' },
  { name: 'ui/question-mark-fat', label: 'Question' },
  { name: 'ui/add-fat', label: 'Plus' },
  { name: 'ui/subtract-fat', label: 'Minus' },
  { name: 'ui/info-fat', label: 'Info' },
  { name: 'ui/exclamation-mark-s', label: 'Important' },
  { name: 'ui/star-fat', label: 'Star' },
  { name: 'ui/circled-heart', label: 'Heart' },
  { name: 'ui/circled-check', label: 'Circle check' },
  { name: 'ui/circled-question-mark', label: 'Circle question' },
  { name: 'ui/squared-check', label: 'Square check' },
  { name: 'ui/squared-question-mark', label: 'Square question' },
  { name: 'ui/pointer-hand', label: 'Hand' },
  { name: 'ui/pointer-cross', label: 'Stop hand' },
  { name: 'ui/pointer-arrow', label: 'Pointer' },
  { name: 'ui/speech-balloon', label: 'Speech' },
  { name: 'ui/speech-balloon-square-text', label: 'Message' },
  { name: 'ui/talk-info', label: 'Talk info' },
  { name: 'ui/talk-question-mark', label: 'Talk question' },
  { name: 'ui/user', label: 'Person' },
  { name: 'ui/users', label: 'People' },
  { name: 'ui/user-heart', label: 'Care' },
  { name: 'ui/accessibility-person', label: 'Accessibility' },
  { name: 'ui/wheelchair-action', label: 'Wheelchair' },
  { name: 'ui/clock', label: 'Clock' },
  { name: 'ui/timer', label: 'Timer' },
  { name: 'ui/calendar-2', label: 'Calendar' },
  { name: 'ui/check-list', label: 'Checklist' },
  { name: 'ui/checklist-success', label: 'Checklist done' },
  { name: 'ui/books', label: 'Books' },
  { name: 'ui/home-location', label: 'Home' },
  { name: 'ui/building-house', label: 'House' },
  { name: 'ui/building-shop', label: 'Shop' },
  { name: 'ui/globe', label: 'Globe' },
  { name: 'ui/world', label: 'World' },
  { name: 'media/volume-iii', label: 'Voice' },
  { name: 'media/music-note', label: 'Music' },
  { name: 'media/headphones', label: 'Headphones' },
  { name: 'media/microphone', label: 'Microphone' },
  { name: 'media/camera', label: 'Camera' },
  { name: 'media/image', label: 'Image' },
  { name: 'media/playback-play', label: 'Play' },
  { name: 'media/playback-pause', label: 'Pause' },
  { name: 'food-drinks/bottle', label: 'Bottle' },
  { name: 'food-drinks/bread-slice', label: 'Bread' },
  { name: 'food-drinks/hamburger', label: 'Food' },
  { name: 'animals/cat-head', label: 'Cat' },
  { name: 'animals/fish', label: 'Fish' },
  { name: 'animals/turtle', label: 'Turtle' },
  { name: 'misc/toy-blocks', label: 'Toys' },
  { name: 'misc/furniture-bed', label: 'Bed' },
  { name: 'misc/plant', label: 'Plant' },
  { name: 'misc/fire', label: 'Fire' },
  { name: 'misc/key', label: 'Key' },
  { name: 'misc/lock', label: 'Lock' },
  { name: 'misc/unlock', label: 'Unlock' },
  { name: 'misc/shield-check', label: 'Safe' },
  { name: 'arrows/arrow-headed-left', label: 'Left' },
  { name: 'arrows/arrow-headed-right', label: 'Right' },
  { name: 'arrows/arrow-headed-up', label: 'Up' },
  { name: 'arrows/arrow-headed-down', label: 'Down' },
]

export function tikoNormalizeOpenIcon(icon: string | undefined): string {
  if (!icon) return ''
  if (icon.includes('/')) return icon
  return 'ui/question-mark-fat'
}

export const tikoKitComponents = [
  'TikoAppHeader',
  'TikoAppShell',
  'TikoAnswerButton',
  'TikoChoiceGrid',
  'TikoSettingsPanel',
  'TikoOpenIconPicker',
  'tikoAppColors',
  'tikoAppConfigs'
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
  const workerUrl = normalizeBaseUrl(options.workerUrl ?? 'https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1')
  const cdnUrl = normalizeBaseUrl(options.cdnUrl ?? 'https://tts.tikocdn.org')
  const fetcher = options.fetcher ?? globalThis.fetch
  const memoryCache = new Map<string, TikoTtsResponse>()

  // Tikoapi.org splits APIs per-service subdomain. Existing callers may still
  // pass identity/generation bases; normalize those to the Atlas gateway so TTS
  // routing stays centralized.
  function atlasBase(): string {
    return workerUrl
      .replace('//identity.tikoapi.org/', '//api.tikotalks.com/')
      .replace('//generation.tikoapi.org/', '//api.tikotalks.com/')
      .replace(/\/v1\/generation$/, '/v1')
      .replace(/\/generate$/, '')
  }

  function generationBase(): string {
    return workerUrl.replace('//identity.tikoapi.org/', '//generation.tikoapi.org/')
  }

  function cacheKey(request: TikoTtsRequest) {
    return generationTtsCacheKey(request)
  }

  function ttsEndpoint() {
    const base = atlasBase()
    if (base.endsWith('/v1/atlas')) return `${base}/speech`
    if (base.endsWith('/v1')) return `${base}/atlas/speech`
    return `${base}/v1/atlas/speech`
  }

  function toCdnUrl(audioUrl: string) {
    if (audioUrl.startsWith('http')) return audioUrl
    const key = audioUrl.match(/key=([^&]+)/)?.[1]
    if (key) return `${cdnUrl}/${decodeURIComponent(key)}`
    if (audioUrl.startsWith('/v1/atlas/assets/')) return `${atlasBase().replace(/\/v1(?:\/atlas)?$/, '')}${audioUrl}`
    if (audioUrl.startsWith('/v1/generation/audio/')) return `${generationBase().replace(/\/v1$/, '')}${audioUrl}`
    return `${cdnUrl}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`
  }

  function normalizeTtsResponse(data: unknown): TikoTtsResponse {
    if (isGenerationTtsResponse(data)) {
      const provider = typeof data.data.provider === 'object' && data.data.provider !== null
        ? data.data.provider as { name?: string; model?: string; voice?: string }
        : { name: data.data.provider as string | undefined, model: data.data.model, voice: data.data.voice }
      const meta = data.meta as { cached?: boolean; schemaVersion?: number; requestId?: string } | undefined
      return {
        success: true,
        audioUrl: toCdnUrl(data.data.audioUrl),
        cached: data.meta?.cached ?? false,
        metadata: {
          id: data.data.id,
          provider: provider.name,
          language: data.data.language,
          voice: provider.voice ?? data.data.voice,
          model: provider.model ?? data.data.model,
          schemaVersion: meta?.schemaVersion,
          requestId: meta?.requestId
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
          app: 'tiko-ui',
          purpose: 'speech-playback',
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

function isImageSource(value: string) {
  return /^(https?:|data:|blob:)/.test(value) || /\.(avif|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(value)
}

function resizedTikoMediaUrl(url: string, size = 96) {
  try {
    const parsed = new URL(url)
    if (parsed.host === 'data.tikocdn.org' && parsed.pathname.startsWith('/uploads/')) {
      return `https://data.tikocdn.org/cdn-cgi/image/width=${size},height=${size},fit=cover,quality=85,f=auto${parsed.pathname}`
    }
  } catch {
    // Keep non-URL values as-is; callers already validated source shape.
  }
  return url
}

function normalizedHexColor(value?: string): string {
  const raw = value?.trim()
  if (!raw) return ''
  const match = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return ''
  const hex = match[1]
  if (hex.length === 3) {
    return `#${hex.split('').map((part) => `${part}${part}`).join('')}`.toLowerCase()
  }
  return `#${hex.toLowerCase()}`
}

function readableTextColor(background: string): string {
  const hex = normalizedHexColor(background).slice(1)
  if (!hex) return '#ffffff'
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return luminance > 0.58 ? '#17131c' : '#ffffff'
}

function appThemeStyle(themeColor?: string): CSSProperties | undefined {
  const primary = normalizedHexColor(themeColor)
  if (!primary) return undefined
  return {
    '--tiko-app-primary': primary,
    '--tiko-app-primary-text': readableTextColor(primary),
    '--tiko-app-primary-deep': `color-mix(in srgb, ${primary}, var(--color-foreground) 42%)`,
  } as CSSProperties
}

/**
 * Inject favicon, apple-touch-icon, and theme-color meta tags from app config.
 * Call once in each web app's main.ts before mounting.
 */
export function injectAppMeta(config: TikoAppConfig): void {
  const iconUrl = config.appIconImageUrl
  const color = config.themeColor

  if (iconUrl) {
    // Cloudflare Image Resizing: 32x32 for favicon, 180x180 for apple-touch-icon
    const faviconUrl = resizedTikoMediaUrl(iconUrl, 32)
    const touchIconUrl = resizedTikoMediaUrl(iconUrl, 180)

    // Set or create <link rel="icon">
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }
    favicon.type = 'image/png'
    favicon.href = faviconUrl

    // Set or create <link rel="apple-touch-icon">
    let touchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
    if (!touchIcon) {
      touchIcon = document.createElement('link')
      touchIcon.rel = 'apple-touch-icon'
      document.head.appendChild(touchIcon)
    }
    touchIcon.href = touchIconUrl
  }

  if (color) {
    // Set or create <meta name="theme-color">
    let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!themeColor) {
      themeColor = document.createElement('meta')
      themeColor.name = 'theme-color'
      document.head.appendChild(themeColor)
    }
    themeColor.content = color
  }
}

async function fetchTikoMediaIcon(category: string): Promise<string> {
  const endpoint = `https://media.tikoapi.org/v1/media?type=image&category=${encodeURIComponent(category)}&limit=20`
  const response = await fetch(endpoint)
  if (!response.ok) return ''
  const payload = await response.json() as { data?: Array<{ original_url?: string; url?: string }> }
  const item = payload.data?.find((entry) => entry.original_url || entry.url)
  const url = item?.original_url ?? item?.url ?? ''
  return url ? resizedTikoMediaUrl(url) : ''
}

function imageSpan(src: string, alt = '') {
  return h('img', { class: 'tiko-icon tiko-icon--image', src, alt, loading: 'lazy', decoding: 'async', 'aria-hidden': alt ? undefined : 'true' })
}

function iconSpan(icon: string, alt = '') {
  if (isImageSource(icon)) return imageSpan(icon, alt)
  const openIcon = tikoNormalizeOpenIcon(icon)
  return h(Icon, { class: 'tiko-icon', name: openIcon, size: 'medium', 'aria-hidden': 'true', 'data-icon': openIcon })
}

export const TikoOpenIconPicker = defineComponent({
  name: 'TikoOpenIconPicker',
  props: {
    modelValue: { type: String, default: '' },
    icons: { type: Array as () => TikoOpenIconOption[], default: () => tikoOpenIcons },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'tiko-open-icon-picker', role: 'listbox', 'aria-label': 'Open icons' }, props.icons.map(icon =>
      h('button', {
        key: icon.name,
        type: 'button',
        class: ['tiko-open-icon-picker__item', tikoNormalizeOpenIcon(props.modelValue) === icon.name ? 'tiko-open-icon-picker__item--active' : ''],
        title: icon.label,
        'aria-label': icon.label,
        'aria-selected': tikoNormalizeOpenIcon(props.modelValue) === icon.name ? 'true' : 'false',
        onClick: () => emit('update:modelValue', tikoNormalizeOpenIcon(props.modelValue) === icon.name ? '' : icon.name),
      }, [h(Icon, { name: icon.name, size: 'medium', 'aria-hidden': 'true' })])
    ))
  }
})

export const TikoAppHeader = defineComponent({
  name: 'TikoAppHeader',
  props: {
    appName: { type: String, required: true },
    appIcon: { type: String, default: 'ui/check-fat' },
    appIconImageUrl: { type: String, default: '' },
    appIconMediaCategory: { type: String, default: '' },
    avatar: { type: String, default: '' },
    appColor: { type: String as () => TikoAppColor, default: 'yes-no' },
    themeColor: { type: String, default: '' },
    actions: { type: Array as () => TikoHeaderAction[], default: () => [] },
    showBack: { type: Boolean, default: false },
    showSettingsButton: { type: Boolean, default: true },
  },
  emits: ['action', 'avatar-click', 'back-click', 'title-click'],
  setup(props, { emit }) {
    const mediaIconUrl = ref('')

    async function resolveMediaIcon() {
      mediaIconUrl.value = ''
      if (!props.appIconMediaCategory || typeof fetch === 'undefined') return
      const storageKey = `tiko:app-icon:${props.appColor}:${props.appIconMediaCategory}`
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : ''
        if (stored) {
          mediaIconUrl.value = stored
          return
        }
        const url = await fetchTikoMediaIcon(props.appIconMediaCategory)
        if (url) {
          mediaIconUrl.value = url
          if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, url)
        }
      } catch {
        mediaIconUrl.value = ''
      }
    }

    onMounted(resolveMediaIcon)
    watch(() => [props.appColor, props.appIconMediaCategory], resolveMediaIcon)

    return () => h('header', { class: ['tiko-app-header', props.showBack ? 'tiko-app-header--has-back' : ''], 'data-test': 'tiko-app-header', 'data-app-color': props.appColor, style: appThemeStyle(props.themeColor) }, [
      h('div', { class: 'tiko-app-header__brand' }, [
        props.showBack
          ? h('button', {
              class: 'tiko-app-header__back-btn',
              'aria-label': 'Back',
              onClick: () => emit('back-click'),
            }, [iconSpan('arrows/arrow-left')])
          : h('span', { class: ['tiko-app-header__app-icon', (props.appIconImageUrl || mediaIconUrl.value) ? 'tiko-app-header__app-icon--image' : ''], 'aria-hidden': 'true' }, [iconSpan(props.appIconImageUrl || mediaIconUrl.value || props.appIcon, props.appName)]),
        h('span', { class: 'tiko-app-header__title', 'data-test': 'tiko-shell-title', onClick: () => emit('title-click') }, props.appName)
      ]),
      h('div', { class: 'tiko-app-header__actions' }, [
        ...(props.showSettingsButton ? props.actions : []).filter(a => a.visible !== false).map(action => h(Button, {
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
        }, [iconSpan(props.avatar, 'Account')]) : null
      ])
    ])
  }
})

export const TikoAppShell = defineComponent({
  name: 'TikoAppShell',
  props: {
    appName: { type: String, required: true },
    appIcon: { type: String, default: 'ui/check-fat' },
    appIconImageUrl: { type: String, default: '' },
    appIconMediaCategory: { type: String, default: '' },
    appColor: { type: String as () => TikoAppColor, default: 'yes-no' },
    themeColor: { type: String, default: '' },
    avatar: { type: String, default: '' },
    actions: { type: Array as () => TikoHeaderAction[], default: () => [] },
    showBack: { type: Boolean, default: false },
    showSettingsButton: { type: Boolean, default: true },
  },
  emits: ['headerAction', 'avatar-click', 'back-click', 'title-click'],
  setup(props, { slots, emit }) {
    return () => h('div', { class: 'tiko-app-shell', 'data-app-color': props.appColor, style: appThemeStyle(props.themeColor) }, [
      h(TikoAppHeader, {
        appName: props.appName,
        appIcon: props.appIcon,
        appIconImageUrl: props.appIconImageUrl,
        appIconMediaCategory: props.appIconMediaCategory,
        avatar: props.avatar,
        appColor: props.appColor,
        themeColor: props.themeColor,
        actions: props.actions,
        showBack: props.showBack,
        showSettingsButton: props.showSettingsButton,
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
    colorMode: { type: String as () => TikoColorMode, required: true },
    labels: { type: Object as () => TikoSettingsPanelLabels, default: () => ({}) },
    languages: { type: Array as () => TikoSettingsPanelLanguage[], default: () => [
      { value: 'en', nativeLabel: 'English' },
      { value: 'nl', nativeLabel: 'Nederlands' },
      { value: 'fr', nativeLabel: 'Français' },
      { value: 'es', nativeLabel: 'Español' },
    ] }
  },
  emits: ['update:language', 'update:colorMode'],
  setup(props, { emit }) {
    watch(() => props.colorMode, (mode) => {
      if (!['light', 'dark', 'system'].includes(mode)) emit('update:colorMode', 'system')
    }, { immediate: true })

    const text = (key: keyof TikoSettingsPanelLabels, fallback: string) => props.labels[key] ?? fallback
    return () => h('section', { class: 'tiko-settings-panel', 'data-test': 'tiko-settings-panel', 'aria-label': text('settings', 'Settings') }, [
      h('label', {}, [text('language', 'Language'), h('select', { value: props.language, class: 'tiko-settings-panel__select', 'data-test': 'tiko-settings-language', onChange: (e: Event) => emit('update:language', (e.target as HTMLSelectElement).value) }, props.languages.map((language) => h('option', { value: language.value }, language.nativeLabel)))]),
      h('label', {}, [text('colorMode', 'Color mode'), h('select', { value: props.colorMode, class: 'tiko-settings-panel__select', 'data-test': 'tiko-settings-color-mode', onChange: (e: Event) => emit('update:colorMode', (e.target as HTMLSelectElement).value) }, [
        h('option', { value: 'light' }, text('light', 'Light')),
        h('option', { value: 'dark' }, text('dark', 'Dark')),
        h('option', { value: 'system' }, text('system', 'System'))
      ])])
    ])
  }
})
