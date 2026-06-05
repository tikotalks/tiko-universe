<template>
  <section class="talk-strip" aria-label="Sentence strip">
    <div class="talk-strip__words" data-test="sentence-strip">
      <button
        v-for="(word, index) in words"
        :key="`${word.id}-${index}`"
        class="talk-strip__word"
        type="button"
        :aria-label="`Remove ${word.text}`"
        @click="$emit('remove', index)"
      >
        {{ word.text }}
      </button>
      <span v-if="words.length === 0" class="talk-strip__placeholder">{{ placeholder }}</span>
    </div>
    <button class="talk-strip__clear" type="button" :disabled="words.length === 0" @click="$emit('clear')">
      {{ clearLabel }}
    </button>
  </section>
</template>

<script setup lang="ts">
import type { WordTile } from '@tiko/talk-types'

withDefaults(defineProps<{
  words: WordTile[]
  placeholder?: string
  clearLabel?: string
}>(), {
  placeholder: 'Build a sentence',
  clearLabel: 'Clear',
})

defineEmits<{
  remove: [index: number]
  clear: []
}>()
</script>
