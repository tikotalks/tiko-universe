<script setup lang="ts">
import { ref } from 'vue'
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import { TikoColorPicker, TikoSheet } from '@tiko/ui'
import type { TikoColorName } from '@tiko/data'
import type { CardCollection } from '../types'
import { colorValue } from '../composables/useCardsStore'

defineProps<{
  count: number
  collections: CardCollection[]
  labels: {
    selected: string
    moveToCollection: string
    changeColor: string
    delete: string
    back: string
    color: string
    applyColor: string
  }
}>()

const emit = defineEmits<{
  close: []
  delete: []
  move: [collectionID: string]
  color: [color: TikoColorName]
}>()

const view = ref<'actions' | 'move' | 'color'>('actions')
const color = ref<TikoColorName>('orange')
const actionList = useBemm('cards-action-list', { return: 'string', includeBaseClass: true })
const actionRow = useBemm('cards-action-row', { return: 'string', includeBaseClass: true })
</script>

<template>
  <TikoSheet v-if="view === 'actions'" :title="`${count} ${labels.selected}`" icon="check">
    <div :class="actionList('')">
      <button type="button" :class="actionRow('')" @click="view = 'move'">{{ labels.moveToCollection }} <span>›</span></button>
      <button type="button" :class="actionRow('')" @click="view = 'color'">{{ labels.changeColor }} <span>›</span></button>
      <button type="button" :class="actionRow('', { danger: true })" @click="emit('delete')">{{ labels.delete }} <span>×</span></button>
    </div>
  </TikoSheet>

  <TikoSheet v-else-if="view === 'move'" :title="labels.moveToCollection" icon="move">
    <div :class="actionList('')">
      <button
        v-for="collection in collections"
        :key="collection.id"
        type="button"
        :class="actionRow('')"
        @click="emit('move', collection.id)"
      >
        <span :class="actionRow('swatch')" :style="{ backgroundColor: colorValue(collection.color) }" />
        {{ collection.title }}
        <span>›</span>
      </button>
    </div>
    <template #footer>
      <Button type="button" variant="ghost" @click="view = 'actions'">{{ labels.back }}</Button>
    </template>
  </TikoSheet>

  <TikoSheet v-else :title="labels.changeColor" icon="color">
    <TikoColorPicker v-model="color" value-mode="name" :label="labels.color" />
    <template #footer>
      <Button type="button" variant="ghost" @click="view = 'actions'">{{ labels.back }}</Button>
      <Button type="button" variant="primary" @click="emit('color', color)">{{ labels.applyColor }}</Button>
    </template>
  </TikoSheet>
</template>
