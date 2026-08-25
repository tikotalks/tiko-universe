<script setup lang="ts">
import { useBemm } from 'bemm'
import { SilIcon } from '@tiko/ui'
import type { MediaItem } from '../types/media'

const props = defineProps<{
  item: MediaItem
}>()

const emit = defineEmits<{
  click: []
  download: []
}>()

const bemm = useBemm('media-card', { return: 'string', includeBaseClass: true })

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
  image: 'media/image',
  audio: 'media/music-note',
  video: 'media/filmroll',
}

function placeholderIcon(): string {
  return typeIcons[props.item.fileType] ?? 'ui/simple-note'
}
</script>

<template>
  <article :class="bemm('')">
    <button :class="bemm('open')" @click="emit('click')">
      <span :class="bemm('preview')">
        <img
          v-if="item.thumbnailUrl"
          :class="bemm('image')"
          :src="item.thumbnailUrl"
          :alt="item.title"
          loading="lazy"
        >
        <span v-else :class="bemm('placeholder')">
          <SilIcon :name="placeholderIcon()" />
        </span>
        <span v-if="item.durationSeconds" :class="bemm('duration')">
          {{ formatDuration(item.durationSeconds) }}
        </span>
      </span>

      <span :class="bemm('info')">
        <span :class="bemm('title')">{{ item.title }}</span>
        <span :class="bemm('meta')">
          <span :class="bemm('category')">{{ item.category }}</span>
          <span :class="bemm('size')">{{ formatSize(item.fileSizeBytes) }}</span>
        </span>
      </span>
    </button>

    <button
      :class="bemm('download')"
      :aria-label="`Download ${item.title}`"
      @click="emit('download')"
    >
      <SilIcon name="arrows/arrow-download" />
    </button>
  </article>
</template>

<style lang="scss">
.media-card {
  position: relative;
  display: flex;
  border-radius: 20px;
  background: var(--surface-card);
  overflow: hidden;
  transition: transform 0.18s var(--ease-out), box-shadow 0.18s var(--ease-out);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-m);
  }

  // The whole card is one control, so the card itself carries no click handler —
  // a nested button inside a clickable article is not reachable by keyboard.
  &__open {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
    }
  }

  &__preview {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    background: var(--surface-subtle);
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
    font-size: 2rem;
    color: var(--text-muted);
  }

  &__duration {
    position: absolute;
    bottom: var(--space-s);
    left: var(--space-s);
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background), transparent 15%);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    color: var(--color-foreground);
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    flex: 1;
    padding: var(--space);
  }

  &__title {
    font-weight: 600;
    font-size: 0.9rem;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    gap: var(--space-s);
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  &__category {
    text-transform: capitalize;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__size {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  &__download {
    position: absolute;
    top: var(--space-s);
    right: var(--space-s);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-primary-text);
    font-size: 0.85rem;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s var(--ease-out);

    .media-card:hover &,
    &:focus-visible {
      opacity: 1;
    }
  }
}

// Touch devices never get a hover, so the download action has to stay visible.
@media (hover: none) {
  .media-card__download {
    opacity: 1;
  }
}
</style>
