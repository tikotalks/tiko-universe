<template>
  <button
    class="talk-speak-button"
    type="button"
    :disabled="disabled || loading"
    :aria-busy="loading"
    @click="$emit('speak')"
  >
    <span class="talk-speak-button__label">{{ loading ? loadingLabel : label }}</span>
    <span v-if="cached" class="talk-speak-button__status">{{ cachedLabel }}</span>
  </button>
</template>

<script setup lang="ts">
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
