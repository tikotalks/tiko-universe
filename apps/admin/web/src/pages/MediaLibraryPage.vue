<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputSearch } from '@sil/ui'
import { useAdminMediaLibrary } from '../composables/useAdminMediaLibrary'
import type { AdminMediaItem, AudioLibraryAlbum } from '../composables/useAdminMediaLibrary'

const bemm = useBemm('media-library', { return: 'string', includeBaseClass: true })

const { items, total, page, totalPages, loading, uploading, error, list, upload, itemUrl, itemPreviewUrl, listAudioAlbums, createAudioAlbum, addAudioTrack } = useAdminMediaLibrary()

const search = ref('')
const type = ref('')
const selectedFile = ref<File | null>(null)
const selectedThumbnail = ref<File | null>(null)
const uploadResult = ref<string | null>(null)
const lastUploadedMediaId = ref<string | null>(null)
const audioAlbums = ref<AudioLibraryAlbum[]>([])
const audioAlbumTitle = ref('')
const audioAlbumDescription = ref('')
const audioAlbumCoverMediaId = ref('')
const audioAlbumVisibility = ref<'public' | 'private'>('public')
const audioAlbumRadioEnabled = ref(true)
const selectedAlbumId = ref('')
const selectedAudioMediaId = ref('')
const selectedTrackTitle = ref('')
const audioLibraryLoading = ref(false)
const audioLibraryError = ref<string | null>(null)

onMounted(() => {
  void list()
  void loadAudioAlbums()
})

