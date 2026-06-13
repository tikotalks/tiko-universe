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
}

export interface TikoSettingsPanelLanguage {
  value: string
  nativeLabel: string
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
