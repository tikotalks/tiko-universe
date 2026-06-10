<script setup lang="ts">
import { h, inject, markRaw } from 'vue'
import { useBemm } from 'bemm'
import { Button, type PopupService } from '@sil/ui'
import { resizedCDNURL } from '../composables/cardsMedia'
import CardsImagePickerSheet from './CardsImagePickerSheet.vue'

const props = defineProps<{
  modelValue: string
  query: string
  labels: {
    image: string
    changeImage: string
    addImage: string
    pickImage: string
    search: string
    searching: string
    searchImages: string
    typeToSearch: string
  }
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
          labels: props.labels,
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
    <span :class="bemm('label')">{{ labels.image }}</span>
    <div v-if="modelValue" :class="bemm('preview')">
      <img :src="resizedCDNURL(modelValue)" alt="" loading="lazy">
      <button type="button" @click="emit('update:modelValue', '')">×</button>
    </div>
    <Button type="button" variant="secondary" @click="openPicker(query)">
      {{ modelValue ? labels.changeImage : labels.addImage }}
    </Button>
  </div>
</template>
