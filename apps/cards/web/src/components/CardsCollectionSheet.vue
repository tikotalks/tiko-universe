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
    <TikoSheet :title="mode === 'add' ? 'New Category' : 'Edit Category'" icon="grid">
      <TikoField v-model="title" label="Name" placeholder="Category name" />
      <label :class="selectBemm('')">
        <span :class="selectBemm('label')">Parent Collection</span>
        <select v-model="selectedParentID" :class="selectBemm('control')">
          <option value="">None</option>
          <option v-for="candidate in eligibleParents" :key="candidate.id" :value="candidate.id">
            {{ candidate.title }}
          </option>
        </select>
      </label>
      <TikoColorPicker v-model="colorHex" label="Color" />
      <CardsImageChooser v-model="imageURL" :query="title" />
      <template #footer>
        <Button type="button" variant="ghost" @click="emit('cancel')">Cancel</Button>
        <Button type="submit" variant="primary" :disabled="!title.trim()">
          {{ mode === 'add' ? 'Add Category' : 'Save' }}
        </Button>
      </template>
    </TikoSheet>
  </form>
</template>
