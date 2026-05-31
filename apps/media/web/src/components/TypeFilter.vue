<script setup lang="ts">
import type { MediaType } from '../types/media'

type FilterOption = { value: MediaType | undefined; label: string; icon: string }

const props = defineProps<{
  modelValue?: MediaType | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MediaType | undefined]
}>()

const options: FilterOption[] = [
  { value: undefined, label: 'All', icon: '☰' },
  { value: 'image', label: 'Images', icon: '🖼' },
  { value: 'audio', label: 'Audio', icon: '♪' },
  { value: 'video', label: 'Video', icon: '▶' },
]

function select(option: FilterOption) {
  emit('update:modelValue', option.value)
}
</script>

<template>
  <div class="type-filter">
    <button
      v-for="option in options"
      :key="String(option.value)"
      class="type-filter__pill"
      :class="{ 'type-filter__pill--active': modelValue === option.value }"
      @click="select(option)"
    >
      <span class="type-filter__icon">{{ option.icon }}</span>
      <span class="type-filter__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.type-filter {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  &__pill {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.85rem;
    border: 1px solid var(--tiko-border);
    border-radius: 999px;
    background: var(--tiko-surface);
    color: var(--color-foreground);
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;

    &:hover {
      background: var(--tiko-surface-raised);
    }

    &--active {
      background: var(--tiko-app-primary);
      border-color: var(--tiko-app-primary);
      color: var(--tiko-app-primary-text);
    }
  }

  &__icon {
    font-size: 0.9rem;
  }
}
</style>
