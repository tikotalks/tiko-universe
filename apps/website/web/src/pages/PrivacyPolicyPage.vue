<script setup lang="ts">
import PageSection from '../components/sections/PageSection.vue'

// Last meaningful update to this policy. Update when the practices change.
const lastUpdated = 'June 2026'
</script>

<template>
  <div class="privacy-page">
    <PageSection
      eyebrow="Privacy policy"
      title="What we collect, and what we don't."
      intro="Tiko makes calm, accessible apps for children. Privacy isn't an afterthought — it's part of the design. This policy explains, in plain language, how the Tiko apps and tikotalks.com handle data."
      width="narrow"
    />

    <PageSection width="narrow">
      <div class="prose">
        <p class="prose__meta">Last updated: {{ lastUpdated }}</p>

        <h2>Our promise</h2>
        <ul>
          <li>Free, always. We never sell your data or a child's attention for access.</li>
          <li>No ads. Ever. There is no advertising, tracking for advertising, or third-party ad networks in the Tiko apps.</li>
          <li>No login walls. The child-facing apps open and work without an account.</li>
          <li>We collect as little as possible, and only what an app genuinely needs to work.</li>
        </ul>

        <h2>Device-first by default</h2>
        <p>
          Tiko apps are built to work on the device. Your settings, saved phrases, drafts,
          and recent content are stored locally so the apps stay fast and usable offline.
          When you use an app without signing in, that content stays on your device.
        </p>

        <h2>Optional accounts and syncing</h2>
        <p>
          Tiko uses device-based identity rather than passwords. If you choose to enable
          caregiver recovery or syncing across devices, we may store an email address so we
          can send a magic sign-in link and link your devices. This is always optional and
          always transparent — the child-facing app never begins with account setup.
        </p>

        <h2>Speech and content</h2>
        <p>
          Some apps, such as Tiko Type and Tiko Talk, can speak text aloud. To generate
          natural speech, the text you ask to be spoken may be sent to our speech service
          and processed only to return audio. We do not use this content to build advertising
          profiles, and we do not sell it.
        </p>

        <h2>What we do not do</h2>
        <ul>
          <li>We do not show ads or use advertising trackers.</li>
          <li>We do not sell or rent personal data.</li>
          <li>We do not require a child to create an account or share personal details to use an app.</li>
          <li>We do not make medical, diagnostic, or therapy-outcome claims, and we do not collect health data for such purposes.</li>
        </ul>

        <h2>Children's privacy</h2>
        <p>
          Tiko apps are designed to be safe to open beside a child. Because the apps work
          without accounts and without ads, a child can use them without sharing personal
          information. Where a caregiver chooses to set up optional recovery, that account
          information belongs to the caregiver, not the child.
        </p>

        <h2>Data retention and deletion</h2>
        <p>
          Locally stored content stays on the device until you clear it or remove the app.
          If you have created an optional account, you can ask us to delete it and any
          associated data at any time by emailing
          <a href="mailto:support@tikotalks.com">support@tikotalks.com</a>.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If we update how we handle data, we will update this page and revise the date above.
          Significant changes will be made clear.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about privacy or your data? Email
          <a href="mailto:support@tikotalks.com">support@tikotalks.com</a> and a real person
          will help.
        </p>
      </div>
    </PageSection>
  </div>
</template>

<style lang="scss">
.privacy-page {
  .prose {
    max-width: 70ch;
    line-height: 1.7;

    &__meta {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 2rem;
    }

    h2 {
      font-family: var(--font-family-heading);
      font-size: clamp(1.25rem, 2.5vw, 1.6rem);
      margin-top: 2.5rem;
      margin-bottom: 0.75rem;
    }

    p {
      margin-bottom: 1rem;
      color: var(--text-secondary);
    }

    ul {
      margin: 0 0 1rem 1.1rem;
      padding: 0;
      color: var(--text-secondary);
    }

    li {
      margin-bottom: 0.5rem;
    }

    a {
      color: var(--color-primary);
      text-decoration: underline;
    }
  }
}
</style>
