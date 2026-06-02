<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBemm } from 'bemm'
import { Button, Icon, InputText } from '@sil/ui'
import { useAdminAuth } from './composables/useAdminAuth'

const shell = useBemm('admin-shell', { return: 'string', includeBaseClass: true })
const login = useBemm('admin-login', { return: 'string', includeBaseClass: true })

const route = useRoute()
const router = useRouter()
const { token, user, loading, error, loginMessage, isAuthed, verify, warmDeviceSession, requestMagicLink, verifyMagicLink, logout } = useAdminAuth()
const emailInput = ref('')
const codeInput = ref('')
const codeSent = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

const navItems = [
  { to: '/', label: 'Home', icon: 'ui/dashboard' },
  { to: '/images', label: 'Images', icon: 'ui/image' },
  { to: '/stories', label: 'Stories', icon: 'ui/music-note-single' },
  { to: '/library', label: 'Library', icon: 'ui/folder' },
  { to: '/defaults', label: 'Defaults', icon: 'ui/board-multi-dashboard' },
  { to: '/support', label: 'Support', icon: 'ui/at-sign' },
]

function onDocumentClick(event: MouseEvent) {
  if (!userMenuOpen.value) return
  const target = event.target as Node
  if (userMenuRef.value && !userMenuRef.value.contains(target)) {
    userMenuOpen.value = false
  }
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && userMenuOpen.value) {
    userMenuOpen.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)

  const urlToken = route.query.token as string | undefined
  if (urlToken) {
    await verifyMagicLink(urlToken)
    await router.replace({ query: {} })
    return
  }
  if (token.value) {
    await verify(undefined, { silent: true })
    if (!isAuthed.value) logout()
  }
  if (!isAuthed.value) {
    warmDeviceSession()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})

async function sendMagicLink() {
  if (!emailInput.value.trim()) return
  codeSent.value = true
  const ok = await requestMagicLink(emailInput.value)
  if (!ok) codeSent.value = false
}

async function verifyCode() {
  await verifyMagicLink(codeInput.value)
}

function resetLogin() {
  codeSent.value = false
  codeInput.value = ''
}

function handleLogout() {
  userMenuOpen.value = false
  logout()
  emailInput.value = ''
  codeInput.value = ''
  codeSent.value = false
  router.push('/')
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

function navigateTo(path: string) {
  userMenuOpen.value = false
  router.push(path)
}
</script>

<template>
  <section v-if="!isAuthed" :class="login('')">
    <div :class="login('card')">
      <h1 :class="login('title')">Tiko Admin</h1>
      <p :class="login('subtitle')">Sign in to manage content.</p>

      <template v-if="!codeSent">
        <InputText
          v-model="emailInput"
          :class="login('field')"
          label="Email"
          type="email"
          auto-complete="email"
          placeholder="you@example.com"
        />
        <p v-if="error" :class="login('error')">{{ error }}</p>
        <Button :class="login('submit')" :loading="loading" :disabled="loading" block @click="sendMagicLink">
          {{ loading ? 'Sending…' : 'Send sign-in code' }}
        </Button>
      </template>

      <template v-else>
        <p :class="login('message')">{{ loginMessage || 'Check your email for the sign-in code.' }}</p>
        <InputText
          v-model="codeInput"
          :class="[login('field'), login('otp')]"
          label="6-digit code"
          type="text"
          inputmode="numeric"
          auto-complete="one-time-code"
          placeholder="123 456"
          :maxlength="7"
        />
        <p v-if="error" :class="login('error')">{{ error }}</p>
        <Button
          :class="login('submit')"
          :loading="loading"
          :disabled="loading || codeInput.replace(/\s/g, '').length !== 6"
          block
          @click="verifyCode"
        >
          {{ loading ? 'Checking…' : 'Verify and sign in' }}
        </Button>
        <button type="button" :class="login('back')" @click="resetLogin">
          Use a different email
        </button>
      </template>
    </div>
  </section>

  <div v-else :class="shell('')">
    <aside :class="shell('sidebar')">
      <div :class="shell('brand')">
        <div :class="shell('brand-mark')">T</div>
        <div :class="shell('brand-text')">
          <span :class="shell('brand-name')">Tiko</span>
          <span :class="shell('brand-label')">Admin</span>
        </div>
      </div>

      <nav :class="shell('nav')">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="shell('nav-item', { active: route.path === item.to })"
        >
          <Icon :name="item.icon" size="small" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div ref="userMenuRef" :class="shell('user-wrapper')">
        <button
          type="button"
          :class="shell('user', { open: userMenuOpen })"
          :aria-expanded="userMenuOpen"
          aria-haspopup="menu"
          @click="toggleUserMenu"
        >
          <div :class="shell('user-avatar')">{{ (user?.email || '?').charAt(0).toUpperCase() }}</div>
          <div :class="shell('user-meta')">
            <span :class="shell('user-name')">{{ user?.email }}</span>
            <span :class="shell('user-role')">admin</span>
          </div>
          <span :class="shell('user-chevron')" aria-hidden="true">⋯</span>
        </button>

        <div v-if="userMenuOpen" :class="shell('user-menu')" role="menu">
          <button type="button" :class="shell('user-menu-item')" role="menuitem" @click="navigateTo('/profile')">
            <Icon name="ui/user" size="small" />
            <span>Profile</span>
          </button>
          <button type="button" :class="shell('user-menu-item')" role="menuitem" @click="navigateTo('/settings')">
            <Icon name="ui/cog" size="small" />
            <span>Settings</span>
          </button>
          <div :class="shell('user-menu-divider')" aria-hidden="true"></div>
          <button
            type="button"
            :class="[shell('user-menu-item'), shell('user-menu-item', 'danger')]"
            role="menuitem"
            @click="handleLogout"
          >
            <Icon name="ui/logout" size="small" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>

    <main :class="shell('main')">
      <router-view />
    </main>
  </div>
</template>

<style lang="scss">
@use './styles/_tokens.scss';

html, body {
  background: var(--admin-page-bg);
  color: var(--admin-text);
  margin: 0;
  min-height: 100dvh;
}

#app {
  min-height: 100dvh;
}

