<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'

/**
 * Base section wrapper. Owns the vertical rhythm, container width, and the
 * (optional) eyebrow / title / intro header. Set `tone` to render the section
 * as a full-colour band (background = --color-{tone}, readable text auto via
 * --color-{tone}-text). Content goes in the default slot; optional `actions`
 * slot sits under the header.
 */
const props = withDefaults(defineProps<{
  eyebrow?: string
  title?: string
  intro?: string
  tone?: string        // a Tiko colour name e.g. 'primary' | 'yes-no' | 'dark'
  width?: 'narrow' | 'default' | 'wide'
  align?: 'left' | 'center'
  /**
   * `split` puts the eyebrow in a narrow left column with the title and intro
   * beside it. The asymmetry is what keeps a long page from reading as a stack
   * of identical centred blocks. Ignored when `align` is `center`.
   */
  layout?: 'stacked' | 'split'
  id?: string
}>(), {
  width: 'default',
  align: 'left',
  layout: 'stacked',
})

const bemm = useBemm('section', { return: 'string', includeBaseClass: true })

const isSplit = computed(() => props.layout === 'split' && props.align !== 'center')

const toneStyle = computed(() =>
  props.tone
    ? { '--section-bg': `var(--color-${props.tone})`, '--section-fg': `var(--color-${props.tone}-text)` }
    : {}
)
</script>

<template>
  <section
    :id="id"
    :class="[bemm('', { toned: !!tone, [`w-${width}`]: true, [`a-${align}`]: true, split: isSplit })]"
    :style="toneStyle"
  >
    <div :class="bemm('inner')">
      <header v-if="eyebrow || title || intro || $slots.actions || $slots.title" :class="bemm('head')">
        <span v-if="eyebrow" :class="bemm('eyebrow')">{{ eyebrow }}</span>
        <div :class="bemm('head-main')">
          <h2 v-if="title || $slots.title" :class="bemm('title')">
            <slot name="title">{{ title }}</slot>
          </h2>
          <p v-if="intro" :class="bemm('intro')">{{ intro }}</p>
          <div v-if="$slots.actions" :class="bemm('actions')"><slot name="actions" /></div>
        </div>
      </header>
      <div :class="bemm('body')"><slot /></div>
    </div>
  </section>
</template>

<style lang="scss">
.section {
  --section-pad-block: clamp(3rem, 7vw, 6rem);
  padding-block: var(--section-pad-block);

  &--toned {
    background: var(--section-bg);
    color: var(--section-fg);

    .section__eyebrow,
    .section__intro { color: color-mix(in srgb, var(--section-fg), transparent 22%); }
    .section__title { color: var(--section-fg); }
  }

  &__inner {
    width: 100%;
    max-width: var(--max-width);
    margin-inline: auto;
    padding-inline: clamp(1rem, 4vw, 2.5rem);
  }

  &--w-narrow .section__inner { max-width: 720px; }
  &--w-wide .section__inner { max-width: 1360px; }

  &__head {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 60ch;
    margin-bottom: clamp(1.5rem, 3vw, 2.75rem);
  }

  &__head-main {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
  }

  // Eyebrow in a narrow left column, title and intro beside it.
  &--split &__head {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: clamp(1rem, 4vw, 3rem);
    align-items: start;
    max-width: none;

    @media (max-width: 860px) {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  }

  &--split &__eyebrow {
    padding-top: 0.4em;
  }

  // The body lines up under the title rather than starting back at the page
  // edge, so a section reads as one column instead of two disconnected ones.
  &--split &__body {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: clamp(1rem, 4vw, 3rem);

    > * {
      grid-column: 2;
      min-width: 0;
    }

    @media (max-width: 860px) {
      grid-template-columns: 1fr;

      > * {
        grid-column: 1;
      }
    }
  }

  &--split &__intro {
    max-width: 46ch;
  }

  &--a-center &__head {
    align-items: center;
    text-align: center;
    margin-inline: auto;
  }

  &__eyebrow {
    font-family: var(--font-family-heading);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  &__title {
    font-family: var(--font-family-heading);
    font-size: clamp(1.75rem, 4vw, 3rem);
    line-height: 1.05;

    // Lets a title accent one clause without splitting it into two elements.
    em {
      font-style: normal;
      color: var(--color-primary);
    }
  }

  // On a toned band the page primary would fight the band; tint against the
  // band's own readable ink instead.
  &--toned &__title em {
    color: color-mix(in srgb, var(--section-fg), transparent 38%);
  }

  &__intro {
    font-size: clamp(1rem, 2vw, 1.2rem);
    line-height: 1.6;
    color: var(--text-secondary);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
}
</style>
