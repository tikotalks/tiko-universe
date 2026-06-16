<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'

/** Full-colour call-to-action banner. `tone` = Tiko colour name. Buttons via `actions` slot. */
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
    <h2 :class="bemm('title')">{{ title }}</h2>
    <p v-if="body" :class="bemm('body')">{{ body }}</p>
    <div v-if="$slots.actions" :class="bemm('actions')"><slot name="actions" /></div>
  </div>
</template>

<style lang="scss">
.cta-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
  padding: clamp(2.5rem, 6vw, 4.5rem) clamp(1.5rem, 4vw, 3rem);
  border-radius: 32px;
  background: var(--cta-bg);
  color: var(--cta-fg);

  &__title {
    font-family: var(--font-family-heading);
    font-size: clamp(1.75rem, 4vw, 3rem);
    color: inherit;
  }

  &__body {
    max-width: 52ch;
    line-height: 1.6;
    opacity: 0.9;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 0.5rem;
  }
}
</style>
