<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'
import { tikoColors } from '@tiko/ui'
import type { TikoColorName } from '@tiko/data'
import { useCardsDefaults, type CardsCard, type CardsCollection } from '../composables/useCardsDefaults'
import ColorDotPicker from '../components/ColorDotPicker.vue'
import MediaPicker from '../components/MediaPicker.vue'

const bemm = useBemm('cards-page', { return: 'string', includeBaseClass: true })
const { loading, saving, error, read, write } = useCardsDefaults()

const colorNames = new Set<TikoColorName>(tikoColors.map(color => color.name as TikoColorName))
const colorValueByName = new Map<TikoColorName, string>(tikoColors.map(color => [color.name as TikoColorName, color.hex]))
const colorNameByValue = new Map<string, TikoColorName>(tikoColors.map(color => [color.hex.toLowerCase(), color.name as TikoColorName]))

function colorName(value: unknown, fallback: TikoColorName): TikoColorName {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (colorNames.has(normalized as TikoColorName)) return normalized as TikoColorName
    const fromValue = colorNameByValue.get(normalized)
    if (fromValue) return fromValue
  }
  return fallback
}

function colorValue(color: TikoColorName, fallback: TikoColorName = 'gray') {
  return colorValueByName.get(color) ?? colorValueByName.get(fallback) ?? '#888888'
}

// ── local types (hex strings for colours) ──────────────────────────────────
interface UiCard {
  id: string
  title: string
  speech: string
  color: TikoColorName
  imageURL: string
  imageRef: string
  order: number
}

interface UiCollection {
  id: string
  title: string
  color: TikoColorName
  mediaCategories: string[]
  imageURL: string
  imageRef: string
  cards: UiCard[]
  order: number
}

function mediaDownloadUrl(mediaId: string): string {
  return `https://media.tikoapi.org/v1/media/${encodeURIComponent(mediaId)}/download`
}

function resizedMediaUrl(url: string, size = 96): string {
  try {
    const parsed = new URL(url)
    if (parsed.host === 'data.tikocdn.org' && parsed.pathname.startsWith('/uploads/')) {
      return `https://data.tikocdn.org/cdn-cgi/image/width=${size},height=${size},fit=cover,quality=80,f=auto${parsed.pathname}`
    }
  } catch {
    // Keep non-URL values as-is.
  }
  return url
}

function resolveImageUrl(card: CardsCard): string {
  if (card.imageURL) return card.imageURL
  if (card.imageRef) return mediaDownloadUrl(card.imageRef)
  return ''
}

function resolveCollectionImageUrl(col: CardsCollection): string {
  if (col.imageURL) return col.imageURL
  if (col.imageRef) return mediaDownloadUrl(col.imageRef)
  return ''
}

function apiToUiCard(c: CardsCard): UiCard {
  return { id: c.id, title: c.title, speech: c.speech, color: colorName(c.color, 'orange'), imageURL: resolveImageUrl(c), imageRef: c.imageRef ?? '', order: c.order }
}

function apiToUiCollection(c: CardsCollection): UiCollection {
  return { id: c.id, title: c.title, color: colorName(c.color, 'cyan'), mediaCategories: c.mediaCategories ?? [], imageURL: resolveCollectionImageUrl(c), imageRef: c.imageRef ?? '', cards: (c.cards ?? []).map(apiToUiCard), order: c.order }
}

function uiToApiCard(c: UiCard, index: number): CardsCard {
  return { id: c.id, title: c.title, speech: c.speech, color: c.color, imageURL: c.imageURL || undefined, imageRef: c.imageRef || undefined, order: index }
}

function uiToApiCollection(c: UiCollection, index: number): CardsCollection {
  return { id: c.id, title: c.title, color: c.color, order: index, mediaCategories: c.mediaCategories, imageURL: c.imageURL || undefined, imageRef: c.imageRef || undefined, cards: c.cards.map((card, i) => uiToApiCard(card, i)) }
}

// ── collections list ────────────────────────────────────────────────────────
const collections = ref<UiCollection[]>([])

async function load() {
  const data = await read()
  collections.value = data.collections.map(apiToUiCollection)
}

onMounted(() => { void load() })

