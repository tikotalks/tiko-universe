<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'

const bemm = useBemm('edu-page', { return: 'string', includeBaseClass: true })

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
  <div :class="bemm('')">
    <header :class="[bemm('hero'), 'section']">
      <div class="container">
        <p class="eyebrow">For educators &amp; caregivers</p>
        <h1 :class="['display-1', bemm('heading')]">Manage many children. Keep each experience calm.</h1>
        <p :class="['body-lg', bemm('lede')]">
          Tiko Profile Manager lets a teacher or caregiver create a separate, lightweight
          account for each child — and decide exactly what each one can reach.
          Children get a simple, focused tool. Adults keep the controls safely out of view.
        </p>
      </div>
    </header>

    <section class="section section--flush-top">
      <div class="container">
        <div class="edu-features">
          <article
            v-for="feature in features"
            :key="feature.title"
            class="edu-feature card card--raised"
          >
            <h3 class="edu-feature__title">{{ feature.title }}</h3>
            <p class="body-sm">{{ feature.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <section :class="[bemm('steps'), 'section']">
      <div class="container">
        <p class="eyebrow">How it works</p>
        <h2 class="display-2 edu-steps__heading">From adult setup to a child-friendly screen.</h2>
        <div class="edu-steps__grid">
          <div v-for="(step, i) in steps" :key="step.title" class="edu-step">
            <div class="edu-step__num">{{ i + 1 }}</div>
            <div class="edu-step__body">
              <h3 class="edu-step__title">{{ step.title }}</h3>
              <p class="body-sm">{{ step.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section :class="[bemm('trust'), 'section']">
      <div class="container">
        <div class="edu-trust">
          <p class="eyebrow">Why it stays safe</p>
          <h2 class="display-3">Child accounts are intentionally minimal.</h2>
          <p class="body-lg">
            A child account has no email, no recovery flow, and no access to settings or management tools.
            Everything the child can reach is calm and child-facing by design — and the path back to the
            controls is always gated by the adult's PIN.
          </p>
        </div>
      </div>
    </section>

    <section :class="[bemm('cta'), 'section']">
      <div class="container">
        <div class="edu-cta">
          <div>
            <p class="eyebrow">See the apps children reach</p>
            <h2 class="display-3">Explore the Tiko app universe.</h2>
          </div>
          <div class="edu-cta__links">
            <RouterLink to="/apps" class="edu-cta__link edu-cta__link--primary">Browse all apps →</RouterLink>
            <RouterLink to="/caregivers" class="edu-cta__link">Caregiver trust principles →</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss">
.edu-page {
  &__hero {
    background: var(--surface-subtle);
  }

  &__heading {
    max-width: 16ch;
    margin-bottom: calc(var(--space) * 1.5);
  }

  &__lede {
    max-width: 56ch;
  }

  &__steps,
  &__cta {
    background: var(--surface-subtle);
  }
}

.edu-features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space);
  padding-top: calc(var(--space) * 3);
}

.edu-feature {
  padding: calc(var(--space) * 1.5);
  display: flex;
  flex-direction: column;
  gap: calc(var(--space) * 0.75);

  &__title {
    font-family: var(--font-family-heading);
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-foreground);
    line-height: 1.3;
  }
}

.edu-steps {
  &__heading {
    max-width: 18ch;
    margin-top: var(--space-s);
    margin-bottom: calc(var(--space) * 2);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space);
  }
}

.edu-step {
  display: flex;
  gap: calc(var(--space) * 1.25);
  padding: calc(var(--space) * 1.5);
  background: var(--surface-card);
  border-radius: 20px;
  box-shadow: var(--shadow-s);

  &__num {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-foreground);
    color: var(--color-background);
    display: grid;
    place-items: center;
    font-family: var(--font-family-heading);
    font-weight: 800;
    font-size: 0.9rem;
  }

  &__title {
    font-family: var(--font-family-heading);
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-foreground);
    margin-bottom: var(--space-s);
  }
}

.edu-trust {
  max-width: 60ch;
  display: flex;
  flex-direction: column;
  gap: var(--space);
}

.edu-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: calc(var(--space) * 1.5);

  &__links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space);
  }

  &__link {
    font-weight: 700;
    font-size: 1rem;
    color: var(--text-secondary);
    text-decoration: none;
    white-space: nowrap;

    &:hover { color: var(--color-foreground); }

    &--primary {
      color: var(--color-foreground);
    }
  }
}

@media (max-width: 768px) {
  .edu-cta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
