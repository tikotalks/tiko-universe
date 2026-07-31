<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { mediaImage } from '../content/mediaImages'
import { faqs, sectionTones as tones } from '../siteContent'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import SplitMedia from '../components/sections/SplitMedia.vue'
import MediaStream from '../components/sections/MediaStream.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'
</script>

<template>
  <div class="faq-page">
    <PageSection
      eyebrow="Frequently asked questions"
      title="Plain answers before setup."
    >
      <SplitMedia :image="mediaImage('adultAndChildWithTablet')" image-alt="An adult and child using Tiko on a tablet" media-side="right">
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
          <RouterLink class="btn btn--light" to="/docs">Go to docs</RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>
