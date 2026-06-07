<script setup lang="ts">
import { Icon } from '@sil/ui'

interface Props {
  /** Kept for the shared app-shell contract; the iOS-style menu is shown only while parent mode is active. */
  parentMode: boolean
  hasCode: boolean
  isLoggedIn?: boolean
  isRecoverable?: boolean
  userLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  isLoggedIn: true,
  isRecoverable: false,
  userLabel: 'Device user'
})

const emit = defineEmits<{
  (e: 'profile'): void
  (e: 'login'): void
  (e: 'logout'): void
  (e: 'delete-account'): void
  (e: 'enter-parent-mode'): void
  (e: 'enter-child-mode'): void
  (e: 'child-accounts'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div class="tiko-profile-menu" data-test="tiko-profile-menu">
    <div class="tiko-profile-menu__header">
      <button class="tiko-profile-menu__close" type="button" aria-label="Close" @click="emit('close')">
        <Icon name="wayfinding/cross" aria-hidden="true" />
      </button>
      <div class="tiko-profile-menu__heading">
        <h2 class="tiko-profile-menu__title">Account</h2>
        <p class="tiko-profile-menu__subtitle">{{ props.isRecoverable ? props.userLabel : 'Temporary device user' }}</p>
      </div>
      <span class="tiko-profile-menu__badge" aria-hidden="true"><Icon name="ui/user-s" /></span>
    </div>

    <div class="tiko-profile-menu__items">
      <button class="tiko-profile-menu__item" type="button" @click="emit('profile')">
        <span class="tiko-profile-menu__icon"><Icon name="ui/user-s" /></span>
        <span class="tiko-profile-menu__copy">
          <strong>{{ props.isRecoverable ? 'Profile' : 'Set name and email' }}</strong>
          <small>{{ props.isRecoverable ? 'Name, email, avatar' : 'Make this a recoverable user' }}</small>
        </span>
        <span class="tiko-profile-menu__chevron" aria-hidden="true">›</span>
      </button>

      <button v-if="!props.isRecoverable" class="tiko-profile-menu__item" type="button" @click="emit('login')">
        <span class="tiko-profile-menu__icon"><Icon name="media/mail" /></span>
        <span class="tiko-profile-menu__copy">
          <strong>Log in</strong>
          <small>Recover an existing user by email</small>
        </span>
        <span class="tiko-profile-menu__chevron" aria-hidden="true">›</span>
      </button>

      <button v-if="props.isRecoverable" class="tiko-profile-menu__item" type="button" @click="emit('enter-child-mode')">
        <span class="tiko-profile-menu__icon"><Icon name="product/baby-stroller" /></span>
        <span class="tiko-profile-menu__copy">
          <strong>Child mode</strong>
          <small>{{ props.hasCode ? 'Hide parent controls' : 'Create a 4-digit code' }}</small>
        </span>
        <span class="tiko-profile-menu__chevron" aria-hidden="true">›</span>
      </button>

      <button v-if="props.isRecoverable" class="tiko-profile-menu__item" type="button" @click="emit('child-accounts')">
        <span class="tiko-profile-menu__icon"><Icon name="ui/users" /></span>
        <span class="tiko-profile-menu__copy">
          <strong>Child Accounts</strong>
          <small>Manage child profiles and login codes</small>
        </span>
        <span class="tiko-profile-menu__chevron" aria-hidden="true">›</span>
      </button>

      <button v-if="props.isRecoverable" class="tiko-profile-menu__item tiko-profile-menu__item--danger" type="button" @click="emit('delete-account')">
        <span class="tiko-profile-menu__icon"><Icon name="wayfinding/cross" /></span>
        <span class="tiko-profile-menu__copy">
          <strong>Delete account</strong>
          <small>Remove this user and its sessions</small>
        </span>
        <span class="tiko-profile-menu__chevron" aria-hidden="true">›</span>
      </button>

      <button v-if="props.isLoggedIn" class="tiko-profile-menu__item" type="button" @click="emit('logout')">
        <span class="tiko-profile-menu__icon"><Icon name="arrows/arrow-headed-right" /></span>
        <span class="tiko-profile-menu__copy">
          <strong>Log out</strong>
          <small>Keep this app available on the device</small>
        </span>
        <span class="tiko-profile-menu__chevron" aria-hidden="true">›</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss">
.tiko-profile-menu {
  width: min(100%, 31rem);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: clamp(1.25rem, 4vw, 2rem);
  border-radius: clamp(1.75rem, 5vw, 2.6rem);
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 6%);
  color: var(--color-foreground);
  border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 88%);
  box-shadow: 0 24px 80px color-mix(in srgb, var(--color-foreground), transparent 82%);
  backdrop-filter: blur(22px) saturate(1.15);
}

.tiko-profile-menu__header {
  display: grid;
  grid-template-columns: 4rem 1fr 4rem;
  align-items: center;
  gap: 0.75rem;
}

.tiko-profile-menu__close,
.tiko-profile-menu__badge,
.tiko-profile-menu__icon {
  border: none;
  display: inline-grid;
  place-items: center;
  border-radius: 1.25rem;
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 10%);
  color: color-mix(in srgb, var(--color-foreground), transparent 8%);
  font-weight: 900;
}

.tiko-profile-menu__close,
.tiko-profile-menu__badge {
  width: 4rem;
  height: 4rem;
  font-size: 1.6rem;
}

.tiko-profile-menu__close {
  cursor: pointer;
}

.tiko-profile-menu__heading {
  min-width: 0;
  text-align: center;
}

.tiko-profile-menu__title {
  margin: 0;
  font-size: clamp(1.45rem, 5vw, 2rem);
  font-weight: 900;
}

.tiko-profile-menu__subtitle {
  margin: 0.15rem 0 0;
  color: color-mix(in srgb, var(--color-foreground), transparent 42%);
  font-size: 0.9rem;
  font-weight: 700;
}

.tiko-profile-menu__items {
  display: grid;
  gap: 0.85rem;
}

.tiko-profile-menu__item {
  width: 100%;
  min-height: 5.25rem;
  display: grid;
  grid-template-columns: 3.3rem 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.15rem;
  border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 90%);
  border-radius: 1.35rem;
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 3%);
  color: inherit;
  font-size: clamp(1.05rem, 4vw, 1.3rem);
  font-weight: 850;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 10px 28px color-mix(in srgb, var(--color-foreground), transparent 92%);

  &:active {
    transform: scale(0.985);
  }

  &--danger {
    color: color-mix(in srgb, var(--color-foreground), transparent 10%);
  }
}

.tiko-profile-menu__icon {
  width: 3.3rem;
  height: 3.3rem;
  font-size: 1.45rem;
}

.tiko-profile-menu__copy {
  display: grid;
  gap: 0.15rem;

  strong,
  small {
    display: block;
  }

  small {
    color: color-mix(in srgb, var(--color-foreground), transparent 45%);
    font-size: 0.82rem;
    font-weight: 700;
  }
}

.tiko-profile-menu__chevron {
  color: color-mix(in srgb, var(--color-foreground), transparent 56%);
  font-size: 2rem;
  font-weight: 900;
}
</style>
