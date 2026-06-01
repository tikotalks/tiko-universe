import { defineComponent, h } from 'vue'
import { vi } from 'vitest'

vi.mock('@sil/ui', () => {
  const Button = defineComponent({
    name: 'SilButtonMock',
    props: {
      disabled: Boolean,
      variant: String,
      iconOnly: Boolean
    },
    emits: ['click'],
    setup(props, { attrs, emit, slots }) {
      return () => h('button', {
        ...attrs,
        disabled: props.disabled,
        onClick: (event: MouseEvent) => emit('click', event)
      }, slots.default?.())
    }
  })

  const Icon = defineComponent({
    name: 'SilIconMock',
    props: {
      name: { type: String, required: true },
      size: String
    },
    setup(props, { attrs }) {
      return () => h('span', { ...attrs, 'data-icon': props.name }, props.name)
    }
  })

  const InputTextArea = defineComponent({
    name: 'SilInputTextAreaMock',
    props: {
      modelValue: { type: String, default: '' },
      rows: Number,
      maxlength: Number
    },
    emits: ['update:modelValue'],
    setup(props, { attrs, emit }) {
      return () => h('textarea', {
        ...attrs,
        value: props.modelValue,
        rows: props.rows,
        maxlength: props.maxlength,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
      })
    }
  })

  const Popup = defineComponent({
    name: 'SilPopupMock',
    setup(_, { slots }) {
      return () => slots.default?.()
    }
  })

  const ThemeToggle = defineComponent({
    name: 'SilThemeToggleMock',
    props: {
      theme: String,
    },
    emits: ['toggle'],
    setup(props, { attrs, emit }) {
      return () => h('button', {
        ...attrs,
        type: 'button',
        'data-theme-toggle': props.theme,
        onClick: () => emit('toggle'),
      }, 'Toggle theme')
    },
  })

  const LanguageSwitch = defineComponent({
    name: 'SilLanguageSwitchMock',
    props: {
      modelValue: String,
      options: { type: Array, default: () => [] },
    },
    emits: ['select', 'update:modelValue'],
    setup(props, { attrs, emit }) {
      return () => h('button', {
        ...attrs,
        type: 'button',
        'data-language-switch': props.modelValue,
        onClick: () => {
          const option = (props.options as Array<{ value?: string }>)[0]
          if (option) {
            emit('select', option)
            emit('update:modelValue', option.value)
          }
        },
      }, props.modelValue || 'Language')
    },
  })

  return {
    Button,
    Icon,
    InputTextArea,
    Popup,
    ThemeToggle,
    LanguageSwitch,
  }
})
