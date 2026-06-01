<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'
import { tikoApps } from '../content/appUniverse'

const bemm = useBemm('apps-page', { return: 'string', includeBaseClass: true })
</script>

<template>
  <div :class="bemm('')">
    <header :class="[bemm('hero'), 'section']">
      <div class="container">
        <p class="eyebrow">The app universe</p>
        <h1 :class="['display-1', bemm('heading')]">Tiny apps.<br />One clear job each.</h1>
        <p :class="['body-lg', bemm('lede')]">
          Tiko is not one giant app. It is a set of small, focused tools that open immediately
          and do one thing well. Pick the one that fits the moment.
        </p>
      </div>
    </header>

    <section class="section section--flush-top">
      <div class="container">
        <div class="apps-grid">
          <RouterLink
            v-for="app in tikoApps"
            :key="app.id"
            :to="app.path"
            class="app-card"
            :style="{ '--app-color': app.color, '--app-color-light': app.colorLight }"
          >
            <div class="app-card__hero">
              <div class="app-card__icon-wrap" aria-hidden="true">
                <div class="app-card__icon" />
              </div>
              <h2 class="app-card__name">{{ app.name }}</h2>
            </div>
            <div class="app-card__body">
              <div class="app-card__meta">
                <span
                  class="badge"
                  :class="app.status === 'available' ? 'badge--available' : 'badge--planned'"
                >
                  {{ app.statusLabel }}
                </span>
              </div>
              <p class="app-card__headline">{{ app.headline }}</p>
              <p class="app-card__summary">{{ app.summary }}</p>
              <ul class="app-card__use-when">
                <li v-for="use in app.useWhen" :key="use" class="app-card__use-item">
                  {{ use }}
                </li>
              </ul>
            </div>
            <div class="app-card__footer">
              <span class="app-card__link">
                {{ app.status === 'available' ? 'Open app →' : 'Learn more →' }}
              </span>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="apps-note section">
      <div class="container">
        <div class="apps-note__inner">
          <p class="eyebrow">Coming soon</p>
          <h2 class="display-3">More apps are in the pipeline.</h2>
          <p class="body-lg">
            Radio, Sequence, Timer, Type, and Cards are all built around the same
            child-first contracts. Each one opens fast and does one thing only.
          </p>
          <RouterLink to="/docs/architecture" class="apps-note__link">
            Read the architecture docs →
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss">
.apps-page {
  &__hero {
    background: var(--surface-subtle);
  }

  &__heading {
    max-width: 12ch;
    margin-bottom: calc(var(--space) * 1.5);
  }

  &__lede {
    max-width: 52ch;
  }
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: calc(var(--space) * 1.5);
}

.app-card {
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border-radius: 24px;
  overflow: hidden;
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: var(--shadow-s);

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-m);

    .app-card__link {
      color: var(--app-color);
    }
  }

  &__hero {
    min-height: 120px;
    background: var(--app-color);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: calc(var(--space) * 1.25) calc(var(--space) * 1.25) var(--space);
    position: relative;
    gap: calc(var(--space) * 0.75);
  }

  &__icon-wrap {
    position: absolute;
    top: calc(var(--space) * 1.25);
    left: calc(var(--space) * 1.25);
    width: 48px;
    height: 48px;
    background: rgba(255,255,255,0.25);
    border-radius: 14px;
    display: grid;
    place-items: center;
    backdrop-filter: blur(4px);
  }

  &__icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: white;
    opacity: 0.9;
  }

  &__name {
    font-family: var(--font-family-heading);
    font-size: 1.75rem;
    font-weight: 900;
    letter-spacing: 0;
    color: white;
    line-height: 1;
    text-shadow: 0 2px 8px rgba(0,0,0,0.2);
    flex: 1;
    align-self: flex-end;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 0.75);
    padding: calc(var(--space) * 1.25);
    flex: 1;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  &__headline {
    font-family: var(--font-family-heading);
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-foreground);
    line-height: 1.3;
  }

  &__summary {
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  &__use-when {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding-top: calc(var(--space) * 0.75);
  }

  &__use-item {
    font-size: 0.8rem;
    color: var(--text-muted);
    padding-left: calc(var(--space) * 0.75);
    position: relative;
    font-weight: 600;

    &::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--app-color);
    }
  }

  &__footer {
    padding: var(--space) calc(var(--space) * 1.25);
  }

  &__link {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-secondary);
    transition: color 0.15s;
  }
}

.apps-note {
  background: var(--surface-subtle);

  &__inner {
    max-width: 56ch;
    display: flex;
    flex-direction: column;
    gap: var(--space);
  }

  &__link {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-decoration: none;

    &:hover { color: var(--color-foreground); }
  }
}

@media (max-width: 640px) {
  .apps-grid {
    grid-template-columns: 1fr;
  }
}
</style>
