<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import { TikoColorPicker, TikoField, TikoSheet } from '@tiko/ui'
import type { CardCollection, CardsCollectionInput } from '../types'
import CardsImageChooser from './CardsImageChooser.vue'

const props = defineProps<{
  mode: 'add' | 'edit'
  collection?: CardCollection
  collections: CardCollection[]
  parentID?: string
  labels: {
    newCategory: string
    editCategory: string
    name: string
    categoryNamePlaceholder: string
    parentCollection: string
    none: string
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
    addCategory: string
    save: string
  }
}>()

const emit = defineEmits<{
  submit: [value: CardsCollectionInput]
  cancel: []
}>()

const title = ref(props.collection?.title ?? '')
const colorHex = ref(props.collection?.colorHex ?? 0xFF922B)
const selectedParentID = ref(props.collection?.parentID ?? props.parentID ?? '')
const imageURL = ref(props.collection?.imageURL ?? '')
const selectBemm = useBemm('cards-select-field', { return: 'string', includeBaseClass: true })

const eligibleParents = computed(() => props.collections.filter(collection =>
  collection.id !== props.collection?.id && collection.parentID !== props.collection?.id,
))

function submit() {
  emit('submit', {
    title: title.value,
    colorHex: colorHex.value,
    parentID: selectedParentID.value || null,
    imageURL: imageURL.value || undefined,
  })
}
</script>

<template>
  <form @submit.prevent="submit">
    <TikoSheet :title="mode === 'add' ? labels.newCategory : labels.editCategory" icon="grid">
      <TikoField v-model="title" :label="labels.name" :placeholder="labels.categoryNamePlaceholder" />
      <label :class="selectBemm('')">
        <span :class="selectBemm('label')">{{ labels.parentCollection }}</span>
        <select v-model="selectedParentID" :class="selectBemm('control')">
          <option value="">{{ labels.none }}</option>
          <option v-for="candidate in eligibleParents" :key="candidate.id" :value="candidate.id">
            {{ candidate.title }}
          </option>
        </select>
      </label>
      <TikoColorPicker v-model="colorHex" :label="labels.color" />
      <CardsImageChooser v-model="imageURL" :query="title" :labels="labels" />
      <template #footer>
        <Button type="button" variant="ghost" @click="emit('cancel')">{{ labels.cancel }}</Button>
        <Button type="submit" variant="primary" :disabled="!title.trim()">
          {{ mode === 'add' ? labels.addCategory : labels.save }}
        </Button>
      </template>
    </TikoSheet>
  </form>
</template>
