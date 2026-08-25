<script setup lang="ts">
import { useBemm } from 'bemm'

/** Two-column section body: content slot beside a media visual (image or `media` slot). */
withDefaults(defineProps<{
  image?: string
  imageAlt?: string
  mediaSide?: 'left' | 'right'
  /**
   * Draws a surface, radius and shadow behind the media. Turn it off when the
   * image is the subject rather than a photo in a frame — an app icon already
   * has its own shape, and boxing it only adds chrome around it.
   */
  frame?: boolean
}>(), {
  mediaSide: 'right',
  frame: true,
})

const bemm = useBemm('split-media', { return: 'string', includeBaseClass: true })
</script>

<template>
  <div :class="[bemm('', `media-${mediaSide}`), frame ? '' : 'split-media--bare']">
    <div :class="bemm('content')"><slot /></div>
    <div :class="bemm('media')">
      <slot name="media">
        <img v-if="image" :src="image" :alt="imageAlt ?? ''" loading="eager" :class="bemm('image')" />
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
  }

  &__image { width: 100%; height: 100%; object-fit: cover; }

  // Just the image — no surface, no radius, no crop.
  &--bare &__media {
    background: none;
    border-radius: 0;
    overflow: visible;
    aspect-ratio: auto;
  }

  &--bare &__image {
    height: auto;
    object-fit: contain;
    display: block;
    margin-inline: auto;
    max-width: min(100%, 20rem);
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    &--media-left { direction: ltr; }
  }
}
</style>
