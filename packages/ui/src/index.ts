import { defineComponent, h, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { tikoNormalizeOpenIcon, tikoOpenIcons, type TikoAppColor, type TikoAppConfig, type TikoColorMode, type TikoOpenIconOption } from './app-config'
import { tikoMediaThumbnailUrl } from './media-images'
export { default as TikoLogo } from './TikoLogo.vue'
export { default as TikoChildAccountsPanel } from './TikoChildAccountsPanel.vue'
export { default as TikoProfileMenu } from './TikoProfileMenu.vue'
export { default as TikoPinPopup } from './TikoPinPopup.vue'
export { default as TikoSquareTile } from './TikoSquareTile.vue'
export { default as TikoPagedTileGrid } from './TikoPagedTileGrid.vue'
export { default as TikoTileBoard } from './TikoTileBoard.vue'
export { default as TikoSheet } from './TikoSheet.vue'
export { default as TikoField } from './TikoField.vue'
export { default as TikoColorPicker } from './TikoColorPicker.vue'
export { default as TikoToggleRow } from './TikoToggleRow.vue'
export { default as TikoSegmentedControl } from './TikoSegmentedControl.vue'
export { default as TikoSelectionBadge } from './TikoSelectionBadge.vue'
export { default as TikoEditBadge } from './TikoEditBadge.vue'
export { useIdentityRuntime, type UseIdentityRuntimeOptions, type IdentityRuntimeState, type StoredIdentity, type TikoIdentityLabels } from './identity-runtime'
export { useTikoAppDataRuntime, useTikoAppSettingsRuntime, type TikoAppDataClient, type TikoAppDataRuntimeOptions, type TikoAppSettingsClient, type TikoAppSettingsRuntimeOptions, type TikoVersionedSettings, type TikoVersionedState } from './app-data-runtime'
export { useTikoI18nRuntime, type UseTikoI18nRuntimeOptions } from './i18n-runtime'
export { createTikoTtsClient, type TikoTtsClientOptions, type TikoTtsProvider, type TikoTtsRequest, type TikoTtsResponse } from './tts-client'
export {
  TIKO_PALETTE,
  tikoAppColors,
  tikoAppConfigs,
  tikoNormalizeOpenIcon,
  tikoOpenIcons,
  type TikoAppColor,
  type TikoAppConfig,
  type TikoColorMode,
  type TikoOpenIconOption,
  type TikoSupportedLanguagesMode,
} from './app-config'
export { tikoContentImageRefUrl, tikoMediaThumbnailUrl } from './media-images'
export {
  applyTikoColorMode,
  normalizeTikoColorMode,
  readTikoLocalJson,
  resolveTikoAppApiBaseUrl,
  resolveTikoColorMode,
  resolveTikoContentApiBaseUrl,
  resolveTikoGenerationApiBaseUrl,
  resolveTikoIdentityBaseUrl,
  resolveTikoMediaApiBaseUrl,
  useTikoColorModeEffect,
  writeTikoLocalJson,
  type TikoColorModeDocument,
  type TikoColorModeMediaQuery,
  type TikoColorModeWindow,
  type TikoRuntimeEnv,
} from './web-runtime'
export { hashParentPin } from './pin-crypto'
import { Button, Icon } from '@sil/ui'
import './styles.scss'

export { Button as SilButton, Icon as SilIcon } from '@sil/ui'

export type TikoChoiceTone = 'primary' | 'secondary' | 'success' | 'danger'

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

export { tikoColors, type TikoColorEntry } from './tikoColors'

export interface TikoSettingsPanelLabels {
  settings?: string
  appearance?: string
  appPreferences?: string
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

export interface TikoShellLabels {
  account?: string
  back?: string
  deselect?: string
  edit?: string
  openIcons?: string
  select?: string
}


export const tikoKitComponents = [
  'TikoAppHeader',
  'TikoAppShell',
  'TikoAnswerButton',
  'TikoChoiceGrid',
  'TikoSettingsPanel',
  'TikoOpenIconPicker',
  'TikoTileBoard',
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

function isImageSource(value: string) {
  return /^(https?:|data:|blob:)/.test(value) || /\.(avif|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(value)
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
    const faviconUrl = tikoMediaThumbnailUrl(iconUrl, 32)
    const touchIconUrl = tikoMediaThumbnailUrl(iconUrl, 180)

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
  return url ? tikoMediaThumbnailUrl(url, 96) : ''
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
    labels: { type: Object as () => Pick<TikoShellLabels, 'openIcons'>, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'tiko-open-icon-picker', role: 'listbox', 'aria-label': props.labels.openIcons ?? 'Open icons' }, props.icons.map(icon =>
      h('button', {
        key: icon.name,
        type: 'button',
        role: 'option',
        class: ['tiko-open-icon-picker__item', tikoNormalizeOpenIcon(props.modelValue) === icon.name ? 'tiko-open-icon-picker__item--active' : ''],
        title: icon.label,
        'aria-label': icon.label,
        'aria-pressed': tikoNormalizeOpenIcon(props.modelValue) === icon.name ? 'true' : 'false',
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
    labels: { type: Object as () => Pick<TikoShellLabels, 'account' | 'back'>, default: () => ({}) },
  },
  emits: ['action', 'avatar-click', 'back-click', 'title-click'],
  setup(props, { emit }) {
    const mediaIconUrl = ref('')

    let mediaIconSeq = 0

    async function resolveMediaIcon() {
      const seq = ++mediaIconSeq
      mediaIconUrl.value = ''
      if (!props.appIconMediaCategory || typeof fetch === 'undefined') return
      const storageKey = `tiko:app-icon:${props.appColor}:${props.appIconMediaCategory}`
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : ''
        if (stored) {
          if (seq !== mediaIconSeq) return
          mediaIconUrl.value = stored
          return
        }
        const url = await fetchTikoMediaIcon(props.appIconMediaCategory)
        if (seq !== mediaIconSeq) return
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
              'aria-label': props.labels.back ?? 'Back',
              onClick: () => emit('back-click'),
            }, [iconSpan('arrows/arrow-left')])
          : h('span', { class: ['tiko-app-header__app-icon', (props.appIconImageUrl || mediaIconUrl.value) ? 'tiko-app-header__app-icon--image' : ''], 'aria-hidden': 'true' }, [iconSpan(props.appIconImageUrl || mediaIconUrl.value || props.appIcon, props.appName)]),
        h('span', { class: 'tiko-app-header__title', 'data-test': 'tiko-shell-title', onClick: () => emit('title-click') }, props.appName)
      ]),
      h('div', { class: 'tiko-app-header__actions' }, [
        ...props.actions.filter(a => a.visible !== false && (props.showSettingsButton || a.id !== 'settings')).map(action => h(Button, {
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
          'aria-label': props.labels.account ?? 'Account',
          onClick: () => emit('avatar-click'),
        }, [iconSpan(props.avatar, props.labels.account ?? 'Account')]) : null
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
    labels: { type: Object as () => Pick<TikoShellLabels, 'account' | 'back'>, default: () => ({}) },
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
        labels: props.labels,
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
      h('header', { class: 'tiko-settings-panel__header' }, [
        h('h2', { class: 'tiko-settings-panel__title' }, text('settings', 'Settings')),
        h('p', { class: 'tiko-settings-panel__subtitle' }, text('appPreferences', 'Language, appearance and app preferences.')),
      ]),
      h('div', { class: 'tiko-settings-panel__group', 'aria-label': text('appearance', 'Appearance') }, [
        h('label', {}, [text('language', 'Language'), h('select', { value: props.language, class: 'tiko-settings-panel__select', 'data-test': 'tiko-settings-language', onChange: (e: Event) => emit('update:language', (e.target as HTMLSelectElement).value) }, props.languages.map((language) => h('option', { value: language.value }, language.nativeLabel)))]),
        h('label', {}, [text('colorMode', 'Color mode'), h('select', { value: props.colorMode, class: 'tiko-settings-panel__select', 'data-test': 'tiko-settings-color-mode', onChange: (e: Event) => emit('update:colorMode', (e.target as HTMLSelectElement).value) }, [
          h('option', { value: 'light' }, text('light', 'Light')),
          h('option', { value: 'dark' }, text('dark', 'Dark')),
          h('option', { value: 'system' }, text('system', 'System'))
        ])])
      ])
    ])
  }
})
