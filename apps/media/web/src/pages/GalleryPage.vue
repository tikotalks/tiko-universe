<script setup lang="ts">
import { ref } from 'vue'

// Placeholder — will be built out in Task 1.3
</script>

<template>
  <div class="gallery-page">
    <h1>Media Gallery</h1>
    <p class="gallery-page__subtitle">Browse, search, and download Tiko media assets.</p>
  </div>
</template>

<style lang="scss" scoped>
.gallery-page {
  &__subtitle {
    color: color-mix(in srgb, var(--color-foreground) 60%, transparent);
    margin-top: 0.25rem;
  }
}
</style>
