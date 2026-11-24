<script setup lang="ts">
import { ref } from 'vue'
import { fitzgeraldCategories, type FitzgeraldCategory } from '@tiko/data'
import { createI18n } from '@tiko/i18n'
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

const i18n = createI18n({ app: 'cards' })
const category = ref<FitzgeraldCategory>(props.card?.fitzgeraldCategory ?? 'miscellaneous')
const title = ref(props.card?.title ?? '')
const speech = ref(props.card?.speech ?? '')
const color = ref(props.card?.color ?? props.collection.color)
const imageRef = ref(props.card?.imageRef ?? '')

function updateTitle(value: string) {
  if (!speech.value || speech.value === title.value) speech.value = value
  title.value = value
}

function submit() {
  emit('submit', {
    fitzgeraldCategory: category.value,
    title: title.value,
    speech: speech.value || title.value,
    color: color.value,
    imageRef: imageRef.value || undefined,
  })
}
</script>

<template>
  <form @submit.prevent="submit">
    <TikoSheet :title="mode === 'add' ? labels.newCard : labels.editCard" icon="card">
      <TikoField :model-value="title" :label="labels.name" :placeholder="labels.cardNamePlaceholder" @update:model-value="updateTitle" />
      <TikoField v-model="speech" :label="labels.spokenText" :placeholder="labels.whatShouldBeSpoken" />
      <TikoColorPicker v-model="color" value-mode="name" :label="labels.color" />
      <label>
        {{ i18n.t('common.fitzgeraldCategory') }}
        <select v-model="category">
          <option v-for="item in fitzgeraldCategories" :key="item" :value="item">{{ i18n.t(`common.fitzgerald.${item}`) }}</option>
        </select>
      </label>
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
