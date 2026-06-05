<script setup lang="ts">
import { ref, computed } from 'vue'

const CODE_LENGTH = 4

interface Props {
  /** Existing code hash — if undefined, this is first-time setup */
  existingHash?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'set', hash: string): void
  (e: 'cancel'): void
}>()

const mode = computed(() => props.existingHash ? 'verify' : 'setup')

const step = ref<'enter' | 'confirm'>('enter')
const digits = ref<string[]>([])
const confirmDigits = ref<string[]>([])
const error = ref('')
const shake = ref(false)

const inputRefs = ref<(HTMLInputElement | null)[]>([])

function focusDigit(index: number) {
  inputRefs.value[index]?.focus()
}

function onDigitInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/[^0-9]/g, '')

  if (mode.value === 'setup') {
    const arr = step.value === 'enter' ? digits.value : confirmDigits.value
    if (value.length === 1) {
      arr[index] = value
      if (index < CODE_LENGTH - 1) focusDigit(index + 1)
    } else if (value.length === 0) {
      arr[index] = ''
      if (index > 0) focusDigit(index - 1)
    }
  } else {
    digits.value[index] = value.length === 1 ? value : ''
    if (value.length === 1 && index < CODE_LENGTH - 1) focusDigit(index + 1)
    else if (value.length === 0 && index > 0) focusDigit(index - 1)
  }

  error.value = ''
  shake.value = false

  const currentDigits = mode.value === 'setup' && step.value === 'confirm'
    ? confirmDigits.value
    : digits.value

  if (currentDigits.every(d => d !== '')) {
    setTimeout(() => handleSubmit(), 200)
  }
}

function onKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace') {
    const arr = mode.value === 'setup' && step.value === 'confirm'
      ? confirmDigits.value
      : digits.value
    if (arr[index] === '' && index > 0) {
      focusDigit(index - 1)
    } else {
      arr[index] = ''
    }
    error.value = ''
    event.preventDefault()
  }
}

async function handleSubmit() {
  const currentDigits = mode.value === 'setup' && step.value === 'confirm'
    ? confirmDigits.value
    : digits.value

  const code = currentDigits.join('')

  if (mode.value === 'setup') {
    if (step.value === 'enter') {
      step.value = 'confirm'
      focusDigit(0)
    } else {
      const original = digits.value.join('')
      if (code !== original) {
        error.value = 'Codes don\'t match'
        shake.value = true
        confirmDigits.value = []
        setTimeout(() => { shake.value = false }, 400)
        focusDigit(0)
      } else {
        const hash = await hashCode(code)
        emit('set', hash)
      }
    }
  } else {
    const hash = await hashCode(code)
    if (hash === props.existingHash) {
      emit('set', hash)
    } else {
      error.value = 'Wrong code'
      shake.value = true
      digits.value = []
      setTimeout(() => { shake.value = false }, 400)
      focusDigit(0)
    }
  }
}

function resetConfirm() {
  step.value = 'enter'
  confirmDigits.value = []
  digits.value = []
  error.value = ''
  focusDigit(0)
}

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`tiko:parent-code:${code}`)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
</script>

<template>
  <div class="tiko-pin-popup" :class="{ 'tiko-pin-popup--shake': shake }">
    <template v-if="mode === 'setup'">
      <div v-if="step === 'enter'" class="tiko-pin-popup__header">
        <h2 class="tiko-pin-popup__title">Create a code</h2>
        <p class="tiko-pin-popup__subtitle">This protects parent mode from kids</p>
      </div>
      <div v-else class="tiko-pin-popup__header">
        <h2 class="tiko-pin-popup__title">Confirm code</h2>
        <p class="tiko-pin-popup__subtitle">Enter the same 4 digits again</p>
      </div>
    </template>

    <template v-else>
      <div class="tiko-pin-popup__header">
        <h2 class="tiko-pin-popup__title">Enter code</h2>
        <p class="tiko-pin-popup__subtitle">to switch to parent mode</p>
      </div>
    </template>

    <div class="tiko-pin-popup__digits">
      <template v-if="mode === 'setup' && step === 'confirm'">
        <input
          v-for="i in CODE_LENGTH"
          :key="'c' + i"
          :ref="(el: any) => { if (el) inputRefs[i - 1] = el as HTMLInputElement }"
          type="tel"
          inputmode="numeric"
          maxlength="1"
          class="tiko-pin-popup__digit"
          :value="confirmDigits[i - 1]"
          @input="onDigitInput(i - 1, $event)"
          @keydown="onKeydown(i - 1, $event)"
          autocomplete="off"
        />
      </template>
      <template v-else>
        <input
          v-for="i in CODE_LENGTH"
          :key="'e' + i"
          :ref="(el: any) => { if (el) inputRefs[i - 1] = el as HTMLInputElement }"
          type="tel"
          inputmode="numeric"
          maxlength="1"
          class="tiko-pin-popup__digit"
          :value="digits[i - 1]"
          @input="onDigitInput(i - 1, $event)"
          @keydown="onKeydown(i - 1, $event)"
          autocomplete="off"
        />
      </template>
    </div>

    <p v-if="error" class="tiko-pin-popup__error">{{ error }}</p>

    <button
      v-if="mode === 'setup' && step === 'confirm'"
      class="tiko-pin-popup__back"
      @click="resetConfirm"
    >
      Back
    </button>

    <button
      v-if="mode === 'verify'"
      class="tiko-pin-popup__cancel"
      @click="emit('cancel')"
    >
      Cancel
    </button>
  </div>
</template>

<style scoped lang="scss">
.tiko-pin-popup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 2rem 1.5rem 1.5rem;
  transition: transform 0.15s ease;

  &--shake {
    animation: pin-shake 0.4s ease;
  }

  &__header {
    text-align: center;
  }

  &__title {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
    color: var(--color-foreground);
  }

  &__subtitle {
    font-size: 0.85rem;
    color: color-mix(in srgb, var(--color-foreground), transparent 40%);
    margin: 0;
  }

  &__digits {
    display: flex;
    gap: 0.65rem;
    justify-content: center;
  }

  &__digit {
    width: 3.25rem;
    height: 3.75rem;
    text-align: center;
    font-size: 1.5rem;
    font-weight: 700;
    font-family: inherit;
    border: 2px solid color-mix(in srgb, var(--color-foreground), transparent 15%);
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--tiko-surface, #fff), var(--color-foreground) 4%);
    color: var(--color-foreground);
    caret-color: var(--tiko-app-primary);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:focus {
      outline: none;
      border-color: var(--tiko-app-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--tiko-app-primary), transparent 75%);
    }

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    -moz-appearance: textfield;
  }

  &__error {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-error, #e84057);
    margin: 0;
    min-height: 1.2rem;
    text-align: center;
  }

  &__back,
  &__cancel {
    background: none;
    border: none;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: color-mix(in srgb, var(--color-foreground), transparent 40%);
    cursor: pointer;
    padding: 0.4rem 0.8rem;
    border-radius: 0.5rem;
    transition: color 0.15s ease;

    &:hover {
      color: var(--color-foreground);
    }
  }
}

@keyframes pin-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-0.5rem); }
  40% { transform: translateX(0.5rem); }
  60% { transform: translateX(-0.35rem); }
  80% { transform: translateX(0.35rem); }
}
</style>
