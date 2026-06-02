<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBemm } from 'bemm'
import { useAdminAuth } from '../composables/useAdminAuth'

const bemm = useBemm('home-page', { return: 'string', includeBaseClass: true })
const router = useRouter()
const { user } = useAdminAuth()

const quickLinks = [
  {
    to: '/images',
    title: 'Generate images',
    description: 'Create child-friendly images with the Tiko visual style.',
    icon: 'ui/image',
  },
  {
    to: '/stories',
    title: 'Narrate stories',
    description: 'Generate narrated stories and save them to the library.',
    icon: 'ui/music-note-single',
  },
  {
    to: '/library',
    title: 'Media library',
    description: 'Browse and edit every image, story, and asset in Tiko.',
    icon: 'ui/folder',
  },
  {
    to: '/defaults',
    title: 'App defaults',
    description: 'Set the starter content each Tiko app loads on first run.',
    icon: 'ui/board-multi-dashboard',
  },
  {
    to: '/support',
    title: 'Support inbox',
    description: 'See incoming user emails and reply from one place.',
    icon: 'ui/at-sign',
  },
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 2.5rem 2.5rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;

  &__header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__title {
    margin: 0;
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--admin-text);
  }

  &__greeting {
    margin: 0;
    color: var(--admin-text-muted);
    font-size: 0.95rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0.75rem;
  }

  &__card {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    padding: 1rem;
    text-align: left;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: 12px;
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
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(168, 85, 247, 0.18));
    border: 1px solid rgba(139, 92, 246, 0.35);
    display: grid;
    place-items: center;
    color: #c4b5fd;
    flex-shrink: 0;
  }

  &__card-icon-inner {
    font-weight: 700;
    font-size: 0.95rem;
  }

  &__card-body {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  &__card-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--admin-text);
  }

  &__card-description {
    margin: 0;
    font-size: 0.825rem;
    color: var(--admin-text-muted);
    line-height: 1.4;
  }

  &__panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: 12px;
    padding: 1.5rem 1.75rem;
  }

  &__panel-title {
    margin: 0 0 1rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--admin-text);
  }

  &__steps {
    margin: 0;
    padding-left: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    color: var(--admin-text-muted);
    font-size: 0.9rem;
    line-height: 1.5;

    strong {
      color: var(--admin-text);
      font-weight: 600;
    }
  }

  @media (max-width: 760px) {
    padding: 1.5rem 1rem 3rem;
    gap: 1.5rem;

    &__title {
      font-size: 1.5rem;
    }
  }
}
</style>
