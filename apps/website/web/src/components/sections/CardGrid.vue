<script setup lang="ts">
import { useBemm } from 'bemm'

/** Responsive auto-fit grid for cards. `min` sets the smallest card width. */
withDefaults(defineProps<{ min?: string; gap?: string }>(), {
  min: '240px',
  gap: '1.25rem',
})

const bemm = useBemm('card-grid', { return: 'string', includeBaseClass: true })
</script>

<template>
  <div :class="bemm()" :style="{ '--grid-min': min, '--grid-gap': gap }">
    <slot />
  </div>
</template>

<style lang="scss">
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(var(--grid-min), 100%), 1fr));
  gap: var(--grid-gap);
}
</style>
