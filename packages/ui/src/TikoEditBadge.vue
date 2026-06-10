<script setup lang="ts">
import { useBemm } from 'bemm'

withDefaults(defineProps<{
  userOwned?: boolean
}>(), {
  userOwned: true,
})

const emit = defineEmits<{
  press: []
}>()

const bemm = useBemm('tiko-edit-badge', { return: 'string', includeBaseClass: true })
</script>

<template>
  <button
    type="button"
    :class="bemm('', { 'user-owned': userOwned, default: !userOwned })"
    aria-label="Edit"
    @click.stop="emit('press')"
  >
    {{ userOwned ? '✎' : '✦' }}
  </button>
</template>
