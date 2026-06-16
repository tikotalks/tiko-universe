<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import SplitMedia from '../components/sections/SplitMedia.vue'
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

const features = [
  {
    title: 'A child account for every child',
    body: 'A Profile Manager can create a separate account for each child — each with just a name and a simple 4-digit code. No email, no password, no setup the child has to handle.'
  },
  {
    title: 'Control what each child sees',
    body: 'Child Mode shows only the calm, child-facing apps and hides settings, account management, recovery, and anything a child should not reach.'
  },
  {
    title: 'PIN-gated Parent Mode',
    body: 'A 4-digit PIN locks the device into Child Mode. Children cannot reach the management tools or leave Child Mode without it. Failed attempts are rate-limited and never block the child-facing app.'
  },
  {
    title: 'Reset and manage',
    body: 'Edit a child\'s name and language, reset a forgotten 4-digit code, reset progress to start fresh, or remove a child account when it is no longer needed.'
  },
  {
    title: 'Works across Tiko',
    body: 'A child account works across every Tiko app the child opens — Yes No, Talk, Cards, Sequence, Timer — carrying their settings and language along.'
  },
  {
    title: 'Free and ad-free',
    body: 'Profile Manager is part of Tiko. No ads, no tracking, no upgrade pressure, and no price tag on basic support.'
  },
]

const steps = [
  {
    title: 'Become a Profile Manager',
    body: 'A caregiver or educator account is promoted to Profile Manager. There is no self-service button — it is granted deliberately, so management stays with trusted adults.'
  },
  {
    title: 'Create child accounts',
    body: 'Add a child with a name and a 4-digit code. That is the whole login — simple enough for a child to enter on their own.'
  },
  {
    title: 'Children open their account',
    body: 'A child enters their name and 4-digit code and lands straight in Child Mode. No email, no recovery flow, no adult screens.'
  },
  {
    title: 'Manage from Parent Mode',
    body: 'The Profile Manager returns to Parent Mode with the PIN to rename, reset a code, reset progress, or remove a child account.'
  },
]
</script>

<template>
  <div class="edu-page">
    <PageSection
      eyebrow="For educators &amp; caregivers"
      title="Manage many children. Keep each experience calm."
    >
      <SplitMedia :image="poolImage(0)" image-alt="Children using Tiko" media-side="right">
        <p class="section__intro">
          Tiko Profile Manager lets a teacher or caregiver create a separate, lightweight
          account for each child — and decide exactly what each one can reach.
          Children get a simple, focused tool. Adults keep the controls safely out of view.
        </p>
      </SplitMedia>
    </PageSection>

    <PageSection
      eyebrow="What you get"
      title="Everything a Profile Manager can do."
    >
      <CardGrid min="280px">
        <ColorCard
          v-for="(feature, i) in features"
          :key="feature.title"
          :tone="tones[i % tones.length]"
          :title="feature.title"
          :body="feature.body"
          :image="poolImage(i + 1)"
        />
      </CardGrid>
    </PageSection>

    <PageSection
      eyebrow="How it works"
      title="From adult setup to a child-friendly screen."
      tone="dark"
    >
      <CardGrid min="240px">
        <ColorCard
          v-for="(step, i) in steps"
          :key="step.title"
          :tone="tones[(i + 5) % tones.length]"
          :eyebrow="`Step ${i + 1}`"
          :title="step.title"
          :body="step.body"
          :image="poolImage(i + 8)"
        />
      </CardGrid>
    </PageSection>

    <PageSection eyebrow="Why it stays safe" title="Child accounts are intentionally minimal.">
      <SplitMedia :image="poolImage(13)" image-alt="A calm child-facing Tiko screen" media-side="left">
        <p class="section__intro">
          A child account has no email, no recovery flow, and no access to settings or management tools.
          Everything the child can reach is calm and child-facing by design — and the path back to the
          controls is always gated by the adult's PIN.
        </p>
      </SplitMedia>
    </PageSection>

    <PageSection align="center">
      <CtaBanner
        tone="primary"
        title="Explore the Tiko app universe."
        body="See the apps children reach."
      >
        <template #actions>
          <RouterLink class="button button--light" to="/apps">Browse all apps</RouterLink>
          <RouterLink class="button button--ghost-light" to="/caregivers">Caregiver trust principles</RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>
