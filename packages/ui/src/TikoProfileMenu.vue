<script setup lang="ts">
import { Icon } from '@sil/ui'
interface Props {
  /** Kept for the shared app-shell contract; the iOS-style menu is shown only while parent mode is active. */
  parentMode: boolean
  hasCode: boolean
  isLoggedIn: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'profile'): void
  (e: 'logout'): void
  (e: 'enter-parent-mode'): void
  (e: 'enter-child-mode'): void
  (e: 'login'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div class="tiko-profile-menu" data-test="tiko-profile-menu">
    <div class="tiko-profile-menu__header">
      <button class="tiko-profile-menu__close" type="button" aria-label="Close" @click="emit('close')">×</button>
      <h2 class="tiko-profile-menu__title">Profile</h2>
      <span class="tiko-profile-menu__badge" aria-hidden="true"><Icon name="ui/avatar" /></span>
    </div>

    <div class="tiko-profile-menu__items">
      <button class="tiko-profile-menu__item" type="button" @click="emit('profile')">
        <span class="tiko-profile-menu__icon"><Icon name="ui/avatar" /></span>
        <span>Profile</span>
        <span class="tiko-profile-menu__chevron" aria-hidden="true">›</span>
      </button>
      <button class="tiko-profile-menu__item" type="button" @click="emit('enter-child-mode')">
        <span class="tiko-profile-menu__icon"><Icon name="product/baby-stroller" /></span>
        <span>Child mode</span>
        <span class="tiko-profile-menu__chevron" aria-hidden="true">›</span>
      </button>
      <button v-if="isLoggedIn" class="tiko-profile-menu__item" type="button" @click="emit('logout')">
        <span class="tiko-profile-menu__icon"><Icon name="arrows/arrow-right" /></span>
        <span>Log out</span>
        <span class="tiko-profile-menu__chevron" aria-hidden="true">›</span>
      </button>
      <button v-else class="tiko-profile-menu__item" type="button" @click="emit('login')">
        <span class="tiko-profile-menu__icon"><Icon name="ui/key" /></span>
        <span>Log in</span>
        <span class="tiko-profile-menu__chevron" aria-hidden="true">›</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tiko-profile-menu {
  --tiko-profile-accent: #ff9829;
  width: min(100%, 31rem);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: clamp(1.25rem, 4vw, 2rem);
  border-radius: clamp(1.75rem, 5vw, 2.6rem);
  background:
    radial-gradient(circle at 82% 14%, rgba(255, 213, 87, 0.28), transparent 34%),
    radial-gradient(circle at 16% 86%, rgba(137, 199, 255, 0.28), transparent 38%),
    rgba(255, 255, 255, 0.86);
  color: #17130f;
  box-shadow: 0 24px 80px rgba(24, 20, 16, 0.22);
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
  background: rgba(255, 255, 255, 0.54);
  color: var(--tiko-profile-accent);
  font-weight: 900;
}

.tiko-profile-menu__close,
.tiko-profile-menu__badge {
  width: 4rem;
  height: 4rem;
  font-size: 2.1rem;
}

.tiko-profile-menu__close {
  color: rgba(20, 20, 20, 0.78);
  cursor: pointer;
}

.tiko-profile-menu__title {
  margin: 0;
  text-align: center;
  font-size: clamp(1.65rem, 5vw, 2.25rem);
  font-weight: 950;
  letter-spacing: -0.05em;
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
  border: none;
  border-radius: 1.35rem;
  background: rgba(255, 255, 255, 0.9);
  color: inherit;
  font-size: clamp(1.15rem, 4vw, 1.45rem);
  font-weight: 900;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(24, 20, 16, 0.07);
}

.tiko-profile-menu__item:active {
  transform: scale(0.985);
}

.tiko-profile-menu__icon {
  width: 3.3rem;
  height: 3.3rem;
  background: rgba(255, 245, 231, 0.95);
  font-size: 1.6rem;
}

.tiko-profile-menu__chevron {
  color: rgba(20, 20, 20, 0.44);
  font-size: 2rem;
  font-weight: 900;
}
</style>
