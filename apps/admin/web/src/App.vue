<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TikoAppShell } from '@tiko/ui'
import type { TikoHeaderAction } from '@tiko/ui'
import { useAdminAuth } from './composables/useAdminAuth'

const route = useRoute()
const router = useRouter()
const { token, user, loading, error, loginMessage, isAuthed, verify, requestMagicLink, verifyMagicLink, logout } = useAdminAuth()
const emailInput = ref('')
const codeInput = ref('')
const codeSent = ref(false)

const actions: TikoHeaderAction[] = [
  { id: 'logout', label: 'Logout', icon: 'ui/logout' },
]

const navItems = [
  { to: '/images', label: 'Images', icon: '🖼' },
  { to: '/stories', label: 'Stories', icon: '♪' },
  { to: '/library', label: 'Library', icon: '☰' },
  { to: '/defaults', label: 'Defaults', icon: '▦' },
  { to: '/support', label: 'Support', icon: '@' },
]

onMounted(async () => {
  // Check for magic link token in URL first (user clicked email link)
  const urlToken = route.query.token as string | undefined
  if (urlToken) {
    await verifyMagicLink(urlToken)
    await router.replace({ query: {} })
    return
  }
  // Silently re-verify stored token — don't show errors for stale sessions
  if (token.value) {
    await verify()
    // If verify failed, silently clear stale credentials
    if (!isAuthed.value) {
      logout()
    }
  }
})

function onHeaderAction(id: string) {
  if (id === 'logout') {
    logout()
    emailInput.value = ''
    codeInput.value = ''
    codeSent.value = false
  }
}

async function sendMagicLink() {
  const ok = await requestMagicLink(emailInput.value)
  if (ok) codeSent.value = true
}

async function verifyCode() {
  await verifyMagicLink(codeInput.value)
}

function resetLogin() {
  codeSent.value = false
  codeInput.value = ''
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

          <template v-if="!codeSent">
            <p>Enter your admin email and we'll send a sign-in code.</p>
            <label class="admin-login__field">
              <span>Email</span>
              <input
                v-model="emailInput"
                type="email"
                autocomplete="email"
                placeholder="your@email.com"
                @keyup.enter="sendMagicLink"
              />
            </label>
            <p v-if="error" class="admin-login__error">{{ error }}</p>
            <button class="admin-login__button" :disabled="loading" @click="sendMagicLink">
              {{ loading ? 'Sending…' : 'Send sign-in code' }}
            </button>
          </template>

          <template v-else>
            <p class="admin-login__message">{{ loginMessage }}</p>
            <label class="admin-login__field">
              <span>6-digit sign-in code</span>
              <input
                v-model="codeInput"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                placeholder="123 456"
                maxlength="7"
                class="admin-login__otp"
                @keyup.enter="verifyCode"
              />
            </label>
            <p v-if="error" class="admin-login__error">{{ error }}</p>
            <button class="admin-login__button" :disabled="loading || codeInput.replace(/\s/g, '').length !== 6" @click="verifyCode">
              {{ loading ? 'Checking…' : 'Verify and unlock' }}
            </button>
            <button class="admin-login__link" @click="resetLogin">
              Use a different email
            </button>
          </template>
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

  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--tiko-admin-border);
    border-radius: 0.75rem;
    padding: 0.75rem;
    background: var(--color-background);
    color: var(--color-foreground);
  }

  textarea {
    resize: vertical;
  }

  &__message {
    color: var(--color-success);
    font-size: 0.85rem;
    font-weight: 700;
  }

  &__error {
    color: var(--color-error);
    font-size: 0.85rem;
  }

  &__otp {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-align: center;
    font-family: monospace;
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

    &:disabled { opacity: 0.6; cursor: not-allowed; }
  }

  &__link {
    display: block;
    margin-top: 0.75rem;
    width: 100%;
    border: none;
    background: none;
    color: var(--tiko-app-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    text-align: center;

    &:hover { text-decoration: underline; }
  }
}
</style>
