<template>
  <section class="talk-word-grid" aria-label="Word grid">
    <div class="talk-word-grid__header">
      <h2>{{ title }}</h2>
      <div class="talk-word-grid__tabs" aria-label="Word categories">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="talk-word-grid__tab"
          :class="{ 'talk-word-grid__tab--active': category.id === activeCategoryId }"
          @click="$emit('category-change', category.id)"
        >
          {{ category.label }}
        </button>
      </div>
    </div>
    <div class="talk-word-grid__tiles">
      <WordTile
        v-for="word in visibleWords"
        :key="word.id"
        :word="word"
        @select="$emit('select', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Category, WordTile as TalkWordTile } from '@tiko/talk-types'
import WordTile from './WordTile.vue'

const props = withDefaults(defineProps<{
  title?: string
  categories: Category[]
  words: TalkWordTile[]
  activeCategoryId: string
}>(), {
  title: 'Word groups',
})

defineEmits<{
  select: [word: TalkWordTile]
  'category-change': [categoryId: string]
}>()

const visibleWords = computed(() => props.words.filter((word) => word.category === props.activeCategoryId))
</script>
