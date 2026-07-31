<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useBemm } from 'bemm'
import { SilIcon } from '@tiko/ui'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
}>()

const bemm = useBemm('search-bar', { return: 'string', includeBaseClass: true })

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
  if (debounceTimer) clearTimeout(debounceTimer)
  query.value = ''
  emit('update:modelValue', '')
  emit('search', '')
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

const hasValue = computed(() => query.value.length > 0)
</script>

<template>
  <div :class="bemm('')">
    <span :class="bemm('icon')" aria-hidden="true">
      <SilIcon name="ui/search-m" />
    </span>
    <input
      v-model="query"
      type="search"
      :class="bemm('input')"
      :placeholder="placeholder ?? 'Search media…'"
      aria-label="Search media"
      @input="onInput"
    >
    <button
      v-if="hasValue"
      :class="bemm('clear')"
      aria-label="Clear search"
      @click="onClear"
    >
      <SilIcon name="ui/multiply-m" />
    </button>
  </div>
</template>

<style lang="scss">
.search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-s);
  flex: 1 1 18rem;
  min-width: 0;
  padding: 0.55rem var(--space);
  border-radius: 999px;
  background: var(--surface-subtle);
  transition: box-shadow 0.15s var(--ease-out);

  &:focus-within {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary), transparent 75%);
  }

  &__icon {
    display: flex;
    flex-shrink: 0;
    color: var(--text-muted);
  }

  &__input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--color-foreground);
    font-family: var(--font-family);
    font-size: 0.95rem;
    outline: none;

    &::placeholder {
      color: var(--text-muted);
    }

    // Safari draws its own clear affordance on type="search"; this component
    // provides one that matches the rest of the UI.
    &::-webkit-search-cancel-button {
      appearance: none;
    }
  }

  &__clear {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);

    &:hover {
      background: var(--surface-ink-wash);
      color: var(--color-foreground);
    }
  }
}
</style>
