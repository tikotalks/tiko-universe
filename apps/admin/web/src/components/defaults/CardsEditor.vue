<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'

interface Tile {
  id: string
  label: string
  emoji?: string
}

interface Collection {
  id: string
  title: string
  tiles: Tile[]
}

interface CardsState {
  collections: Collection[]
}

const bemm = useBemm('cards-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const state = computed<CardsState>(() => {
  const value = props.modelValue as Partial<CardsState> | null | undefined
  const collections = Array.isArray(value?.collections) ? value!.collections : []
  return { collections }
})

function update(next: CardsState) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function addCollection() {
  update({
    collections: [
      ...state.value.collections,
      { id: makeId('collection'), title: 'New collection', tiles: [] },
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

function addTile(collectionIndex: number) {
  const collections = state.value.collections.map((c, i) =>
    i === collectionIndex ? { ...c, tiles: [...c.tiles, { id: makeId('tile'), label: 'New tile', emoji: '✨' }] } : c,
  )
  update({ collections })
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
        </div>
        <div :class="bemm('collection-actions')">
          <Button variant="ghost" size="small" :disabled="ci === 0" @click="moveCollection(ci, -1)">↑</Button>
          <Button variant="ghost" size="small" :disabled="ci === state.collections.length - 1" @click="moveCollection(ci, 1)">↓</Button>
          <Button variant="ghost" size="small" @click="removeCollection(ci)">Remove</Button>
        </div>
      </header>

      <div :class="bemm('tiles')">
        <header :class="bemm('tiles-head')">
          <h4 :class="bemm('tiles-title')">Tiles</h4>
          <Button variant="outline" size="small" @click="addTile(ci)">Add tile</Button>
        </header>

        <div v-if="collection.tiles.length === 0" :class="bemm('tiles-empty')">No tiles yet.</div>

        <div v-else :class="bemm('tile-grid')">
          <div v-for="(tile, ti) in collection.tiles" :key="tile.id" :class="bemm('tile')">
            <InputText
              :model-value="tile.emoji ?? ''"
              label="Emoji"
              placeholder="✨"
              @update:model-value="(v: string) => updateTile(ci, ti, { emoji: v })"
            />
            <InputText
              :model-value="tile.label"
              label="Label"
              placeholder="Tile label"
              @update:model-value="(v: string) => updateTile(ci, ti, { label: v })"
            />
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
    grid-template-columns: 2fr 1fr;
    gap: var(--space-s);
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
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space) * 16), 1fr));
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
}
</style>
