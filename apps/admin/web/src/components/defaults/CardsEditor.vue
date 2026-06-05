<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'

interface Tile {
  id: string
  title: string
  speech: string
  type: string
  color?: string
  image?: string
}

interface Collection {
  id: string
  title: string
  color: string
  order: number
  mediaCategories?: string[]
  image?: string
  tiles: Tile[]
}

interface CardsDefaultsPayload {
  collections: Collection[]
}

const bemm = useBemm('cards-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const state = computed<CardsDefaultsPayload>(() => {
  const value = props.modelValue as Partial<CardsDefaultsPayload> | null | undefined
  const collections = Array.isArray(value?.collections) ? (value!.collections as Collection[]) : []
  return { collections }
})

function update(next: CardsDefaultsPayload) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function addCollection() {
  const collections = state.value.collections
  update({
    collections: [
      ...collections,
      {
        id: makeId('col'),
        title: 'New collection',
        color: '#4ECDC4',
        order: collections.length,
        mediaCategories: [],
        tiles: [],
      },
    ],
  })
}

function updateCollection(index: number, patch: Partial<Collection>) {
  const collections = state.value.collections.map((c, i) => (i === index ? { ...c, ...patch } : c))
  update({ collections })
}

function removeCollection(index: number) {
  const collections = state.value.collections.filter((_, i) => i !== index)
  update({ collections: collections.map((c, i) => ({ ...c, order: i })) })
}

function moveCollection(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= state.value.collections.length) return
  const collections = [...state.value.collections]
  ;[collections[index], collections[target]] = [collections[target], collections[index]]
  update({ collections: collections.map((c, i) => ({ ...c, order: i })) })
}

function addTile(collectionIndex: number) {
  const collection = state.value.collections[collectionIndex]
  const collections = state.value.collections.map((c, i) =>
    i === collectionIndex
      ? { ...c, tiles: [...c.tiles, { id: makeId('tile'), title: 'New tile', speech: 'New tile', type: 'item' }] }
      : c,
  )
  update({ collections })
  void collection
}

function updateTile(collectionIndex: number, tileIndex: number, patch: Partial<Tile>) {
  const collections = state.value.collections.map((c, i) => {
    if (i !== collectionIndex) return c
    const tiles = c.tiles.map((t, ti) => (ti === tileIndex ? { ...t, ...patch } : t))
    return { ...c, tiles }
  })
  update({ collections })
}

function removeTile(collectionIndex: number, tileIndex: number) {
  const collections = state.value.collections.map((c, i) => {
    if (i !== collectionIndex) return c
    return { ...c, tiles: c.tiles.filter((_, ti) => ti !== tileIndex) }
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
          <InputText
            :model-value="collection.color ?? ''"
            label="Color"
            placeholder="#4ECDC4"
            @update:model-value="(v: string) => updateCollection(ci, { color: v })"
          />
          <InputText
            :model-value="(collection.mediaCategories ?? []).join(', ')"
            label="Media categories"
            placeholder="e.g. animals, food"
            @update:model-value="(v: string) => updateMediaCategories(ci, v)"
          />
        </div>
        <div :class="bemm('collection-actions')">
          <Button variant="ghost" size="small" :disabled="ci === 0" @click="moveCollection(ci, -1)">&#8593;</Button>
          <Button variant="ghost" size="small" :disabled="ci === state.collections.length - 1" @click="moveCollection(ci, 1)">&#8595;</Button>
          <Button variant="ghost" size="small" @click="removeCollection(ci)">Remove</Button>
        </div>
      </header>

      <div :class="bemm('tiles')">
        <header :class="bemm('tiles-head')">
          <h4 :class="bemm('tiles-title')">Tiles ({{ collection.tiles.length }})</h4>
          <Button variant="outline" size="small" @click="addTile(ci)">Add tile</Button>
        </header>

        <div v-if="collection.tiles.length === 0" :class="bemm('tiles-empty')">No tiles yet.</div>

        <div v-else :class="bemm('tile-grid')">
          <div v-for="(tile, ti) in collection.tiles" :key="tile.id" :class="bemm('tile')">
            <InputText
              :model-value="tile.title"
              label="Title"
              placeholder="Tile title"
              @update:model-value="(v: string) => updateTile(ci, ti, { title: v })"
            />
            <InputText
              :model-value="tile.speech"
              label="Speech text"
              placeholder="What to say when tapped"
              @update:model-value="(v: string) => updateTile(ci, ti, { speech: v })"
            />
            <div :class="bemm('tile-row')">
              <InputText
                :model-value="tile.type"
                label="Type"
                placeholder="item"
                @update:model-value="(v: string) => updateTile(ci, ti, { type: v || 'item' })"
              />
              <InputText
                :model-value="tile.color ?? ''"
                label="Color"
                placeholder="#FF6B6B"
                @update:model-value="(v: string) => updateTile(ci, ti, { color: v || undefined })"
              />
            </div>
            <InputText
              :model-value="tile.id"
              label="ID"
              placeholder="kebab-case-id"
              @update:model-value="(v: string) => updateTile(ci, ti, { id: v })"
            />
            <Button variant="ghost" size="small" @click="removeTile(ci, ti)">Remove tile</Button>
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
  &__tiles-empty {
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
    grid-template-columns: 2fr 1fr 1fr 2fr;
    gap: var(--space-s);
    align-items: end;
  }

  &__collection-actions {
    display: flex;
    gap: var(--space-xs);
    align-items: center;
  }

  &__tiles {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__tiles-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-s);
  }

  &__tiles-title {
    font-size: var(--font-size-s);
    font-weight: 600;
    color: var(--admin-text);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__tile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space) * 22), 1fr));
    gap: var(--space-s);
  }

  &__tile {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__tile-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-xs);
  }
}
</style>
