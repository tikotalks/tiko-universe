<script setup lang="ts">
import { TikoAppShell } from '@tiko/ui'
import type { TikoHeaderAction } from '@tiko/ui'
import { useRouter } from 'vue-router'

const router = useRouter()

const actions: TikoHeaderAction[] = [
  { id: 'search', label: 'Search', icon: 'ui/search' },
]

function onHeaderAction(id: string) {
  if (id === 'search') {
    // Focus search bar — will be implemented in gallery page
    document.querySelector<HTMLInputElement>('.media-app__search-input')?.focus()
  }
}
</script>

<template>
  <TikoAppShell
    app-name="Media"
    app-icon="ui/image"
    app-color="media"
    :actions="actions"
    @header-action="onHeaderAction"
  >
    <div class="media-app">
      <router-view />
    </div>
  </TikoAppShell>
</template>

<style lang="scss">
@use './styles/_tokens.scss';

.media-app {
  padding: 1rem;
  max-width: 72rem;
  margin: 0 auto;
  animation: media-fade-in 0.3s ease-out;
}

@keyframes media-fade-in {
  from { opacity: 0; transform: translateY(0.5rem); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
