<script setup lang="ts">
import { computed } from 'vue'
import { Button, Icon } from '@sil/ui'
import { useBemm } from 'bemm'
import { useRouter } from 'vue-router'
import { useAdminAuth } from '../composables/useAdminAuth'

const bemm = useBemm('settings-page', { return: 'string', includeBaseClass: true })
const router = useRouter()
const { config, logout } = useAdminAuth()

const endpoints = computed(() => [
  { label: 'App API', value: config.value?.appApiUrl ?? 'Not loaded' },
  { label: 'Generation API', value: config.value?.generationApiUrl ?? 'Not loaded' },
  { label: 'Media API', value: config.value?.mediaApiUrl ?? 'Not loaded' },
  { label: 'Communication API', value: config.value?.communicationApiUrl ?? 'Not loaded' },
])

function signOut() {
  logout()
  router.push('/')
}
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div>
        <h1 :class="bemm('title')">Settings</h1>
        <p :class="bemm('subtitle')">Admin session and service configuration.</p>
      </div>
    </header>

    <div :class="bemm('layout')">
      <article :class="bemm('card')">
        <div :class="bemm('card-header')">
          <Icon name="ui/cog" size="small" />
          <h2 :class="bemm('card-title')">Connected services</h2>
        </div>
        <dl :class="bemm('endpoints')">
          <div v-for="endpoint in endpoints" :key="endpoint.label" :class="bemm('endpoint')">
            <dt>{{ endpoint.label }}</dt>
            <dd>{{ endpoint.value }}</dd>
          </div>
        </dl>
      </article>

      <article :class="bemm('card')">
        <div :class="bemm('card-header')">
          <Icon name="ui/user" size="small" />
          <h2 :class="bemm('card-title')">Session</h2>
        </div>
        <p :class="bemm('copy')">Sign out clears the local admin session and identity bootstrap stored in this browser.</p>
        <div :class="bemm('actions')">
          <Button variant="outline" @click="router.push('/profile')">View profile</Button>
          <Button @click="signOut">Sign out</Button>
        </div>
      </article>
    </div>
  </section>
</template>

<style lang="scss">
.settings-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__title {
    color: var(--admin-text);
    font-size: var(--font-size-xl);
    font-weight: 700;
  }

  &__subtitle,
  &__copy {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 20), 1fr));
    gap: var(--space-s);
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
  }

  &__card-header {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    color: var(--admin-text);
  }

  &__card-title {
    font-size: var(--font-size-m);
    font-weight: 700;
  }

  &__endpoints {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    margin: 0;
  }

  &__endpoint {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space-xs) / 2);
    padding: var(--space-s);
    border-radius: var(--border-radius-xs);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 6%);

    dt {
      color: var(--admin-text-muted);
      font-size: var(--font-size-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    dd {
      margin: 0;
      color: var(--admin-text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: var(--font-size-s);
      overflow-wrap: anywhere;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
  }
}
</style>
