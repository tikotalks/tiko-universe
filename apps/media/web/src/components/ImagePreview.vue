<script setup lang="ts">
defineProps<{
  src: string
  alt: string
  width?: number
  height?: number
}>()

const emit = defineEmits<{
  download: []
}>()
</script>

<template>
  <div class="image-preview">
    <div class="image-preview__frame">
      <img
        :src="src"
        :alt="alt"
        class="image-preview__img"
        :width="width"
        :height="height"
      />
    </div>
    <button class="image-preview__download" @click="emit('download')">
      ↓ Download Image
    </button>
  </div>
</template>

<style lang="scss" scoped>
.image-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__frame {
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--color-foreground) 4%, var(--color-background));
    border-radius: 1rem;
    overflow: hidden;
    min-height: 16rem;
  }

  &__img {
    max-width: 100%;
    max-height: 32rem;
    object-fit: contain;
    border-radius: 0.5rem;
  }

  &__download {
    align-self: center;
    padding: 0.6rem 1.5rem;
    border: none;
    border-radius: 0.75rem;
    background: var(--tiko-app-primary);
    color: var(--tiko-app-primary-text);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover { opacity: 0.85; }
  }
}
</style>
