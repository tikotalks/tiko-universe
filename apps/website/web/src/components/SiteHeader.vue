<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { ref, onMounted } from 'vue'
import { useBemm } from 'bemm'
import { ThemeToggle, LanguageSwitch } from '@sil/ui'

const bemm = useBemm('site-header', { return: 'string', includeBaseClass: true })

const route = useRoute()
const mobileOpen = ref(false)

type ColorMode = 'light' | 'dark' | 'system'
const colorMode = ref<ColorMode>('system')
const currentLang = ref('en')

const navLinks = [
  { label: 'Apps', path: '/apps' },
  { label: 'How it works', path: '/how-it-works' },
  { label: 'Caregivers', path: '/caregivers' },
  { label: 'Docs', path: '/docs' },
]

const langOptions = [
  { value: 'en', label: 'English', regionCode: 'GB' },
  { value: 'de', label: 'Deutsch', regionCode: 'DE' },
  { value: 'es', label: 'Español', regionCode: 'ES' },
  { value: 'fr', label: 'Français', regionCode: 'FR' },
  { value: 'nl', label: 'Nederlands', regionCode: 'NL' },
  { value: 'pt', label: 'Português', regionCode: 'PT' },
  { value: 'ja', label: '日本語', regionCode: 'JP' },
  { value: 'zh', label: '中文', regionCode: 'CN' },
  { value: 'ko', label: '한국어', regionCode: 'KR' },
  { value: 'it', label: 'Italiano', regionCode: 'IT' },
  { value: 'ar', label: 'العربية', regionCode: 'SA' },
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
    document.documentElement.setAttribute('data-color-mode', mode)
  } catch { /* ignore in test env */ }
  safeStorage('set', 'color-mode', mode)
}

function cycleTheme() {
  const modes: ColorMode[] = ['light', 'dark', 'system']
  const idx = modes.indexOf(colorMode.value)
  colorMode.value = modes[(idx + 1) % modes.length]
  applyTheme(colorMode.value)
}

function onLangSelect(option: { value?: string; label?: string }) {
  const val = option.value
  if (!val) return
  currentLang.value = val
  try { document.documentElement.lang = val } catch { /* ignore */ }
  safeStorage('set', 'lang', val)
}

onMounted(() => {
  const stored = safeStorage('get', 'color-mode') as ColorMode | null
  colorMode.value = stored || 'system'
  currentLang.value = safeStorage('get', 'lang') || 'en'
  try { document.documentElement.lang = currentLang.value } catch { /* ignore */ }
})
</script>

<template>
  <header :class="bemm('')">
    <div :class="[bemm('inner'), 'container']">
      <RouterLink :class="bemm('brand')" to="/" aria-label="TikoTalks home" @click="closeMobile">
        <span :class="bemm('brand-mark')" aria-hidden="true">T</span>
        <span :class="bemm('brand-text')">TikoTalks</span>
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

        <div :class="bemm('controls')">
          <ThemeToggle :theme="colorMode" @toggle="cycleTheme" />
          <LanguageSwitch
            v-model="currentLang"
            :options="langOptions"
            surface="popover"
            display-mode="code"
            @select="onLangSelect"
          />
        </div>

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
    font-weight: 600;
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
      background: var(--surface-ink-wash);
    }
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    margin-left: var(--sp-2);
  }

  &__cta {
    margin-left: var(--sp-2);
    padding: 8px 18px;
    border-radius: 999px;
    background: var(--app-yes-no);
    color: white;
    font-size: 0.875rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
    transition: opacity 0.15s, transform 0.1s;

    &:hover {
      opacity: 0.88;
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

    &__controls {
      margin-left: 0;
      justify-content: flex-start;
      padding: var(--sp-2) 0;
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
