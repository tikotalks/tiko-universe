<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { tikoApps } from '../../content/appUniverse'

/** Homepage hero: copy + CTAs (actions slot) beside the app icon cluster. */
withDefaults(defineProps<{ eyebrow?: string; title?: string; lede?: string; note?: string }>(), {})

const bemm = useBemm('hero', { return: 'string', includeBaseClass: true })

/**
 * The real app icons, shipped apps first.
 *
 * This replaced `MediaCanvas`, a requestAnimationFrame loop that drew a
 * drifting field of stock media tiles. It cost a full-time animation frame with
 * a per-tile canvas `shadowBlur` — expensive enough to keep the main thread
 * busy for the life of the page — and it illustrated the product with whatever
 * happened to be in the media library rather than with the apps themselves.
 */
const icons = computed(() =>
  [...tikoApps]
    .sort((a, b) => Number(b.status === 'available') - Number(a.status === 'available'))
    .slice(0, 9),
)
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
      <ul :class="bemm('visual')" aria-hidden="true">
        <li
          v-for="(app, i) in icons"
          :key="app.id"
          :class="bemm('tile')"
          :style="{ '--tile-bg': app.color, '--tile-index': i }"
        >
          <img :src="app.iconUrl" alt="" :class="bemm('tile-icon')" loading="eager" />
        </li>
      </ul>
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
    font-family: var(--font-family-heading);
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

  // A 3×3 grid of app tiles. Every other tile is offset within its own track,
  // so the cluster reads as hand-placed without any tile overlapping another.
  &__visual {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(0.6rem, 1.6vw, 1.1rem);
  }

  &__tile {
    aspect-ratio: 1;
    border-radius: 26%;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--tile-bg), transparent 82%);

    &:nth-child(even) {
      transform: translateY(clamp(0.6rem, 1.6vw, 1.25rem));
    }

    @media (prefers-reduced-motion: no-preference) {
      animation: hero-tile-in 0.5s var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)) both;
      animation-delay: calc(var(--tile-index) * 45ms);
    }
  }

  &__tile-icon {
    inline-size: 74%;
    block-size: 74%;
    object-fit: contain;
  }

  @keyframes hero-tile-in {
    from { opacity: 0; transform: translateY(0.75rem) scale(0.94); }
  }

  @media (max-width: 860px) {
    &__inner { grid-template-columns: 1fr; }
    &__visual { order: -1; max-width: 22rem; }
  }
}
</style>
