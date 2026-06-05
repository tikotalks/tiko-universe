<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBemm } from 'bemm'
import { useAdminAuth } from '../composables/useAdminAuth'

const bemm = useBemm('home-page', { return: 'string', includeBaseClass: true })
const router = useRouter()
const { user } = useAdminAuth()

const quickLinks = [
  { to: '/images', title: 'Generate images', description: 'Create child-friendly images with the Tiko visual style.' },
  { to: '/stories', title: 'Narrate stories', description: 'Generate narrated stories and save them to the library.' },
  { to: '/library', title: 'Media library', description: 'Browse and edit every image, story, and asset in Tiko.' },
  { to: '/users', title: 'Users and roles', description: 'Manage product-scoped roles for admins, editors, managers, and child profiles.' },
  { to: '/apps', title: 'Apps', description: 'Review each app title, color, icon, and starter defaults.' },
  { to: '/support', title: 'Support inbox', description: 'See incoming user emails and reply from one place.' },
]
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <h1 :class="bemm('title')">Home</h1>
      <p :class="bemm('greeting')">
        Welcome back<span v-if="user?.email">, {{ user.email }}</span>.
      </p>
    </header>

    <div :class="bemm('grid')">
      <button
        v-for="link in quickLinks"
        :key="link.to"
        type="button"
        :class="bemm('card')"
        @click="router.push(link.to)"
      >
        <div :class="bemm('card-icon')">
          <span :class="bemm('card-icon-inner')">{{ link.title.charAt(0) }}</span>
        </div>
        <div :class="bemm('card-body')">
          <h3 :class="bemm('card-title')">{{ link.title }}</h3>
          <p :class="bemm('card-description')">{{ link.description }}</p>
        </div>
      </button>
    </div>

    <section :class="bemm('panel')">
      <h2 :class="bemm('panel-title')">Getting started</h2>
      <ol :class="bemm('steps')">
        <li>
          <strong>Generate or upload</strong> images and stories from the dedicated tools in the sidebar.
        </li>
        <li>
          <strong>Curate the library</strong> — every asset is tagged and searchable so kids see the right thing.
        </li>
        <li>
          <strong>Set defaults</strong> so new installs of Tiko apps come with great starter content.
        </li>
      </ol>
    </section>
  </section>
</template>

<style lang="scss">
.home-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-l);

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--admin-text);
  }

  &__greeting {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space) * 17), 1fr));
    gap: var(--space-s);
  }

  &__card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-s);
    padding: var(--space-m);
    text-align: left;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    color: var(--admin-text);
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease;

    &:hover {
      background: var(--admin-surface-hover);
      border-color: var(--admin-border-strong);
    }

    &:active {
      transform: translateY(1px);
    }
  }

  &__card-icon {
    width: calc(var(--space) * 2.25);
    height: calc(var(--space) * 2.25);
    border-radius: var(--border-radius-xs);
    background: color-mix(in srgb, var(--color-primary), transparent 80%);
    border: 1px solid color-mix(in srgb, var(--color-primary), transparent 65%);
    display: grid;
    place-items: center;
    color: var(--color-primary);
    flex-shrink: 0;
  }

  &__card-icon-inner {
    font-weight: 700;
    font-size: var(--font-size-m);
  }

  &__card-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    min-width: 0;
  }

  &__card-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__card-description {
    font-size: var(--font-size-s);
    color: var(--admin-text-muted);
    line-height: 1.4;
  }

  &__panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m) var(--space-l);
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  &__panel-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__steps {
    padding-left: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    line-height: 1.5;

    strong {
      color: var(--admin-text);
      font-weight: 600;
    }
  }
}
</style>
