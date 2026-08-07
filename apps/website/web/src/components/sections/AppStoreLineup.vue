<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'
import { tikoApps } from '../../content/appUniverse'
import AppStoreButton from '../AppStoreButton.vue'

/**
 * The apps you can install from the App Store today, each with its own badge.
 *
 * Until this existed the badge appeared only on an app's own detail page, so a
 * visitor had to already know which apps had shipped on iOS in order to find
 * the download for one.
 */
const bemm = useBemm('store-lineup', { return: 'string', includeBaseClass: true })

const shipped = computed(() => tikoApps.filter((app) => app.appStoreUrl))
</script>

<template>
  <div :class="bemm()">
    <article
      v-for="app in shipped"
      :key="app.id"
      :class="bemm('item')"
      :style="{ '--card-bg': app.color, '--card-fg': app.colorText }"
    >
      <RouterLink :to="app.path" :class="bemm('link')">
        <img :src="app.iconUrl" :alt="''" :class="bemm('icon')" loading="eager" aria-hidden="true" />
        <span :class="bemm('text')">
          <span :class="bemm('name')">{{ app.name }}</span>
          <span :class="bemm('summary')">{{ app.summary }}</span>
        </span>
      </RouterLink>
      <AppStoreButton :href="app.appStoreUrl!" :label="`Download ${app.name} on the App Store`" />
    </article>
  </div>
</template>

<style lang="scss">
.store-lineup {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
  gap: 1.25rem;

  &__item {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: clamp(1.25rem, 2.5vw, 1.75rem);
    border-radius: 28px;
    border: 1px solid var(--surface-hairline);
    background: var(--card-bg);
    color: var(--card-fg);
  }

  &__link {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: inherit;
    text-decoration: none;
    // Pushes the badge to the bottom so every card's badge lines up, however
    // long the summary runs.
    margin-bottom: auto;
  }

  &__icon {
    inline-size: 4rem;
    block-size: 4rem;
    object-fit: contain;
    flex-shrink: 0;
    filter: drop-shadow(0 10px 18px color-mix(in srgb, var(--card-bg), #000 40%));
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-inline-size: 0;
  }

  &__name {
    font-family: var(--font-family-heading);
    font-size: 1.2rem;
    line-height: 1.15;
  }

  &__summary {
    font-size: 0.88rem;
    line-height: 1.45;
    opacity: 0.85;
  }
}
</style>
