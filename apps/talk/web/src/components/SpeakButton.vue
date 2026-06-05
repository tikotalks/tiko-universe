<script setup lang="ts">
import { useBemm } from 'bemm'

const bemm = useBemm('speak-button', { return: 'string', includeBaseClass: true })

withDefaults(defineProps<{
  disabled?: boolean
  loading?: boolean
  cached?: boolean
  label?: string
  loadingLabel?: string
  cachedLabel?: string
}>(), {
  label: 'Speak',
  loadingLabel: 'Loading words',
  cachedLabel: 'Audio ready',
})

defineEmits<{
  speak: []
}>()
</script>

<template>
  <button
    :class="bemm('')"
    type="button"
    :disabled="disabled || loading"
    :aria-busy="loading"
    @click="$emit('speak')"
  >
    <span :class="bemm('label')">{{ loading ? loadingLabel : label }}</span>
    <span v-if="cached" :class="bemm('status')">{{ cachedLabel }}</span>
  </button>
</template>
