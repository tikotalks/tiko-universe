<script setup lang="ts">
import { ref } from 'vue'
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import { TikoColorPicker, TikoSheet } from '@tiko/ui'
import type { CardCollection } from '../types'
import { hexColor } from '../composables/useCardsStore'

defineProps<{
  count: number
  collections: CardCollection[]
}>()

const emit = defineEmits<{
  close: []
  delete: []
  move: [collectionID: string]
  color: [colorHex: number]
}>()

const view = ref<'actions' | 'move' | 'color'>('actions')
const colorHex = ref(0xFF922B)
const actionList = useBemm('cards-action-list', { return: 'string', includeBaseClass: true })
const actionRow = useBemm('cards-action-row', { return: 'string', includeBaseClass: true })
</script>

<template>
  <TikoSheet v-if="view === 'actions'" :title="`${count} selected`" icon="check">
    <div :class="actionList('')">
      <button type="button" :class="actionRow('')" @click="view = 'move'">Move to Collection <span>›</span></button>
      <button type="button" :class="actionRow('')" @click="view = 'color'">Change Color <span>›</span></button>
      <button type="button" :class="actionRow('', { danger: true })" @click="emit('delete')">Delete <span>×</span></button>
    </div>
  </TikoSheet>

  <TikoSheet v-else-if="view === 'move'" title="Move to Collection" icon="move">
    <div :class="actionList('')">
      <button
        v-for="collection in collections"
        :key="collection.id"
        type="button"
        :class="actionRow('')"
        @click="emit('move', collection.id)"
      >
        <span :class="actionRow('swatch')" :style="{ backgroundColor: hexColor(collection.colorHex) }" />
        {{ collection.title }}
        <span>›</span>
      </button>
    </div>
    <template #footer>
      <Button type="button" variant="ghost" @click="view = 'actions'">Back</Button>
    </template>
  </TikoSheet>

  <TikoSheet v-else title="Change Color" icon="color">
    <TikoColorPicker v-model="colorHex" label="Color" />
    <template #footer>
      <Button type="button" variant="ghost" @click="view = 'actions'">Back</Button>
      <Button type="button" variant="primary" @click="emit('color', colorHex)">Apply Color</Button>
    </template>
  </TikoSheet>
</template>
