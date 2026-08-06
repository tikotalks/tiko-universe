<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { mediaImage, type MediaImageName } from '../content/mediaImages'
import { trustPrinciples, sectionTones as tones } from '../siteContent'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import SplitMedia from '../components/sections/SplitMedia.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'

const sections = [
  {
    title: 'No account before use',
    body: 'A child should be able to use a Tiko app the moment a caregiver opens it. There is no sign-up form, no password creation, and no onboarding wizard between the link and the tool.',
    image: 'childSayingHi' as MediaImageName
  },
  {
    title: 'No dark patterns',
    body: 'Tiko does not use upgrade pressure, FOMO mechanics, or guilt-based UI in any child-facing flow. Design decisions that serve the product at the expense of the user are not acceptable.',
    image: 'balloons' as MediaImageName
  },
  {
    title: 'No medical claims',
    body: 'Tiko is a set of education and communication tools. It does not diagnose, treat, or promise outcomes. Caregivers and professionals decide whether a tool fits their situation.',
    image: 'doctor' as MediaImageName
  },
  {
    title: 'Optional recovery only',
    body: 'Device-first sessions work without an email. If a caregiver wants to recover settings across devices, they add an email later. The child never needs to be part of that process.',
    image: 'envelope' as MediaImageName
  },
]
</script>

<template>
  <div class="care-page">
    <PageSection
      eyebrow="For caregivers"
      title="Built so the first moment is not an account form."
    >
      <SplitMedia :image="mediaImage('adultAndChildTalking')" image-alt="A caregiver and child using Tiko together" media-side="right">
        <p class="section__intro">
          You should be able to try a tool before trusting it.
          Tiko is designed so a caregiver can open an app, see whether it helps,
          and only add recovery or sync when that actually matters.
        </p>
      </SplitMedia>
    </PageSection>

    <PageSection
      eyebrow="Trust principles"
      title="Our non-negotiables."
      tone="dark"
    >
      <CardGrid min="240px">
        <ColorCard
          v-for="(principle, i) in trustPrinciples"
          :key="principle"
          :tone="tones[i % tones.length]"
          :body="principle"
        />
      </CardGrid>
    </PageSection>

    <PageSection
      eyebrow="What we promise"
      title="How that shows up in the product."
    >
      <CardGrid min="280px">
        <ColorCard
          v-for="(section, i) in sections"
          :key="section.title"
          :tone="tones[(i + 4) % tones.length]"
          :title="section.title"
          :body="section.body"
          :image="mediaImage(section.image)"
        />
      </CardGrid>
    </PageSection>

    <PageSection align="center">
      <CtaBanner
        tone="primary"
        title="Check the FAQ for quick answers."
        body="Have questions? Plain answers to what caregivers ask most, before any setup."
      >
        <template #actions>
          <RouterLink class="btn btn--light" to="/faq">Read the FAQ</RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>
