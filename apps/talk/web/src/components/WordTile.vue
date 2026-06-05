<script setup lang="ts">
import { useBemm } from 'bemm'
import type { WordTile } from '@tiko/talk-types'

const bemm = useBemm('word-tile', { return: 'string', includeBaseClass: true })

defineProps<{
  word: WordTile
  selected?: boolean
}>()

defineEmits<{
  select: [word: WordTile]
}>()
</script>

<template>
  <button
    :class="bemm('', { selected })"
    type="button"
    :aria-pressed="selected"
    @click="$emit('select', word)"
  >
    <span :class="bemm('icon')" aria-hidden="true">{{ word.icon ?? word.pos }}</span>
    <span :class="bemm('text')">{{ word.text }}</span>
    <span :class="bemm('pos')">{{ word.pos }}</span>
  </button>
</template>
