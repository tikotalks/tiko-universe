<script setup lang="ts">
import { TikoTileBoard } from '@tiko/ui'
import type { CardsGridItem } from '../types'
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
  labels?: {
    deselect?: string
    edit?: string
    select?: string
  }
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

function active(item: CardsGridItem) {
  return item.kind === 'card' && props.speakingCardID === item.card.id
}

function itemID(item: CardsGridItem): string {
  return item.kind === 'collection' ? item.collection.id : item.card.id
}
</script>

<template>
  <TikoTileBoard
    :items="items"
    :columns="columns"
    :items-per-page="itemsPerPage"
    :page="page"
    :reduce-motion="reduceMotion"
    :editing="editing"
    :label-size="labelSize"
    :get-title="title"
    :get-background="background"
    :get-image="image"
    :is-selected="selected"
    :is-active="active"
    :can-edit="canEdit"
    :is-user-owned="item => isUserOwned(itemID(item))"
    :labels="labels"
    @update:page="emit('update:page', $event)"
    @activate="emit('activate', $event)"
    @edit="emit('edit', $event)"
    @select="emit('select', $event)"
    @drag-start="emit('dragStart', $event)"
    @drop-item="emit('dropItem', $event)"
    @start-edit="emit('startEdit')"
  />
</template>
