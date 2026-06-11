<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@sil/ui'
import { TikoColorPicker, TikoField, TikoSheet } from '@tiko/ui'
import type { CardCollection, CardsCardInput, CommunicationCard } from '../types'
import CardsImageChooser from './CardsImageChooser.vue'

const props = defineProps<{
  mode: 'add' | 'edit'
  collection: CardCollection
  card?: CommunicationCard
  labels: {
    newCard: string
    editCard: string
    name: string
    cardNamePlaceholder: string
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
    addCard: string
    save: string
  }
}>()

const emit = defineEmits<{
  submit: [value: CardsCardInput]
  cancel: []
}>()

const title = ref(props.card?.title ?? '')
const speech = ref(props.card?.speech ?? '')
const colorHex = ref(props.card?.colorHex ?? props.collection.colorHex)
const imageRef = ref(props.card?.imageRef ?? '')

function updateTitle(value: string) {
  if (!speech.value || speech.value === title.value) speech.value = value
  title.value = value
}

function submit() {
  emit('submit', {
    title: title.value,
    speech: speech.value || title.value,
    colorHex: colorHex.value,
    imageRef: imageRef.value || undefined,
  })
}
</script>

<template>
  <form @submit.prevent="submit">
    <TikoSheet :title="mode === 'add' ? labels.newCard : labels.editCard" icon="card">
      <TikoField :model-value="title" :label="labels.name" :placeholder="labels.cardNamePlaceholder" @update:model-value="updateTitle" />
      <TikoField v-model="speech" :label="labels.spokenText" :placeholder="labels.whatShouldBeSpoken" />
      <TikoColorPicker v-model="colorHex" :label="labels.color" />
      <CardsImageChooser v-model="imageRef" :query="title" :labels="labels" />
      <template #footer>
        <Button type="button" variant="ghost" @click="emit('cancel')">{{ labels.cancel }}</Button>
        <Button type="submit" variant="primary" :disabled="!title.trim()">
          {{ mode === 'add' ? labels.addCard : labels.save }}
        </Button>
      </template>
    </TikoSheet>
  </form>
</template>
