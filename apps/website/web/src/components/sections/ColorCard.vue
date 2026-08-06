<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'

/**
 * Full-colour, borderless card with auto readable text. Pass `tone` (a Tiko
 * colour name) for background + text, or explicit `color`/`textColor`. Optional
 * image/icon visual, title, body, badge, and link (`to` for router, `href` for
 * external). Extra content via the default slot.
 */
const props = withDefaults(defineProps<{
  tone?: string
  color?: string
  textColor?: string
  title?: string
  body?: string
  eyebrow?: string
  badge?: string
  image?: string
  imageAlt?: string
  to?: string
  href?: string
}>(), {})

const bemm = useBemm('color-card', { return: 'string', includeBaseClass: true })

const style = computed(() => ({
  '--card-bg': props.color ?? (props.tone ? `var(--color-${props.tone})` : 'var(--surface-card)'),
  '--card-fg': props.textColor ?? (props.tone ? `var(--color-${props.tone}-text)` : 'var(--color-foreground)'),
}))

const tag = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'div'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :href="href"
    :class="[bemm('', { link: !!(to || href) })]"
    :style="style"
  >
    <div v-if="image || $slots.visual" :class="bemm('visual')">
      <slot name="visual">
        <img :src="image" :alt="imageAlt ?? title ?? ''" loading="eager" :class="bemm('image')" />
      </slot>
    </div>
    <div :class="bemm('content')">
      <span v-if="eyebrow" :class="bemm('eyebrow')">{{ eyebrow }}</span>
      <h3 v-if="title" :class="bemm('title')">{{ title }}</h3>
      <p v-if="body" :class="bemm('body')">{{ body }}</p>
      <slot />
      <span v-if="badge" :class="bemm('badge')">{{ badge }}</span>
    </div>
  </component>
</template>

<style lang="scss">
.color-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: clamp(1.25rem, 2.5vw, 1.75rem);
  border-radius: 24px;
  // Keeps the card's edge readable when its own colour sits close to the page
  // background — Talk's near-black in dark mode, pale tones in light mode.
  border: 1px solid var(--surface-hairline);
  background: var(--card-bg);
  color: var(--card-fg);
  box-shadow: 0 18px 40px -28px color-mix(in srgb, var(--card-bg), #000 55%);
  text-decoration: none;
  transition: transform 0.22s var(--ease-out), box-shadow 0.22s var(--ease-out);

  &--link { cursor: pointer; }
  &--link:hover {
    transform: translateY(-4px);
    box-shadow: 0 26px 50px -26px color-mix(in srgb, var(--card-bg), #000 50%);
  }

  &__visual {
    display: grid;
    place-items: center;
    aspect-ratio: 16 / 10;
    border-radius: 16px;
    overflow: hidden;
    background: color-mix(in srgb, var(--card-fg), transparent 86%);
  }

  &__image { width: 100%; height: 100%; object-fit: cover; }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__eyebrow {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.75;
  }

  &__title {
    font-family: var(--font-family-heading);
    font-size: 1.25rem;
    line-height: 1.15;
    color: inherit;
  }

  &__body { line-height: 1.55; opacity: 0.9; }

  &__badge {
    align-self: flex-start;
    margin-top: 0.5rem;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    background: color-mix(in srgb, var(--card-fg), transparent 84%);
    color: inherit;
  }
}
</style>
