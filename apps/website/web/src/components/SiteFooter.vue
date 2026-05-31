<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { tikoApps } from '../content/appUniverse'
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__inner container">
      <div class="site-footer__top">
        <div class="site-footer__brand-col">
          <RouterLink class="site-footer__brand" to="/" aria-label="TikoTalks home">
            <span class="site-footer__brand-mark" aria-hidden="true">T</span>
            <span class="site-footer__brand-text">TikoTalks</span>
          </RouterLink>
          <p class="site-footer__tagline">Small tools for big moments.<br />No passwords. No account ceremony.</p>
        </div>

        <nav class="site-footer__col" aria-label="Apps">
          <p class="site-footer__col-label">Apps</p>
          <RouterLink
            v-for="app in tikoApps"
            :key="app.id"
            :to="app.path"
            class="site-footer__link"
          >
            {{ app.name }}
            <span v-if="app.status === 'available'" class="site-footer__available">●</span>
          </RouterLink>
        </nav>

        <nav class="site-footer__col" aria-label="Platform">
          <p class="site-footer__col-label">Platform</p>
          <RouterLink to="/how-it-works" class="site-footer__link">How it works</RouterLink>
          <RouterLink to="/docs" class="site-footer__link">Documentation</RouterLink>
          <RouterLink to="/docs/architecture" class="site-footer__link">Architecture</RouterLink>
          <RouterLink to="/docs/apis" class="site-footer__link">API contracts</RouterLink>
        </nav>

        <nav class="site-footer__col" aria-label="For caregivers">
          <p class="site-footer__col-label">Caregivers</p>
          <RouterLink to="/caregivers" class="site-footer__link">Trust principles</RouterLink>
          <RouterLink to="/faq" class="site-footer__link">FAQ</RouterLink>
          <RouterLink to="/docs/philosophy" class="site-footer__link">Philosophy</RouterLink>
        </nav>
      </div>

      <div class="site-footer__bottom">
        <p class="site-footer__copy">© 2026 TikoTalks. Not a medical or diagnostic product.</p>
        <p class="site-footer__note">Tiko does not make therapy or outcome claims.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
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
    font-weight: 600;
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
