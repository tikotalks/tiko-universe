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
}>()

const emit = defineEmits<{
  submit: [value: CardsCardInput]
  cancel: []
}>()

const title = ref(props.card?.title ?? '')
const speech = ref(props.card?.speech ?? '')
const colorHex = ref(props.card?.colorHex ?? props.collection.colorHex)
const imageURL = ref(props.card?.imageURL ?? '')

function updateTitle(value: string) {
  if (!speech.value || speech.value === title.value) speech.value = value
  title.value = value
}

function submit() {
  emit('submit', {
    title: title.value,
    speech: speech.value || title.value,
    colorHex: colorHex.value,
    imageURL: imageURL.value || undefined,
  })
}
</script>

<template>
  <form @submit.prevent="submit">
    <TikoSheet :title="mode === 'add' ? 'New Card' : 'Edit Card'" icon="card">
      <TikoField :model-value="title" label="Name" placeholder="Card name" @update:model-value="updateTitle" />
      <TikoField v-model="speech" label="Spoken Text" placeholder="What should be spoken?" />
      <TikoColorPicker v-model="colorHex" label="Color" />
      <CardsImageChooser v-model="imageURL" :query="title" />
      <template #footer>
        <Button type="button" variant="ghost" @click="emit('cancel')">Cancel</Button>
        <Button type="submit" variant="primary" :disabled="!title.trim()">
          {{ mode === 'add' ? 'Add Card' : 'Save' }}
        </Button>
      </template>
    </TikoSheet>
  </form>
</template>
