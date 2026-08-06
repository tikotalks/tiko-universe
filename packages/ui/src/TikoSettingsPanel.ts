import { defineComponent, h, watch } from 'vue'
import { type TikoColorMode } from './app-config'

export interface TikoSettingsPanelLabels {
  settings?: string
  appearance?: string
  appPreferences?: string
  language?: string
  colorMode?: string
  light?: string
  dark?: string
  system?: string
  fullyTranslated?: string
  coreTranslated?: string
}

export interface TikoSettingsPanelLanguage {
  value: string
  nativeLabel: string
  /** The English name, shown beside the native one so a parent can find it. */
  label?: string
  /**
   * How complete this language's interface is. Tiko offers 54, eight of them
   * translated throughout and the rest sharing a translated core, and the list is
   * grouped by that rather than presenting them as equals.
   */
  ui?: 'full' | 'core' | 'none'
}

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
  setup(props, { emit, slots }) {
    watch(() => props.colorMode, (mode) => {
      if (!['light', 'dark', 'system'].includes(mode)) emit('update:colorMode', 'system')
    }, { immediate: true })

    const text = (key: keyof TikoSettingsPanelLabels, fallback: string) => props.labels[key] ?? fallback

    /**
     * One option per language: its own name first, with the English name after it
     * where they differ — "Lëtzebuergesch (Luxembourgish)". A parent setting the app
     * up for a child may not read the script the language is written in.
     */
    const option = (language: TikoSettingsPanelLanguage) => h(
      'option',
      { value: language.value },
      language.label && language.label !== language.nativeLabel
        ? `${language.nativeLabel} (${language.label})`
        : language.nativeLabel,
    )

    /**
     * Fifty-four languages in one flat list is a wall. Where the caller says how
     * complete each interface is, they are grouped by it — the fully translated ones
     * first — so the difference is visible rather than implied.
     */
    const languageOptions = () => {
      const full = props.languages.filter((language) => language.ui === 'full')
      const rest = props.languages.filter((language) => language.ui && language.ui !== 'full')
      if (!full.length || !rest.length) return props.languages.map(option)
      return [
        h('optgroup', { label: text('fullyTranslated', 'Fully translated') }, full.map(option)),
        h('optgroup', { label: text('coreTranslated', 'Core translated') }, rest.map(option)),
      ]
    }
    return () => h('section', { class: 'tiko-settings-panel', 'data-test': 'tiko-settings-panel', 'aria-label': text('settings', 'Settings') }, [
      h('header', { class: 'tiko-settings-panel__header' }, [
        h('h2', { class: 'tiko-settings-panel__title' }, text('settings', 'Settings')),
        h('p', { class: 'tiko-settings-panel__subtitle' }, text('appPreferences', 'Language, appearance and app preferences.')),
      ]),
      h('div', { class: 'tiko-settings-panel__group', 'aria-label': text('appearance', 'Appearance') }, [
        h('label', {}, [text('language', 'Language'), h('select', { value: props.language, class: 'tiko-settings-panel__select', 'data-test': 'tiko-settings-language', onChange: (e: Event) => emit('update:language', (e.target as HTMLSelectElement).value) }, languageOptions())]),
        h('label', {}, [text('colorMode', 'Color mode'), h('select', { value: props.colorMode, class: 'tiko-settings-panel__select', 'data-test': 'tiko-settings-color-mode', onChange: (e: Event) => emit('update:colorMode', (e.target as HTMLSelectElement).value) }, [
          h('option', { value: 'light' }, text('light', 'Light')),
          h('option', { value: 'dark' }, text('dark', 'Dark')),
          h('option', { value: 'system' }, text('system', 'System'))
        ])])
      ]),
      slots.default ? slots.default() : null,
    ])
  }
})
