<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { tikoImageUrl } from '@tiko/media'

const props = defineProps<{
  src: string
  alt: string
  width?: number
  height?: number
}>()

const bemm = useBemm('image-preview', { return: 'string', includeBaseClass: true })

const previewSrc = computed(() => tikoImageUrl(props.src, 'medium') || props.src)
</script>

<template>
  <figure :class="bemm('')">
    <img
      :class="bemm('image')"
      :src="previewSrc"
      :alt="alt"
      :width="width"
      :height="height"
    >
  </figure>
</template>

<style lang="scss">
.image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: clamp(var(--space), 3vw, calc(var(--space) * 2));
  min-height: 20rem;
  border-radius: 24px;
  background: var(--surface-subtle);
  overflow: hidden;

  &__image {
    max-width: 100%;
    max-height: 34rem;
    width: auto;
    object-fit: contain;
    border-radius: 12px;
  }
}
</style>
