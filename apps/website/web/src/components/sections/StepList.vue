<script setup lang="ts">
import { useBemm } from 'bemm'

/**
 * Numbered rows separated by hairlines. Use where a sequence matters and a
 * grid of equal cards would flatten the order into a menu.
 */
export interface Step {
  title: string
  body: string
}

defineProps<{ steps: Step[] }>()

const bemm = useBemm('step-list', { return: 'string', includeBaseClass: true })

const marker = (index: number) => String(index + 1).padStart(2, '0')
</script>

<template>
  <ol :class="bemm()">
    <li v-for="(step, index) in steps" :key="step.title" :class="bemm('item')">
      <span :class="bemm('number')">{{ marker(index) }}</span>
      <h3 :class="bemm('title')">{{ step.title }}</h3>
      <p :class="bemm('body')">{{ step.body }}</p>
    </li>
  </ol>
</template>

<style lang="scss">
.step-list {
  list-style: none;
  margin: 0;
  padding: 0;

  &__item {
    display: grid;
    grid-template-columns: auto 1fr 1.4fr;
    gap: clamp(1rem, 3vw, 2.5rem);
    align-items: start;
    padding-block: clamp(1.25rem, 3vw, 2rem);
    border-block-start: 1px solid var(--surface-hairline);

    &:last-child {
      border-block-end: 1px solid var(--surface-hairline);
    }
  }

  &__number {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    min-inline-size: 2.5em;
    padding-top: 0.5em;
    opacity: 0.65;
  }

  &__title {
    font-family: var(--font-family-heading);
    font-size: clamp(1.15rem, 2.2vw, 1.6rem);
    line-height: 1.15;
    color: inherit;
  }

  &__body {
    line-height: 1.6;
    max-width: 52ch;
    color: var(--text-secondary);
  }

  // On a toned band --text-secondary is a page token and would drop out of
  // contrast; tint against the band's own ink instead.
  .section--toned &__body {
    color: color-mix(in srgb, var(--section-fg), transparent 22%);
  }

  @media (max-width: 860px) {
    &__item {
      grid-template-columns: auto 1fr;
      gap: 0.5rem 1rem;
    }

    &__body {
      grid-column: 2;
    }

    &__number {
      padding-top: 0.35em;
    }
  }
}
</style>
