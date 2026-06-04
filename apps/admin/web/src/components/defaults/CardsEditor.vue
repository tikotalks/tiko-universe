<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'

interface Card {
  id: string
  title: string
  speech: string
  colorHex: number
}

interface Collection {
  id: string
  title: string
  colorHex: number
  order: number
  mediaCategories: string[]
  cards: Card[]
}

interface CardsDefaultsPayload {
  collections: Collection[]
}

const DEFAULT_COLLECTION_COLOR = 0xff8a1f

const bemm = useBemm('cards-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

function numberToHex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

const state = computed<CardsDefaultsPayload>(() => {
  const value = props.modelValue as Partial<CardsDefaultsPayload> | null | undefined
  const collections = Array.isArray(value?.collections) ? (value!.collections as Collection[]) : []
  return { collections }
})

function update(next: CardsDefaultsPayload) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function addCollection() {
  const order = state.value.collections.length
  update({
    collections: [
      ...state.value.collections,
      {
        id: makeId('collection'),
        title: 'New collection',
        colorHex: DEFAULT_COLLECTION_COLOR,
        order,
        mediaCategories: [],
        cards: [],
      },
    ],
  })
}

function updateCollection(index: number, patch: Partial<Collection>) {
  const collections = state.value.collections.map((c, i) => (i === index ? { ...c, ...patch } : c))
  update({ collections })
}

function removeCollection(index: number) {
  update({ collections: state.value.collections.filter((_, i) => i !== index) })
}

function moveCollection(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= state.value.collections.length) return
  const collections = [...state.value.collections]
  ;[collections[index], collections[target]] = [collections[target], collections[index]]
  update({ collections })
}

function addCard(collectionIndex: number) {
  const collection = state.value.collections[collectionIndex]
  const order = collection.cards.length
  const newCard: Card = {
    id: makeId('card'),
    title: 'New card',
    speech: 'New card',
    colorHex: collection.colorHex,
    order,
  } as Card & { order: number }
  const collections = state.value.collections.map((c, i) =>
    i === collectionIndex ? { ...c, cards: [...c.cards, newCard] } : c,
  )
  update({ collections })
}

function updateCard(collectionIndex: number, cardIndex: number, patch: Partial<Card>) {
  const collections = state.value.collections.map((c, i) => {
    if (i !== collectionIndex) return c
    const cards = c.cards.map((card, ci) => (ci === cardIndex ? { ...card, ...patch } : card))
    return { ...c, cards }
  })
  update({ collections })
}

function removeCard(collectionIndex: number, cardIndex: number) {
  const collections = state.value.collections.map((c, i) => {
    if (i !== collectionIndex) return c
    return { ...c, cards: c.cards.filter((_, ci) => ci !== cardIndex) }
  })
  update({ collections })
}

function updateMediaCategories(index: number, raw: string) {
  const mediaCategories = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  updateCollection(index, { mediaCategories })
}
</script>

<template>
  <div :class="bemm('')">
    <header :class="bemm('header')">
      <h3 :class="bemm('title')">Collections</h3>
      <Button variant="outline" size="small" @click="addCollection">Add collection</Button>
    </header>

    <div v-if="state.collections.length === 0" :class="bemm('empty')">
      No collections yet. Add one to get started.
    </div>

    <article v-for="(collection, ci) in state.collections" :key="collection.id" :class="bemm('collection')">
      <header :class="bemm('collection-head')">
        <div :class="bemm('collection-fields')">
          <InputText
            :model-value="collection.title"
            label="Title"
            placeholder="Collection title"
            @update:model-value="(v: string) => updateCollection(ci, { title: v })"
          />
          <InputText
            :model-value="collection.id"
            label="ID"
            placeholder="kebab-case-id"
            @update:model-value="(v: string) => updateCollection(ci, { id: v })"
          />
          <div :class="bemm('color-field')">
            <label :class="bemm('color-label')">Color</label>
            <input
              type="color"
              :class="bemm('color-input')"
              :value="numberToHex(collection.colorHex)"
              @input="(e) => updateCollection(ci, { colorHex: hexToNumber((e.target as HTMLInputElement).value) })"
            />
          </div>
          <InputText
            :model-value="collection.mediaCategories.join(', ')"
            label="Media categories"
            placeholder="e.g. animals, food"
            @update:model-value="(v: string) => updateMediaCategories(ci, v)"
          />
        </div>
        <div :class="bemm('collection-actions')">
          <Button variant="ghost" size="small" :disabled="ci === 0" @click="moveCollection(ci, -1)">↑</Button>
          <Button variant="ghost" size="small" :disabled="ci === state.collections.length - 1" @click="moveCollection(ci, 1)">↓</Button>
          <Button variant="ghost" size="small" @click="removeCollection(ci)">Remove</Button>
        </div>
      </header>

      <div :class="bemm('cards')">
        <header :class="bemm('cards-head')">
          <h4 :class="bemm('cards-title')">Cards</h4>
          <Button variant="outline" size="small" @click="addCard(ci)">Add card</Button>
        </header>

        <div v-if="collection.cards.length === 0" :class="bemm('cards-empty')">No cards yet.</div>

        <div v-else :class="bemm('card-grid')">
          <div v-for="(card, ki) in collection.cards" :key="card.id" :class="bemm('card')">
            <InputText
              :model-value="card.title"
              label="Title"
              placeholder="Card title"
              @update:model-value="(v: string) => updateCard(ci, ki, { title: v })"
            />
            <InputText
              :model-value="card.speech"
              label="Speech"
              placeholder="What gets spoken aloud"
              @update:model-value="(v: string) => updateCard(ci, ki, { speech: v })"
            />
            <InputText
              :model-value="card.id"
              label="ID"
              placeholder="kebab-case-id"
              @update:model-value="(v: string) => updateCard(ci, ki, { id: v })"
            />
            <div :class="bemm('color-field')">
              <label :class="bemm('color-label')">Color</label>
              <input
                type="color"
                :class="bemm('color-input')"
                :value="numberToHex(card.colorHex)"
                @input="(e) => updateCard(ci, ki, { colorHex: hexToNumber((e.target as HTMLInputElement).value) })"
              />
            </div>
            <Button variant="ghost" size="small" @click="removeCard(ci, ki)">Remove card</Button>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

<style lang="scss">
.cards-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-m);
  }

  &__title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__empty,
  &__cards-empty {
    background: var(--admin-page-bg);
    border: 1px dashed var(--admin-border-strong);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    text-align: center;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__collection {
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__collection-head {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-m);
    align-items: end;
  }

  &__collection-fields {
    display: grid;
    grid-template-columns: 2fr 1fr auto 2fr;
    gap: var(--space-s);
    align-items: end;
  }

  &__collection-actions {
    display: flex;
    gap: var(--space-xs);
    align-items: center;
  }

  &__color-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__color-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__color-input {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0.1rem;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-xs);
    background: var(--admin-surface);
    cursor: pointer;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__cards-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-s);
  }

  &__cards-title {
    font-size: var(--font-size-s);
    font-weight: 600;
    color: var(--admin-text);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space) * 16), 1fr));
    gap: var(--space-s);
  }

  &__card {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
}
</style>
