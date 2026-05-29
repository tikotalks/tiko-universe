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

  return {
    Button,
    Icon,
    InputTextArea,
    Popup
  }
})
