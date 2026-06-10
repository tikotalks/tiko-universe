<script setup lang="ts">
import { h, inject, markRaw } from 'vue'
import { useBemm } from 'bemm'
import { Button, type PopupService } from '@sil/ui'
import { resizedCDNURL } from '../composables/cardsMedia'
import CardsImagePickerSheet from './CardsImagePickerSheet.vue'

defineProps<{
  modelValue: string
  query: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const bemm = useBemm('cards-image-chooser', { return: 'string', includeBaseClass: true })
const popup = inject<PopupService>('popupService')!

function openPicker(query: string) {
  popup.showPopup({
    id: 'cards-image-picker',
    title: '',
    component: markRaw({
      setup() {
        return () => h(CardsImagePickerSheet, {
          query,
          onSelect: (url: string) => {
            emit('update:modelValue', url)
            popup.closeAllPopups()
          },
        })
      },
    }),
    config: {
      position: 'center',
      canClose: true,
      background: true,
      width: '32rem',
    },
  })
}
</script>

<template>
  <div :class="bemm('')">
    <span :class="bemm('label')">Image</span>
    <div v-if="modelValue" :class="bemm('preview')">
      <img :src="resizedCDNURL(modelValue)" alt="" loading="lazy">
      <button type="button" @click="emit('update:modelValue', '')">×</button>
    </div>
    <Button type="button" variant="secondary" @click="openPicker(query)">
      {{ modelValue ? 'Change Image' : 'Browse Images' }}
    </Button>
  </div>
</template>
