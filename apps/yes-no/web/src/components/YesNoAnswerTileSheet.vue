<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@sil/ui'
import { TikoColorPicker, TikoField, TikoSheet } from '@tiko/ui'
import type { TikoColorName } from '@tiko/data'
import type { AnswerSet, AnswerTile, AnswerTileInput } from '../types'
import YesNoImageChooser from './YesNoImageChooser.vue'

const props = defineProps<{
  mode: 'add' | 'edit'
  set: AnswerSet
  tile?: AnswerTile
  labels: {
    newTile: string
    editTile: string
    name: string
    namePlaceholder: string
    spokenText: string
    whatShouldBeSpoken: string
    color: string
    image: string
    changeImage: string
    addImage: string
    pickImage: string
    search: string
    searching: string
    searchImages: string
    typeToSearch: string
    cancel: string
    addTile: string
    save: string
  }
}>()

const emit = defineEmits<{
  submit: [value: AnswerTileInput]
  cancel: []
}>()

const label = ref(props.tile?.label ?? '')
const speech = ref(props.tile?.speech ?? '')
const color = ref<TikoColorName>((props.tile?.color as TikoColorName) ?? (props.set.color as TikoColorName) ?? 'teal')
const imageRef = ref(props.tile?.imageRef ?? '')
const icon = ref(props.tile?.icon ?? '')

function updateLabel(value: string) {
  if (!speech.value || speech.value === label.value) speech.value = value
  label.value = value
}

function submit() {
  emit('submit', {
    label: label.value,
    speech: speech.value || label.value,
    color: color.value,
    ...(imageRef.value ? { imageRef: imageRef.value } : {}),
    ...(icon.value ? { icon: icon.value } : {}),
  })
}
</script>

<template>
  <form @submit.prevent="submit">
    <TikoSheet :title="mode === 'add' ? labels.newTile : labels.editTile" icon="grid">
      <TikoField :model-value="label" :label="labels.name" :placeholder="labels.namePlaceholder" @update:model-value="updateLabel" />
      <TikoField v-model="speech" :label="labels.spokenText" :placeholder="labels.whatShouldBeSpoken" />
      <TikoColorPicker v-model="color" value-mode="name" :label="labels.color" />
      <YesNoImageChooser v-model="imageRef" :query="label" :labels="labels" />
      <template #footer>
        <Button type="button" variant="ghost" @click="emit('cancel')">{{ labels.cancel }}</Button>
        <Button type="submit" variant="primary" :disabled="!label.trim()">
          {{ mode === 'add' ? labels.addTile : labels.save }}
        </Button>
      </template>
    </TikoSheet>
  </form>
</template>
