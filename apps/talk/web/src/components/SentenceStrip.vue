<script setup lang="ts">
import { useBemm } from 'bemm'
import type { WordTile } from '@tiko/talk-types'

const bemm = useBemm('sentence-strip', { return: 'string', includeBaseClass: true })

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

<template>
  <section :class="bemm('')" aria-label="Sentence strip">
    <div :class="bemm('words')" data-test="sentence-strip">
      <button
        v-for="(word, index) in words"
        :key="`${word.id}-${index}`"
        :class="bemm('word')"
        type="button"
        :aria-label="`Remove ${word.text}`"
        @click="$emit('remove', index)"
      >
        {{ word.text }}
      </button>
      <span v-if="words.length === 0" :class="bemm('placeholder')">{{ placeholder }}</span>
    </div>
    <button :class="bemm('clear')" type="button" :disabled="words.length === 0" @click="$emit('clear')">
      {{ clearLabel }}
    </button>
  </section>
</template>