// ── collection modal ────────────────────────────────────────────────────────
const activeCollection = ref<UiCollection | null>(null)
const activeIndex = ref(-1)

function openCollection(col: UiCollection, idx: number) {
  activeCollection.value = { ...col, mediaCategories: [...col.mediaCategories], cards: col.cards.map(c => ({ ...c })) }
  activeIndex.value = idx
}

function closeCollection() {
  activeCollection.value = null
  activeIndex.value = -1
}

function updateActiveCollection(patch: Partial<UiCollection>) {
  if (!activeCollection.value) return
  activeCollection.value = { ...activeCollection.value, ...patch }
}

function updateActiveCollectionColor(value: string) {
  if (!activeCollection.value) return
  updateActiveCollection({ color: colorName(value, activeCollection.value.color) })
}

function updateActiveCollectionImageRef(value: string) {
  updateActiveCollection({
    imageRef: value,
    imageURL: value ? mediaDownloadUrl(value) : '',
  })
}

function updateCardFormImageRef(value: string) {
  if (!cardForm.value) return
  cardForm.value.imageRef = value
  cardForm.value.imageURL = value ? mediaDownloadUrl(value) : ''
}

function updateMediaCats(raw: string) {
  updateActiveCollection({ mediaCategories: raw.split(',').map(s => s.trim()).filter(Boolean) })
}

async function saveCollection() {
  if (!activeCollection.value) return
  const updated = [...collections.value]
  if (activeIndex.value === -1) {
    updated.push({ ...activeCollection.value, order: updated.length })
  } else {
    updated[activeIndex.value] = activeCollection.value
  }
  collections.value = updated
  closeCollection()
  await write(collections.value.map((c, i) => uiToApiCollection(c, i)))
}

function startNewCollection() {
  const col: UiCollection = {
    id: `col_${crypto.randomUUID().slice(0, 8)}`,
    title: 'New collection',
    color: 'green',
    mediaCategories: [],
    imageURL: '',
    imageRef: '',
    cards: [],
    order: collections.value.length,
  }
  openCollection(col, -1)
}

async function deleteCollection(idx: number) {
  collections.value = collections.value.filter((_, i) => i !== idx)
  await write(collections.value.map((c, i) => uiToApiCollection(c, i)))
}

async function moveCollection(idx: number, direction: -1 | 1) {
  const target = idx + direction
  if (target < 0 || target >= collections.value.length) return
  const arr = [...collections.value]
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  collections.value = arr
  await write(collections.value.map((c, i) => uiToApiCollection(c, i)))
}

// ── card modal ──────────────────────────────────────────────────────────────
const cardForm = ref<UiCard | null>(null)
const editCardIndex = ref(-1)

function startNewCard() {
  cardForm.value = { id: `card_${crypto.randomUUID().slice(0, 8)}`, title: '', speech: '', color: 'blue', imageURL: '', imageRef: '', order: 0 }
  editCardIndex.value = -1
}

function startEditCard(card: UiCard, idx: number) {
  cardForm.value = { ...card }
  editCardIndex.value = idx
}

function closeCardForm() {
  cardForm.value = null
  editCardIndex.value = -1
}

function saveCard() {
  if (!activeCollection.value || !cardForm.value) return
  const cards = [...activeCollection.value.cards]
  if (editCardIndex.value === -1) {
    cards.push({ ...cardForm.value, order: cards.length })
  } else {
    cards[editCardIndex.value] = { ...cardForm.value }
  }
  updateActiveCollection({ cards })
  closeCardForm()
}

function deleteCard(idx: number) {
  if (!activeCollection.value) return
  updateActiveCollection({ cards: activeCollection.value.cards.filter((_, i) => i !== idx) })
}

function moveCard(idx: number, direction: -1 | 1) {
  if (!activeCollection.value) return
  const cards = [...activeCollection.value.cards]
  const target = idx + direction
  if (target < 0 || target >= cards.length) return
  ;[cards[idx], cards[target]] = [cards[target], cards[idx]]
  updateActiveCollection({ cards })
}
</script>

