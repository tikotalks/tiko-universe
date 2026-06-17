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
  id?: string
}>(), {
  width: 'default',
  align: 'left',
})

const bemm = useBemm('section', { return: 'string', includeBaseClass: true })

const toneStyle = computed(() =>
  props.tone
    ? { '--section-bg': `var(--color-${props.tone})`, '--section-fg': `var(--color-${props.tone}-text)` }
    : {}
)
</script>

<template>
  <section
    :id="id"
    :class="[bemm('', { toned: !!tone, [`w-${width}`]: true, [`a-${align}`]: true })]"
    :style="toneStyle"
  >
    <div :class="bemm('inner')">
      <header v-if="eyebrow || title || intro || $slots.actions" :class="bemm('head')">
        <span v-if="eyebrow" :class="bemm('eyebrow')">{{ eyebrow }}</span>
        <h2 v-if="title" :class="bemm('title')">{{ title }}</h2>
        <p v-if="intro" :class="bemm('intro')">{{ intro }}</p>
        <div v-if="$slots.actions" :class="bemm('actions')"><slot name="actions" /></div>
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

  &--a-center &__head {
    align-items: center;
    text-align: center;
    margin-inline: auto;
  }

  &__eyebrow {
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
