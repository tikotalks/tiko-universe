<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TikoAppShell } from '@tiko/ui'
import type { TikoHeaderAction } from '@tiko/ui'
import { useAdminAuth } from './composables/useAdminAuth'

const route = useRoute()
const router = useRouter()
const { token, user, loading, error, isAuthed, verify, logout } = useAdminAuth()
const tokenInput = ref(token.value)

const actions: TikoHeaderAction[] = [
  { id: 'logout', label: 'Logout', icon: 'ui/logout' },
]

const navItems = [
  { to: '/images', label: 'Images', icon: '🖼' },
  { to: '/stories', label: 'Stories', icon: '♪' },
  { to: '/library', label: 'Library', icon: '☰' },
  { to: '/defaults', label: 'Defaults', icon: '▦' },
]

onMounted(() => {
  if (token.value) verify()
})

function onHeaderAction(id: string) {
  if (id === 'logout') {
    logout()
    tokenInput.value = ''
  }
}

async function unlock() {
  await verify(tokenInput.value)
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
          <h1>Admin dashboard</h1>
          <p>Only the configured Tiko admin account can unlock this dashboard.</p>
          <label class="admin-login__field">
            <span>Session token</span>
            <textarea
              v-model="tokenInput"
              placeholder="Paste Tiko identity bearer token…"
              rows="4"
            />
          </label>
          <p v-if="error" class="admin-login__error">{{ error }}</p>
          <button class="admin-login__button" :disabled="loading" @click="unlock">
            {{ loading ? 'Checking…' : 'Unlock dashboard' }}
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
    width: min(28rem, 100%);
    padding: 1.25rem;
    border: 1px solid var(--tiko-admin-border);
    border-radius: 1rem;
    background: var(--tiko-admin-card);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: 1rem;
    font-size: 0.85rem;
  }

  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--tiko-admin-border);
    border-radius: 0.75rem;
    padding: 0.75rem;
    background: var(--color-background);
    color: var(--color-foreground);
    resize: vertical;
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