<template>
  <section :class="bemm('')">
    <!-- Page header -->
    <header :class="bemm('header')">
      <div :class="bemm('intro')">
        <h1 :class="bemm('title')">Cards</h1>
        <p :class="bemm('subtitle')">Manage default collections and cards for the Cards app.</p>
      </div>
      <div :class="bemm('header-actions')">
        <span :class="bemm('total')">{{ collections.length }} collections</span>
        <Button :loading="saving" @click="startNewCollection">Add collection</Button>
      </div>
    </header>

    <p v-if="error" :class="bemm('error')">{{ error }}</p>

    <!-- Collections list -->
    <div :class="bemm('list-wrap')">
      <div v-if="loading" :class="bemm('empty')">Loading…</div>
      <div v-else-if="collections.length === 0" :class="bemm('empty')">No collections yet. Add one to get started.</div>
      <ul v-else :class="bemm('list')">
        <li
          v-for="(col, idx) in collections"
          :key="col.id"
          :class="bemm('row')"
          @click="openCollection(col, idx)"
        >
          <div :class="bemm('row-thumb')" :style="{ background: col.imageURL ? 'transparent' : colorValue(col.color) }">
            <img v-if="col.imageURL" :src="resizedMediaUrl(col.imageURL, 96)" :alt="col.title" />
            <span v-else>{{ col.title.charAt(0).toUpperCase() }}</span>
          </div>

          <div :class="bemm('row-body')">
            <span :class="bemm('row-title')">{{ col.title }}</span>
            <div v-if="col.mediaCategories.length" :class="bemm('tags')">
              <span v-for="cat in col.mediaCategories" :key="cat" :class="bemm('tag')">{{ cat }}</span>
            </div>
          </div>

          <div :class="bemm('row-meta')">
            <span :class="bemm('row-count')">{{ col.cards.length }} cards</span>
            <div :class="bemm('row-color')">
              <span :class="bemm('color-dot')" :style="{ background: colorValue(col.color) }" />
            </div>
          </div>

          <div :class="bemm('row-reorder')">
            <Button variant="ghost" size="small" :disabled="idx === 0" @click.stop="moveCollection(idx, -1)">Up</Button>
            <Button variant="ghost" size="small" :disabled="idx === collections.length - 1" @click.stop="moveCollection(idx, 1)">Down</Button>
          </div>

          <Button
            variant="ghost"
            size="small"
            :class="bemm('row-action')"
            @click.stop="deleteCollection(idx)"
          >Delete</Button>
        </li>
      </ul>
    </div>

    <!-- Collection modal -->
    <div v-if="activeCollection" :class="bemm('modal')" @click.self="closeCollection">
      <div :class="bemm('modal-panel')">
        <header :class="bemm('modal-header')">
          <div :class="bemm('modal-identity')">
              <ColorDotPicker
              :model-value="colorValue(activeCollection.color)"
              @update:model-value="updateActiveCollectionColor"
            />
            <input
              :class="bemm('modal-title-input')"
              :value="activeCollection.title"
              placeholder="Collection title"
              @input="(e) => updateActiveCollection({ title: (e.target as HTMLInputElement).value })"
            />
          </div>
          <div :class="bemm('modal-header-actions')">
            <Button variant="outline" size="small" @click="closeCollection">Cancel</Button>
            <Button :loading="saving" size="small" @click="saveCollection">Save</Button>
          </div>
        </header>

        <div :class="bemm('modal-fields')">
          <label :class="bemm('label')">
            <span :class="bemm('label-text')">ID</span>
            <input
              :class="bemm('input')"
              :value="activeCollection.id"
              placeholder="col_abc123"
              @input="(e) => updateActiveCollection({ id: (e.target as HTMLInputElement).value })"
            />
          </label>
          <label :class="bemm('label')">
            <span :class="bemm('label-text')">Media categories</span>
            <input
              :class="bemm('input')"
              :value="activeCollection.mediaCategories.join(', ')"
              placeholder="animals, food"
              @input="(e) => updateMediaCats((e.target as HTMLInputElement).value)"
            />
          </label>
          <div :class="bemm('label')">
            <span :class="bemm('label-text')">Cover image</span>
            <MediaPicker
              :model-value="activeCollection.imageRef"
              emit-id
              @update:model-value="updateActiveCollectionImageRef"
            />
          </div>
        </div>

        <!-- Cards list -->
        <div :class="bemm('cards-section')">
          <header :class="bemm('cards-head')">
            <h3 :class="bemm('cards-title')">Cards ({{ activeCollection.cards.length }})</h3>
            <Button variant="outline" size="small" @click="startNewCard">Add card</Button>
          </header>

          <div v-if="activeCollection.cards.length === 0" :class="bemm('empty', { inline: true })">
            No cards yet. Add one to get started.
          </div>
          <ul v-else :class="bemm('cards-list')">
            <li
              v-for="(card, ci) in activeCollection.cards"
              :key="card.id"
              :class="bemm('card-row')"
            >
              <div :class="bemm('card-thumb')" :style="{ background: card.imageURL ? 'transparent' : colorValue(card.color) }">
                <img v-if="card.imageURL" :src="resizedMediaUrl(card.imageURL, 96)" :alt="card.title" />
                <span v-else>{{ card.title.charAt(0).toUpperCase() || '?' }}</span>
              </div>
              <div :class="bemm('card-body')">
                <span :class="bemm('card-title')">{{ card.title || '—' }}</span>
                <span :class="bemm('card-speech')">{{ card.speech || '—' }}</span>
              </div>
              <span :class="bemm('card-color')" :style="{ background: colorValue(card.color) }" />
              <Button variant="ghost" size="small" :disabled="ci === 0" @click="moveCard(ci, -1)">Up</Button>
              <Button variant="ghost" size="small" :disabled="ci === activeCollection.cards.length - 1" @click="moveCard(ci, 1)">Down</Button>
              <Button variant="ghost" size="small" @click="startEditCard(card, ci)">Edit</Button>
              <Button variant="ghost" size="small" @click="deleteCard(ci)">Delete</Button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Card form modal -->
    <div v-if="cardForm" :class="bemm('modal')" @click.self="closeCardForm">
      <div :class="bemm('modal-panel', { narrow: true })">
        <header :class="bemm('modal-header')">
          <h2 :class="bemm('modal-heading')">{{ editCardIndex === -1 ? 'Add card' : 'Edit card' }}</h2>
          <div :class="bemm('modal-header-actions')">
            <Button variant="outline" size="small" @click="closeCardForm">Cancel</Button>
            <Button size="small" @click="saveCard">Save</Button>
          </div>
        </header>

        <div :class="bemm('form')">
          <InputText
            :model-value="cardForm.title"
            label="Title"
            placeholder="Dog"
            @update:model-value="(v: string) => { if (cardForm) cardForm.title = v }"
          />
          <InputText
            :model-value="cardForm.speech"
            label="Speech text"
            placeholder="Dog"
            @update:model-value="(v: string) => { if (cardForm) cardForm.speech = v }"
          />
          <div :class="bemm('form-row')">
            <div :class="bemm('label')">
              <span :class="bemm('label-text')">Color</span>
              <ColorDotPicker
                :model-value="colorValue(cardForm.color)"
                @update:model-value="(v: string) => { if (cardForm) cardForm.color = colorName(v, cardForm.color) }"
              />
            </div>
            <div :class="bemm('label')">
              <span :class="bemm('label-text')">Image</span>
              <MediaPicker
                :model-value="cardForm.imageRef"
                emit-id
                @update:model-value="updateCardFormImageRef"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss">
