<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="`toast--${t.type}`"
          @click="dismiss(t.id)"
        >
          <span class="toast__icon">
            <span v-if="t.type === 'success'">✓</span>
            <span v-else-if="t.type === 'error'">✕</span>
            <span v-else>ℹ</span>
          </span>
          <span class="toast__message">{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style lang="scss">
.toast-container {
  position: fixed;
  bottom: var(--space-l, 24px);
  right: var(--space-l, 24px);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 8px);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-s, 12px);
  padding: var(--space-s, 12px) var(--space-m, 16px);
  border-radius: var(--border-radius-s, 8px);
  background: var(--admin-surface, #1a1a2e);
  border: 1px solid var(--admin-border, #333);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  color: var(--admin-text, #fff);
  font-size: var(--font-size-s, 14px);
  font-weight: 500;
  cursor: pointer;
  pointer-events: auto;
  max-width: 380px;
  min-width: 240px;
  transition: opacity 0.2s ease, transform 0.2s ease;

  &--success {
    border-left: 3px solid var(--color-success, #22c55e);
  }

  &--error {
    border-left: 3px solid var(--color-error, #ef4444);
  }

  &--info {
    border-left: 3px solid var(--color-primary, #3b82f6);
  }

  &__icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;

    .toast--success & { color: var(--color-success, #22c55e); }
    .toast--error & { color: var(--color-error, #ef4444); }
    .toast--info & { color: var(--color-primary, #3b82f6); }
  }

  &__message {
    flex: 1;
    line-height: 1.4;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