.admin-shell {
  display: flex;
  min-height: 100dvh;
  width: 100%;
  background: var(--admin-page-bg);
  color: var(--admin-text);

  &__sidebar {
    width: 240px;
    flex-shrink: 0;
    background: var(--admin-sidebar-bg);
    border-right: 1px solid var(--admin-border);
    display: flex;
    flex-direction: column;
    padding: 1rem 0.75rem;
    position: sticky;
    top: 0;
    height: 100dvh;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.5rem 1rem;
    border-bottom: 1px solid var(--admin-border);
    margin-bottom: 0.75rem;
  }

  &__brand-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, #8b5cf6, #a855f7);
    display: grid;
    place-items: center;
    color: white;
    font-weight: 800;
    font-size: 0.85rem;
  }

  &__brand-text {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  &__brand-name {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--admin-text);
  }

  &__brand-label {
    font-size: 0.7rem;
    color: var(--admin-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    overflow-y: auto;
  }

  &__nav-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.625rem;
    border-radius: 8px;
    color: var(--admin-text-muted);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.12s ease, color 0.12s ease;

    &:hover {
      background: var(--admin-nav-hover);
      color: var(--admin-text);
    }

    &--active {
      background: var(--admin-nav-active);
      color: var(--admin-text);
    }

    .icon, svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  }

  &__user-wrapper {
    position: relative;
    margin-top: 0.5rem;
    border-top: 1px solid var(--admin-border);
    padding-top: 0.75rem;
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.5rem;
    border-radius: 8px;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;

    &:hover,
    &--open {
      background: var(--admin-nav-hover);
    }
  }

  &__user-avatar {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: linear-gradient(135deg, #8b5cf6, #a855f7);
    display: grid;
    place-items: center;
    color: white;
    font-weight: 700;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  &__user-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  &__user-name {
    color: var(--admin-text);
    font-size: 0.8rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__user-role {
    color: var(--admin-text-muted);
    font-size: 0.7rem;
    text-transform: lowercase;
  }

  &__user-chevron {
    color: var(--admin-text-muted);
    font-size: 1rem;
    line-height: 1;
    padding: 0 0.25rem;
  }

  &__user-menu {
    position: absolute;
    left: 0.25rem;
    right: 0.25rem;
    bottom: calc(100% + 0.25rem);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border-strong);
    border-radius: 10px;
    padding: 0.25rem;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  &__user-menu-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.5rem 0.625rem;
    border: 0;
    background: transparent;
    color: var(--admin-text);
    font-size: 0.85rem;
    font-weight: 500;
    text-align: left;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.12s ease;

    &:hover {
      background: var(--admin-nav-hover);
    }

    &--danger {
      color: #f87171;

      &:hover {
        background: rgba(239, 68, 68, 0.12);
      }
    }
  }

  &__user-menu-divider {
    height: 1px;
    background: var(--admin-border);
    margin: 0.25rem 0;
  }

  &__main {
    flex: 1;
    min-width: 0;
    background: var(--admin-page-bg);
    overflow-x: hidden;
  }

  @media (max-width: 760px) {
    flex-direction: column;

    &__sidebar {
      width: 100%;
      height: auto;
      position: static;
      flex-direction: row;
      padding: 0.5rem;
      gap: 0.5rem;
      align-items: center;
      border-right: 0;
      border-bottom: 1px solid var(--admin-border);
    }

    &__brand {
      border: 0;
      margin: 0;
      padding: 0.25rem 0.5rem;
    }

    &__nav {
      flex-direction: row;
      flex: 1;
      overflow-x: auto;
    }

    &__user-wrapper {
      border: 0;
      padding: 0;
      margin: 0;
    }

    &__user-meta {
      display: none;
    }

    &__user-menu {
      bottom: auto;
      top: calc(100% + 0.5rem);
      left: auto;
      right: 0.5rem;
      width: 200px;
    }
  }
}

.admin-login {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: var(--admin-page-bg);

  &__card {
    width: min(26rem, 100%);
    padding: 2.5rem 2rem;
    background: var(--admin-sidebar-bg);
    border: 1px solid var(--admin-border);
    border-radius: 16px;
  }

  &__title {
    margin: 0 0 0.25rem;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--admin-text);
  }

  &__subtitle {
    margin: 0 0 1.5rem;
    color: var(--admin-text-muted);
    font-size: 0.9rem;
  }

  &__field {
    margin-top: 0.75rem;
  }

  &__message {
    margin: 0 0 0.5rem;
    color: var(--color-success);
    font-size: 0.85rem;
    font-weight: 600;
  }

  &__error {
    margin: 0.5rem 0 0;
    color: var(--color-error);
    font-size: 0.85rem;
  }

  &__otp input {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-align: center;
    font-family: monospace;
  }

  &__submit {
    margin-top: 1rem;
    width: 100%;
  }

  &__back {
    display: block;
    margin: 0.75rem auto 0;
    border: 0;
    background: none;
    color: var(--admin-text-muted);
    font-size: 0.85rem;
    cursor: pointer;

    &:hover {
      color: var(--admin-text);
      text-decoration: underline;
    }
  }
}
</style>
