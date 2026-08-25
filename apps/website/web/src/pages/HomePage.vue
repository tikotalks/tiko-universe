<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { mediaImage } from '../content/mediaImages'
import { useApps } from '../content/useApps'
import { useCopy } from '../i18n'
import {
  whyFreePillarImages,
  platformNoteImages,
  sectionTones as tones,
} from '../siteContent'
import HeroSection from '../components/sections/HeroSection.vue'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import AppCardGrid from '../components/sections/AppCardGrid.vue'
import AppStoreLineup from '../components/sections/AppStoreLineup.vue'
import PrinciplePanels, { type Principle } from '../components/sections/PrinciplePanels.vue'
import SplitMedia from '../components/sections/SplitMedia.vue'
import MediaStream from '../components/sections/MediaStream.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'

const copy = useCopy()
const apps = useApps()
const home = computed(() => copy.value.home)

/** The Why-Tiko pillars as numbered colour panels. */
const whyTikoPanels = computed<Principle[]>(() =>
  home.value.whyTiko.pillars.map((pillar, i) => ({
    marker: String(i + 1).padStart(2, '0'),
    title: pillar.title,
    body: pillar.body,
    tone: tones[i % tones.length],
  })),
)
</script>

<template>
  <div class="home">
    <HeroSection
      :eyebrow="home.hero.eyebrow"
      :title="home.hero.title"
      :lede="home.hero.lede"
      :note="home.hero.note"
    >
      <template #actions>
        <RouterLink class="btn btn--primary" to="/tools">{{ home.hero.primaryLabel }}</RouterLink>
        <RouterLink class="btn btn--ghost" to="/why-tiko">{{ home.hero.secondaryLabel }}</RouterLink>
      </template>
    </HeroSection>

    <PageSection
      :eyebrow="home.whyTiko.eyebrow"
      :intro="home.whyTiko.intro"
      layout="split"
    >
      <template #title>{{ home.whyTiko.title }} <em>{{ home.whyTiko.titleAccent }}</em></template>
      <!--
        Numbered colour panels rather than image cards: the pillar artwork was
        generic stock (a light bulb, a puzzle piece, a globe) that illustrated
        nothing the copy actually says.
      -->
      <PrinciplePanels :panels="whyTikoPanels" />
    </PageSection>

    <PageSection
      :eyebrow="home.apps.eyebrow"
      :intro="home.apps.intro"
      layout="split"
    >
      <template #title>{{ home.apps.title }} <em>{{ home.apps.titleAccent }}</em></template>
      <AppCardGrid :apps="apps" />
    </PageSection>

    <PageSection
      :eyebrow="home.download.eyebrow"
      :intro="home.download.intro"
      layout="split"
      id="download"
    >
      <template #title>{{ home.download.title }} <em>{{ home.download.titleAccent }}</em></template>
      <AppStoreLineup />
    </PageSection>

    <PageSection tone="dark">
      <SplitMedia
        :image="mediaImage('adultAndChildTalking')"
        :image-alt="home.caregivers.imageAlt"
        media-side="right"
      >
        <p class="home__eyebrow">{{ home.caregivers.eyebrow }}</p>
        <h2 class="home__split-title">{{ home.caregivers.title }}</h2>
        <ul class="home__trust">
          <li v-for="principle in home.caregivers.principles" :key="principle">{{ principle }}</li>
        </ul>
      </SplitMedia>
    </PageSection>

    <PageSection
      :eyebrow="home.media.eyebrow"
      :title="home.media.title"
    >
      <MediaStream :limit="24" />
    </PageSection>

    <PageSection
      :eyebrow="home.whyFree.eyebrow"
      :title="home.whyFree.title"
    >
      <CardGrid min="260px">
        <ColorCard
          v-for="(pillar, i) in home.whyFree.pillars"
          :key="pillar.title"
          :tone="tones[(i + 3) % tones.length]"
          :title="pillar.title"
          :body="pillar.body"
          :image="mediaImage(whyFreePillarImages[i])"
        />
      </CardGrid>
    </PageSection>

    <PageSection
      :eyebrow="home.platforms.eyebrow"
      :title="home.platforms.title"
    >
      <CardGrid min="240px">
        <ColorCard
          v-for="(note, i) in home.platforms.notes"
          :key="note.label"
          :tone="tones[(i + 1) % tones.length]"
          :title="note.label"
          :body="note.body"
          :image="mediaImage(platformNoteImages[i])"
        />
      </CardGrid>
    </PageSection>

    <PageSection>
      <CtaBanner
        tone="primary"
        :title="home.cta.title"
        :body="home.cta.body"
      >
        <template #actions>
          <RouterLink class="btn btn--light" to="/tools">{{ home.cta.primaryLabel }}</RouterLink>
          <a class="btn btn--ghost-light" href="https://yesno.tikoapps.org">{{ home.cta.secondaryLabel }}</a>
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
