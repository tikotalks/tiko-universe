<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { tikoApps } from '../content/appUniverse'
</script>

<template>
  <div class="apps-page">
    <header class="apps-page__hero section">
      <div class="container">
        <p class="eyebrow">The app universe</p>
        <h1 class="display-1 apps-page__heading">Tiny apps.<br />One clear job each.</h1>
        <p class="body-lg apps-page__lede">
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
              <span
                class="badge"
                :class="app.status === 'available' ? 'badge--available' : 'badge--planned'"
              >
                {{ app.statusLabel }}
              </span>
            </div>
            <div class="app-card__body">
              <h2 class="app-card__name">{{ app.name }}</h2>
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

<style scoped lang="scss">
.apps-page {
  &__hero {
    background: var(--surface-subtle);
    border-bottom: 1px solid var(--border);
  }

  &__heading {
    max-width: 12ch;
    margin-bottom: var(--sp-6);
  }

  &__lede {
    max-width: 52ch;
  }
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--sp-4);
}

.app-card {
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: var(--shadow-sm);

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);

    .app-card__link {
      color: var(--app-color);
    }
  }

  &__hero {
    height: 160px;
    background: color-mix(in srgb, var(--app-color-light) 80%, white);
    border-bottom: 1px solid color-mix(in srgb, var(--app-color) 15%, transparent);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sp-5);
    position: relative;
  }

  &__icon-wrap {
    width: 64px;
    height: 64px;
    background: white;
    border-radius: 18px;
    display: grid;
    place-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border: 1.5px solid rgba(0,0,0,0.06);
  }

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--app-color);
    opacity: 0.8;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-5);
    flex: 1;
  }

  &__name {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  &__summary {
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--text-secondary);
    font-weight: 500;
  }

  &__use-when {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    padding-top: var(--sp-2);
    border-top: 1px solid var(--border);
  }

  &__use-item {
    font-size: 0.8rem;
    color: var(--text-muted);
    padding-left: var(--sp-3);
    position: relative;

    &::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--app-color);
    }
  }

  &__footer {
    padding: var(--sp-4) var(--sp-5);
    border-top: 1px solid var(--border);
  }

  &__link {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    transition: color 0.15s;
  }
}

.apps-note {
  background: var(--surface-subtle);
  border-top: 1px solid var(--border);

  &__inner {
    max-width: 56ch;
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  &__link {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-decoration: none;

    &:hover { color: var(--text-primary); }
  }
}
</style>
