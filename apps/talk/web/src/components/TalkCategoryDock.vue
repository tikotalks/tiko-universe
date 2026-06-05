<script setup lang="ts">
import { useBemm } from 'bemm'
import { SilIcon as Icon } from '@tiko/ui'
import type { CategoryShortcut } from '../composables/useTalkPresentation'

const bemm = useBemm('category-dock', { return: 'string', includeBaseClass: true })

const props = defineProps<{
  categories: CategoryShortcut[]
  activeCategoryId: string | null
  side: 'left' | 'right'
}>()

const emit = defineEmits<{
  selectCategory: [category: CategoryShortcut]
}>()
</script>

<template>
  <nav :class="bemm('', { [props.side]: true })" :aria-label="`Category shortcuts ${props.side}`">
    <button
      v-for="category in categories"
      :key="category.id"
      :class="bemm('card', { active: activeCategoryId === category.id, [category.color]: true })"
      type="button"
      @click="emit('selectCategory', category)"
    >
      <Icon :class="bemm('card-icon')" :name="category.icon" size="large" aria-hidden="true" />
      <span>{{ category.label }}</span>
    </button>
  </nav>
</template>

<style lang="scss">
.category-dock {
  display: grid;
  gap: clamp(0.7rem, 1.3vw, 1.1rem);
  align-content: center;

  &__card {
    min-height: clamp(6.1rem, 11vw, 8.7rem);
    padding: clamp(0.5rem, 1vw, 0.8rem);
    border: 0;
    border-radius: clamp(1.35rem, 2.4vw, 2rem);
    display: grid;
    place-items: center;
    gap: 0.22rem;
    color: var(--talk-ink);
    box-shadow:
      inset 0 0.45rem 0 rgba(255, 255, 255, 0.36),
      0 0.45rem 0 rgba(48, 41, 28, 0.08),
      0 0.8rem 1.5rem var(--talk-shadow-soft);
    font-size: clamp(1rem, 1.7vw, 1.35rem);
    font-weight: 1000;
    cursor: pointer;
    transition: transform 0.14s ease;

    &:active { transform: translateY(0.12rem) scale(0.98); }
    &--active { outline: 0.22rem solid rgba(255, 127, 24, 0.44); }
    &--yellow { background: #ffe38b; }
    &--mint { background: #94e2da; }
    &--lavender { background: #d6c0f3; }
    &--peach { background: #ffaaa5; }
    &--blue { background: #b8ddf6; }
    &--green { background: #d4eeb9; }
    &--pink { background: #ffb8c3; }
  }

  &__card-icon {
    font-size: clamp(2.35rem, 4.2vw, 3.6rem);
    filter: drop-shadow(0 0.32rem 0.28rem rgba(35, 28, 20, 0.16));
  }
}

@media (max-width: 760px) {
  .category-dock {
    display: flex;
    gap: 0.65rem;
    overflow-x: auto;
    padding: 0.1rem 0 0.45rem;

    &--left,
    &--right { grid-row: 2; }

    &--right { margin-top: -0.45rem; }

    &__card {
      min-width: 6rem;
      min-height: 5.4rem;
    }
  }
}
</style>
