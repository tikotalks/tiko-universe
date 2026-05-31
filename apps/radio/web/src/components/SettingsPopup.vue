<script setup lang="ts">
import { Button, Icon as SilIcon } from '@sil/ui'
import type { TikoColorMode } from '@tiko/ui'
import type { TikoLanguage } from '@tiko/i18n'

interface Props {
  language: string
  colorMode: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:language', value: string): void
  (e: 'update:colorMode', value: string): void
}>()

const LANGUAGES: { value: TikoLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
]

const MODES: { value: TikoColorMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
]

function setLang(value: string) {
  emit('update:language', value)
}

function setColorMode(value: string) {
  emit('update:colorMode', value)
}
</script>

<template>
  <div class="radio-settings-popup">
    <div class="radio-settings-popup__row">
      <span class="radio-settings-popup__row-label">Language</span>
      <div class="radio-settings-popup__pills">
        <button
          v-for="lang in LANGUAGES"
          :key="lang.value"
          class="radio-settings-popup__pill"
          :class="{ 'radio-settings-popup__pill--active': props.language === lang.value }"
          @click="setLang(lang.value)"
        >
          {{ lang.label }}
        </button>
      </div>
    </div>

    <div class="radio-settings-popup__row">
      <span class="radio-settings-popup__row-label">Appearance</span>
      <div class="radio-settings-popup__pills">
        <button
          v-for="mode in MODES"
          :key="mode.value"
          class="radio-settings-popup__pill radio-settings-popup__pill--icon"
          :class="{ 'radio-settings-popup__pill--active': props.colorMode === mode.value }"
          @click="setColorMode(mode.value)"
        >
          <span class="radio-settings-popup__pill-emoji">{{ mode.icon }}</span>
          {{ mode.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.radio-settings-popup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.25rem;

  &__row {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;

    &-label {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: color-mix(in srgb, var(--color-foreground, #1a1a2e), transparent 35%);
    }
  }

  &__pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  &__pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem 0.8rem;
    border: 2px solid color-mix(in srgb, var(--color-foreground, #1a1a2e), transparent 12%);
    border-radius: 2rem;
    background: transparent;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--color-foreground, #1a1a2e);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: color-mix(in srgb, var(--color-foreground, #1a1a2e), transparent 6%);
    }

    &--active {
      background: var(--tiko-app-primary, #e84057);
      border-color: var(--tiko-app-primary, #e84057);
      color: #fff;

      &:hover {
        opacity: 0.9;
      }
    }

    &--icon {
      gap: 0.3rem;
    }

    &-emoji {
      font-size: 0.95rem;
    }
  }
}
</style>
