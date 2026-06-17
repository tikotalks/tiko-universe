<script setup lang="ts">
import { h, inject, markRaw } from 'vue'
import { useBemm } from 'bemm'
import { Button, type PopupService } from '@sil/ui'
import { tikoContentImageRefUrl } from '@tiko/ui'
import { resolveContentBaseUrl } from '../composables/yesNoApi'
import YesNoImagePickerSheet from './YesNoImagePickerSheet.vue'

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

const bemm = useBemm('yes-no-image-chooser', { return: 'string', includeBaseClass: true })
const popup = inject<PopupService>('popupService')!

function imageRefPreview(value: string) {
  return tikoContentImageRefUrl(value, resolveContentBaseUrl())
}

function openPicker(query: string) {
  popup.showPopup({
    id: 'yes-no-image-picker',
    title: '',
    component: markRaw({
      setup() {
        return () => h(YesNoImagePickerSheet, {
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
      <img :src="imageRefPreview(modelValue)" alt="" loading="lazy">
      <button type="button" @click="emit('update:modelValue', '')">×</button>
    </div>
    <Button type="button" variant="secondary" @click="openPicker(query)">
      {{ modelValue ? labels.changeImage : labels.addImage }}
    </Button>
  </div>
</template>
