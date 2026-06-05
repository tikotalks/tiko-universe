<script setup lang="ts">
import { useBemm } from 'bemm'
import type { SavedPhrase } from '@tiko/talk-types'

const bemm = useBemm('saved-phrases', { return: 'string', includeBaseClass: true })

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

<template>
  <section :class="bemm('')" aria-label="Saved phrases">
    <h2>{{ title }}</h2>
    <div v-if="phrases.length" :class="bemm('list')">
      <button
        v-for="phrase in phrases"
        :key="phrase.id"
        :class="bemm('item')"
        type="button"
        @click="$emit('select', phrase)"
      >
        <strong>{{ phrase.label ?? phrase.sentence }}</strong>
        <span>{{ phrase.usageCount }} uses</span>
      </button>
    </div>
    <p v-else :class="bemm('empty')">{{ emptyLabel }}</p>
  </section>
</template>
