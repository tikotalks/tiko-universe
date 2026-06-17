<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { platformNotes } from '../siteContent'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import SplitMedia from '../components/sections/SplitMedia.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'

// Colour rotation so adjacent cards read as distinct Tiko colours.
const tones = ['primary', 'secondary', 'tertiary', 'accent', 'warning', 'yes-no', 'cards', 'sequence']

const steps = [
  {
    title: 'Open the link',
    body: 'A caregiver shares a link or bookmarks a Tiko app. No app store, no download required — just a URL.',
  },
  {
    title: 'Use it immediately',
    body: 'The app is ready with no sign-in, no tutorial, no onboarding flow. The child sees the tool straight away.',
  },
  {
    title: 'Recover later if needed',
    body: 'If the caregiver wants to keep settings across devices, they can add an email and get a magic link — no password ever.',
  },
]

const identityProps = [
  { label: 'Device session', body: 'Created automatically on first open. Stored locally, never requires login.' },
  { label: 'Magic link recovery', body: 'Optional. The caregiver adds an email and verifies it once to enable cross-device sync.' },
  { label: 'No child-facing ceremony', body: 'Recovery and admin flows are always caregiver-only. The child never sees an account form.' },
  { label: 'Bearer token auth', body: 'API sessions use bearer tokens so iOS, Android, and web all behave the same way.' },
]

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
  <div class="how-page">
    <PageSection
      eyebrow="How Tiko works"
      title="Open first. Setup stays in the background."
      intro="Tiko starts device-first. Apps open and work immediately. Caregiver recovery can come later through email magic links — never before the child gets to use the tool."
    />

    <PageSection
      eyebrow="One Tiko, many screens"
      title="The same experience, everywhere."
      align="center"
    >
      <CardGrid min="220px">
        <ColorCard
          v-for="(item, i) in platformNotes"
          :key="item.label"
          :tone="tones[(i + 1) % tones.length]"
          :title="item.label"
          :body="item.copy"
          :image="poolImage(i)"
        />
      </CardGrid>
    </PageSection>

    <PageSection
      eyebrow="The experience"
      title="Three moments, no friction."
      align="center"
    >
      <CardGrid min="250px">
        <ColorCard
          v-for="(step, i) in steps"
          :key="step.title"
          :tone="tones[(i + 4) % tones.length]"
          :eyebrow="`Step ${i + 1}`"
          :title="step.title"
          :body="step.body"
          :image="poolImage(i + 3)"
        />
      </CardGrid>
    </PageSection>

    <PageSection tone="dark">
      <SplitMedia :image="poolImage(6)" image-alt="A caregiver using Tiko device-first" media-side="right">
        <p class="how-page__eyebrow">Device-first identity</p>
        <h2 class="how-page__split-title">No passwords, ever.</h2>
        <p>
          Every Tiko app creates a device session the first time it opens.
          No email, no password, no account required.
          If a caregiver later wants to recover settings across devices,
          they add an email and verify with a magic link — never the child.
        </p>
      </SplitMedia>
    </PageSection>

    <PageSection
      eyebrow="How identity works"
      title="Caregiver-only, by design."
      align="center"
    >
      <CardGrid min="240px">
        <ColorCard
          v-for="(prop, i) in identityProps"
          :key="prop.label"
          :tone="tones[(i + 2) % tones.length]"
          :title="prop.label"
          :body="prop.body"
          :image="poolImage(i + 8)"
        />
      </CardGrid>
    </PageSection>

    <PageSection align="center">
      <CtaBanner
        tone="primary"
        title="Want the technical details?"
        body="Read the architecture and API documentation for how workers, storage, and clients fit together."
      >
        <template #actions>
          <RouterLink class="button button--light" to="/docs/architecture">Architecture docs →</RouterLink>
          <RouterLink class="button button--ghost-light" to="/docs/apis">API contracts →</RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>

<style lang="scss">
.how-page {
  &__eyebrow {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.75;
    margin-bottom: 0.5rem;
  }

  &__split-title {
    font-family: var(--font-family-heading);
    font-size: clamp(1.6rem, 3vw, 2.4rem);
    line-height: 1.1;
    margin-bottom: 1rem;
    color: inherit;
  }
}
</style>
