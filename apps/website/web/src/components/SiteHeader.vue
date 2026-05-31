<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { ref } from 'vue'

const route = useRoute()
const mobileOpen = ref(false)

const navLinks = [
  { label: 'Apps', path: '/apps' },
  { label: 'How it works', path: '/how-it-works' },
  { label: 'Caregivers', path: '/caregivers' },
  { label: 'Docs', path: '/docs' },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

function closeMobile() {
  mobileOpen.value = false
}
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner container">
      <RouterLink class="site-header__brand" to="/" aria-label="TikoTalks home" @click="closeMobile">
        <span class="site-header__brand-mark" aria-hidden="true">T</span>
        <span class="site-header__brand-text">TikoTalks</span>
      </RouterLink>

      <nav class="site-header__nav" aria-label="Site navigation" :class="{ 'site-header__nav--open': mobileOpen }">
        <RouterLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="site-header__nav-link"
          :class="{ 'site-header__nav-link--active': isActive(link.path) }"
          :aria-current="isActive(link.path) ? 'page' : undefined"
          @click="closeMobile"
        >
          {{ link.label }}
        </RouterLink>

        <RouterLink
          to="/apps/yes-no"
          class="site-header__cta button button--primary button--small"
          @click="closeMobile"
        >
          Try Yes No
        </RouterLink>
      </nav>

      <button
        class="site-header__toggle"
        aria-label="Toggle menu"
        :aria-expanded="mobileOpen"
        @click="toggleMobile"
      >
        <span class="site-header__toggle-bar" />
        <span class="site-header__toggle-bar" />
        <span class="site-header__toggle-bar" />
      </button>
    </div>

    <div v-if="mobileOpen" class="site-header__backdrop" @click="closeMobile" />
  </header>
</template>

<style scoped lang="scss">
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(250, 248, 244, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    gap: var(--sp-4);
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    flex-shrink: 0;
  }

  &__brand-mark {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f6c85f;
    border: 2px solid rgba(17,17,17,0.12);
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 1rem;
    color: #111111;
    box-shadow: 0 3px 0 rgba(17,17,17,0.15);
    flex-shrink: 0;
  }

  &__brand-text {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.05rem;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  &__nav {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
  }

  &__nav-link {
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s, background 0.15s;
    white-space: nowrap;

    &:hover {
      color: var(--text-primary);
      background: var(--surface-ink-wash);
    }

    &--active {
      color: var(--text-primary);
      background: rgba(17,17,17,0.06);
    }
  }

  &__cta {
    margin-left: var(--sp-2);
    padding: 8px 18px;
    border-radius: 999px;
    background: var(--text-primary);
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    transition: opacity 0.15s, transform 0.1s;

    &:hover {
      opacity: 0.85;
      transform: translateY(-1px);
    }
  }

  &__toggle {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 36px;
    height: 36px;
    padding: 6px;
    background: none;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    flex-shrink: 0;
  }

  &__toggle-bar {
    display: block;
    width: 100%;
    height: 2px;
    background: var(--text-primary);
    border-radius: 2px;
  }

  &__backdrop {
    position: fixed;
    inset: 0;
    background: rgba(17,17,17,0.3);
    z-index: -1;
  }
}

@media (max-width: 768px) {
  .site-header {
    &__nav {
      display: none;
      position: absolute;
      top: var(--header-height);
      left: 0;
      right: 0;
      flex-direction: column;
      align-items: stretch;
      gap: var(--sp-1);
      padding: var(--sp-4);
      background: var(--surface-card);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow-md);

      &--open {
        display: flex;
      }
    }

    &__nav-link {
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 1rem;
    }

    &__cta {
      margin-left: 0;
      margin-top: var(--sp-2);
      padding: 12px 16px;
      text-align: center;
      border-radius: 12px;
    }

    &__toggle {
      display: flex;
    }
  }
}
</style>
