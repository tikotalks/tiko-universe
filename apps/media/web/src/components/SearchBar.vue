<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
}>()

const query = ref(props.modelValue ?? '')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onInput() {
  emit('update:modelValue', query.value)
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('search', query.value)
  }, 300)
}

function onClear() {
  query.value = ''
  emit('update:modelValue', '')
  emit('search', '')
}

const hasValue = computed(() => query.value.length > 0)
</script>

<template>
  <div class="search-bar">
    <span class="search-bar__icon" aria-hidden="true">⌕</span>
    <input
      v-model="query"
      type="text"
      class="search-bar__input media-app__search-input"
      :placeholder="placeholder ?? 'Search media…'"
      @input="onInput"
    />
    <button
      v-if="hasValue"
      class="search-bar__clear"
      aria-label="Clear search"
      @click="onClear"
    >
      ×
    </button>
  </div>
</template>

<style lang="scss" scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--tiko-surface-raised);
  border: 1px solid var(--tiko-border);
  border-radius: 0.75rem;

  &__icon {
    font-size: 1.1rem;
    color: color-mix(in srgb, var(--color-foreground) 50%, transparent);
  }

  &__input {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--color-foreground);
    font-size: 0.95rem;
    outline: none;

    &::placeholder {
      color: color-mix(in srgb, var(--color-foreground) 40%, transparent);
    }
  }

  &__clear {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-foreground) 10%, transparent);
    color: var(--color-foreground);
    font-size: 1rem;
    cursor: pointer;

    &:hover {
      background: color-mix(in srgb, var(--color-foreground) 20%, transparent);
    }
  }
}
</style>