function onFileChange(event: Event) {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function onThumbnailChange(event: Event) {
  selectedThumbnail.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function onSearch() {
  await list({ search: search.value, type: type.value, page: 1 })
}

async function go(delta: number) {
  await list({ search: search.value, type: type.value, page: page.value + delta })
}

async function onUpload() {
  if (!selectedFile.value) return
  const result = await upload(selectedFile.value, { thumbnail: selectedThumbnail.value })
  uploadResult.value = `Uploaded ${result.filename}${result.id ? ` · Media ID ${result.id}` : ''}`
  lastUploadedMediaId.value = result.id ?? null
  if (result.id && result.type === 'audio') {
    selectedAudioMediaId.value = result.id
    selectedTrackTitle.value = result.filename
  }
  selectedFile.value = null
  selectedThumbnail.value = null
}

async function loadAudioAlbums() {
  audioLibraryLoading.value = true
  audioLibraryError.value = null
  try {
    audioAlbums.value = await listAudioAlbums()
  } catch (e) {
    audioLibraryError.value = e instanceof Error ? e.message : 'Could not load audio albums.'
  } finally {
    audioLibraryLoading.value = false
  }
}

async function onCreateAudioAlbum() {
  if (!audioAlbumTitle.value.trim()) {
    audioLibraryError.value = 'Add an album title first.'
    return
  }
  audioLibraryLoading.value = true
  audioLibraryError.value = null
  try {
    const album = await createAudioAlbum({
      title: audioAlbumTitle.value.trim(),
      description: audioAlbumDescription.value.trim() || undefined,
      coverMediaId: audioAlbumCoverMediaId.value.trim() || undefined,
      visibility: audioAlbumVisibility.value,
      radioEnabled: audioAlbumRadioEnabled.value,
      sortMode: 'manual',
    })
    audioAlbums.value = [album, ...audioAlbums.value.filter(item => item.id !== album.id)]
    selectedAlbumId.value = album.id
    audioAlbumTitle.value = ''
    audioAlbumDescription.value = ''
    audioAlbumCoverMediaId.value = ''
  } catch (e) {
    audioLibraryError.value = e instanceof Error ? e.message : 'Could not create audio album.'
  } finally {
    audioLibraryLoading.value = false
  }
}

async function onAddAudioTrack() {
  if (!selectedAlbumId.value || !selectedAudioMediaId.value.trim()) {
    audioLibraryError.value = 'Choose an album and provide an audio media ID.'
    return
  }
  audioLibraryLoading.value = true
  audioLibraryError.value = null
  try {
    const track = await addAudioTrack(selectedAlbumId.value, {
      mediaId: selectedAudioMediaId.value.trim(),
      title: selectedTrackTitle.value.trim() || selectedAudioMediaId.value.trim(),
    })
    audioAlbums.value = audioAlbums.value.map(album =>
      album.id === selectedAlbumId.value ? { ...album, tracks: [...album.tracks, track] } : album,
    )
    selectedAudioMediaId.value = ''
    selectedTrackTitle.value = ''
  } catch (e) {
    audioLibraryError.value = e instanceof Error ? e.message : 'Could not add audio track.'
  } finally {
    audioLibraryLoading.value = false
  }
}

function mediaKind(item: AdminMediaItem): string {
  const mime = item.mime_type || ''
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  return item.type || 'file'
}

function formatSize(size?: number): string {
  if (!size) return '—'
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value?: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return value
  }
}
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div :class="bemm('intro')">
        <h1 :class="bemm('title')">Media library</h1>
        <p :class="bemm('subtitle')">Upload, inspect, search, and open assets in Tiko Media.</p>
      </div>
      <span :class="bemm('total')">{{ total }} assets</span>
    </header>

    <section :class="bemm('panel')">
      <h2 :class="bemm('panel-title')">Upload media</h2>
      <div :class="bemm('upload-grid')">
        <label :class="bemm('label')">
          <span :class="bemm('label-text')">File</span>
          <input :class="bemm('file-input')" type="file" accept="image/*,audio/*,video/*" @change="onFileChange" />
        </label>
        <label :class="bemm('label')">
          <span :class="bemm('label-text')">Video thumbnail (optional)</span>
          <input :class="bemm('file-input')" type="file" accept="image/*" @change="onThumbnailChange" />
        </label>
        <Button :loading="uploading" :disabled="!selectedFile || uploading" @click="onUpload">
          {{ uploading ? 'Uploading…' : 'Upload' }}
        </Button>
      </div>
      <p v-if="selectedFile" :class="bemm('hint')">Selected: {{ selectedFile.name }} · {{ formatSize(selectedFile.size) }}</p>
      <p v-if="uploadResult" :class="bemm('success')">{{ uploadResult }}</p>
      <p v-if="lastUploadedMediaId" :class="bemm('hint')">Media ID for covers/tracks: {{ lastUploadedMediaId }}</p>
    </section>



    <section :class="bemm('toolbar')">
      <InputSearch v-model="search" placeholder="Search media…" :search-action="onSearch" @search="onSearch" />
      <select :class="bemm('select')" v-model="type">
        <option value="">All types</option>
        <option value="image">Images</option>
        <option value="audio">Audio</option>
        <option value="video">Video</option>
      </select>
      <Button :loading="loading" :disabled="loading" @click="onSearch">Search</Button>
    </section>

    <p v-if="error" :class="bemm('error')">{{ error }}</p>

    <div :class="bemm('list-wrap')">
      <div v-if="loading" :class="bemm('empty')">Loading media…</div>
      <div v-else-if="items.length === 0" :class="bemm('empty')">No media found.</div>
      <ul v-else :class="bemm('list')">
        <li v-for="item in items" :key="item.id" :class="bemm('row')">
          <img
            v-if="mediaKind(item) === 'image'"
            :class="bemm('thumb')"
            :src="itemPreviewUrl(item, 160)"
            :alt="item.title || item.file_name || item.id"
          />
          <div v-else :class="bemm('thumb', { file: true })">
            <span>{{ mediaKind(item).slice(0, 1).toUpperCase() }}</span>
          </div>

          <div :class="bemm('row-body')">
            <span :class="bemm('row-title')">{{ item.title || item.file_name || item.id }}</span>
            <p v-if="item.description" :class="bemm('row-desc')">{{ item.description }}</p>
            <div v-if="item.tags?.length" :class="bemm('tags')">
              <span v-for="tag in (item.tags || []).slice(0, 5)" :key="tag" :class="bemm('tag')">{{ tag }}</span>
              <span v-if="(item.tags || []).length > 5" :class="bemm('tag', { more: true })">+{{ (item.tags || []).length - 5 }}</span>
            </div>
          </div>

          <div :class="bemm('row-meta')">
            <span :class="bemm('row-type')">{{ item.mime_type || mediaKind(item) }}</span>
            <span :class="bemm('row-size')">{{ formatSize(item.file_size) }}</span>
          </div>

          <time :class="bemm('row-date')">{{ formatDate(item.createdAt || item.created_at) }}</time>

          <a :class="bemm('row-action')" :href="itemUrl(item)" target="_blank" rel="noreferrer">Open</a>
        </li>
      </ul>
    </div>

    <footer :class="bemm('pager')">
      <Button variant="outline" :disabled="page <= 1 || loading" @click="go(-1)">Previous</Button>
      <span :class="bemm('pager-status')">Page {{ page }} / {{ totalPages }}</span>
      <Button variant="outline" :disabled="page >= totalPages || loading" @click="go(1)">Next</Button>
    </footer>
  </section>
</template>

<style lang="scss">
@use '../styles/mixins' as *;

.media-library {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-m);
  }

  &__intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--admin-text);
  }

  &__subtitle {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__total {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    font-weight: 600;
    background: var(--admin-surface);
    padding: var(--space-xs) var(--space-s);
    border-radius: var(--border-radius-round);
    white-space: nowrap;
  }

  &__panel {
    background: var(--admin-surface);
    border-radius: var(--border-radius-m);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__panel-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
    flex-wrap: wrap;
  }

  &__upload-grid {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: var(--space-s);
    align-items: end;
  }

  &__toolbar {
    display: flex;
    gap: var(--space-s);
    background: var(--admin-surface);
    border-radius: var(--border-radius-m);
    padding: var(--space-s) var(--space-m);
    align-items: center;

    > *:first-child {
      flex: 1;
      min-width: 0;
    }
  }

  &__audio-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 12), 1fr));
    gap: var(--space-s);
    align-items: end;
  }

  &__check {
    display: flex;
    gap: var(--space-xs);
    align-items: center;
    color: var(--admin-text);
    font-size: var(--font-size-s);
  }

  &__album-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space) * 16), 1fr));
    gap: var(--space-s);
  }

  &__album-card {
    border-radius: var(--border-radius-m);
    padding: var(--space-s);
    background: var(--admin-page-bg);
    color: var(--admin-text);

    ol {
      margin: var(--space-xs) 0 0;
      padding-inline-start: var(--space-m);
      color: var(--admin-text-muted);
      font-size: var(--font-size-s);
    }
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
  }

  &__file-input,
  &__input,
  &__select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-m);
    padding: var(--space-s);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font: inherit;
  }

  &__hint {
    font-size: var(--font-size-s);
    color: var(--admin-text-muted);
  }

  &__success {
    color: var(--color-success);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__error {
    color: var(--color-error);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__empty {
    color: var(--admin-text-muted);
    text-align: center;
    padding: var(--space-l);
  }

  &__list-wrap {
    display: flex;
    flex-direction: column;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__row {
    display: flex;
    align-items: center;
    gap: var(--space-m);
    padding: var(--space-m);
    background: var(--admin-surface);
    border-radius: var(--border-radius-m);
    transition: background 0.12s ease;

    &:hover {
      background: var(--admin-surface-hover);
    }
  }

  &__thumb {
    width: calc(var(--space) * 4);
    height: calc(var(--space) * 4);
    border-radius: var(--border-radius-m);
    object-fit: cover;
    flex-shrink: 0;
    --block-size: 0.5em;
    @include checkeredBackground;

    &--file {
      display: grid;
      place-items: center;
      color: var(--admin-text-muted);
      font-size: var(--font-size-s);
      font-weight: 600;
    }
  }

  &__row-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__row-title {
    font-weight: 600;
    font-size: var(--font-size-s);
    color: var(--admin-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  &__row-desc {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    margin: 0;
  }

  &__row-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    flex-shrink: 0;
    width: calc(var(--space) * 9);
  }

  &__row-type {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
    background: color-mix(in srgb, var(--color-foreground), transparent 90%);
    padding: 2px var(--space-s);
    border-radius: var(--border-radius-s);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  &__row-size {
    font-size: var(--font-size-xs);
    color: var(--admin-text-dim);
  }

  &__row-date {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
    flex-shrink: 0;
    white-space: nowrap;
    width: calc(var(--space) * 7);
    text-align: right;
  }

  &__row-action {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 600;
    font-size: var(--font-size-xs);
    flex-shrink: 0;
    padding: var(--space-xs) var(--space-s);
    border-radius: var(--border-radius-m);
    background: color-mix(in srgb, var(--color-primary), transparent 88%);
    transition: background 0.12s ease;

    &:hover {
      background: color-mix(in srgb, var(--color-primary), transparent 76%);
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__tag {
    display: inline-block;
    background: color-mix(in srgb, var(--color-foreground), transparent 90%);
    border-radius: var(--border-radius-s);
    padding: 1px var(--space-s);
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);

    &--more {
      background: transparent;
      color: var(--admin-text-dim);
    }
  }

  &__pager {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-m);
  }

  &__pager-status {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  @media (max-width: 860px) {
    &__upload-grid {
      grid-template-columns: 1fr;
    }

    &__toolbar {
      flex-wrap: wrap;
    }

    &__row {
      flex-wrap: wrap;
    }

    &__row-meta,
    &__row-date {
      display: none;
    }
  }
}
</style>
