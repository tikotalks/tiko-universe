<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { tikoApps } from '../content/appUniverse'
import { trustPrinciples, whyTikoPillars, whyFreePillars, platformNotes } from '../siteContent'
import HeroSection from '../components/sections/HeroSection.vue'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import AppCardGrid from '../components/sections/AppCardGrid.vue'
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
  <div class="home">
    <HeroSection
      eyebrow="Education and Communication"
      title="Tiny apps for everyday moments"
      lede="Tiko is a collection of small, beautiful education and communication apps. Each one does one clear thing, opens in seconds, and speaks any language."
      note="No ads · No account · Any language"
    >
      <template #actions>
        <RouterLink class="button button--primary" to="/tools">Explore the apps</RouterLink>
        <RouterLink class="button button--ghost" to="/why-tiko">Why Tiko</RouterLink>
      </template>
    </HeroSection>

    <PageSection
      eyebrow="Why Tiko"
      title="Small on purpose."
      intro="Each app stays focused so the moment stays calm — for the child and the adult beside them."
      align="center"
    >
      <CardGrid min="240px">
        <ColorCard
          v-for="(pillar, i) in whyTikoPillars"
          :key="pillar.title"
          :tone="tones[i % tones.length]"
          :title="pillar.title"
          :body="pillar.body"
          :image="poolImage(i)"
        />
      </CardGrid>
    </PageSection>

    <PageSection
      eyebrow="Education and Communication"
      title="One everyday moment. One tiny app."
      intro="Open the one that fits the moment."
      align="center"
    >
      <AppCardGrid :apps="tikoApps" />
    </PageSection>

    <PageSection tone="dark">
      <SplitMedia :image="poolImage(4)" image-alt="A calm Tiko moment" media-side="right">
        <p class="home__eyebrow">For caregivers</p>
        <h2 class="home__split-title">Built so the first moment isn't an account form.</h2>
        <ul class="home__trust">
          <li v-for="principle in trustPrinciples" :key="principle">{{ principle }}</li>
        </ul>
      </SplitMedia>
    </PageSection>

    <PageSection
      eyebrow="From the Tiko library"
      title="Thousands of clear, colourful images."
      align="center"
    >
      <MediaStream :limit="24" />
    </PageSection>

    <PageSection
      eyebrow="Why free"
      title="Free, and ad-free, always."
      align="center"
    >
      <CardGrid min="260px">
        <ColorCard
          v-for="(pillar, i) in whyFreePillars"
          :key="pillar.title"
          :tone="tones[(i + 3) % tones.length]"
          :title="pillar.title"
          :body="pillar.body"
          :image="poolImage(i + 6)"
        />
      </CardGrid>
    </PageSection>

    <PageSection
      eyebrow="One Tiko, many screens"
      title="Start on the web. Stay consistent everywhere."
      align="center"
    >
      <CardGrid min="240px">
        <ColorCard
          v-for="(note, i) in platformNotes"
          :key="note.label"
          :tone="tones[(i + 1) % tones.length]"
          :title="note.label"
          :body="note.copy"
          :image="poolImage(i + 10)"
        />
      </CardGrid>
    </PageSection>

    <PageSection align="center">
      <CtaBanner
        tone="primary"
        title="Ready to try?"
        body="Open a Tiko app and use it with a child right now — no account, no download, no waiting room."
      >
        <template #actions>
          <RouterLink class="button button--light" to="/tools">Explore the apps</RouterLink>
          <a class="button button--ghost-light" href="https://yesno.tikoapps.org">Open Yes No</a>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>

<style lang="scss">
.home {
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
    margin-bottom: 1.25rem;
    color: inherit;
  }

  &__trust {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;

    li {
      position: relative;
      padding-left: 1.6rem;
      line-height: 1.5;
      opacity: 0.92;
    }
    li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.55em;
      width: 0.7rem;
      height: 0.7rem;
      border-radius: 999px;
      background: currentColor;
      opacity: 0.6;
    }
  }
}
</style>
