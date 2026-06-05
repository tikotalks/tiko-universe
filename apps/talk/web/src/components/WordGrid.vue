<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import type { Category, WordTile as TalkWordTile } from '@tiko/talk-types'
import WordTile from './WordTile.vue'

const bemm = useBemm('word-grid', { return: 'string', includeBaseClass: true })

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

<template>
  <section :class="bemm('')" aria-label="Word grid">
    <div :class="bemm('header')">
      <h2>{{ title }}</h2>
      <div :class="bemm('tabs')" aria-label="Word categories">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          :class="bemm('tab', { active: category.id === activeCategoryId })"
          @click="$emit('category-change', category.id)"
        >
          {{ category.label }}
        </button>
      </div>
    </div>
    <div :class="bemm('tiles')">
      <WordTile
        v-for="word in visibleWords"
        :key="word.id"
        :word="word"
        @select="$emit('select', $event)"
      />
    </div>
  </section>
</template>
