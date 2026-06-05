<script setup lang="ts">
import { SilIcon as Icon } from '@tiko/ui'
import type { CategoryShortcut } from '../composables/useTalkPresentation'

defineProps<{
  categories: CategoryShortcut[]
  activeCategoryId: string | null
  side: 'left' | 'right'
}>()

const emit = defineEmits<{
  selectCategory: [category: CategoryShortcut]
}>()
</script>

<template>
  <nav class="category-dock" :class="`category-dock--${side}`" :aria-label="`Category shortcuts ${side}`">
    <button
      v-for="category in categories"
      :key="category.id"
      class="category-card"
      :class="[`category-card--${category.color}`, { 'category-card--active': activeCategoryId === category.id }]"
      type="button"
      @click="emit('selectCategory', category)"
    >
      <Icon class="category-card__icon" :name="category.icon" size="large" aria-hidden="true" />
      <span>{{ category.label }}</span>
    </button>
  </nav>
</template>
