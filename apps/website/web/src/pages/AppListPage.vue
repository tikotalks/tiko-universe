<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useApps } from '../content/useApps'
import { useCopy } from '../i18n'
import PageSection from '../components/sections/PageSection.vue'
import AppCardGrid from '../components/sections/AppCardGrid.vue'
import MediaStream from '../components/sections/MediaStream.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'

const copy = useCopy()
const apps = useApps()
const page = computed(() => copy.value.appsPage)
</script>

<template>
  <div class="apps-page">
    <PageSection
      :eyebrow="page.intro.eyebrow"
      :title="page.intro.title"
      :intro="page.intro.lede"
    >
      <AppCardGrid :apps="apps" />
    </PageSection>

    <PageSection
      :eyebrow="page.media.eyebrow"
      :title="page.media.title"
    >
      <MediaStream :limit="24" />
    </PageSection>

    <PageSection
      :eyebrow="page.onTheWay.eyebrow"
      :title="page.onTheWay.title"
      :intro="page.onTheWay.lede"
    >
      <CtaBanner
        tone="primary"
        :title="page.onTheWay.ctaTitle"
        :body="page.onTheWay.ctaBody"
      >
        <template #actions>
          <RouterLink to="/docs/architecture" class="btn btn--light">
            {{ page.onTheWay.ctaLabel }}
          </RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>
