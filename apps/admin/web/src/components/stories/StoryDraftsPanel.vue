<script setup lang="ts">
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import type { AudioLibraryAlbum } from '../../composables/useAdminMediaLibrary'
import type { StoryDraft, StoryGalleryItem } from '../../composables/useStoryNarration'

defineProps<{
  savedDrafts: StoryDraft[]
  renderedDrafts: StoryGalleryItem[]
  audioAlbums: AudioLibraryAlbum[]
  loading: boolean
  audioSrc: (url: string) => string
}>()

const emit = defineEmits<{
  (event: 'reload'): void
  (event: 'create'): void
  (event: 'promote', item: StoryGalleryItem): void
  (event: 'delete-rendered', item: StoryGalleryItem): void
}>()

const panel = useBemm('story-drafts-panel', { return: 'string', includeBaseClass: true })
const card = useBemm('story-draft-card', { return: 'string', includeBaseClass: true })

function albumTitle(albums: AudioLibraryAlbum[], id: string | null | undefined): string {
  if (!id) return 'not assigned'
  return albums.find(album => album.id === id)?.title || id
}
</script>

<template>
  <section :class="panel('')">
    <header :class="panel('head')">
      <div :class="panel('intro')">
        <h2 :class="panel('title')">Story creator drafts</h2>
        <p :class="panel('meta')">Chapter plans with voice, cover, and target Radio album settings.</p>
      </div>
      <Button variant="outline" :loading="loading" :disabled="loading" @click="emit('reload')">Reload</Button>
    </header>

    <div v-if="savedDrafts.length === 0" :class="panel('empty')">
      No creator drafts yet. <button type="button" :class="panel('inline-link')" @click="emit('create')">Plan one</button>.
    </div>
    <div v-else :class="panel('grid')">
      <article v-for="draft in savedDrafts" :key="draft.id" :class="card('', { draft: true })">
        <header :class="card('head')">
          <h3 :class="card('title')">{{ draft.title }}</h3>
          <p :class="card('meta')">{{ draft.defaultVoice }} / {{ draft.chapters.length }} chapters / {{ draft.status }}</p>
        </header>
        <p v-if="draft.description" :class="card('description')">{{ draft.description }}</p>
        <p :class="card('description')">
          Cover: {{ draft.coverMediaId || 'not assigned' }}<br />
          Radio album: {{ albumTitle(audioAlbums, draft.targetAlbumId) }}
        </p>
      </article>
    </div>

    <header :class="panel('head')">
      <div :class="panel('intro')">
        <h2 :class="panel('title')">Generated drafts</h2>
        <p :class="panel('meta')">Render output stays here until promoted to Tiko Radio.</p>
      </div>
    </header>

    <div v-if="loading && renderedDrafts.length === 0" :class="panel('empty')">Loading drafts...</div>
    <div v-else-if="renderedDrafts.length === 0" :class="panel('empty')">
      No drafts yet. <button type="button" :class="panel('inline-link')" @click="emit('create')">Create one</button>.
    </div>
    <div v-else :class="panel('grid')">
      <article v-for="item in renderedDrafts" :key="item.id" :class="card('', { draft: true })">
        <header :class="card('head')">
          <h3 :class="card('title')">{{ item.title }}</h3>
          <p :class="card('meta')">{{ item.voice }} / {{ item.segmentCount }} segments</p>
        </header>
        <p v-if="item.description" :class="card('description')">{{ item.description }}</p>
        <audio v-if="item.audioUrl" :class="card('audio')" :src="audioSrc(item.audioUrl)" controls />
        <div :class="card('actions')">
          <Button size="small" @click="emit('promote', item)">Promote</Button>
          <Button variant="ghost" size="small" @click="emit('delete-rendered', item)">Delete</Button>
        </div>
      </article>
    </div>
  </section>
</template>

<style lang="scss">
.story-drafts-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
    flex-wrap: wrap;
  }

  &__intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__empty {
    background: var(--admin-surface);
    border: 1px dashed var(--admin-border-strong);
    border-radius: var(--admin-card-radius);
    padding: var(--space-l);
    text-align: center;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__inline-link {
    border: 0;
    background: transparent;
    color: var(--color-primary);
    font: inherit;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space) * 14), 1fr));
    gap: var(--space-s);
  }
}

.story-draft-card {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-card-radius);
  padding: var(--space-m);
  display: flex;
  flex-direction: column;
  gap: var(--space-s);

  &--draft {
    border-color: color-mix(in srgb, var(--color-warning), transparent 60%);
  }

  &__head {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    color: var(--admin-text);
    font-size: var(--font-size-m);
    font-weight: 600;
  }

  &__meta,
  &__description {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    line-height: 1.45;
  }

  &__audio {
    width: 100%;
  }

  &__actions {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
    margin-top: auto;
  }
}
</style>
