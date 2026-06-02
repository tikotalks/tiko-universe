<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TikoAppShell } from '@tiko/ui'
import type { TikoHeaderAction } from '@tiko/ui'
import { Button, Card, InputText } from '@sil/ui'
import { useAdminAuth } from './composables/useAdminAuth'

const route = useRoute()
const router = useRouter()
const { token, user, loading, error, loginMessage, isAuthed, verify, warmDeviceSession, requestMagicLink, verifyMagicLink, logout } = useAdminAuth()
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
    await verify(undefined, { silent: true })
    if (isAuthed.value) {
      if (route.path === '/') router.replace('/images')
    } else {
      logout()
    }
  }
  // Pre-warm the device session so it's ready when the user clicks "Send sign-in code"
  if (!isAuthed.value) {
    warmDeviceSession()
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

</script>

<template>
  <TikoAppShell
    app-name="Dashboard"
    app-icon="food-drinks/espresso-machine"
    app-color="admin"
    :actions="isAuthed ? actions : []"
    @header-action="onHeaderAction"
  >
    <div class="admin-app">
      <section v-if="!isAuthed" class="admin-login">
        <Card class="admin-login__card" :title="'Dashboard'">

          <template v-if="!codeSent">
            <InputText
              v-model="emailInput"
              class="admin-login__field"
              label="Email"
              type="email"
              auto-complete="email"
              placeholder="your@email.com"
            />
            <p v-if="error" class="admin-login__error">{{ error }}</p>
            <Button class="admin-login__button" :loading="loading" :disabled="loading" block @click="sendMagicLink">
              {{ loading ? 'Sending…' : 'Send sign-in code' }}
            </Button>
          </template>

          <template v-else>
            <p class="admin-login__message">{{ loginMessage }}</p>
            <InputText
              v-model="codeInput"
              class="admin-login__field admin-login__otp"
              label="6-digit sign-in code"
              type="text"
              inputmode="numeric"
              auto-complete="one-time-code"
              placeholder="123 456"
              :maxlength="7"
            />
            <p v-if="error" class="admin-login__error">{{ error }}</p>
            <Button class="admin-login__button" :loading="loading" :disabled="loading || codeInput.replace(/\s/g, '').length !== 6" block @click="verifyCode">
              {{ loading ? 'Checking…' : 'Verify and unlock' }}
            </Button>
            <Button class="admin-login__link" variant="ghost" @click="resetLogin">
              Use a different email
            </Button>
          </template>
        </Card>
      </section>

      <template v-else>
        <aside class="admin-app__sidebar">
          <div class="admin-app__user">{{ user?.email }}</div>
          <nav class="admin-app__nav">
            <Button
              v-for="item in navItems"
              :key="item.to"
              class="admin-app__nav-item"
              variant="ghost"
              :class="{ 'admin-app__nav-item--active': route.path === item.to }"
              @click="router.push(item.to)"
            >
              <span>{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </Button>
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
    width: 100%;
    justify-content: flex-start;

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
    --card-border-color: transparent;
    --card-content-padding: var(--space-l);
    --card-radius: var(--border-radius-l);
   --card-background-color: color-mix(in srgb, var(--color-foreground), transparent 95%);
  }

  &__field {
    margin-top: 1rem;
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
