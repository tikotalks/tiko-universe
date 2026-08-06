<script setup lang="ts">
import { useBemm } from 'bemm'
import MediaCard from './MediaCard.vue'
import type { MediaItem } from '../types/media'

defineProps<{
  items: MediaItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  cardClick: [item: MediaItem]
  download: [item: MediaItem]
}>()

const bemm = useBemm('media-grid', { return: 'string', includeBaseClass: true })
</script>

<template>
  <div :class="bemm('')">
    <p v-if="loading && items.length === 0" :class="bemm('status')" role="status">
      Loading media…
    </p>

    <p v-else-if="items.length === 0" :class="bemm('status')" role="status">
      No media matches those filters.
    </p>

    <div v-else :class="bemm('grid', ['', loading ? 'pending' : ''])">
      <MediaCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        @click="emit('cardClick', item)"
        @download="emit('download', item)"
      />
    </div>
  </div>
</template>

<style lang="scss">
.media-grid {
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: var(--space);
    transition: opacity 0.18s var(--ease-out);

    // Refetching keeps the current page on screen and dims it, rather than
    // replacing the grid with a spinner and losing the reader's place.
    &--pending {
      opacity: 0.55;
    }
  }

  &__status {
    padding: calc(var(--space) * 3) var(--space);
    text-align: center;
    color: var(--text-muted);
  }
}
</style>
