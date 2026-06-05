<template>
  <section class="talk-saved-phrases" aria-label="Saved phrases">
    <h2>{{ title }}</h2>
    <div v-if="phrases.length" class="talk-saved-phrases__list">
      <div
        v-for="phrase in phrases"
        :key="phrase.id"
        class="talk-saved-phrases__item"
      >
        <button
          class="talk-saved-phrases__select"
          type="button"
          data-testid="saved-phrase-select"
          @click="$emit('select', phrase)"
        >
          <strong>{{ phrase.label ?? phrase.sentence }}</strong>
          <span>{{ phrase.usageCount }} uses</span>
        </button>
        <button
          class="talk-saved-phrases__delete"
          type="button"
          data-testid="saved-phrase-delete"
          :aria-label="`Delete ${phrase.label ?? phrase.sentence}`"
          @click.stop="$emit('delete', phrase)"
        >
          Delete
        </button>
      </div>
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
  delete: [phrase: SavedPhrase]
}>()
</script>
