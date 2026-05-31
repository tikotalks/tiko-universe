<script setup lang="ts">
import type { MediaItem } from '../types/media'
import MediaCard from './MediaCard.vue'

defineProps<{
  items: MediaItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  cardClick: [item: MediaItem]
  download: [item: MediaItem]
}>()
</script>

<template>
  <div class="media-grid">
    <div v-if="loading && items.length === 0" class="media-grid__empty">
      <span class="media-grid__spinner">⟳</span>
      <p>Loading media…</p>
    </div>

    <div v-else-if="items.length === 0" class="media-grid__empty">
      <p>No media found.</p>
    </div>

    <div v-else class="media-grid__grid">
      <MediaCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        @click="emit('cardClick', item)"
        @download="emit('download', item)"
      />
    </div>

    <div v-if="loading && items.length > 0" class="media-grid__loading-more">
      <span class="media-grid__spinner">⟳</span> Loading more…
    </div>
  </div>
</template>

<style lang="scss" scoped>
.media-grid {
  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;

    @media (min-width: 640px) {
      grid-template-columns: repeat(3, 1fr);
    }

    @media (min-width: 960px) {
      grid-template-columns: repeat(4, 1fr);
    }

    @media (min-width: 1200px) {
      grid-template-columns: repeat(5, 1fr);
    }
  }

  &__empty {
    text-align: center;
    padding: 3rem 1rem;
    color: color-mix(in srgb, var(--color-foreground) 50%, transparent);
  }

  &__loading-more {
    text-align: center;
    padding: 1rem;
    color: color-mix(in srgb, var(--color-foreground) 50%, transparent);
    font-size: 0.9rem;
  }

  &__spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
}
</style>
