<template>
  <section class="talk-saved-phrases" aria-label="Saved phrases">
    <h2>{{ title }}</h2>
    <div v-if="phrases.length" class="talk-saved-phrases__list">
      <button
        v-for="phrase in phrases"
        :key="phrase.id"
        class="talk-saved-phrases__item"
        type="button"
        @click="$emit('select', phrase)"
      >
        <strong>{{ phrase.label ?? phrase.sentence }}</strong>
        <span>{{ phrase.usageCount }} uses</span>
      </button>
    </div>
    <p v-else class="talk-saved-phrases__empty">{{ emptyLabel }}</p>
  </section>
</template>

<script setup lang="ts">
import type { SavedPhrase } from '@tiko/talk-types'

withDefaults(defineProps<{
  title?: string
  emptyLabel?: string
  phrases: SavedPhrase[]
}>(), {
  title: 'Saved phrases',
  emptyLabel: 'No saved phrases yet.',
})

defineEmits<{
  select: [phrase: SavedPhrase]
}>()
</script>
