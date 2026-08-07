<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'

/**
 * Full-colour call to action. `tone` = Tiko colour name, buttons via `actions`.
 *
 * Left-aligned and asymmetric rather than a centred slab: centred display type
 * over centred body copy over a centred button gives the eye no edge to follow,
 * and every one of them looks the same as the last.
 */
const props = withDefaults(defineProps<{ title: string; body?: string; tone?: string }>(), {
  tone: 'primary',
})

const bemm = useBemm('cta-banner', { return: 'string', includeBaseClass: true })
const style = computed(() => ({
  '--cta-bg': `var(--color-${props.tone})`,
  '--cta-fg': `var(--color-${props.tone}-text)`,
}))
</script>

<template>
  <div :class="bemm()" :style="style">
    <div :class="bemm('copy')">
      <h2 :class="bemm('title')">{{ title }}</h2>
      <p v-if="body" :class="bemm('body')">{{ body }}</p>
    </div>
    <div v-if="$slots.actions" :class="bemm('actions')"><slot name="actions" /></div>
  </div>
</template>

<style lang="scss">
.cta-banner {
  display: grid;
  grid-template-columns: 1.4fr auto;
  align-items: end;
  gap: clamp(1.5rem, 4vw, 3rem);
  padding: clamp(2rem, 5vw, 3.5rem);
  border-radius: 32px;
  background: var(--cta-bg);
  color: var(--cta-fg);

  &__copy {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
  }

  &__title {
    font-family: var(--font-family-heading);
    font-size: clamp(1.75rem, 4vw, 3rem);
    line-height: 1.02;
    letter-spacing: -0.02em;
    max-width: 18ch;
    color: inherit;
  }

  &__body {
    max-width: 46ch;
    line-height: 1.6;
    color: color-mix(in srgb, var(--cta-fg), transparent 20%);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    align-items: start;
  }
}
</style>
