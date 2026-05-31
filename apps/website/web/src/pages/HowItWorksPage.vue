<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { platformNotes } from '../siteContent'
</script>

<template>
  <div class="how-page">
    <header class="how-page__hero section">
      <div class="container">
        <p class="eyebrow">How Tiko works</p>
        <h1 class="display-1 how-page__heading">Open first.<br />Setup stays in the background.</h1>
        <p class="body-lg how-page__lede">
          Tiko starts device-first. Apps open and work immediately.
          Caregiver recovery can come later through email magic links — never before the child gets to use the tool.
        </p>
      </div>
    </header>

    <section class="section section--flush-top">
      <div class="container">
        <div class="how-page__platforms">
          <article v-for="item in platformNotes" :key="item.label" class="how-platform-card card">
            <div class="how-platform-card__label-wrap">
              <strong class="how-platform-card__label">{{ item.label }}</strong>
            </div>
            <p class="body-sm">{{ item.copy }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section how-page__flow">
      <div class="container">
        <p class="eyebrow">The experience</p>
        <h2 class="display-2 how-page__flow-heading">Three moments, no friction.</h2>
        <div class="how-steps">
          <div v-for="(step, i) in steps" :key="step.title" class="how-step">
            <div class="how-step__num">{{ i + 1 }}</div>
            <div class="how-step__body">
              <h3 class="how-step__title">{{ step.title }}</h3>
              <p class="body-sm">{{ step.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section how-page__identity">
      <div class="container">
        <div class="how-identity__layout">
          <div class="how-identity__copy">
            <p class="eyebrow">Device-first identity</p>
            <h2 class="display-2">No passwords, ever.</h2>
            <p class="body-lg">
              Every Tiko app creates a device session the first time it opens.
              No email, no password, no account required.
              If a caregiver later wants to recover settings across devices,
              they add an email and verify with a magic link — never the child.
            </p>
          </div>
          <div class="how-identity__props card card--raised">
            <div v-for="prop in identityProps" :key="prop.label" class="how-identity__prop">
              <span class="how-identity__prop-dot" />
              <div>
                <strong class="how-identity__prop-label">{{ prop.label }}</strong>
                <p class="body-sm">{{ prop.body }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section how-page__cta">
      <div class="container">
        <div class="how-cta">
          <p class="eyebrow">Architecture docs</p>
          <h2 class="display-3">Want the technical details?</h2>
          <p class="body-lg">Read the architecture and API documentation for how workers, storage, and clients fit together.</p>
          <div class="how-cta__links">
            <RouterLink to="/docs/architecture" class="how-cta__link how-cta__link--primary">Architecture docs →</RouterLink>
            <RouterLink to="/docs/apis" class="how-cta__link">API contracts →</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
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
</script>

<style scoped lang="scss">
.how-page {
  &__hero {
    background: var(--surface-subtle);
    border-bottom: 1px solid var(--border);
  }

  &__heading {
    max-width: 14ch;
    margin-bottom: var(--sp-6);
  }

  &__lede {
    max-width: 52ch;
  }

  &__platforms {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--sp-4);
    padding-top: var(--sp-12);
  }

  &__flow-heading {
    max-width: 16ch;
    margin-bottom: var(--sp-10);
    margin-top: var(--sp-2);
  }
}

.how-platform-card {
  padding: var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);

  &__label-wrap {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  &__label {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text-primary);
  }
}

.how-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--sp-4);
}

.how-step {
  display: flex;
  gap: var(--sp-5);
  padding: var(--sp-6);
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow-sm);

  &__num {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--text-primary);
    color: white;
    display: grid;
    place-items: center;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 0.9rem;
  }

  &__title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: var(--sp-2);
  }
}

.how-identity {
  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: start;
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: var(--sp-6);
  }

  &__props {
    padding: var(--sp-6);
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
  }

  &__prop {
    display: flex;
    gap: var(--sp-4);
    align-items: flex-start;
  }

  &__prop-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f6c85f;
    margin-top: 6px;
  }

  &__prop-label {
    display: block;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text-primary);
    margin-bottom: var(--sp-1);
  }
}

.how-page__identity {
  background: var(--surface-subtle);
  border-block: 1px solid var(--border);
}

.how-cta {
  max-width: 56ch;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);

  &__links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-4);
    margin-top: var(--sp-2);
  }

  &__link {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-secondary);
    text-decoration: none;

    &:hover { color: var(--text-primary); }

    &--primary {
      color: var(--text-primary);
    }
  }
}

@media (max-width: 768px) {
  .how-identity__layout {
    grid-template-columns: 1fr;
  }
}
</style>
