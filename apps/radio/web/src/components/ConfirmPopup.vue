<script setup lang="ts">
import { inject } from 'vue'
import type { PopupService } from '@sil/ui'

interface Props {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  /** Destructive confirms (delete) get the warning treatment. */
  destructive?: boolean
}

withDefaults(defineProps<Props>(), { destructive: false })

const emit = defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()

const popup = inject<PopupService>('popupService')

function confirm() {
  emit('confirm')
  popup?.closeAllPopups()
}

function cancel() {
  emit('cancel')
  popup?.closeAllPopups()
}
</script>

<template>
  <div class="radio-confirm" data-test="radio-confirm">
    <h2 class="radio-confirm__title">{{ title }}</h2>
    <p class="radio-confirm__message">{{ message }}</p>
    <div class="radio-confirm__actions">
      <button class="radio-confirm__button" data-test="radio-confirm-cancel" @click="cancel">
        {{ cancelLabel }}
      </button>
      <button
        class="radio-confirm__button radio-confirm__button--primary"
        :class="{ 'radio-confirm__button--destructive': destructive }"
        data-test="radio-confirm-accept"
        @click="confirm"
      >
        {{ confirmLabel }}
      </button>
    </div>
  </div>
</template>
