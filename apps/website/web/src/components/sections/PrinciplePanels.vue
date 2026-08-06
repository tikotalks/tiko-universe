<script setup lang="ts">
import { useBemm } from 'bemm'

/**
 * A short grid of solid-colour panels, each carrying a numeric marker, a
 * display heading and one paragraph.
 *
 * Unlike `ColorCard` these carry no image: the panel is the statement. Corners
 * stay generously rounded so a row of them still reads as Tiko rather than as
 * a corporate slab.
 */
export interface Principle {
  /** e.g. '01'. Omit on a lead panel that states the idea the rest answer. */
  marker?: string
  title: string
  body: string
  /** A Tiko colour name: 'primary' | 'secondary' | 'tertiary' | 'dark' | an app slug. */
  tone: string
}

withDefaults(defineProps<{ panels: Principle[]; columns?: 2 | 3 }>(), { columns: 2 })

const bemm = useBemm('principle-panels', { return: 'string', includeBaseClass: true })
</script>

<template>
  <div :class="bemm()" :style="{ '--panel-columns': columns }">
    <article
      v-for="panel in panels"
      :key="panel.title"
      :class="bemm('panel')"
      :style="{
        '--panel-bg': `var(--color-${panel.tone})`,
        '--panel-fg': `var(--color-${panel.tone}-text)`,
      }"
    >
      <p v-if="panel.marker" :class="bemm('marker')">{{ panel.marker }}</p>
      <h3 :class="bemm('title')">{{ panel.title }}</h3>
      <p :class="bemm('body')">{{ panel.body }}</p>
    </article>
  </div>
</template>

<style lang="scss">
.principle-panels {
  display: grid;
  grid-template-columns: repeat(var(--panel-columns), 1fr);
  gap: 1.25rem;

  &__panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: clamp(1.5rem, 3vw, 2.5rem);
    border-radius: 28px;
    // Talk's near-black and the pale tones both need an edge to separate from
    // the page behind them.
    border: 1px solid var(--surface-hairline);
    background: var(--panel-bg);
    color: var(--panel-fg);
    min-block-size: clamp(14rem, 22vw, 20rem);
    box-shadow: 0 20px 44px -28px color-mix(in srgb, var(--panel-bg), #000 55%);
  }

  &__marker {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    // Pushes the heading and body to the foot of the panel, so the marker sits
    // alone at the top however tall the panel grows.
    margin-block-end: auto;
    opacity: 0.7;
  }

  &__title {
    font-family: var(--font-family-heading);
    font-size: clamp(1.4rem, 2.6vw, 2.1rem);
    line-height: 1.05;
    color: inherit;
  }

  &__body {
    line-height: 1.55;
    max-width: 34ch;
    opacity: 0.9;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;

    &__panel {
      min-block-size: 0;
    }

    &__marker {
      margin-block-end: 0;
    }
  }
}
</style>
