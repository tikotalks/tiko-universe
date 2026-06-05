<script setup lang="ts">
import { SilIcon as Icon } from '@tiko/ui'
import type { WordTile } from '@tiko/talk-types'

defineProps<{
  words: WordTile[]
  canSpeak: boolean
  speechStatus: 'idle' | 'speaking' | 'ready' | 'fallback' | 'error'
  wordIcon: (word: WordTile) => string
}>()

const emit = defineEmits<{
  removeWord: [index: number]
  removeLastWord: []
  speak: []
}>()
</script>

<template>
  <section class="sentence-bar" aria-label="Current sentence">
    <div class="sentence-bar__words">
      <button
        v-for="(word, index) in words"
        :key="`${word.id}-${index}`"
        class="sentence-word-pill"
        type="button"
        :aria-label="`Remove ${word.text}`"
        @click="emit('removeWord', index)"
      >
        <span>{{ word.text }}</span>
        <Icon v-if="wordIcon(word)" :name="wordIcon(word)" size="small" aria-hidden="true" />
      </button>
      <span v-if="!words.length" class="sentence-bar__placeholder">Tap a word</span>
    </div>

    <button class="sentence-bar__backspace" type="button" aria-label="Delete last word" :disabled="!words.length" @click="emit('removeLastWord')">
      <Icon name="ui/talk-subtract" size="small" />
    </button>
    <button class="speak-orb" type="button" :disabled="!canSpeak" aria-label="Speak sentence" @click="emit('speak')">
      <span v-if="speechStatus === 'speaking'" aria-hidden="true">…</span>
      <Icon v-else name="media/playback-play" size="medium" aria-hidden="true" />
    </button>
    <Icon class="sentence-bar__sound" name="media/volume-iii" size="medium" aria-hidden="true" />
  </section>
</template>
