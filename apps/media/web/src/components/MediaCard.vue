<script setup lang="ts">
import type { MediaItem } from '../types/media'

defineProps<{
  item: MediaItem
}>()

const emit = defineEmits<{
  click: []
  download: []
}>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const typeIcons: Record<string, string> = {
  image: '🖼',
  audio: '♪',
  video: '▶',
}
</script>

<template>
  <article class="media-card" @click="emit('click')">
    <div class="media-card__preview">
      <img
        v-if="item.thumbnailUrl"
        :src="item.thumbnailUrl"
        :alt="item.title"
        class="media-card__image"
        loading="lazy"
      />
      <div v-else class="media-card__placeholder">
        <span class="media-card__placeholder-icon">{{ typeIcons[item.fileType] ?? '📄' }}</span>
      </div>
      <span class="media-card__type-badge">{{ item.fileType }}</span>
      <span v-if="item.durationSeconds" class="media-card__duration">
        {{ formatDuration(item.durationSeconds) }}
      </span>
    </div>
    <div class="media-card__info">
      <h3 class="media-card__title">{{ item.title }}</h3>
      <div class="media-card__meta">
        <span class="media-card__category">{{ item.category }}</span>
        <span class="media-card__size">{{ formatSize(item.fileSizeBytes) }}</span>
      </div>
    </div>
    <button
      class="media-card__download"
      aria-label="Download"
      @click.stop="emit('download')"
    >
      ↓
    </button>
  </article>
</template>

<style lang="scss" scoped>
.media-card {
  display: flex;
  flex-direction: column;
  background: var(--tiko-surface-raised);
  border: 1px solid var(--tiko-border);
  border-radius: 1rem;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--tiko-shadow);
  }

  &__preview {
    position: relative;
    aspect-ratio: 1;
    background: color-mix(in srgb, var(--color-foreground) 6%, var(--color-background));
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;

    &-icon {
      font-size: 2.5rem;
      opacity: 0.4;
    }
  }

  &__type-badge {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background), transparent 20%);
    color: var(--color-foreground);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    backdrop-filter: blur(4px);
  }

  &__duration {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    padding: 0.15rem 0.4rem;
    border-radius: 0.3rem;
    background: color-mix(in srgb, var(--color-background), transparent 20%);
    color: var(--color-foreground);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    backdrop-filter: blur(4px);
  }

  &__info {
    padding: 0.65rem 0.75rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__title {
    font-size: 0.85rem;
    font-weight: 600;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: color-mix(in srgb, var(--color-foreground) 55%, transparent);
  }

  &__download {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: var(--tiko-app-primary);
    color: var(--tiko-app-primary-text);
    font-size: 1rem;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;

    .media-card:hover & {
      opacity: 1;
    }
  }
}
</style>
