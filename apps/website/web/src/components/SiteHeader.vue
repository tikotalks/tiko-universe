<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { ref, onMounted } from 'vue'
import { useBemm } from 'bemm'
import { ThemeToggle } from '@sil/ui'
import { TikoLogo } from '@tiko/ui'

const bemm = useBemm('site-header', { return: 'string', includeBaseClass: true })

const route = useRoute()
const mobileOpen = ref(false)

type ColorMode = 'light' | 'dark' | 'system'
const colorMode = ref<ColorMode>('system')

const navLinks = [
  { label: 'Apps', path: '/apps' },
  { label: 'Why Tiko', path: '/why-tiko' },
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

function safeStorage(op: 'get', key: string): string | null
function safeStorage(op: 'set', key: string, value: string): void
function safeStorage(op: 'get' | 'set', key: string, value?: string): string | null | void {
  try {
    if (op === 'get') return localStorage.getItem(key)
    localStorage.setItem(key, value!)
  } catch {
    return op === 'get' ? null : undefined
  }
}

function applyTheme(mode: ColorMode) {
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const effective = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
  try {
    document.documentElement.setAttribute('data-theme', effective)
    document.documentElement.setAttribute('data-color-mode', effective)
  } catch { /* ignore in test env */ }
  safeStorage('set', 'color-mode', mode)
}

function cycleTheme() {
  const modes: ColorMode[] = ['light', 'dark', 'system']
  const idx = modes.indexOf(colorMode.value)
  colorMode.value = modes[(idx + 1) % modes.length]
  applyTheme(colorMode.value)
}

onMounted(() => {
  const stored = safeStorage('get', 'color-mode') as ColorMode | null
  colorMode.value = stored || 'system'
})
</script>

<template>
  <header :class="bemm('')">
    <div :class="[bemm('inner'), 'container']">
      <RouterLink :class="bemm('brand')" to="/" aria-label="TikoTalks home" @click="closeMobile">
        <TikoLogo />
      </RouterLink>

      <nav :class="bemm('nav', { open: mobileOpen })" aria-label="Site navigation">
        <RouterLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          :class="bemm('nav-link', { active: isActive(link.path) })"
          :aria-current="isActive(link.path) ? 'page' : undefined"
          @click="closeMobile"
        >
          {{ link.label }}
        </RouterLink>

        <ThemeToggle :theme="colorMode" @toggle="cycleTheme" />

        <RouterLink
          to="/apps/yes-no"
          :class="bemm('cta')"
          @click="closeMobile"
        >
          Try Yes No
        </RouterLink>
      </nav>

      <button
        :class="bemm('toggle')"
        aria-label="Toggle menu"
        :aria-expanded="mobileOpen"
        @click="toggleMobile"
      >
        <span :class="bemm('toggle-bar')" />
        <span :class="bemm('toggle-bar')" />
        <span :class="bemm('toggle-bar')" />
      </button>
    </div>

    <div v-if="mobileOpen" :class="bemm('backdrop')" @click="closeMobile" />
  </header>
</template>

<style lang="scss">
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--header-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  &__inner {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    height: var(--header-height);
    gap: clamp(var(--space-s), 2vw, var(--space));
    min-width: 0;
  }

  &__brand {
    display: flex;
    align-items: center;
    text-decoration: none;
    flex-shrink: 0;
    font-size: 36px;
    color: var(--color-foreground);
  }

  &__nav {
    display: flex;
    align-items: center;
    gap: clamp(4px, 0.7vw, var(--space-xs));
    flex: 1 1 auto;
    justify-content: flex-end;
    min-width: 0;
    flex-wrap: nowrap;
  }

  &__nav-link {
    padding: 6px clamp(8px, 1vw, 12px);
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s, background 0.15s;
    white-space: nowrap;

    &:hover {
      color: var(--color-foreground);
      background: var(--surface-ink-wash);
    }

    &--active {
      color: var(--color-foreground);
      background: var(--surface-ink-wash);
    }
  }

  &__cta {
    padding: 8px clamp(14px, 1.5vw, 18px);
    border-radius: 999px;
    background: var(--app-yes-no);
    color: white;
    font-size: 0.875rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
    transition: opacity 0.15s;
    flex-shrink: 0;

    &:hover {
      opacity: 0.88;
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
    border-radius: 8px;
    cursor: pointer;
    flex-shrink: 0;
  }

  &__toggle-bar {
    display: block;
    width: 100%;
    height: 2px;
    background: var(--color-foreground);
    border-radius: 2px;
  }

  &__backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--color-foreground), transparent 70%);
    z-index: -1;
  }
}

@media (max-width: 1120px) {
  .site-header {
    &__nav {
      display: none;
      position: absolute;
      top: var(--header-height);
      left: 0;
      right: 0;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding: calc(var(--space) * 0.75);
      background: var(--surface-card);
      z-index: 1;
      border-radius: 0 0 20px 20px;
      box-shadow: var(--shadow-m);

      &--open {
        display: flex;
      }
    }

    &__nav-link {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 1rem;
    }

    &__cta {
      margin: calc(var(--space) * 0.75) 0 0;
      padding: 12px 16px;
      text-align: center;
      border-radius: 12px;
    }

    &__toggle {
      display: flex;
      grid-column: 3;
      justify-self: end;
    }
  }
}
</style>
