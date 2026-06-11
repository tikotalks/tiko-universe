<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'
import { tikoColors } from '@tiko/ui'
import type { TikoColorName } from '@tiko/data'
import ColorDotPicker from '../ColorDotPicker.vue'
import MediaPicker from '../MediaPicker.vue'

interface LegacyTile {
  id?: string
  title?: string
  speech?: string
  type?: string
  color?: string
  image?: string
  imageUrl?: string
  imageURL?: string
  imageRef?: string
  original_url?: string
  thumbnailUrl?: string
  thumbnail_url?: string
  order?: number
}

interface CardItem {
  id: string
  title: string
  speech: string
  color: TikoColorName
  order: number
  imageURL?: string
  imageRef?: string
}

interface Collection {
  id: string
  title: string
  color: TikoColorName
  order: number
  parentID?: string | null
  mediaCategories: string[]
  imageURL?: string
  imageRef?: string
  cards: CardItem[]
  tiles?: LegacyTile[]
}

interface CardsDefaultsPayload {
  collections: Collection[]
}

const bemm = useBemm('cards-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const activeIndex = ref(-1)
const activeCollection = ref<Collection | null>(null)
const colorNames = new Set<TikoColorName>(tikoColors.map(color => color.name as TikoColorName))
const colorValueByName = new Map<TikoColorName, string>(tikoColors.map(color => [color.name as TikoColorName, color.hex]))
const colorNameByValue = new Map<string, TikoColorName>(tikoColors.map(color => [color.hex.toLowerCase(), color.name as TikoColorName]))

const state = computed<CardsDefaultsPayload>(() => {
  const value = props.modelValue as Partial<CardsDefaultsPayload> | null | undefined
  const collections = Array.isArray(value?.collections) ? (value!.collections as Collection[]) : []
  return { collections: collections.map(normalizeCollection) }
})

function update(next: CardsDefaultsPayload) {
  emit('update:modelValue', { ...props.modelValue, collections: next.collections.map(normalizeCollection) })
}

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function colorValue(color: TikoColorName | undefined, fallback: TikoColorName = 'gray') {
  return colorValueByName.get(color ?? fallback) ?? colorValueByName.get(fallback) ?? '#888888'
}

function colorName(value: unknown, fallback: TikoColorName): TikoColorName {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (colorNames.has(normalized as TikoColorName)) return normalized as TikoColorName
    const fromValue = colorNameByValue.get(normalized)
    if (fromValue) return fromValue
  }
  return fallback
}

function colorFromPicker(value: string, fallback: TikoColorName) {
  return colorName(value, fallback)
}

function mediaDownloadUrl(mediaId: string): string {
  return `https://media.tikoapi.org/v1/media/${encodeURIComponent(mediaId)}/download`
}

function resizedMediaUrl(url: string | undefined, size = 96): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (parsed.host === 'data.tikocdn.org' && parsed.pathname.startsWith('/uploads/')) {
      return `https://data.tikocdn.org/cdn-cgi/image/width=${size},height=${size},fit=cover,quality=80,f=auto${parsed.pathname}`
    }
  } catch {
    // Non-URL values are returned unchanged.
  }
  return url
}

function firstImageValue(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim()
}

function resolvedImageURL(source: Record<string, unknown>): string | undefined {
  const url = firstImageValue(
    source.imageURL,
    source.imageUrl,
    source.image,
    source.original_url,
    source.thumbnailUrl,
    source.thumbnail_url,
  )
  if (url) return url
  const imageRef = firstImageValue(source.imageRef, source.image_ref)
  if (!imageRef) return undefined
  return imageRef.startsWith('http') ? imageRef : mediaDownloadUrl(imageRef)
}

function normalizeCard(card: LegacyTile, order: number, fallbackColor: TikoColorName): CardItem {
  const rawCard = card as Record<string, unknown>
  const imageURL = resolvedImageURL(rawCard)
  const imageRef = firstImageValue(rawCard.imageRef, rawCard.image_ref)
  return {
    id: card.id || makeId('card'),
    title: card.title || 'New card',
    speech: card.speech || card.title || 'New card',
    color: colorName(card.color, fallbackColor),
    order: typeof card.order === 'number' ? card.order : order,
    ...(imageURL ? { imageURL } : {}),
    ...(imageRef ? { imageRef } : {}),
  }
}

