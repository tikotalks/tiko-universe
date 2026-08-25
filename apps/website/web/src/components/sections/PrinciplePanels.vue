<script setup lang="ts">
import { useBemm } from 'bemm'

/**
 * A short run of principles.
 *
 * Not a grid of equal colour rectangles: that treatment gives every point the
 * same weight and ends up reading as wallpaper. The first panel is deliberately
 * larger, each carries an oversized ghost numeral, and the statement itself is
 * set at display size — the panel *is* the sentence, and the supporting line
 * sits under it rather than competing.
 */
export interface Principle {
  /** e.g. '01'. */
  marker?: string
  title: string
  body: string
  /** A Tiko colour name: 'primary' | 'secondary' | 'tertiary' | 'dark' | an app slug. */
  tone: string
}

withDefaults(defineProps<{ panels: Principle[]; feature?: boolean }>(), { feature: true })

const bemm = useBemm('principle-panels', { return: 'string', includeBaseClass: true })
</script>

<template>
  <ol :class="bemm('', { feature })">
    <li
      v-for="(panel, i) in panels"
      :key="panel.title"
      :class="bemm('panel')"
      :style="{
        '--panel-bg': `var(--color-${panel.tone})`,
        '--panel-fg': `var(--color-${panel.tone}-text)`,
      }"
    >
      <span v-if="panel.marker" :class="bemm('numeral')" aria-hidden="true">{{ panel.marker }}</span>
      <div :class="bemm('content')">
        <h3 :class="bemm('title')">{{ panel.title }}</h3>
        <p :class="bemm('body')">{{ panel.body }}</p>
      </div>
    </li>
  </ol>
</template>

<style lang="scss">
.principle-panels {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;

  &__panel {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    // Two of six columns, so three sit in a row by default.
    grid-column: span 2;
    min-block-size: clamp(15rem, 24vw, 21rem);
    padding: clamp(1.5rem, 3vw, 2.25rem);
    border-radius: 28px;
    border: 1px solid var(--surface-hairline);
    background: var(--panel-bg);
    color: var(--panel-fg);
  }

  // The first point carries the argument, so it gets the room to make it.
  &--feature &__panel:first-child {
    grid-column: span 3;
  }

  &--feature &__panel:nth-child(2) {
    grid-column: span 3;
  }

  &__numeral {
    position: absolute;
    // Seated fully inside the panel. Bleeding it off the top edge cropped the
    // glyph mid-stroke, which reads as a rendering fault rather than a device.
    inset-block-start: clamp(0.75rem, 2vw, 1.25rem);
    inset-inline-end: clamp(0.9rem, 2.5vw, 1.75rem);
    font-family: var(--font-family-heading);
    font-size: clamp(4.5rem, 9vw, 7.5rem);
    font-weight: 800;
    line-height: 0.8;
    // Sits in the surface rather than on it — readable as texture, never as
    // something competing with the sentence.
    color: color-mix(in srgb, var(--panel-fg), transparent 88%);
    pointer-events: none;
    user-select: none;
  }

  &__content {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  &__title {
    font-family: var(--font-family-heading);
    font-size: clamp(1.5rem, 2.8vw, 2.25rem);
    line-height: 1.02;
    letter-spacing: -0.02em;
    color: inherit;
    max-width: 16ch;
  }

  &--feature &__panel:first-child &__title,
  &--feature &__panel:nth-child(2) &__title {
    font-size: clamp(1.75rem, 3.4vw, 2.75rem);
  }

  &__body {
    line-height: 1.55;
    max-width: 38ch;
    // Held back from the title so the statement lands first.
    color: color-mix(in srgb, var(--panel-fg), transparent 22%);
    font-size: 0.95rem;
  }

  @media (max-width: 1000px) {
    grid-template-columns: repeat(2, 1fr);

    &__panel,
    &--feature &__panel:first-child,
    &--feature &__panel:nth-child(2) {
      grid-column: span 1;
    }
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;

    &__panel,
    &--feature &__panel:first-child,
    &--feature &__panel:nth-child(2) {
      grid-column: span 1;
      min-block-size: 0;
    }
  }
}
</style>
