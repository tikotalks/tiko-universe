<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'
import { tikoColors } from '@tiko/ui'
import type { TikoColorName } from '@tiko/data'
import ColorSwatchPicker from '../ColorSwatchPicker.vue'

interface RadioCategory {
  id: string
  name: string
  icon: string
  color: TikoColorName
  order: number
}

interface RadioState {
  categories: RadioCategory[]
  shuffleEnabled?: boolean
  repeatEnabled?: boolean
}

const bemm = useBemm('radio-editor', { return: 'string', includeBaseClass: true })
const colorNames = new Set<TikoColorName>(tikoColors.map(color => color.name as TikoColorName))
const colorByHex = new Map<string, TikoColorName>(tikoColors.map(color => [color.hex.toLowerCase(), color.name as TikoColorName]))

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const state = computed<RadioState>(() => {
  const value = props.modelValue as Partial<RadioState>
  return {
    categories: Array.isArray(value?.categories) ? value.categories.map(normalizeCategory) : [],
    shuffleEnabled: value?.shuffleEnabled === true,
    repeatEnabled: value?.repeatEnabled === true,
  }
})

function update(next: Partial<RadioState>) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function makeId(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return slug || `category-${crypto.randomUUID().slice(0, 8)}`
}

function normalizeCategory(category: Partial<RadioCategory>, order = 0): RadioCategory {
  const name = typeof category.name === 'string' && category.name.trim() ? category.name.trim() : 'New category'
  return {
    id: typeof category.id === 'string' && category.id.trim() ? category.id.trim() : makeId(name),
    name,
    icon: typeof category.icon === 'string' && category.icon.trim() ? category.icon.trim() : 'media/headphones',
    color: normalizeColor(category.color),
    order: typeof category.order === 'number' ? category.order : order,
  }
}

function normalizeColor(value: unknown): TikoColorName {
  if (typeof value !== 'string') return 'red'
  const color = value.trim().toLowerCase()
  if (colorNames.has(color as TikoColorName)) return color as TikoColorName
  return colorByHex.get(color) ?? 'red'
}

function updateCategories(categories: RadioCategory[]) {
  update({ categories: categories.map((category, index) => normalizeCategory({ ...category, order: index }, index)) })
}

function addCategory() {
  updateCategories([
    ...state.value.categories,
    normalizeCategory({ name: 'New category' }, state.value.categories.length),
  ])
}

function updateCategory(index: number, patch: Partial<RadioCategory>) {
  updateCategories(state.value.categories.map((category, i) => i === index ? normalizeCategory({ ...category, ...patch }, i) : category))
}

function removeCategory(index: number) {
  updateCategories(state.value.categories.filter((_, i) => i !== index))
}

function moveCategory(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= state.value.categories.length) return
  const categories = [...state.value.categories]
  ;[categories[index], categories[target]] = [categories[target], categories[index]]
  updateCategories(categories)
}
</script>

<template>
  <div :class="bemm('')">
    <header :class="bemm('header')">
      <h3 :class="bemm('title')">Radio categories</h3>
      <Button variant="outline" size="small" @click="addCategory">Add category</Button>
    </header>

    <div :class="bemm('toggles')">
      <label :class="bemm('toggle')">
        <input :checked="state.shuffleEnabled" type="checkbox" @change="(event) => update({ shuffleEnabled: (event.target as HTMLInputElement).checked })">
        <span>Shuffle enabled</span>
      </label>
      <label :class="bemm('toggle')">
        <input :checked="state.repeatEnabled" type="checkbox" @change="(event) => update({ repeatEnabled: (event.target as HTMLInputElement).checked })">
        <span>Repeat enabled</span>
      </label>
    </div>

    <div v-if="state.categories.length === 0" :class="bemm('empty')">No categories yet.</div>

    <div v-else :class="bemm('list')">
      <div v-for="(category, index) in state.categories" :key="category.id" :class="bemm('item')">
        <InputText
          :model-value="category.name"
          label="Name"
          @update:model-value="(value: string) => updateCategory(index, { name: value })"
        />
        <InputText
          :model-value="category.id"
          label="ID"
          @update:model-value="(value: string) => updateCategory(index, { id: value })"
        />
        <InputText
          :model-value="category.icon"
          label="Icon"
          @update:model-value="(value: string) => updateCategory(index, { icon: value })"
        />
        <ColorSwatchPicker
          :model-value="category.color"
          label="Color"
          mode="name"
          @update:model-value="(value: string) => updateCategory(index, { color: normalizeColor(value) })"
        />
        <div :class="bemm('actions')">
          <Button variant="ghost" size="small" :disabled="index === 0" @click="moveCategory(index, -1)">Up</Button>
          <Button variant="ghost" size="small" :disabled="index === state.categories.length - 1" @click="moveCategory(index, 1)">Down</Button>
          <Button variant="ghost" size="small" @click="removeCategory(index)">Remove</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.radio-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header,
  &__toggles,
  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  &__header {
    justify-content: space-between;
  }

  &__title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--admin-text);
    font-size: var(--font-size-s);
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

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__item {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 12rem auto;
    gap: var(--space-s);
    align-items: end;
  }
}
</style>
