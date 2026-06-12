<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import {
  TikoEditBadge,
  TikoPagedTileGrid,
  TikoSelectionBadge,
  TikoSquareTile,
} from '@tiko/ui'
import type { CardCollection, CardsGridItem, CommunicationCard } from '../types'
import { colorValue, isUserOwned } from '../composables/useCardsStore'
import { imageForCard, imageForCollection } from '../composables/cardsMedia'

const props = defineProps<{
  items: CardsGridItem[]
  columns: number
  itemsPerPage: number
  page: number
  reduceMotion: boolean
  editing: boolean
  isAdmin: boolean
  labelSize: 'small' | 'medium' | 'large'
  selectedCollectionIds: Set<string>
  selectedCardIds: Set<string>
  collectionThumbnails: Record<string, string>
  cardImages: Record<string, string>
  contentBaseUrl: string
  speakingCardID?: string
  translateTitle?: (item: CardsGridItem) => string
}>()

const emit = defineEmits<{
  'update:page': [page: number]
  activate: [item: CardsGridItem]
  edit: [item: CardsGridItem]
  select: [item: CardsGridItem]
  dragStart: [item: CardsGridItem]
  dropItem: [item: CardsGridItem]
  startEdit: []
}>()

const bemm = useBemm('cards-board', { return: 'string', includeBaseClass: true })

const pageModel = computed({
  get: () => props.page,
  set: value => emit('update:page', value),
})

function selected(item: CardsGridItem) {
  return item.kind === 'collection'
    ? props.selectedCollectionIds.has(item.collection.id)
    : props.selectedCardIds.has(item.card.id)
}

function canEdit(item: CardsGridItem) {
  if (props.isAdmin) return true
  return item.kind === 'collection' ? isUserOwned(item.collection.id) : isUserOwned(item.card.id)
}

function title(item: CardsGridItem) {
  return props.translateTitle?.(item) ?? (item.kind === 'collection' ? item.collection.title : item.card.title)
}

function background(item: CardsGridItem) {
  return colorValue(item.kind === 'collection' ? item.collection.color : item.card.color)
}

function image(item: CardsGridItem) {
  return item.kind === 'collection'
    ? imageForCollection(item.collection, props.collectionThumbnails)
    : imageForCard(item.card, props.contentBaseUrl, props.cardImages)
}

function itemID(item: CardsGridItem): string {
  return item.kind === 'collection' ? item.collection.id : item.card.id
}
</script>

<template>
  <TikoPagedTileGrid
    v-model:page="pageModel"
    :items="items"
    :columns="columns"
    :items-per-page="itemsPerPage"
    :reduce-motion="reduceMotion"
  >
    <template #item="{ item }">
      <article
        :class="bemm('item', { editing, selected: selected(item) })"
        draggable="true"
        @dragstart="emit('dragStart', item)"
        @dragover.prevent
        @drop="emit('dropItem', item)"
        @contextmenu.prevent="emit('edit', item)"
        @dblclick="emit('startEdit')"
      >
        <TikoSquareTile
          :title="title(item)"
          :background="background(item)"
          :image-src="image(item)"
          :active="item.kind === 'card' && speakingCardID === item.card.id"
          :editing="editing"
          :selected="selected(item)"
          :label-size="labelSize"
          @press="emit('activate', item)"
        />
        <TikoSelectionBadge
          v-if="editing"
          :selected="selected(item)"
          @toggle="emit('select', item)"
        />
        <TikoEditBadge
          v-if="editing && canEdit(item)"
          :user-owned="isUserOwned(itemID(item))"
          @press="emit('edit', item)"
        />
      </article>
    </template>
  </TikoPagedTileGrid>
</template>
