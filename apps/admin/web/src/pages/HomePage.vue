<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBemm } from 'bemm'
import { Icon } from '@sil/ui'
import { useAdminAuth } from '../composables/useAdminAuth'

const bemm = useBemm('home-page', { return: 'string', includeBaseClass: true })
const router = useRouter()
const { user } = useAdminAuth()

const quickLinks = [
  { to: '/images', title: 'Generate images', description: 'Create child-friendly images with the Tiko visual style.', icon: 'media/image', color: 'var(--tiko-image)' },
  { to: '/stories', title: 'Narrate stories', description: 'Generate narrated stories and save them to the library.', icon: 'media/music-note', color: 'var(--tiko-story)' },
  { to: '/library', title: 'Media library', description: 'Browse and edit every image, story, and asset in Tiko.', icon: 'media/folder-image', color: 'var(--tiko-media)' },
  { to: '/users', title: 'Users and roles', description: 'Manage product-scoped roles for admins, editors, managers, and child profiles.', icon: 'ui/user', color: 'var(--tiko-users)' },
  { to: '/apps', title: 'Apps', description: 'Manage app titles, colors, icons, and starter defaults.', icon: 'ui/grid', color: 'var(--tiko-apps)' },
  { to: '/support', title: 'Support inbox', description: 'See incoming user emails and reply from one place.', icon: 'communication/message', color: 'var(--tiko-support)' },
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
        <div :class="bemm('card-icon')" :style="{ '--card-color': link.color }">
          <Icon :name="link.icon" size="medium" />
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
    gap: var(--space-m);
    padding: var(--space-m);
    text-align: left;
    background: var(--admin-card-bg);
    border: 0;
    border-radius: var(--admin-card-radius);
    color: var(--admin-text);
    cursor: pointer;
    transition: background 0.12s ease, transform 0.12s ease;

    &:hover {
      background: var(--admin-card-bg-hover);

      .home-page__card-icon {
        background: color-mix(in srgb, var(--card-color), transparent 20%);
        border-color: color-mix(in srgb, var(--card-color), transparent 20%);
        transform: scale(1.05);
      }
    }

    &:active {
      transform: translateY(1px);
    }
  }

  &__card-icon {
    width: calc(var(--space) * 3);
    height: calc(var(--space) * 3);
    border-radius: var(--border-radius-m);
    background: color-mix(in srgb, var(--card-color), transparent 82%);
    border: 1px solid color-mix(in srgb, var(--card-color), transparent 70%);
    display: grid;
    place-items: center;
    color: var(--card-color);
    flex-shrink: 0;
    transition: transform 0.15s ease;

    .icon {
      --icon-stroke-color: currentColor;
    }
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
    background: var(--admin-section-bg);
    border: 0;
    border-radius: var(--admin-section-radius);
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
