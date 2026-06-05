<template>
  <button
    class="talk-word-tile"
    type="button"
    :class="{ 'talk-word-tile--selected': selected }"
    :aria-pressed="selected"
    @click="$emit('select', word)"
  >
    <span class="talk-word-tile__icon" aria-hidden="true">{{ word.icon ?? word.pos }}</span>
    <span class="talk-word-tile__text">{{ word.text }}</span>
    <span class="talk-word-tile__pos">{{ word.pos }}</span>
  </button>
</template>

<script setup lang="ts">
import type { WordTile } from '@tiko/talk-types'

defineProps<{
  word: WordTile
  selected?: boolean
}>()

defineEmits<{
  select: [word: WordTile]
}>()
</script>