@use '../styles/mixins' as *;

.cards-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-m);
    flex-wrap: wrap;
  }

  &__intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--admin-text);
  }

  &__subtitle {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  &__total {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    font-weight: 600;
    background: var(--admin-surface);
    padding: var(--space-xs) var(--space-s);
    border-radius: var(--border-radius-round);
    white-space: nowrap;
  }

  &__error {
    color: var(--color-error);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__empty {
    color: var(--admin-text-muted);
    text-align: center;
    padding: var(--space-l);

    &--inline {
      padding: var(--space-m);
      background: var(--admin-page-bg);
      border-radius: var(--border-radius-m);
      font-size: var(--font-size-s);
    }
  }

  // ── collections list ──
  &__list-wrap {
    display: flex;
    flex-direction: column;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__row {
    display: flex;
    align-items: center;
    gap: var(--space-m);
    padding: var(--space-m);
    background: var(--admin-surface);
    border-radius: var(--border-radius-m);
    cursor: pointer;
    transition: background 0.12s ease;

    &:hover {
      background: var(--admin-surface-hover);
    }
  }

  &__row-thumb {
    width: calc(var(--space) * 4);
    height: calc(var(--space) * 4);
    border-radius: var(--border-radius-m);
    flex-shrink: 0;
    display: grid;
    place-items: center;
    color: white;
    font-weight: 700;
    font-size: var(--font-size-m);
    overflow: hidden;
    --block-size: 0.5em;
    @include checkeredBackground;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__row-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__row-title {
    font-weight: 600;
    font-size: var(--font-size-s);
    color: var(--admin-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__row-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-xs);
    flex-shrink: 0;
  }

  &__row-reorder {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
  }

  &__row-count {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
    background: color-mix(in srgb, var(--color-foreground), transparent 90%);
    padding: 2px var(--space-s);
    border-radius: var(--border-radius-round);
    white-space: nowrap;
  }

  &__row-color,
  &__color-dot {
    width: calc(var(--space) * 1.25);
    height: calc(var(--space) * 1.25);
    border-radius: var(--border-radius-round);
    display: block;
  }

  &__row-action {
    flex-shrink: 0;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__tag {
    background: color-mix(in srgb, var(--color-foreground), transparent 90%);
    border-radius: var(--border-radius-round);
    padding: 1px var(--space-s);
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
  }

  // ── modal ──
  &__modal {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    padding: var(--space-l) var(--space-m);
    overflow-y: auto;
  }

  &__modal-panel {
    background: var(--admin-surface);
    border: 0;
    border-radius: var(--border-radius-l);
    width: 100%;
    max-width: 720px;
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
    padding: var(--space-l);

    &--narrow {
      max-width: 440px;
    }
  }

  &__modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-m);
  }

  &__modal-identity {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    flex: 1;
    min-width: 0;
  }

  &__modal-title-input {
    flex: 1;
    min-width: 0;
    font-size: var(--font-size-l);
    font-weight: 700;
    color: var(--admin-text);
    background: transparent;
    border: 0;
    border-bottom: 2px solid var(--admin-border);
    padding: var(--space-xs) 0;
    outline: none;
    transition: border-color 0.12s ease;

    &:focus {
      border-bottom-color: var(--color-primary);
    }
  }

  &__modal-heading {
    font-size: var(--font-size-m);
    font-weight: 700;
    color: var(--admin-text);
  }

  &__modal-header-actions {
    display: flex;
    gap: var(--space-xs);
    flex-shrink: 0;
  }

  &__modal-fields {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: var(--space-s);
    align-items: end;
  }

  // ── cards section inside modal ──
  &__cards-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    border-top: 1px solid var(--admin-border);
    padding-top: var(--space-m);
  }

  &__cards-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__cards-title {
    font-size: var(--font-size-s);
    font-weight: 700;
    color: var(--admin-text);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__cards-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__card-row {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-s) var(--space-m);
    background: var(--admin-page-bg);
    border-radius: var(--border-radius-m);
    transition: background 0.12s ease;

    &:hover {
      background: color-mix(in srgb, var(--admin-page-bg), var(--color-foreground) 4%);
    }
  }

  &__card-thumb {
    width: calc(var(--space) * 3);
    height: calc(var(--space) * 3);
    border-radius: var(--border-radius-s);
    flex-shrink: 0;
    display: grid;
    place-items: center;
    color: white;
    font-weight: 700;
    font-size: var(--font-size-xs);
    overflow: hidden;
    --block-size: 0.4em;
    @include checkeredBackground;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__card-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__card-title {
    font-weight: 600;
    font-size: var(--font-size-s);
    color: var(--admin-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__card-speech {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__card-color {
    width: calc(var(--space) * 1.25);
    height: calc(var(--space) * 1.25);
    border-radius: var(--border-radius-round);
    flex-shrink: 0;
  }

  // ── card form ──
  &__form {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-s);
    align-items: start;
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__label-text {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-m);
    padding: var(--space-s);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font: inherit;
    font-size: var(--font-size-s);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
}
</style>
