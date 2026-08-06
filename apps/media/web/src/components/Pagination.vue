<script setup lang="ts">
import { useBemm } from 'bemm'
import { SilIcon } from '@tiko/ui'

defineProps<{
  page: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
  goto: [page: number]
}>()

const bemm = useBemm('pagination', { return: 'string', includeBaseClass: true })

function pageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
</script>

<template>
  <nav v-if="totalPages > 1" :class="bemm('')" aria-label="Pagination">
    <button
      :class="bemm('step')"
      :disabled="!hasPrev"
      aria-label="Previous page"
      @click="emit('prev')"
    >
      <SilIcon name="arrows/arrow-left" />
      <span :class="bemm('step-label')">Previous</span>
    </button>

    <div :class="bemm('pages')">
      <template v-for="(entry, index) in pageRange(page, totalPages)" :key="index">
        <span v-if="entry === '...'" :class="bemm('gap')" aria-hidden="true">…</span>
        <button
          v-else
          :class="bemm('page', ['', entry === page ? 'active' : ''])"
          :aria-label="`Page ${entry}`"
          :aria-current="entry === page ? 'page' : undefined"
          @click="emit('goto', entry)"
        >
          {{ entry }}
        </button>
      </template>
    </div>

    <button
      :class="bemm('step')"
      :disabled="!hasNext"
      aria-label="Next page"
      @click="emit('next')"
    >
      <span :class="bemm('step-label')">Next</span>
      <SilIcon name="arrows/arrow-right" />
    </button>
  </nav>
</template>

<style lang="scss">
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-s);
  padding-top: var(--space);

  &__step {
    display: inline-flex;
    align-items: center;
    gap: var(--space-s);
    padding: 8px 16px;
    border: none;
    border-radius: 999px;
    background: var(--surface-subtle);
    color: var(--text-secondary);
    font-family: var(--font-family);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-primary), transparent 88%);
      color: var(--color-foreground);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &__pages {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.25rem;
    height: 2.25rem;
    padding: 0 8px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-family);
    font-size: 0.85rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);

    &:hover {
      background: var(--surface-ink-wash);
      color: var(--color-foreground);
    }

    // Selection is a tint, not an outline.
    &--active {
      background: color-mix(in srgb, var(--color-primary), transparent 78%);
      color: color-mix(in srgb, var(--color-foreground), var(--color-primary) 30%);
    }
  }

  &__gap {
    width: 1.5rem;
    text-align: center;
    color: var(--text-muted);
  }
}

@media (max-width: 560px) {
  .pagination__step-label {
    display: none;
  }
}
</style>
