<script setup lang="ts">
import { useBemm } from 'bemm'
import type { WordTile as TalkWordTile } from '@tiko/talk-types'
import WordTile from './WordTile.vue'

const bemm = useBemm('suggestion-bar', { return: 'string', includeBaseClass: true })

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

<template>
  <section :class="bemm('')" aria-label="Suggestions">
    <h2>{{ title }}</h2>
    <div v-if="suggestions.length" :class="bemm('row')">
      <WordTile
        v-for="word in suggestions"
        :key="word.id"
        :word="word"
        @select="$emit('select', $event)"
      />
    </div>
    <p v-else :class="bemm('empty')">{{ emptyLabel }}</p>
  </section>
</template>
