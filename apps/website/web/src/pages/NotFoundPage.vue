<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { tikoApps } from '../content/appUniverse'
import PageSection from '../components/sections/PageSection.vue'
import AppCardGrid from '../components/sections/AppCardGrid.vue'

const availableApps = tikoApps.filter((app) => app.status === 'available')
</script>

<template>
  <div class="not-found">
    <PageSection width="narrow">
      <p class="eyebrow">Page not found</p>
      <h1 class="display-2 not-found__title">That page isn't here.</h1>
      <p class="body-lg not-found__lede">
        The link may be old, or the page may have moved. Every Tiko app is one tap away below.
      </p>
      <div class="not-found__actions">
        <RouterLink class="btn btn--primary" to="/apps">Explore the apps</RouterLink>
        <RouterLink class="btn btn--ghost" to="/">Back to the homepage</RouterLink>
      </div>
    </PageSection>

    <PageSection eyebrow="Open now" title="Apps you can use today.">
      <AppCardGrid :apps="availableApps" />
    </PageSection>
  </div>
</template>

<style lang="scss">
.not-found {
  &__title { margin-block: 0.5rem 0.75rem; }

  &__lede { margin-inline: auto; }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1.75rem;
  }
}
</style>
