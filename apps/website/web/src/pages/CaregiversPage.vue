<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { trustPrinciples } from '../siteContent'

const sections = [
  {
    title: 'No account before use',
    body: 'A child should be able to use a Tiko app the moment a caregiver opens it. There is no sign-up form, no password creation, and no onboarding wizard between the link and the tool.',
  },
  {
    title: 'No dark patterns',
    body: 'Tiko does not use upgrade pressure, FOMO mechanics, or guilt-based UI in any child-facing flow. Design decisions that serve the product at the expense of the user are not acceptable.',
  },
  {
    title: 'No medical claims',
    body: 'Tiko is a set of communication and support tools. It does not diagnose, treat, or promise outcomes. Caregivers and professionals decide whether a tool is appropriate for their situation.',
  },
  {
    title: 'Optional recovery only',
    body: 'Device-first sessions work without an email. If a caregiver wants to recover settings across devices, they add an email later. The child never needs to be part of that process.',
  },
]
</script>

<template>
  <div class="care-page">
    <header class="care-page__hero section">
      <div class="container">
        <p class="eyebrow">For caregivers</p>
        <h1 class="display-1 care-page__heading">Built so the first moment is not an account form.</h1>
        <p class="body-lg care-page__lede">
          You should be able to try a tool before trusting it.
          Tiko is designed so a caregiver can open an app, see whether it helps,
          and only add recovery or sync when that actually matters.
        </p>
      </div>
    </header>

    <section class="section section--flush-top">
      <div class="container">
        <div class="care-principles">
          <p class="eyebrow">Trust principles</p>
          <h2 class="display-2 care-principles__heading">Our non-negotiables.</h2>

          <ul class="care-trust-list">
            <li v-for="principle in trustPrinciples" :key="principle" class="care-trust-item">
              <span class="care-trust-item__check" aria-hidden="true">✓</span>
              <span>{{ principle }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section care-sections">
      <div class="container">
        <div class="care-sections__grid">
          <article
            v-for="section in sections"
            :key="section.title"
            class="care-section card card--raised"
          >
            <h3 class="care-section__title">{{ section.title }}</h3>
            <p class="body-sm">{{ section.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section care-page__cta">
      <div class="container">
        <div class="care-cta">
          <div>
            <p class="eyebrow">Have questions?</p>
            <h2 class="display-3">Check the FAQ for quick answers.</h2>
          </div>
          <RouterLink to="/faq" class="care-cta__link">Read the FAQ →</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.care-page {
  &__hero {
    background: var(--surface-subtle);
    border-bottom: 1px solid var(--border);
  }

  &__heading {
    max-width: 16ch;
    margin-bottom: var(--sp-6);
  }

  &__lede {
    max-width: 52ch;
  }
}

.care-principles {
  padding-top: var(--sp-12);

  &__heading {
    max-width: 16ch;
    margin-top: var(--sp-2);
    margin-bottom: var(--sp-8);
  }
}

.care-trust-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  max-width: 560px;
}

.care-trust-item {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5);
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);

  &__check {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    background: #d1fae5;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 0.7rem;
    color: #065f46;
    font-weight: 700;
  }
}

.care-sections {
  background: var(--surface-subtle);
  border-block: 1px solid var(--border);

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--sp-4);
  }
}

.care-section {
  padding: var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);

  &__title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.3;
  }
}

.care-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-6);

  &__link {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-secondary);
    text-decoration: none;
    white-space: nowrap;

    &:hover { color: var(--text-primary); }
  }
}
</style>
