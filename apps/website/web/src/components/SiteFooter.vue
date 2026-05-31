<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'
import { tikoApps } from '../content/appUniverse'

const bemm = useBemm('site-footer', { return: 'string', includeBaseClass: true })
</script>

<template>
  <footer :class="bemm('')">
    <div :class="[bemm('inner'), 'container']">
      <div :class="bemm('top')">
        <div :class="bemm('brand-col')">
          <RouterLink :class="bemm('brand')" to="/" aria-label="TikoTalks home">
            <span :class="bemm('brand-mark')" aria-hidden="true">T</span>
            <span :class="bemm('brand-text')">TikoTalks</span>
          </RouterLink>
          <p :class="bemm('tagline')">Small tools for big moments.<br />No passwords. No account ceremony.</p>
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
          <RouterLink to="/how-it-works" :class="bemm('link')">How it works</RouterLink>
          <RouterLink to="/docs" :class="bemm('link')">Documentation</RouterLink>
          <RouterLink to="/docs/architecture" :class="bemm('link')">Architecture</RouterLink>
          <RouterLink to="/docs/apis" :class="bemm('link')">API contracts</RouterLink>
        </nav>

        <nav :class="bemm('col')" aria-label="For caregivers">
          <p :class="bemm('col-label')">Caregivers</p>
          <RouterLink to="/caregivers" :class="bemm('link')">Trust principles</RouterLink>
          <RouterLink to="/faq" :class="bemm('link')">FAQ</RouterLink>
          <RouterLink to="/docs/philosophy" :class="bemm('link')">Philosophy</RouterLink>
        </nav>
      </div>

      <div :class="bemm('bottom')">
        <p :class="bemm('copy')">© 2026 TikoTalks. Not a medical or diagnostic product.</p>
        <p :class="bemm('note')">Tiko does not make therapy or outcome claims.</p>
      </div>
    </div>
  </footer>
</template>

<style lang="scss">
.site-footer {
  background: var(--text-primary);
  color: rgba(255,255,255,0.7);
  padding-top: clamp(var(--sp-12), 8vw, var(--sp-20));
  padding-bottom: var(--sp-8);
  margin-top: clamp(var(--sp-12), 10vw, var(--sp-24));

  &__inner {
    display: flex;
    flex-direction: column;
    gap: var(--sp-12);
  }

  &__top {
    display: grid;
    grid-template-columns: 1.5fr repeat(3, 1fr);
    gap: clamp(var(--sp-6), 4vw, var(--sp-10));
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    margin-bottom: var(--sp-4);
  }

  &__brand-mark {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f6c85f;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 1rem;
    color: #111111;
    flex-shrink: 0;
  }

  &__brand-text {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.05rem;
    color: white;
    letter-spacing: -0.01em;
  }

  &__tagline {
    font-size: 0.875rem;
    line-height: 1.65;
    color: rgba(255,255,255,0.5);
    max-width: 24ch;
  }

  &__col-label {
    font-family: var(--font-body);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    margin-bottom: var(--sp-4);
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  &__link {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
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
    gap: var(--sp-2);
    padding-top: var(--sp-6);
    border-top: 1px solid rgba(255,255,255,0.08);
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
