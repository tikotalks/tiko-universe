import { defineComponent, h } from 'vue'
import { Icon } from '@sil/ui'
import { tikoNormalizeOpenIcon, tikoOpenIcons, type TikoOpenIconOption } from './app-config'

export interface TikoOpenIconPickerLabels {
  openIcons?: string
}

export default defineComponent({
  name: 'TikoOpenIconPicker',
  props: {
    modelValue: { type: String, default: '' },
    icons: { type: Array as () => TikoOpenIconOption[], default: () => tikoOpenIcons },
    labels: { type: Object as () => TikoOpenIconPickerLabels, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'tiko-open-icon-picker', role: 'listbox', 'aria-label': props.labels.openIcons ?? 'Open icons' }, props.icons.map(icon => {
      const active = tikoNormalizeOpenIcon(props.modelValue) === icon.name
      return h('button', {
        key: icon.name,
        type: 'button',
        role: 'option',
        class: ['tiko-open-icon-picker__item', active ? 'tiko-open-icon-picker__item--active' : ''],
        title: icon.label,
        'aria-label': icon.label,
        'aria-pressed': active ? 'true' : 'false',
        'aria-selected': active ? 'true' : 'false',
        onClick: () => emit('update:modelValue', active ? '' : icon.name),
      }, [h(Icon, { name: icon.name, size: 'medium', 'aria-hidden': 'true' })])
    }))
  },
})
