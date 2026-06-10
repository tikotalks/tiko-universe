<script setup lang="ts">
import { computed } from 'vue'
import { Button, Icon } from '@sil/ui'
import { useBemm } from 'bemm'
import { useRouter } from 'vue-router'
import { useAdminAuth } from '../composables/useAdminAuth'

const bemm = useBemm('profile-page', { return: 'string', includeBaseClass: true })
const router = useRouter()
const { user } = useAdminAuth()

const initials = computed(() => (user.value?.email || '?').slice(0, 1).toUpperCase())
const roles = computed(() => user.value?.roles?.length ? user.value.roles : ['admin'])
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div :class="bemm('avatar')" aria-hidden="true">{{ initials }}</div>
      <div>
        <h1 :class="bemm('title')">Profile</h1>
        <p :class="bemm('subtitle')">Your signed-in Tiko admin identity.</p>
      </div>
    </header>

    <div :class="bemm('grid')">
      <article :class="bemm('card')">
        <span :class="bemm('label')">Email</span>
        <strong :class="bemm('value')">{{ user?.email }}</strong>
      </article>

      <article :class="bemm('card')">
        <span :class="bemm('label')">Subject ID</span>
        <strong :class="[bemm('value'), bemm('value', 'mono')]">{{ user?.userId }}</strong>
      </article>

      <article :class="bemm('card')">
        <span :class="bemm('label')">Access</span>
        <div :class="bemm('roles')">
          <span v-for="role in roles" :key="role" :class="bemm('pill')">{{ role }}</span>
        </div>
      </article>
    </div>

    <div :class="bemm('actions')">
      <Button @click="router.push({ path: '/users', query: { q: user?.email || '' } })">
        <Icon name="ui/user" size="small" />
        Show me in users
      </Button>
      <Button variant="outline" @click="router.push('/settings')">
        <Icon name="ui/cog" size="small" />
        Open settings
      </Button>
    </div>
  </section>
</template>

<style lang="scss">
.profile-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-m);
  }

  &__avatar {
    width: calc(var(--space) * 4);
    height: calc(var(--space) * 4);
    border-radius: var(--border-radius-s);
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 12%);
    color: var(--admin-text);
    border: 1px solid var(--admin-border);
    font-size: var(--font-size-xl);
    font-weight: 800;
  }

  &__title {
    color: var(--admin-text);
    font-size: var(--font-size-xl);
    font-weight: 700;
  }

  &__subtitle,
  &__label {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 16), 1fr));
    gap: var(--space-s);
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    background: var(--admin-surface);
    border: 0;
    border-radius: var(--admin-card-radius);
    padding: var(--space-m);
  }

  &__value {
    color: var(--admin-text);
    overflow-wrap: anywhere;

    &--mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: var(--font-size-s);
    }
  }

  &__roles,
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
  }

  &__pill {
    border: 1px solid var(--admin-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 8%);
    color: var(--admin-text);
    padding: calc(var(--space-xs) / 2) var(--space-xs);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }
}
</style>
