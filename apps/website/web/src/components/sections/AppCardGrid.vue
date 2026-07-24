<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'
import { tikoApps, type TikoAppInfo } from '../../content/appUniverse'

/** Grid of Tiko app cards: whole card in the app colour, big icon, name + status. */
withDefaults(defineProps<{ apps?: TikoAppInfo[]; min?: string }>(), {
  min: '200px',
})

const bemm = useBemm('app-card-grid', { return: 'string', includeBaseClass: true })
const items = (p: { apps?: TikoAppInfo[] }) => p.apps ?? tikoApps
</script>

<template>
  <div :class="bemm()" :style="{ '--grid-min': min }">
    <RouterLink
      v-for="app in (apps ?? tikoApps)"
      :key="app.id"
      :to="app.path"
      :class="bemm('card')"
      :style="{ '--card-bg': app.color, '--card-fg': app.colorText }"
    >
      <div :class="bemm('icon-wrap')">
        <img :src="app.iconUrl" :alt="app.name" :class="bemm('icon')" loading="lazy" />
      </div>
      <div :class="bemm('label')">
        <h3 :class="bemm('name')">{{ app.name }}</h3>
        <span :class="bemm('status')">{{ app.statusLabel }}</span>
      </div>
    </RouterLink>
  </div>
</template>

<style lang="scss">
.app-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(var(--grid-min), 100%), 1fr));
  gap: 1.25rem;

  &__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: clamp(1.25rem, 2.5vw, 1.75rem);
    border-radius: 28px;
    border: none;
    background: var(--card-bg);
    color: var(--card-fg);
    text-decoration: none;
    box-shadow: 0 20px 44px -28px color-mix(in srgb, var(--card-bg), #000 55%);
    transition: transform 0.22s var(--ease-out), box-shadow 0.22s var(--ease-out);

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 30px 56px -26px color-mix(in srgb, var(--card-bg), #000 48%);
    }
  }

  // Big icon: fill most of the card, no inner coloured wrap.
  &__icon-wrap {
    width: 100%;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
  }

  &__icon {
    width: 82%;
    height: 82%;
    object-fit: contain;
    filter: drop-shadow(0 16px 24px color-mix(in srgb, var(--card-bg), #000 40%));
  }

  &__label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    text-align: center;
  }

  &__name {
    font-family: var(--font-family-heading);
    font-size: 1.2rem;
    color: inherit;
  }

  &__status {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 3px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--card-fg), transparent 84%);
    color: inherit;
  }
}
</style>
