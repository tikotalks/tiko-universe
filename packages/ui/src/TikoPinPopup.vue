<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useBemm } from 'bemm'
import { hashParentPin } from './pin-crypto'

const CODE_LENGTH = 4
const EMPTY_DIGITS = () => Array<string>(CODE_LENGTH).fill('')

interface Props {
  /** Existing code hash — if undefined, this is first-time setup unless mode is forced. */
  existingHash?: string
  /** Hash namespace for backward-compatible app-local codes. */
  hashNamespace?: string
  /** Force setup/verify mode when the PIN is verified by the identity API instead of an app-local hash. */
  mode?: 'setup' | 'verify'
  /** Optional async verifier for API-backed PIN flows. Return false to keep the popup open with an error. */
  verifyCode?: (code: string) => boolean | Promise<boolean>
  labels?: TikoPinPopupLabels
}

const props = withDefaults(defineProps<Props>(), {
  hashNamespace: 'parent-code',
  labels: () => ({
    createTitle: 'Create a code',
    createSubtitle: 'This protects parent mode from kids',
    confirmTitle: 'Confirm code',
    confirmSubtitle: 'Enter the same 4 digits again',
    enterTitle: 'Enter code',
    enterSubtitle: 'to switch to parent mode',
    codesDontMatch: "Codes don't match",
    wrongCode: 'Wrong code',
    digitLabel: 'Digit {index} of {total}',
    back: 'Back',
    cancel: 'Cancel',
  }),
})

const bemm = useBemm('tiko-pin-popup', { return: 'string', includeBaseClass: true })

interface TikoPinPopupLabels {
  createTitle: string
  createSubtitle: string
  confirmTitle: string
  confirmSubtitle: string
  enterTitle: string
  enterSubtitle: string
  codesDontMatch: string
  wrongCode: string
  digitLabel: string
  back: string
  cancel: string
}

const emit = defineEmits<{
  (e: 'set', hash: string, code: string): void
  (e: 'cancel'): void
}>()

const mode = computed(() => props.mode ?? (props.existingHash ? 'verify' : 'setup'))

const step = ref<'enter' | 'confirm'>('enter')
const digits = ref<string[]>(EMPTY_DIGITS())
const confirmDigits = ref<string[]>(EMPTY_DIGITS())
const error = ref('')
const shake = ref(false)
const loading = ref(false)

const inputRefs = ref<(HTMLInputElement | null)[]>([])

function focusDigit(index: number) {
  inputRefs.value[index]?.focus()
}

function onDigitInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/[^0-9]/g, '')
  const arr = mode.value === 'setup' && step.value === 'confirm'
    ? confirmDigits.value
    : digits.value

  if (value.length > 1) {
    const distributed = value.slice(0, CODE_LENGTH).split('')
    for (let di = 0; di < distributed.length; di++) {
      if (index + di < CODE_LENGTH) arr[index + di] = distributed[di]
    }
    const nextIndex = Math.min(index + distributed.length, CODE_LENGTH - 1)
    focusDigit(nextIndex)
  } else if (mode.value === 'setup') {
    if (value.length === 1) {
      arr[index] = value
      if (index < CODE_LENGTH - 1) focusDigit(index + 1)
    } else if (value.length === 0) {
      arr[index] = ''
      if (index > 0) focusDigit(index - 1)
    }
  } else {
    arr[index] = value.length === 1 ? value : ''
    if (value.length === 1 && index < CODE_LENGTH - 1) focusDigit(index + 1)
    else if (value.length === 0 && index > 0) focusDigit(index - 1)
  }

  error.value = ''
  shake.value = false

  const currentDigits = mode.value === 'setup' && step.value === 'confirm'
    ? confirmDigits.value
    : digits.value

  if (currentDigits.filter(d => d !== '').length === CODE_LENGTH) {
    autoSubmitTimer = window.setTimeout(() => handleSubmit(), 200)
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

function rejectCode() {
  error.value = props.labels.wrongCode
  shake.value = true
  digits.value = EMPTY_DIGITS()
  shakeTimer = window.setTimeout(() => { shake.value = false }, 400)
  focusDigit(0)
}

async function handleSubmit() {
  if (loading.value) return
  const currentDigits = mode.value === 'setup' && step.value === 'confirm'
    ? confirmDigits.value
    : digits.value

  if (currentDigits.filter(digit => digit !== '').length !== CODE_LENGTH) return

  const code = currentDigits.join('')

  if (mode.value === 'setup') {
    if (step.value === 'enter') {
      step.value = 'confirm'
      focusDigit(0)
    } else {
      const original = digits.value.join('')
      if (code !== original) {
        error.value = props.labels.codesDontMatch
        shake.value = true
        confirmDigits.value = EMPTY_DIGITS()
        shakeTimer = window.setTimeout(() => { shake.value = false }, 400)
        focusDigit(0)
      } else {
        const hash = await hashCode(code)
        emit('set', hash, code)
      }
    }
  } else {
    if (!props.verifyCode && !props.existingHash) {
      rejectCode()
      return
    }
    const hash = await hashCode(code)
    loading.value = true
    try {
      const verified = props.verifyCode
        ? await props.verifyCode(code)
        : props.existingHash
          ? hash === props.existingHash
          : false

      if (verified) {
        emit('set', hash, code)
      } else {
        rejectCode()
      }
    } catch {
      rejectCode()
    } finally {
      loading.value = false
    }
  }
}

function resetConfirm() {
  step.value = 'enter'
  confirmDigits.value = EMPTY_DIGITS()
  digits.value = EMPTY_DIGITS()
  error.value = ''
  focusDigit(0)
}

function digitLabel(index: number): string {
  return props.labels.digitLabel
    .replace('{index}', String(index))
    .replace('{total}', String(CODE_LENGTH))
}

let autoSubmitTimer: number | undefined
let shakeTimer: number | undefined

onUnmounted(() => {
  if (autoSubmitTimer !== undefined) clearTimeout(autoSubmitTimer)
  if (shakeTimer !== undefined) clearTimeout(shakeTimer)
})

async function hashCode(code: string): Promise<string> {
  return hashParentPin(code, props.hashNamespace)
}
</script>

<template>
  <div :class="bemm('', { shake })">
    <template v-if="mode === 'setup'">
      <div v-if="step === 'enter'" :class="bemm('header')">
        <h2 :class="bemm('title')">{{ props.labels.createTitle }}</h2>
        <p :class="bemm('subtitle')">{{ props.labels.createSubtitle }}</p>
      </div>
      <div v-else :class="bemm('header')">
        <h2 :class="bemm('title')">{{ props.labels.confirmTitle }}</h2>
        <p :class="bemm('subtitle')">{{ props.labels.confirmSubtitle }}</p>
      </div>
    </template>

    <template v-else>
      <div :class="bemm('header')">
        <h2 :class="bemm('title')">{{ props.labels.enterTitle }}</h2>
        <p :class="bemm('subtitle')">{{ props.labels.enterSubtitle }}</p>
      </div>
    </template>

    <div :class="bemm('digits')">
      <template v-if="mode === 'setup' && step === 'confirm'">
        <input
          v-for="i in CODE_LENGTH"
          :key="'c' + i"
          :ref="(el: any) => { if (el) inputRefs[i - 1] = el as HTMLInputElement }"
          type="tel"
          inputmode="numeric"
          maxlength="1"
          :class="bemm('digit')"
          :value="confirmDigits[i - 1]"
          @input="onDigitInput(i - 1, $event)"
          @keydown="onKeydown(i - 1, $event)"
          :aria-label="digitLabel(i)"
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
          :class="bemm('digit')"
          :value="digits[i - 1]"
          @input="onDigitInput(i - 1, $event)"
          @keydown="onKeydown(i - 1, $event)"
          :aria-label="digitLabel(i)"
          autocomplete="off"
        />
      </template>
    </div>

    <p v-if="error" :class="bemm('error')">{{ error }}</p>

    <button
      v-if="mode === 'setup' && step === 'confirm'"
      :class="bemm('back')"
      @click="resetConfirm"
    >
      {{ props.labels.back }}
    </button>

    <button
      v-if="mode === 'verify'"
      :class="bemm('cancel')"
      @click="emit('cancel')"
    >
      {{ props.labels.cancel }}
    </button>
  </div>
</template>

<style lang="scss">
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
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 4%);
    color: var(--color-foreground);
    caret-color: currentColor;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:focus {
      outline: none;
      border-color: color-mix(in srgb, var(--color-foreground), transparent 5%);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-foreground), transparent 82%);
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
