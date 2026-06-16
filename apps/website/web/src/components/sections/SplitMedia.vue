<script setup lang="ts">
import { useBemm } from 'bemm'

/** Two-column section body: content slot beside a media visual (image or `media` slot). */
withDefaults(defineProps<{
  image?: string
  imageAlt?: string
  mediaSide?: 'left' | 'right'
}>(), {
  mediaSide: 'right',
})

const bemm = useBemm('split-media', { return: 'string', includeBaseClass: true })
</script>

<template>
  <div :class="bemm('', `media-${mediaSide}`)">
    <div :class="bemm('content')"><slot /></div>
    <div :class="bemm('media')">
      <slot name="media">
        <img v-if="image" :src="image" :alt="imageAlt ?? ''" loading="lazy" :class="bemm('image')" />
      </slot>
    </div>
  </div>
</template>

<style lang="scss">
.split-media {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(1.5rem, 4vw, 3.5rem);
  align-items: center;

  &--media-left { direction: rtl; }
  &--media-left > * { direction: ltr; }

  &__media {
    border-radius: 24px;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    background: var(--surface-subtle);
    box-shadow: 0 24px 50px -30px color-mix(in srgb, var(--color-foreground), transparent 40%);
  }

  &__image { width: 100%; height: 100%; object-fit: cover; }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    &--media-left { direction: ltr; }
  }
}
</style>