function normalizeCollection(collection: Collection, order = 0): Collection {
  const rawCollection = collection as Collection & Record<string, unknown>
  const color = colorName(rawCollection.color, 'cyan')
  const imageURL = resolvedImageURL(rawCollection)
  const imageRef = firstImageValue(rawCollection.imageRef, rawCollection.image_ref)
  const sourceCards = Array.isArray(collection.cards) ? collection.cards : Array.isArray(collection.tiles) ? collection.tiles : []
  return {
    id: collection.id || makeId('col'),
    title: collection.title || 'New collection',
    color,
    order: typeof collection.order === 'number' ? collection.order : order,
    parentID: collection.parentID ?? null,
    mediaCategories: Array.isArray(collection.mediaCategories) ? collection.mediaCategories : [],
    ...(imageURL ? { imageURL } : {}),
    ...(imageRef ? { imageRef } : {}),
    cards: sourceCards.map((card, index) => normalizeCard(card, index, color)).sort((a, b) => a.order - b.order),
  }
}

function sortedCollections() {
  return [...state.value.collections].sort((a, b) => a.order - b.order)
}

function updateCollections(collections: Collection[]) {
  update({ collections: collections.map((collection, index) => normalizeCollection({ ...collection, order: index }, index)) })
}

function addCollection() {
  const collections = sortedCollections()
  const next: Collection = {
    id: makeId('col'),
    title: 'New collection',
    color: 'cyan',
    order: collections.length,
    parentID: null,
    mediaCategories: [],
    cards: [],
  }
  openCollection(next, -1)
}

function updateCollection(index: number, patch: Partial<Collection>) {
  const collections = sortedCollections().map((collection, i) => i === index ? normalizeCollection({ ...collection, ...patch }, i) : collection)
  updateCollections(collections)
}

function removeCollection(index: number) {
  updateCollections(sortedCollections().filter((_, i) => i !== index))
}

function moveCollection(index: number, delta: number) {
  const target = index + delta
  const collections = sortedCollections()
  if (target < 0 || target >= collections.length) return
  ;[collections[index], collections[target]] = [collections[target], collections[index]]
  updateCollections(collections)
}

function openCollection(collection: Collection, index: number) {
  activeCollection.value = normalizeCollection({
    ...collection,
    mediaCategories: [...collection.mediaCategories],
    cards: collection.cards.map(card => ({ ...card })),
  }, index)
  activeIndex.value = index
}

function closeCollection() {
  activeCollection.value = null
  activeIndex.value = -1
}

function patchActive(patch: Partial<Collection>) {
  if (!activeCollection.value) return
  activeCollection.value = normalizeCollection({ ...activeCollection.value, ...patch }, activeIndex.value)
}

function saveActive() {
  if (!activeCollection.value) return
  const collections = sortedCollections()
  if (activeIndex.value >= 0) {
    collections[activeIndex.value] = activeCollection.value
  } else {
    collections.push(activeCollection.value)
  }
  updateCollections(collections)
  closeCollection()
}

function updateMediaCategories(raw: string) {
  patchActive({ mediaCategories: raw.split(',').map(item => item.trim()).filter(Boolean) })
}

function addCard() {
  if (!activeCollection.value) return
  patchActive({
    cards: [
      ...activeCollection.value.cards,
      {
        id: makeId('card'),
        title: 'New card',
        speech: 'New card',
        color: activeCollection.value.color,
        order: activeCollection.value.cards.length,
      },
    ],
  })
}

function updateCard(index: number, patch: Partial<CardItem>) {
  if (!activeCollection.value) return
  patchActive({
    cards: activeCollection.value.cards.map((card, i) => i === index ? normalizeCard({ ...card, ...patch }, i, activeCollection.value!.color) : card),
  })
}

function updateActiveImageRef(value: string) {
  patchActive({
    imageRef: value || undefined,
    imageURL: value ? mediaDownloadUrl(value) : undefined,
  })
}

function updateCardImageRef(index: number, value: string) {
  updateCard(index, {
    imageRef: value || undefined,
    imageURL: value ? mediaDownloadUrl(value) : undefined,
  })
}

function removeCard(index: number) {
  if (!activeCollection.value) return
  patchActive({ cards: activeCollection.value.cards.filter((_, i) => i !== index) })
}

function moveCard(index: number, delta: number) {
  if (!activeCollection.value) return
  const target = index + delta
  const cards = [...activeCollection.value.cards]
  if (target < 0 || target >= cards.length) return
  ;[cards[index], cards[target]] = [cards[target], cards[index]]
  patchActive({ cards: cards.map((card, order) => ({ ...card, order })) })
}
</script>

