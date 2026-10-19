<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useApps } from '../content/useApps'
import { useCopy } from '../i18n'
import PageSection from '../components/sections/PageSection.vue'
import AppCardGrid from '../components/sections/AppCardGrid.vue'

const copy = useCopy()
const apps = useApps()
const page = computed(() => copy.value.notFound)
const availableApps = computed(() => apps.value.filter((app) => app.status === 'available'))
</script>

<template>
  <div class="not-found">
    <PageSection width="narrow">
      <p class="eyebrow">{{ page.eyebrow }}</p>
      <h1 class="display-2 not-found__title">{{ page.title }}</h1>
      <p class="body-lg not-found__lede">{{ page.lede }}</p>
      <div class="not-found__actions">
        <RouterLink class="btn btn--primary" to="/apps">{{ page.primaryLabel }}</RouterLink>
        <RouterLink class="btn btn--ghost" to="/">{{ page.secondaryLabel }}</RouterLink>
      </div>
    </PageSection>

    <PageSection :eyebrow="page.appsEyebrow" :title="page.appsTitle">
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
