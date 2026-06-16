<script setup lang="ts">
import { RouterLink } from 'vue-router'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'

// Colour rotation so adjacent cards read as distinct Tiko colours.
const tones = ['primary', 'secondary', 'tertiary', 'accent', 'warning', 'yes-no', 'cards', 'sequence']

const topics = [
  {
    title: 'Getting started',
    body: 'Every Tiko app opens straight away — no account or password needed to begin. Download the app, open it, and start using it right away.',
  },
  {
    title: 'Accounts & devices',
    body: 'Tiko uses device-based sign-in rather than passwords. If you switch or reset a device, contact us and we will help you recover access.',
  },
  {
    title: 'Voices & languages',
    body: 'Choose a voice and language that feels right for the child. Tiko apps support many languages and switch instantly from the settings screen.',
  },
  {
    title: 'Offline use',
    body: 'Tiko apps are built to keep working without a connection. Your settings and recent content stay available on the device.',
  },
  {
    title: 'Privacy & data',
    body: 'We collect as little as possible and never show ads. See the FAQ and documentation for how data is stored and handled.',
  },
  {
    title: 'Something not working?',
    body: 'If an app behaves unexpectedly, email us with the app name, your device, and a short description. We read every message.',
  },
]
</script>

<template>
  <div class="support-page">
    <PageSection
      eyebrow="Support"
      title="We're here to help."
      intro="Help with the Tiko apps for children, caregivers, and educators. Most answers are below — and a real person is one email away."
    />

    <PageSection eyebrow="Common topics" title="Quick answers to start with.">
      <CardGrid min="320px">
        <ColorCard
          v-for="(item, i) in topics"
          :key="item.title"
          :tone="tones[i % tones.length]"
          :title="item.title"
          :body="item.body"
        />
      </CardGrid>
    </PageSection>

    <PageSection eyebrow="Contact" title="Get in touch." align="center">
      <CardGrid min="320px">
        <ColorCard
          tone="primary"
          eyebrow="Email"
          title="support@tikotalks.com"
          body="Email us with the app name, your device, and what you were trying to do. We aim to reply within a couple of working days."
          href="mailto:support@tikotalks.com"
        />
        <ColorCard
          tone="secondary"
          eyebrow="FAQ"
          title="Frequently asked questions"
          body="Plain answers to the questions caregivers, teachers, and developers ask most often."
          to="/faq"
        />
        <ColorCard
          tone="tertiary"
          eyebrow="Documentation"
          title="Read the docs"
          body="Philosophy, architecture, and API contracts covered in detail."
          to="/docs"
        />
      </CardGrid>
    </PageSection>

    <PageSection align="center">
      <CtaBanner
        tone="primary"
        title="Still stuck? Send us a message."
        body="No question is too small. Tell us what's happening and we'll help you get back to communicating."
      >
        <template #actions>
          <a class="button button--light" href="mailto:support@tikotalks.com">Email support</a>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>
