<script setup lang="ts">
import { SilIcon as Icon } from '@tiko/ui'

defineProps<{
  appName: string
}>()

const emit = defineEmits<{
  toggleSettings: []
}>()
</script>

<template>
  <header class="talk-header" aria-label="Talk">
    <div class="talk-header__brand">
      <div class="talk-header__icon" aria-hidden="true"><Icon name="ui/talk" size="large" /></div>
      <h1>{{ appName }}</h1>
    </div>
    <div class="talk-header__actions">
      <button class="talk-header__button" type="button" aria-label="Settings" @click="emit('toggleSettings')">
        <Icon name="ui/settings" size="medium" />
      </button>
      <button class="talk-header__avatar" type="button" aria-label="Profile">
        <Icon name="ui/user" size="large" />
      </button>
    </div>
  </header>
</template>
