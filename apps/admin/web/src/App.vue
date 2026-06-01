<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TikoAppShell } from '@tiko/ui'
import type { TikoHeaderAction } from '@tiko/ui'
import { useAdminAuth } from './composables/useAdminAuth'

const route = useRoute()
const router = useRouter()
const {
  user,
  loading,
  error,
  emailSent,
  isAuthed,
  adminEmail,
  requestMagicLink,
  verifyMagicLink,
  verifyStoredSession,
  logout,
} = useAdminAuth()

const actions: TikoHeaderAction[] = [
  { id: 'logout', label: 'Logout', icon: 'ui/logout' },
]

const navItems = [
  { to: '/images', label: 'Images', icon: '🖼' },
  { to: '/stories', label: 'Stories', icon: '♪' },
  { to: '/library', label: 'Library', icon: '☰' },
  { to: '/defaults', label: 'Defaults', icon: '▦' },
]

const callbackToken = computed(() => {
  const value = route.query.token
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? ''
  return ''
})

onMounted(async () => {
  if (callbackToken.value) {
    const verified = await verifyMagicLink(callbackToken.value)
    if (verified) await router.replace({ path: route.path, query: {} })
    return
  }
  await verifyStoredSession()
})

function onHeaderAction(id: string) {
  if (id === 'logout') logout()
}
</script>

<template>
  <TikoAppShell
    app-name="Media Admin"
    app-icon="ui/settings"
    app-color="admin"
    :actions="isAuthed ? actions : []"
    @header-action="onHeaderAction"
  >
    <div class="admin-app">
      <section v-if="!isAuthed" class="admin-login">
        <div class="admin-login__card">
          <p class="admin-login__eyebrow">Tiko Admin</p>
          <h1>Sign in with your email</h1>
          <p>
            This dashboard is restricted to <strong>{{ adminEmail }}</strong>.
            We’ll send a magic link — no passwords and no bearer-token pasting.
          </p>
          <p v-if="emailSent" class="admin-login__success">
            Magic link requested for {{ adminEmail }}. Open it on this device to unlock the dashboard.
          </p>
          <p v-if="error" class="admin-login__error">{{ error }}</p>
          <button class="admin-login__button" :disabled="loading" @click="requestMagicLink">
            {{ loading ? 'Sending…' : `Send magic link to ${adminEmail}` }}
          </button>
        </div>
      </section>

      <template v-else>
        <aside class="admin-app__sidebar">
          <div class="admin-app__user">{{ user?.email }}</div>
          <nav class="admin-app__nav">
            <button
              v-for="item in navItems"
              :key="item.to"
              class="admin-app__nav-item"
              :class="{ 'admin-app__nav-item--active': route.path === item.to }"
              @click="router.push(item.to)"
            >
              <span>{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </button>
          </nav>
        </aside>
        <main class="admin-app__main">
          <router-view />
        </main>
      </template>
    </div>
  </TikoAppShell>
</template>

<style lang="scss">
@use './styles/_tokens.scss';

.admin-app {
  display: flex;
  gap: 1rem;
  width: min(76rem, 100%);
  margin: 0 auto;
  padding: 1rem;

  &__sidebar {
    width: 12rem;
    flex-shrink: 0;
    background: var(--tiko-admin-sidebar);
    border: 1px solid var(--tiko-admin-border);
    border-radius: 1rem;
    padding: 0.75rem;
    position: sticky;
    top: 5rem;
    align-self: flex-start;
  }

  &__user {
    font-size: 0.8rem;
    color: var(--tiko-admin-muted);
    margin-bottom: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__nav {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  &__nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.65rem;
    border: none;
    border-radius: 0.65rem;
    background: transparent;
    color: var(--color-foreground);
    cursor: pointer;
    text-align: left;

    &:hover,
    &--active {
      background: var(--tiko-app-primary);
      color: var(--tiko-app-primary-text);
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 760px) {
    flex-direction: column;

    &__sidebar {
      width: auto;
      position: static;
    }

    &__nav {
      flex-direction: row;
      overflow-x: auto;
    }
  }
}

.admin-login {
  min-height: 60dvh;
  display: grid;
  place-items: center;
  width: 100%;

  &__card {
    width: min(30rem, 100%);
    padding: 1.25rem;
    border: 1px solid var(--tiko-admin-border);
    border-radius: 1rem;
    background: var(--tiko-admin-card);
  }

  &__eyebrow {
    margin: 0 0 0.35rem;
    color: var(--tiko-admin-muted);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__success {
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--tiko-app-primary) 12%, transparent);
    color: var(--color-foreground);
    padding: 0.75rem;
    font-size: 0.9rem;
  }

  &__error {
    color: var(--color-error);
    font-size: 0.85rem;
  }

  &__button {
    margin-top: 1rem;
    width: 100%;
    border: none;
    border-radius: 999px;
    padding: 0.75rem 1rem;
    background: var(--tiko-app-primary);
    color: var(--tiko-app-primary-text);
    font-weight: 700;
    cursor: pointer;

    &:disabled { opacity: 0.6; cursor: wait; }
  }
}
</style>
