<template>
  <section class="talk-suggestions" aria-label="Suggestions">
    <h2>{{ title }}</h2>
    <div v-if="suggestions.length" class="talk-suggestions__row">
      <WordTile
        v-for="word in suggestions"
        :key="word.id"
        :word="word"
        @select="$emit('select', $event)"
      />
    </div>
    <p v-else class="talk-suggestions__empty">{{ emptyLabel }}</p>
  </section>
</template>

<script setup lang="ts">
import type { WordTile as TalkWordTile } from '@tiko/talk-types'
import WordTile from './WordTile.vue'

withDefaults(defineProps<{
  title?: string
  emptyLabel?: string
  suggestions: TalkWordTile[]
}>(), {
  title: 'Next words',
  emptyLabel: 'Pick another word to continue.',
})

defineEmits<{
  select: [word: TalkWordTile]
}>()
</script>
