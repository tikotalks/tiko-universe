<script setup lang="ts">
import { inject, computed } from 'vue'
import type { PopupService } from '@sil/ui'

interface Props {
  parentMode: boolean
  hasCode: boolean
  isLoggedIn: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'profile'): void
  (e: 'logout'): void
  (e: 'enter-parent-mode'): void
  (e: 'enter-child-mode'): void
  (e: 'login'): void
  (e: 'close'): void
}>()

const popup = inject<PopupService>('popupService')
</script>

<template>
  <div class="tiko-profile-menu">
    <!-- Parent mode: full menu -->
    <template v-if="parentMode">
      <button class="tiko-profile-menu__item" @click="emit('profile'); emit('close')">
        <span class="tiko-profile-menu__icon">👤</span>
        <span>Profile</span>
      </button>
      <button v-if="isLoggedIn" class="tiko-profile-menu__item tiko-profile-menu__item--danger" @click="emit('logout'); emit('close')">
        <span class="tiko-profile-menu__icon">🚪</span>
        <span>Log out</span>
      </button>
      <button v-else class="tiko-profile-menu__item" @click="emit('login'); emit('close')">
        <span class="tiko-profile-menu__icon">🔑</span>
        <span>Log in</span>
      </button>
      <button class="tiko-profile-menu__item" @click="emit('enter-child-mode'); emit('close')">
        <span class="tiko-profile-menu__icon">👶</span>
        <span>Child mode</span>
      </button>
    </template>

    <!-- Child mode: limited menu -->
    <template v-else>
      <button class="tiko-profile-menu__item" @click="emit('enter-parent-mode'); emit('close')">
        <span class="tiko-profile-menu__icon">🔒</span>
        <span>Parent mode</span>
      </button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.tiko-profile-menu {
  display: flex;
  flex-direction: column;
  min-width: 12rem;
}

.tiko-profile-menu__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  border: none;
  background: none;
  color: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.1s ease;

  &:hover {
    background: color-mix(in srgb, var(--tiko-surface), var(--color-foreground) 6%);
  }

  &:active {
    background: color-mix(in srgb, var(--tiko-surface), var(--color-foreground) 10%);
  }
}

.tiko-profile-menu__item--danger {
  color: var(--color-error, #e84057);
}

.tiko-profile-menu__icon {
  font-size: 1.1rem;
  width: 1.4rem;
  text-align: center;
}
</style>
