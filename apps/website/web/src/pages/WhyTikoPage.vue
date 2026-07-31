<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { mediaImage } from '../content/mediaImages'
import { whyTikoPillars, whyFreePillars, trustPrinciples, sectionTones as tones } from '../siteContent'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import SplitMedia from '../components/sections/SplitMedia.vue'
import MediaStream from '../components/sections/MediaStream.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'
</script>

<template>
  <div class="why-page">
    <PageSection
      eyebrow="Why Tiko exists"
      title="Fun, simple, and in every language."
      intro="Tiko is a family of small, beautiful, free apps that help children communicate, choose, follow routines, and understand time. Every app opens in seconds, works in any language, and never asks for an account — because the first step should be using the tool, not setting it up."
    />

    <PageSection tone="dark">
      <SplitMedia :image="mediaImage('adultAndChildrenLearning')" image-alt="An adult and two children learning together" media-side="right">
        <p class="why-page__eyebrow">What Tiko is</p>
        <h2 class="why-page__split-title">One universe of tiny apps.</h2>
        <p>
          Tiko is not one big control panel. It is a universe of small, focused apps that each do one clear thing:
          Yes No for quick answers, Talk for building sentences, Type for spoken messages, Cards for visual choices,
          Sequence for routines, and Timer for making time visible. Each one is beautiful, fast, and multilingual.
        </p>
      </SplitMedia>
    </PageSection>

    <PageSection
      eyebrow="The philosophy"
      title="Why it is shaped this way."
      align="center"
    >
      <CardGrid min="220px">
        <ColorCard
          v-for="(pillar, i) in whyTikoPillars"
          :key="pillar.title"
          :tone="tones[i % tones.length]"
          :title="pillar.title"
          :body="pillar.body"
          :image="mediaImage(pillar.image)"
        />
      </CardGrid>
    </PageSection>

    <PageSection
      eyebrow="Why free?"
      title="Because access shouldn’t have a price tag."
      intro="Tiko’s core apps are free, always. Not a trial, not a teaser, not an upgrade funnel. Every child should be able to open a Tiko app right now — without a payment decision getting in the way."
    >
      <CardGrid min="220px">
        <ColorCard
          v-for="(item, i) in whyFreePillars"
          :key="item.title"
          :tone="tones[(i + 3) % tones.length]"
          :title="item.title"
          :body="item.body"
          :image="mediaImage(item.image)"
        />
      </CardGrid>
    </PageSection>

    <PageSection tone="dark">
      <SplitMedia :image="mediaImage('adultAndGirlPractising')" image-alt="An adult practising words with a child" media-side="left">
        <p class="why-page__eyebrow">No ads. Ever.</p>
        <h2 class="why-page__split-title">A child’s attention is not the business model.</h2>
        <p>
          Tiko should be safe to open beside a child without worrying about commercial content,
          sponsored prompts, tracking for ads, or anything designed to pull attention away from the moment.
        </p>
      </SplitMedia>
    </PageSection>

    <PageSection
      eyebrow="Trust boundaries"
      title="What Tiko refuses to become."
      align="center"
    >
      <MediaStream :limit="20" />
      <CardGrid min="240px">
        <ColorCard
          v-for="(principle, i) in trustPrinciples"
          :key="principle"
          :tone="tones[(i + 1) % tones.length]"
          :title="principle"
        />
      </CardGrid>
    </PageSection>

    <PageSection align="center">
      <CtaBanner
        tone="yes-no"
        title="Open Yes No now. No account."
        body="Try the first tool right away — then explore the rest of the Tiko universe."
      >
        <template #actions>
          <a class="btn btn--light" href="https://yesno.tikoapps.org" target="_blank" rel="noopener">Try Yes No free</a>
          <RouterLink class="btn btn--ghost-light" to="/apps">See all apps →</RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>

<style lang="scss">
.why-page {
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
