<script setup lang="ts">
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
  <nav v-if="totalPages > 1" class="pagination" aria-label="Pagination">
    <button
      class="pagination__btn"
      :disabled="!hasPrev"
      @click="emit('prev')"
    >
      ← Prev
    </button>

    <div class="pagination__pages">
      <template v-for="(p, i) in pageRange(page, totalPages)" :key="i">
        <span v-if="p === '...'" class="pagination__dots">…</span>
        <button
          v-else
          class="pagination__page"
          :class="{ 'pagination__page--active': p === page }"
          @click="emit('goto', p)"
        >
          {{ p }}
        </button>
      </template>
    </div>

    <button
      class="pagination__btn"
      :disabled="!hasNext"
      @click="emit('next')"
    >
      Next →
    </button>
  </nav>
</template>

<style lang="scss" scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 0;

  &__btn {
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--tiko-border);
    border-radius: 0.5rem;
    background: var(--tiko-surface);
    color: var(--color-foreground);
    font-size: 0.85rem;
    cursor: pointer;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      background: var(--tiko-surface-raised);
    }
  }

  &__pages {
    display: flex;
    gap: 0.25rem;
  }

  &__page {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0.4rem;
    background: transparent;
    color: var(--color-foreground);
    font-size: 0.85rem;
    cursor: pointer;

    &:hover { background: var(--tiko-surface-raised); }

    &--active {
      background: var(--tiko-app-primary);
      color: var(--tiko-app-primary-text);
      font-weight: 600;
    }
  }

  &__dots {
    width: 2rem;
    text-align: center;
    color: color-mix(in srgb, var(--color-foreground) 40%, transparent);
  }
}
</style>
