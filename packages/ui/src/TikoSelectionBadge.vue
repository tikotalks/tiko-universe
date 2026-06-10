<script setup lang="ts">
import { useBemm } from 'bemm'

defineProps<{
  selected: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const bemm = useBemm('tiko-selection-badge', { return: 'string', includeBaseClass: true })
</script>

<template>
  <button
    type="button"
    :class="bemm('', { selected })"
    :aria-label="selected ? 'Deselect' : 'Select'"
    @click.stop="emit('toggle')"
  >
    <span v-if="selected" :class="bemm('check')" aria-hidden="true">✓</span>
  </button>
</template>
