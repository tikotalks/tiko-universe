<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'
import { TikoLogo } from '@tiko/ui'
import { tikoApps } from '../content/appUniverse'

const bemm = useBemm('site-footer', { return: 'string', includeBaseClass: true })
</script>

<template>
  <footer :class="bemm('')">
    <div :class="[bemm('inner'), 'container']">
      <div :class="bemm('top')">
        <div :class="bemm('brand-col')">
          <RouterLink :class="bemm('brand')" to="/" aria-label="TikoTalks home">
            <TikoLogo />
          </RouterLink>
          <p :class="bemm('tagline')">Tiny apps. Every language. No ads. Ever.</p>
        </div>

        <nav :class="bemm('col')" aria-label="Apps">
          <p :class="bemm('col-label')">Apps</p>
          <RouterLink
            v-for="app in tikoApps"
            :key="app.id"
            :to="app.path"
            :class="bemm('link')"
          >
            {{ app.name }}
            <span v-if="app.status === 'available'" :class="bemm('available')">●</span>
          </RouterLink>
        </nav>

        <nav :class="bemm('col')" aria-label="Platform">
          <p :class="bemm('col-label')">Platform</p>
          <RouterLink to="/why-tiko" :class="bemm('link')">Why Tiko</RouterLink>
          <RouterLink to="/how-it-works" :class="bemm('link')">How it works</RouterLink>
          <RouterLink to="/docs" :class="bemm('link')">Documentation</RouterLink>
          <RouterLink to="/docs/architecture" :class="bemm('link')">Architecture</RouterLink>
          <RouterLink to="/docs/apis" :class="bemm('link')">API contracts</RouterLink>
        </nav>

        <nav :class="bemm('col')" aria-label="For caregivers">
          <p :class="bemm('col-label')">Caregivers</p>
          <RouterLink to="/educators" :class="bemm('link')">For educators</RouterLink>
          <RouterLink to="/caregivers" :class="bemm('link')">Trust principles</RouterLink>
          <RouterLink to="/faq" :class="bemm('link')">FAQ</RouterLink>
          <RouterLink to="/docs/philosophy" :class="bemm('link')">Philosophy</RouterLink>
        </nav>
      </div>

      <div :class="bemm('bottom')">
        <p :class="bemm('copy')">© 2026 TikoTalks</p>
      </div>
    </div>
  </footer>
</template>

<style lang="scss">
.site-footer {
  background: #111111;
  color: rgba(255,255,255,0.7);
  padding-top: clamp(calc(var(--space) * 3), 8vw, calc(var(--space) * 5));
  padding-bottom: var(--space-l);
  margin-top: clamp(calc(var(--space) * 3), 10vw, calc(var(--space) * 6));

  &__inner {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 3);
  }

  &__top {
    display: grid;
    grid-template-columns: 1.5fr repeat(3, 1fr);
    gap: clamp(calc(var(--space) * 1.5), 4vw, calc(var(--space) * 2.5));
  }

  &__brand {
    display: block;
    text-decoration: none;
    margin-bottom: var(--space);
    font-size: 48px;
    color: white;
    opacity: 0.85;
    letter-spacing: 0;
    transition: opacity 0.15s;

    &:hover {
      opacity: 1;
    }
  }

  &__tagline {
    font-size: 0.875rem;
    line-height: 1.65;
    color: rgba(255,255,255,0.5);
    max-width: 24ch;
  }

  &__col-label {
    font-family: var(--font-family);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    margin-bottom: var(--space);
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__link {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    font-size: 0.9rem;
    color: rgba(255,255,255,0.6);
    text-decoration: none;
    transition: color 0.15s;

    &:hover {
      color: white;
    }
  }

  &__available {
    font-size: 0.55rem;
    color: #6ee7b7;
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-s);
    padding-top: calc(var(--space) * 1.5);
  }

  &__copy,
  &__note {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.35);
  }
}

@media (max-width: 768px) {
  .site-footer {
    &__top {
      grid-template-columns: 1fr 1fr;
    }

    &__brand-col {
      grid-column: 1 / -1;
    }
  }
}

@media (max-width: 480px) {
  .site-footer {
    &__top {
      grid-template-columns: 1fr;
    }
  }
}
</style>
