<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'
import { whyTikoPillars, whyFreePillars, trustPrinciples } from '../siteContent'

const bemm = useBemm('why-page', { return: 'string', includeBaseClass: true })
</script>

<template>
  <div :class="bemm('')">
    <header :class="[bemm('hero'), 'section']">
      <div class="container">
        <p class="eyebrow">Why Tiko exists</p>
        <h1 :class="['display-1', bemm('heading')]">Fun, simple, and in every language.</h1>
        <p :class="['body-lg', bemm('lede')]">
          Tiko is a family of small, beautiful, free apps that help children communicate, choose,
          follow routines, and understand time. Every app opens in seconds, works in any language,
          and never asks for an account — because the first step should be using the tool, not setting it up.
        </p>
      </div>
    </header>

    <section class="section section--flush-top">
      <div class="container">
        <div :class="bemm('statement')">
          <p class="eyebrow">What Tiko is</p>
          <h2 class="display-2">One universe of tiny apps.</h2>
          <p class="body-lg">
            Tiko is not one big control panel. It is a universe of small, focused apps that each do one clear thing:
            Yes No for quick answers, Type for spoken messages, Cards for visual choices, Sequence for routines,
            and Timer for making time visible. Each one is beautiful, fast, and multilingual.
          </p>
        </div>
      </div>
    </section>

    <section :class="[bemm('pillars-section'), 'section']">
      <div class="container">
        <p class="eyebrow">The philosophy</p>
        <h2 :class="['display-2', bemm('section-heading')]">Why it is shaped this way.</h2>
        <div :class="bemm('pillars')">
          <article v-for="pillar in whyTikoPillars" :key="pillar.title" :class="bemm('pillar')">
            <h3 :class="bemm('pillar-title')">{{ pillar.title }}</h3>
            <p class="body-sm">{{ pillar.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div :class="bemm('free-layout')">
          <div :class="bemm('free-copy')">
            <p class="eyebrow">Why free?</p>
            <h2 class="display-2">Because access shouldn’t have a price tag.</h2>
            <p class="body-lg">
              Tiko’s core apps are free, always. Not a trial, not a teaser, not an upgrade funnel.
              Every child should be able to open a Tiko app right now — without a payment decision getting in the way.
            </p>
          </div>
          <div :class="bemm('free-cards')">
            <article v-for="item in whyFreePillars" :key="item.title" :class="bemm('free-card')">
              <h3 :class="bemm('free-card-title')">{{ item.title }}</h3>
              <p class="body-sm">{{ item.body }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section :class="[bemm('no-ads'), 'section']">
      <div class="container">
        <div :class="bemm('no-ads-inner')">
          <p class="eyebrow">No ads. Ever.</p>
          <h2 class="display-2">A child’s attention is not the business model.</h2>
          <p class="body-lg">
            Tiko should be safe to open beside a child without worrying about commercial content,
            sponsored prompts, tracking for ads, or anything designed to pull attention away from the moment.
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div :class="bemm('trust-layout')">
          <div>
            <p class="eyebrow">Trust boundaries</p>
            <h2 class="display-2">What Tiko refuses to become.</h2>
          </div>
          <ul :class="bemm('trust-list')">
            <li v-for="principle in trustPrinciples" :key="principle" :class="bemm('trust-item')">
              <span :class="bemm('check')" aria-hidden="true">✓</span>
              <span>{{ principle }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section :class="[bemm('cta'), 'section']">
      <div class="container">
        <div :class="bemm('cta-inner')">
          <div>
            <p class="eyebrow">Try the first tool</p>
            <h2 class="display-3">Open Yes No now. No account.</h2>
          </div>
          <div :class="bemm('cta-actions')">
            <a href="https://yesno.tikoapps.org" :class="bemm('cta-btn')" target="_blank" rel="noopener">Try Yes No free</a>
            <RouterLink to="/apps" :class="bemm('cta-link')">See all apps →</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss">
.why-page {
  &__hero {
    background: var(--surface-subtle);
  }

  &__heading {
    max-width: 13ch;
    margin-bottom: calc(var(--space) * 1.5);
  }

  &__lede {
    max-width: 58ch;
  }

  &__statement {
    padding-top: calc(var(--space) * 3);
    max-width: 64ch;
    display: flex;
    flex-direction: column;
    gap: var(--space);
  }

  &__pillars-section,
  &__no-ads,
  &__cta {
    background: var(--surface-subtle);
  }

  &__section-heading {
    max-width: 12ch;
    margin-bottom: var(--space-l);
  }

  &__pillars,
  &__free-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space);
  }

  &__pillar,
  &__free-card {
    padding: calc(var(--space) * 1.25);
    border-radius: 20px;
    background: var(--surface-card);
    box-shadow: var(--shadow-s);
  }

  &__pillar-title,
  &__free-card-title {
    font-family: var(--font-family-heading);
    font-size: 1.05rem;
    font-weight: 850;
    line-height: 1.2;
    margin-bottom: calc(var(--space) * 0.75);
  }

  &__free-layout,
  &__trust-layout {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
    gap: clamp(calc(var(--space) * 2), 6vw, calc(var(--space) * 4));
    align-items: start;
  }

  &__free-copy,
  &__no-ads-inner {
    display: flex;
    flex-direction: column;
    gap: var(--space);
    max-width: 56ch;
  }

  &__no-ads-inner {
    max-width: 64ch;
  }

  &__trust-list {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 0.75);
  }

  &__trust-item {
    display: flex;
    align-items: center;
    gap: var(--space);
    padding: var(--space) calc(var(--space) * 1.25);
    background: var(--surface-card);
    border-radius: 14px;
    font-size: 0.95rem;
    font-weight: 650;
    color: var(--color-foreground);
    box-shadow: var(--shadow-s);
  }

  &__check {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-background), var(--color-primary) 18%);
    color: color-mix(in srgb, var(--color-foreground), var(--color-primary) 35%);
    font-size: 0.7rem;
    font-weight: 800;
  }

  &__cta-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(var(--space) * 1.5);
    flex-wrap: wrap;
  }

  &__cta-actions {
    display: flex;
    align-items: center;
    gap: var(--space);
    flex-wrap: wrap;
  }

  &__cta-btn {
    display: inline-flex;
    padding: 12px 24px;
    border-radius: 999px;
    background: var(--app-yes-no);
    color: white;
    font-weight: 750;
    text-decoration: none;
  }

  &__cta-link {
    color: var(--text-secondary);
    font-weight: 750;
    text-decoration: none;

    &:hover { color: var(--color-foreground); }
  }
}

@media (max-width: 760px) {
  .why-page {
    &__free-layout,
    &__trust-layout {
      grid-template-columns: 1fr;
    }
  }
}
</style>