<template>
  <div :class="bemm('')">
    <header :class="bemm('header')">
      <div :class="bemm('intro')">
        <h3 :class="bemm('title')">Collections</h3>
        <span :class="bemm('meta')">{{ state.collections.length }} collections</span>
      </div>
      <Button variant="outline" size="small" @click="addCollection">Add collection</Button>
    </header>

    <div v-if="state.collections.length === 0" :class="bemm('empty')">
      No collections yet. Add one to get started.
    </div>

    <ul v-else :class="bemm('collection-list')">
      <li
        v-for="(collection, ci) in sortedCollections()"
        :key="collection.id"
        :class="bemm('collection-row')"
        @click="openCollection(collection, ci)"
      >
        <span :class="bemm('thumb')" :style="{ background: collection.imageURL ? 'transparent' : colorValue(collection.color) }">
          <img v-if="collection.imageURL" :src="resizedMediaUrl(collection.imageURL, 96)" :alt="collection.title" loading="lazy" decoding="async">
          <span v-else>{{ collection.title.charAt(0).toUpperCase() }}</span>
        </span>

        <span :class="bemm('row-copy')">
          <strong :class="bemm('row-title')">{{ collection.title }}</strong>
          <span :class="bemm('row-meta')">
            {{ collection.cards.length }} cards
            <template v-if="collection.mediaCategories.length">
              · {{ collection.mediaCategories.join(', ') }}
            </template>
          </span>
        </span>

        <span :class="bemm('row-color')" @click.stop>
          <ColorDotPicker
            :model-value="colorValue(collection.color)"
            @update:model-value="(value: string) => updateCollection(ci, { color: colorFromPicker(value, collection.color) })"
          />
        </span>

        <span :class="bemm('row-actions')" @click.stop>
          <Button variant="ghost" size="small" :disabled="ci === 0" @click="moveCollection(ci, -1)">Up</Button>
          <Button variant="ghost" size="small" :disabled="ci === state.collections.length - 1" @click="moveCollection(ci, 1)">Down</Button>
          <Button variant="ghost" size="small" @click="removeCollection(ci)">Remove</Button>
        </span>
      </li>
    </ul>

    <div v-if="activeCollection" :class="bemm('modal')" @click.self="closeCollection">
      <section :class="bemm('modal-panel')" aria-label="Edit collection">
        <header :class="bemm('modal-head')">
          <div :class="bemm('modal-title-row')">
            <ColorDotPicker
              :model-value="colorValue(activeCollection.color)"
              @update:model-value="(value: string) => patchActive({ color: colorFromPicker(value, activeCollection?.color ?? 'cyan') })"
            />
            <input
              :class="bemm('title-input')"
              :value="activeCollection.title"
              placeholder="Collection title"
              @input="(event) => patchActive({ title: (event.target as HTMLInputElement).value })"
            >
          </div>
          <div :class="bemm('modal-actions')">
            <Button variant="outline" size="small" @click="closeCollection">Cancel</Button>
            <Button size="small" @click="saveActive">Save</Button>
          </div>
        </header>

        <div :class="bemm('collection-fields')">
          <InputText
            :model-value="activeCollection.id"
            label="ID"
            placeholder="collection-id"
            @update:model-value="(value: string) => patchActive({ id: value })"
          />
          <InputText
            :model-value="activeCollection.mediaCategories.join(', ')"
            label="Media categories"
            placeholder="animals, food"
            @update:model-value="updateMediaCategories"
          />
          <div :class="bemm('media-field')">
            <span :class="bemm('field-label')">Cover image</span>
            <MediaPicker
              :model-value="activeCollection.imageRef ?? ''"
              emit-id
              @update:model-value="updateActiveImageRef"
            />
          </div>
        </div>

        <section :class="bemm('cards')">
          <header :class="bemm('cards-head')">
            <h4 :class="bemm('cards-title')">Cards</h4>
            <Button variant="outline" size="small" @click="addCard">Add card</Button>
          </header>

          <div v-if="activeCollection.cards.length === 0" :class="bemm('empty')">
            No cards yet.
          </div>

          <ul v-else :class="bemm('card-list')">
            <li v-for="(card, cardIndex) in activeCollection.cards" :key="card.id" :class="bemm('card-row')">
              <span :class="bemm('card-thumb')" :style="{ background: card.imageURL ? 'transparent' : colorValue(card.color, activeCollection.color) }">
                <img v-if="card.imageURL" :src="resizedMediaUrl(card.imageURL, 96)" :alt="card.title" loading="lazy" decoding="async">
                <span v-else>{{ card.title.charAt(0).toUpperCase() || '?' }}</span>
              </span>

              <div :class="bemm('card-fields')">
                <InputText
                  :model-value="card.title"
                  label="Title"
                  placeholder="Card title"
                  @update:model-value="(value: string) => updateCard(cardIndex, { title: value })"
                />
                <InputText
                  :model-value="card.speech"
                  label="Speech"
                  placeholder="Speech text"
                  @update:model-value="(value: string) => updateCard(cardIndex, { speech: value })"
                />
                <InputText
                  :model-value="card.id"
                  label="ID"
                  placeholder="card-id"
                  @update:model-value="(value: string) => updateCard(cardIndex, { id: value })"
                />
              </div>

              <div :class="bemm('card-tools')">
                <ColorDotPicker
                  :model-value="colorValue(card.color, activeCollection.color)"
                  @update:model-value="(value: string) => updateCard(cardIndex, { color: colorFromPicker(value, card.color) })"
                />
                <MediaPicker
                  :model-value="card.imageRef ?? ''"
                  emit-id
                  @update:model-value="(value: string) => updateCardImageRef(cardIndex, value)"
                />
                <div :class="bemm('card-actions')">
                  <Button variant="ghost" size="small" :disabled="cardIndex === 0" @click="moveCard(cardIndex, -1)">Up</Button>
                  <Button variant="ghost" size="small" :disabled="cardIndex === activeCollection.cards.length - 1" @click="moveCard(cardIndex, 1)">Down</Button>
                  <Button variant="ghost" size="small" @click="removeCard(cardIndex)">Remove</Button>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </section>
    </div>
  </div>
