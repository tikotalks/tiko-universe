<script setup lang="ts">
import { useBemm } from 'bemm'
import type { MediaType } from '../types/media'

interface FilterOption {
  value: MediaType | undefined
  label: string
}

defineProps<{
  modelValue?: MediaType | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MediaType | undefined]
}>()

const bemm = useBemm('type-filter', { return: 'string', includeBaseClass: true })

const options: FilterOption[] = [
  { value: undefined, label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
]

function select(option: FilterOption) {
  emit('update:modelValue', option.value)
}
</script>

<template>
  <div :class="bemm('')" role="group" aria-label="Filter by media type">
    <button
      v-for="option in options"
      :key="String(option.value)"
      :class="bemm('option', ['', modelValue === option.value ? 'active' : ''])"
      :aria-pressed="modelValue === option.value"
      @click="select(option)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style lang="scss">
// A segmented control rather than four loose pills: the options are mutually
// exclusive, so they read as one control.
.type-filter {
  display: inline-flex;
  flex-shrink: 0;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--surface-subtle);

  &__option {
    padding: 6px 14px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-family);
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);

    &:hover {
      color: var(--color-foreground);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 1px;
    }

    // Selection is a tint, not an outline.
    &--active {
      background: var(--color-background);
      color: var(--color-foreground);
      box-shadow: var(--shadow-s);
    }
  }
}
</style>
