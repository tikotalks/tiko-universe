<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useBemm } from 'bemm'
import { ThemeToggle } from '@sil/ui'
import { TikoLogo, normalizeTikoColorMode, useTikoColorModeEffect, type TikoColorMode } from '@tiko/ui'
import type { SiteNavLink } from './site.model'

const props = withDefaults(defineProps<{
  links?: SiteNavLink[]
  /** Where the brand mark navigates to. */
  homePath?: string
  /** Accessible name for the brand link. */
  homeLabel?: string
  /** Optional surface name rendered beside the logo, e.g. "Media". */
  wordmark?: string
}>(), {
  links: () => [],
  homePath: '/',
  homeLabel: 'TikoTalks home',
  wordmark: '',
})

const bemm = useBemm('site-header', { return: 'string', includeBaseClass: true })

const route = useRoute()
const mobileOpen = ref(false)

const STORAGE_KEY = 'color-mode'

// `index.html` sets the attribute before first paint to avoid a flash; this ref is the
// runtime source of truth from then on. `useTikoColorModeEffect` applies it to the
// document and keeps `system` following the OS preference.
const colorMode = ref<TikoColorMode>(normalizeTikoColorMode(safeStorage('get', STORAGE_KEY)))
useTikoColorModeEffect(colorMode)

watch(colorMode, (mode) => safeStorage('set', STORAGE_KEY, mode))

function isActive(link: SiteNavLink) {
  if (link.external) return false
  const [base, hash] = link.path.split('#')
  if (hash) return route.path === base && route.hash === `#${hash}`
  if (link.exact || base === '/') return route.path === base && !route.hash
  return route.path.startsWith(base)
}

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

function closeMobile() {
  mobileOpen.value = false
}

function safeStorage(op: 'get', key: string): string | null
function safeStorage(op: 'set', key: string, value: string): void
function safeStorage(
  op: 'get' | 'set',
  key: string,
  value?: string
): string | null | void {
  try {
    if (op === 'get') return localStorage.getItem(key)
    localStorage.setItem(key, value!)
  } catch {
    return op === 'get' ? null : undefined
  }
}

function cycleTheme() {
  const modes: TikoColorMode[] = ['light', 'dark', 'system']
  const idx = modes.indexOf(colorMode.value)
  colorMode.value = modes[(idx + 1) % modes.length]
}
</script>

<template>
  <header :class="bemm('')">
    <div :class="[bemm('inner'), 'container']">
      <RouterLink
        :class="bemm('brand')"
        :to="props.homePath"
        :aria-label="props.homeLabel"
        @click="closeMobile"
      >
        <TikoLogo />
        <span v-if="props.wordmark" :class="bemm('wordmark')">{{ props.wordmark }}</span>
      </RouterLink>

      <nav :class="bemm('nav', { open: mobileOpen })" aria-label="Site navigation">
        <template v-for="link in props.links" :key="link.path">
          <a
            v-if="link.external"
            :href="link.path"
            :class="bemm('nav-link')"
            @click="closeMobile"
          >
            {{ link.label }}
          </a>
          <RouterLink
            v-else
            :to="link.path"
            :class="bemm('nav-link', { active: isActive(link) })"
            :aria-current="isActive(link) ? 'page' : undefined"
            @click="closeMobile"
          >
            {{ link.label }}
          </RouterLink>
        </template>

        <!--
          Surfaces that need an extra control beside the theme toggle — the
          website's language picker — fill this rather than forking the header.
        -->
        <slot name="actions" />

        <ThemeToggle :theme="colorMode" @toggle="cycleTheme" />
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
  position: fixed;
  top: 0;
  width: calc(100% - (var(--spacing) * 2));

  border-radius: var(--border-radius-xl);
  padding: 0 var(--space);
  margin: var(--space) var(--spacing);
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
    // The header already floats on its own margin and padding, so it does not
    // want .container's page gutter on top of that.
    padding-inline: 0;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    text-decoration: none;
    flex-shrink: 0;
    font-size: 36px;
    color: var(--color-foreground);
  }

  &__wordmark {
    font-family: var(--font-family-heading);
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    line-height: 1;
    color: var(--text-secondary);
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
    transition: color 0.15s var(--ease-out), background 0.15s var(--ease-out);
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

  &__toggle {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 36px;
    height: 36px;
    padding: 6px;
    border: none;
    background: var(--color-primary);
    border-radius: 8px;
    cursor: pointer;
    flex-shrink: 0;
  }

  &__toggle-bar {
    display: block;
    width: 100%;
    height: 2px;
    // Read against the primary-coloured button, not the page.
    background: var(--color-primary-text);
    border-radius: 2px;
  }

  &__backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--color-foreground), transparent 70%);
    z-index: -1;
  }
}

@media (max-width: 1180px) {
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

    &__toggle {
      display: flex;
      grid-column: 3;
      justify-self: end;
    }
  }
}
</style>