</template>

<style lang="scss">
@use '../../styles/mixins' as *;

.cards-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header,
  &__modal-head,
  &__cards-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-m);
  }

  &__intro {
    display: flex;
    align-items: baseline;
    gap: var(--space-s);
    min-width: 0;
  }

  &__title,
  &__cards-title {
    color: var(--admin-text);
    font-size: var(--font-size-m);
    font-weight: 700;
  }

  &__meta,
  &__row-meta,
  &__field-label {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  &__empty {
    background: var(--admin-page-bg);
    border: 1px dashed var(--admin-border-strong);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    text-align: center;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__collection-list,
  &__card-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__collection-row {
    display: grid;
    grid-template-columns: calc(var(--space) * 4) minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--space-m);
    min-height: calc(var(--space) * 5);
    padding: var(--space-s);
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease;

    &:hover {
      background: var(--admin-surface-hover);
      border-color: var(--admin-border-strong);
    }
  }

  &__thumb,
  &__card-thumb {
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: var(--border-radius-s);
    color: #fff;
    font-weight: 800;
    --block-size: 0.5em;
    @include checkeredBackground;

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__thumb {
    width: calc(var(--space) * 4);
    height: calc(var(--space) * 4);
    font-size: var(--font-size-m);
  }

  &__row-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__row-title {
    color: var(--admin-text);
    font-size: var(--font-size-s);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__row-color,
  &__row-actions,
  &__modal-actions,
  &__card-actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__modal {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    padding: var(--space-l) var(--space-m);
    background: rgba(0, 0, 0, 0.6);
  }

  &__modal-panel {
    width: min(100%, 880px);
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
    padding: var(--space-l);
    background: var(--admin-surface);
    border-radius: var(--admin-card-radius);
  }

  &__modal-title-row {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    flex: 1;
    min-width: 0;
  }

  &__title-input {
    width: 100%;
    min-width: 0;
    border: 0;
    border-bottom: 1px solid var(--admin-border);
    background: transparent;
    color: var(--admin-text);
    font-size: var(--font-size-l);
    font-weight: 700;
    padding: var(--space-xs) 0;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  &__collection-fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(calc(var(--space) * 12), 0.8fr);
    gap: var(--space-s);
    align-items: start;
  }

  &__media-field,
  &__cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__card-row {
    display: grid;
    grid-template-columns: calc(var(--space) * 4) minmax(0, 1fr) minmax(calc(var(--space) * 13), auto);
    gap: var(--space-s);
    align-items: start;
    padding: var(--space-s);
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
  }

  &__card-thumb {
    width: calc(var(--space) * 4);
    height: calc(var(--space) * 4);
    font-size: var(--font-size-m);
  }

  &__card-fields {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-xs);
  }

  &__card-tools {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    gap: var(--space-s);
  }

  &__card-tools .media-picker {
    max-width: calc(var(--space) * 12);
  }

  &__card-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  @media (max-width: 780px) {
    &__collection-row,
    &__card-row,
    &__collection-fields,
    &__card-fields {
      grid-template-columns: 1fr;
    }

    &__row-actions,
    &__card-tools {
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }
}
</style>
