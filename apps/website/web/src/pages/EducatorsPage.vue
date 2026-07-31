<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { mediaImage, type MediaImageName } from '../content/mediaImages'
import { sectionTones as tones } from '../siteContent'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import SplitMedia from '../components/sections/SplitMedia.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'

const features = [
  {
    title: 'A child account for every child',
    body: 'A Profile Manager can create a separate account for each child — each with just a name and a simple 4-digit code. No email, no password, no setup the child has to handle.',
    image: 'adultAndChildrenLearning' as MediaImageName
  },
  {
    title: 'Control what each child sees',
    body: 'Child Mode shows only the calm, child-facing apps and hides settings, account management, recovery, and anything a child should not reach.',
    image: 'gear' as MediaImageName
  },
  {
    title: 'PIN-gated Parent Mode',
    body: 'A 4-digit PIN locks the device into Child Mode. Children cannot reach the management tools or leave Child Mode without it. Failed attempts are rate-limited and never block the child-facing app.',
    image: 'calculator' as MediaImageName
  },
  {
    title: 'Reset and manage',
    body: 'Edit a child\'s name and language, reset a forgotten 4-digit code, reset progress to start fresh, or remove a child account when it is no longer needed.',
    image: 'todoList' as MediaImageName
  },
  {
    title: 'Works across Tiko',
    body: 'A child account works across every Tiko app the child opens — Yes No, Talk, Cards, Sequence, Timer — carrying their settings and language along.',
    image: 'allDevices' as MediaImageName
  },
  {
    title: 'Free and ad-free',
    body: 'Profile Manager is part of Tiko. No ads, no tracking, no upgrade pressure, and no price tag on basic support.',
    image: 'giftBox' as MediaImageName
  },
]

const steps = [
  {
    title: 'Become a Profile Manager',
    body: 'A caregiver or educator account is promoted to Profile Manager. There is no self-service button — it is granted deliberately, so management stays with trusted adults.',
    image: 'teacher' as MediaImageName
  },
  {
    title: 'Create child accounts',
    body: 'Add a child with a name and a 4-digit code. That is the whole login — simple enough for a child to enter on their own.',
    image: 'alphabetBlocks' as MediaImageName
  },
  {
    title: 'Children open their account',
    body: 'A child enters their name and 4-digit code and lands straight in Child Mode. No email, no recovery flow, no adult screens.',
    image: 'childSayingHi' as MediaImageName
  },
  {
    title: 'Manage from Parent Mode',
    body: 'The Profile Manager returns to Parent Mode with the PIN to rename, reset a code, reset progress, or remove a child account.',
    image: 'caregiver' as MediaImageName
  },
]
</script>

<template>
  <div class="edu-page">
    <PageSection
      eyebrow="For educators &amp; caregivers"
      title="Manage many children. Keep each experience calm."
    >
      <SplitMedia :image="mediaImage('adultAndChildrenLearning')" image-alt="An educator working with two children" media-side="right">
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
          :image="mediaImage(feature.image)"
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
          :image="mediaImage(step.image)"
        />
      </CardGrid>
    </PageSection>

    <PageSection eyebrow="Why it stays safe" title="Child accounts are intentionally minimal.">
      <SplitMedia :image="mediaImage('tablet')" image-alt="A calm child-facing Tiko screen on a tablet" media-side="left">
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
          <RouterLink class="btn btn--light" to="/apps">Browse all apps</RouterLink>
          <RouterLink class="btn btn--ghost-light" to="/caregivers">Caregiver trust principles</RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>
