<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { tikoApps } from '../content/appUniverse'
import PageSection from '../components/sections/PageSection.vue'
import AppCardGrid from '../components/sections/AppCardGrid.vue'
import MediaStream from '../components/sections/MediaStream.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'
</script>

<template>
  <div class="apps-page">
    <PageSection
      eyebrow="The app universe"
      title="Tiny apps. One clear job each."
      intro="Tiko is not one giant app. It is a set of small, focused tools that open immediately and do one thing well. Pick the one that fits the moment."
    >
      <AppCardGrid :apps="tikoApps" />
    </PageSection>

    <PageSection
      eyebrow="From the Tiko library"
      title="Thousands of clear, colourful images."
      align="center"
    >
      <MediaStream :limit="24" />
    </PageSection>

    <PageSection
      eyebrow="On the way"
      title="More tiny apps are coming."
      intro="Cards, Sequence, and Timer are built around the same child-first contracts as the apps above. Each one opens fast and does one thing only."
      align="center"
    >
      <CtaBanner
        tone="primary"
        title="Built on the same contracts."
        body="Every Tiko app follows the same child-first promises — open fast, do one thing, speak any language."
      >
        <template #actions>
          <RouterLink to="/docs/architecture" class="btn btn--light">
            Read the architecture docs
          </RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>
