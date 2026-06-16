<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { faqs } from '../siteContent'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import SplitMedia from '../components/sections/SplitMedia.vue'
import MediaStream from '../components/sections/MediaStream.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'

// Colour rotation so adjacent cards read as distinct Tiko colours.
const tones = ['primary', 'secondary', 'tertiary', 'accent', 'warning', 'yes-no', 'cards', 'sequence']

// A small pool of Tiko Media images to give each section a real visual.
const MEDIA_API = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_MEDIA_API_URL
  ?? 'https://media.tikoapi.org/v1'
const pool = ref<string[]>([])
function poolImage(i: number): string | undefined {
  return pool.value.length ? pool.value[i % pool.value.length] : undefined
}
onMounted(async () => {
  try {
    const res = await fetch(`${MEDIA_API}/media?type=image&limit=24&page=1`)
    const body = await res.json() as { data?: Array<{ id?: string; original_url?: string }> }
    pool.value = (body.data ?? [])
      .map((m) => m.original_url || (m.id ? `${MEDIA_API}/media/${m.id}/download` : ''))
      .filter(Boolean)
  } catch { pool.value = [] }
})
</script>

<template>
  <div class="faq-page">
    <PageSection
      eyebrow="Frequently asked questions"
      title="Plain answers before setup."
    >
      <SplitMedia :image="poolImage(0)" image-alt="Tiko in everyday use" media-side="right">
        <p class="section__intro">
          Short answers to the questions caregivers, teachers, and developers ask most often.
        </p>
      </SplitMedia>
    </PageSection>

    <PageSection eyebrow="Answers" title="The questions we hear most.">
      <CardGrid min="320px">
        <ColorCard
          v-for="(item, i) in faqs"
          :key="item.question"
          :tone="tones[i % tones.length]"
          :title="item.question"
          :body="item.answer"
        />
      </CardGrid>
    </PageSection>

    <PageSection
      eyebrow="From the Tiko library"
      title="Thousands of clear, colourful images."
      align="center"
    >
      <MediaStream :limit="24" />
    </PageSection>

    <PageSection align="center">
      <CtaBanner
        tone="primary"
        title="Read the full documentation."
        body="Still have questions? The docs cover philosophy, architecture, and API contracts in detail."
      >
        <template #actions>
          <RouterLink class="button button--light" to="/docs">Go to docs</RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>
