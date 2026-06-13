<script setup lang="ts">
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import type { ImageGenerationResult } from '../../types/admin'
import type { QueueItem } from './imageGenerationQueueTypes'

defineProps<{
  queue: QueueItem[]
  imageSrc: (item: ImageGenerationResult) => string
}>()

const emit = defineEmits<{
  clear: []
  retry: [item: QueueItem]
}>()

const bemm = useBemm('image-generation-queue', { return: 'string', includeBaseClass: true })
</script>

<template>
  <aside :class="bemm('')">
    <header :class="bemm('head')">
      <h3 :class="bemm('title')">
        Queue <span :class="bemm('count')">{{ queue.length }}</span>
      </h3>
      <Button
        v-if="queue.some(i => i.status === 'done' || i.status === 'error')"
        variant="ghost"
        size="small"
        @click="emit('clear')"
      >
        Clear done
      </Button>
    </header>

    <div v-if="queue.length === 0" :class="bemm('empty')">
      No items queued. Add a prompt and click "Add to queue".
    </div>

    <ul v-else :class="bemm('list')">
      <li
        v-for="item in queue"
        :key="item.id"
        :class="bemm('item', { [item.status]: true })"
      >
        <div :class="bemm('status')">
          <span v-if="item.status === 'pending'">...</span>
          <span v-else-if="item.status === 'generating'" :class="bemm('spinner')">...</span>
          <span v-else-if="item.status === 'done'">Done</span>
          <span v-else>Error</span>
        </div>
        <div :class="bemm('info')">
          <strong :class="bemm('label')">{{ item.label }}</strong>
          <span v-if="item.status === 'generating'" :class="bemm('sub')">Generating...</span>
          <span
            v-else-if="item.status === 'error'"
            :class="bemm('error')"
            :title="item.error ?? undefined"
          >
            {{ item.error }}
          </span>
          <span v-else-if="item.status === 'done'" :class="bemm('sub')">
            {{ item.input.type === 'enrich' ? 'Enriched' : Array.isArray(item.result) ? `${item.result.length} images - check Drafts` : 'Done - check Drafts' }}
          </span>
        </div>
        <img
          v-if="item.result && !Array.isArray(item.result)"
          :class="bemm('thumb')"
          :src="imageSrc(item.result)"
          :alt="item.label"
        />
        <div v-else-if="Array.isArray(item.result)" :class="bemm('thumbs')">
          <img
            v-for="result in item.result.slice(0, 4)"
            :key="result.id"
            :class="bemm('thumb')"
            :src="imageSrc(result)"
            :alt="item.label"
          />
        </div>
        <button
          v-if="item.status === 'error'"
          type="button"
          :class="bemm('retry')"
          @click="emit('retry', item)"
        >
          Retry
        </button>
      </li>
    </ul>
  </aside>
</template>

<style lang="scss">
@use '../../styles/mixins' as *;

.image-generation-queue {
  background: var(--admin-surface);
  border: 0;
  border-radius: var(--admin-card-radius);
  padding: var(--space-m);
  display: flex;
  flex-direction: column;
  gap: var(--space-s);

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-s);
  }

  &__title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__count {
    color: var(--admin-text-muted);
    background: var(--admin-page-bg);
    border-radius: var(--border-radius-round);
    padding: 0 var(--space-xs);
    font-size: var(--font-size-xs);
  }

  &__empty {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    text-align: center;
    padding: var(--space-m) 0;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-s);
    border-radius: var(--border-radius-xs);
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);

    &--generating {
      border-color: var(--color-primary);
    }

    &--done {
      border-color: color-mix(in srgb, var(--color-success, green), transparent 60%);
    }

    &--error {
      border-color: color-mix(in srgb, var(--color-error), transparent 60%);
    }
  }

  &__status {
    font-size: var(--font-size-m);
    flex-shrink: 0;
    width: 1.4em;
    text-align: center;
  }

  &__spinner {
    display: inline-block;
    animation: image-generation-queue-spin 1s linear infinite;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__label {
    font-size: var(--font-size-s);
    font-weight: 600;
    color: var(--admin-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__sub {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
  }

  &__error {
    font-size: var(--font-size-xs);
    color: var(--color-error);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  &__retry {
    flex-shrink: 0;
    border: 1px solid var(--admin-border);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font: inherit;
    font-size: var(--font-size-xs);
    font-weight: 500;
    padding: 2px var(--space-s);
    border-radius: var(--border-radius-xs);
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      border-color: var(--admin-border-strong);
      background: var(--admin-nav-hover);
    }
  }

  &__thumb {
    width: calc(var(--space) * 5);
    height: calc(var(--space) * 5);
    object-fit: cover;
    border-radius: var(--border-radius-xs);
    flex-shrink: 0;
    --block-size: 0.5em;
    @include checkeredBackground;
  }

  &__thumbs {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }
}

@keyframes image-generation-queue-spin {
  to { transform: rotate(360deg); }
}
</style>
