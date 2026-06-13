<script setup lang="ts">
import { Icon } from '@sil/ui'
import { useBemm } from 'bemm'

interface Props {
  /** Kept for the shared app-shell contract; the iOS-style menu is shown only while parent mode is active. */
  parentMode: boolean
  hasCode: boolean
  isLoggedIn?: boolean
  isRecoverable?: boolean
  userLabel?: string
  labels?: TikoProfileMenuLabels
}

const props = withDefaults(defineProps<Props>(), {
  isLoggedIn: true,
  isRecoverable: false,
  userLabel: 'Device user',
  labels: () => ({
    close: 'Close',
    account: 'Account',
    deviceUser: 'Device user',
    temporaryDeviceUser: 'Temporary device user',
    profile: 'Profile',
    setNameAndEmail: 'Set name and email',
    profileDetail: 'Name, email, avatar',
    recoverableUserDetail: 'Make this a recoverable user',
    logIn: 'Log in',
    logInDetail: 'Recover an existing user by email',
    childMode: 'Child mode',
    hideParentControls: 'Hide parent controls',
    createParentCode: 'Create a 4-digit code',
    childAccounts: 'Child accounts',
    childAccountsDetail: 'Manage child profiles and login codes',
    deleteAccount: 'Delete account',
    deleteAccountDetail: 'Remove this user and its sessions',
    logOut: 'Log out',
    logOutDetail: 'Keep this app available on the device',
  })
})

const bemm = useBemm('tiko-profile-menu', { return: 'string', includeBaseClass: true })

interface TikoProfileMenuLabels {
  close: string
  account: string
  deviceUser: string
  temporaryDeviceUser: string
  profile: string
  setNameAndEmail: string
  profileDetail: string
  recoverableUserDetail: string
  logIn: string
  logInDetail: string
  childMode: string
  hideParentControls: string
  createParentCode: string
  childAccounts: string
  childAccountsDetail: string
  deleteAccount: string
  deleteAccountDetail: string
  logOut: string
  logOutDetail: string
}

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
  <div :class="bemm('')" data-test="tiko-profile-menu">
    <div :class="bemm('header')">
      <button :class="bemm('close')" type="button" :aria-label="props.labels.close" @click="emit('close')">
        <Icon name="wayfinding/cross" aria-hidden="true" />
      </button>
      <div :class="bemm('heading')">
        <h2 :class="bemm('title')">{{ props.labels.account }}</h2>
        <p :class="bemm('subtitle')">{{ props.isRecoverable ? props.userLabel : props.labels.temporaryDeviceUser }}</p>
      </div>
      <span :class="bemm('badge')" aria-hidden="true"><Icon name="ui/user-s" /></span>
    </div>

    <div :class="bemm('items')">
      <button :class="bemm('item')" type="button" @click="emit('profile')">
        <span :class="bemm('icon')"><Icon name="ui/user-s" /></span>
        <span :class="bemm('copy')">
          <strong>{{ props.isRecoverable ? props.labels.profile : props.labels.setNameAndEmail }}</strong>
          <small>{{ props.isRecoverable ? props.labels.profileDetail : props.labels.recoverableUserDetail }}</small>
        </span>
        <span :class="bemm('chevron')" aria-hidden="true">›</span>
      </button>

      <button v-if="!props.isRecoverable" :class="bemm('item')" type="button" @click="emit('login')">
        <span :class="bemm('icon')"><Icon name="media/mail" /></span>
        <span :class="bemm('copy')">
          <strong>{{ props.labels.logIn }}</strong>
          <small>{{ props.labels.logInDetail }}</small>
        </span>
        <span :class="bemm('chevron')" aria-hidden="true">›</span>
      </button>

      <button v-if="props.isRecoverable" :class="bemm('item')" type="button" @click="emit('enter-child-mode')">
        <span :class="bemm('icon')"><Icon name="product/baby-stroller" /></span>
        <span :class="bemm('copy')">
          <strong>{{ props.labels.childMode }}</strong>
          <small>{{ props.hasCode ? props.labels.hideParentControls : props.labels.createParentCode }}</small>
        </span>
        <span :class="bemm('chevron')" aria-hidden="true">›</span>
      </button>

      <button v-if="props.isRecoverable" :class="bemm('item')" type="button" @click="emit('child-accounts')">
        <span :class="bemm('icon')"><Icon name="ui/users" /></span>
        <span :class="bemm('copy')">
          <strong>{{ props.labels.childAccounts }}</strong>
          <small>{{ props.labels.childAccountsDetail }}</small>
        </span>
        <span :class="bemm('chevron')" aria-hidden="true">›</span>
      </button>

      <button v-if="props.isRecoverable" :class="bemm('item', { danger: true })" type="button" @click="emit('delete-account')">
        <span :class="bemm('icon')"><Icon name="wayfinding/cross" /></span>
        <span :class="bemm('copy')">
          <strong>{{ props.labels.deleteAccount }}</strong>
          <small>{{ props.labels.deleteAccountDetail }}</small>
        </span>
        <span :class="bemm('chevron')" aria-hidden="true">›</span>
      </button>

      <button v-if="props.isLoggedIn" :class="bemm('item')" type="button" @click="emit('logout')">
        <span :class="bemm('icon')"><Icon name="arrows/arrow-headed-right" /></span>
        <span :class="bemm('copy')">
          <strong>{{ props.labels.logOut }}</strong>
          <small>{{ props.labels.logOutDetail }}</small>
        </span>
        <span :class="bemm('chevron')" aria-hidden="true">›</span>
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
  color: var(--color-foreground);
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
