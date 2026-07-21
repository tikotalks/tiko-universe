<script setup lang="ts">
import { useBemm } from 'bemm'
import MediaCanvas from './MediaCanvas.vue'

/** Homepage hero: copy + CTAs (actions slot) beside the interactive media canvas. */
withDefaults(defineProps<{ eyebrow?: string; title?: string; lede?: string; note?: string }>(), {})

const bemm = useBemm('hero', { return: 'string', includeBaseClass: true })
</script>

<template>
  <section :class="bemm()">
    <div :class="bemm('inner')">
      <div :class="bemm('copy')">
        <span v-if="eyebrow" :class="bemm('eyebrow')">{{ eyebrow }}</span>
        <h1 v-if="title" :class="bemm('title')">{{ title }}</h1>
        <p v-if="lede" :class="bemm('lede')">{{ lede }}</p>
        <div v-if="$slots.actions" :class="bemm('actions')"><slot name="actions" /></div>
        <p v-if="note" :class="bemm('note')">{{ note }}</p>
      </div>
      <div :class="bemm('visual')">
        <MediaCanvas />
      </div>
    </div>
  </section>
</template>

<style lang="scss">
.hero {
  padding-block: clamp(2.5rem, 6vw, 5rem);
  overflow: hidden;

  &__inner {
    width: 100%;
    max-width: var(--max-width);
    margin-inline: auto;
    padding-inline: clamp(1rem, 4vw, 2.5rem);
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: center;
  }

  &__eyebrow {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-primary);
  }

  &__title {
    font-family: var(--font-family-heading);
    font-size: clamp(2.75rem, 7vw, 5.25rem);
    line-height: 0.98;
    letter-spacing: -0.03em;
    margin-block: 0.5rem 0.75rem;
  }

  &__lede {
    font-size: clamp(1.05rem, 2.2vw, 1.35rem);
    line-height: 1.6;
    color: var(--text-secondary);
    max-width: 46ch;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  &__note {
    margin-top: 1rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  &__visual {
    position: relative;
    aspect-ratio: 1 / 1;
    min-height: 320px;
    border-radius: 32px;
    overflow: hidden;
    background:
      radial-gradient(120% 120% at 30% 20%,
        color-mix(in srgb, var(--color-primary), transparent 86%),
        color-mix(in srgb, var(--color-secondary), transparent 90%));
  }

  @media (max-width: 860px) {
    &__inner { grid-template-columns: 1fr; }
    &__visual { min-height: 260px; order: -1; }
  }
}
</style>
