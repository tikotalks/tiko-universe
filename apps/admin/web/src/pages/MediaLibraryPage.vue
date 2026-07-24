<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputSearch, Icon, useConfirm } from '@sil/ui'
import { useAdminMediaLibrary } from '../composables/useAdminMediaLibrary'
import { useAdminAuth } from '../composables/useAdminAuth'
import { useImageGeneration } from '../composables/useImageGeneration'
import { useToast } from '../composables/useToast'
import type { AdminMediaItem, AudioLibraryAlbum } from '../composables/useAdminMediaLibrary'
import type { ImageGalleryItem } from '../composables/useImageGeneration'
import type { ImageGenerationResult } from '../types/admin'
import ImageEditModal from '../components/images/ImageEditModal.vue'

const bemm = useBemm('media-library', { return: 'string', includeBaseClass: true })
const toast = useToast()
const { confirmDelete } = useConfirm()

const {
  items, total, page, totalPages, loading, uploading, error,
  list, upload, updateMedia, deleteMedia, toggleActive, toggleHidden,
  itemUrl, itemPreviewUrl, listAudioAlbums, createAudioAlbum, addAudioTrack,
} = useAdminMediaLibrary()

const { importImage, editImage, imageSrc } = useImageGeneration()
const { token: adminToken } = useAdminAuth()

function getAdminToken(): string {
  return adminToken.value
}

const search = ref('')
const type = ref('')
const showInactive = ref(true)
const showHidden = ref(true)
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

const editItem = ref<ImageGalleryItem | null>(null)
const editSourceUrl = ref<string>('')
const editSourceId = ref<string>('')
const editResultUrl = ref<string | null>(null)
const editResultItem = ref<ImageGenerationResult | null>(null)
const editLoading = ref(false)
const editMode = ref<'edit' | 'result'>('edit')
const savingNew = ref(false)
const applyingChange = ref(false)
const deleteConfirmId = ref<string | null>(null)
const actionError = ref<string | null>(null)

onMounted(() => {
  void refreshList()
  void loadAudioAlbums()
})

async function refreshList() {
  await list({ search: search.value, type: type.value, page: 1, includeInactive: true, includeHidden: true } as Record<string, unknown>)
}

async function onSearch() {
  await refreshList()
}

async function go(delta: number) {
  await list({ search: search.value, type: type.value, page: page.value + delta, includeInactive: true, includeHidden: true } as Record<string, unknown>)
}

function onFileChange(event: Event) {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function onThumbnailChange(event: Event) {
  selectedThumbnail.value = (event.target as HTMLInputElement).files?.[0] ?? null
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

async function onToggleActive(item: AdminMediaItem) {
  try {
    await toggleActive(item.id, !item.is_active)
    toast.success(`${item.is_active === false ? 'Activated' : 'Deactivated'} "${item.title || item.id}"`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to toggle active state.')
  }
}

async function onToggleHidden(item: AdminMediaItem) {
  try {
    await toggleHidden(item.id, !item.is_hidden)
    toast.success(`${item.is_hidden ? 'Unhid' : 'Hid'} "${item.title || item.id}"`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to toggle hidden state.')
  }
}

async function onDelete(item: AdminMediaItem) {
  const ok = await confirmDelete(item.title || item.file_name || item.id)
  if (!ok) return
  try {
    await deleteMedia(item.id)
    toast.success('Image deleted')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to delete media.')
  }
}

async function onEditImage(item: AdminMediaItem) {
  editLoading.value = true
  editMode.value = 'edit'
  editResultUrl.value = null
  editResultItem.value = null
  editSourceUrl.value = itemUrl(item)
  editSourceId.value = item.id
  try {
    const imported = await importImage(itemUrl(item), {
      title: item.title || item.file_name,
      category: item.category || 'imported',
      tags: item.tags,
    })
    editItem.value = imported
    editSourceId.value = imported.id
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to import image for editing.')
  } finally {
    editLoading.value = false
  }
}

async function onSubmitEdit(input: { sourceId: string; prompt: string; maskBase64?: string; size: string }) {
  editLoading.value = true
  try {
    const result = await editImage(input.sourceId, input.prompt, input.maskBase64, input.size)
    editResultItem.value = result
    editResultUrl.value = imageSrc(result)
    editMode.value = 'result'
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Image edit failed.')
  } finally {
    editLoading.value = false
  }
}

function closeEdit() {
  editItem.value = null
  editResultItem.value = null
  editResultUrl.value = null
  editMode.value = 'edit'
}

async function onApplyChange() {
  if (!editSourceUrl.value || !editResultUrl.value) return
  applyingChange.value = true
  try {
    const originalItem = items.value.find(i => i.id === editSourceUrl.value.match(/\/media\/([^/]+)/)?.[1])
    if (!originalItem) throw new Error('Could not find original media item')

    const imgResponse = await fetch(editResultUrl.value)
    const blob = await imgResponse.blob()
    const fileName = (originalItem.title || 'edited').replace(/[^a-z0-9_-]/gi, '_')
    const formData = new FormData()
    formData.set('file', new File([blob], `${fileName}.png`, { type: blob.type || 'image/png' }))
    if (originalItem.title) formData.set('title', originalItem.title)
    if (originalItem.category) formData.set('categories', JSON.stringify([originalItem.category]))
    if (originalItem.tags?.length) formData.set('tags', JSON.stringify(originalItem.tags))

    const baseUrl = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_MEDIA_API_URL ?? 'https://media.tikoapi.org/v1'
    const uploadResponse = await fetch(`${baseUrl}/media/upload`, {
      method: 'POST',
      headers: { authorization: `Bearer ${getAdminToken()}` },
      body: formData,
    })
    const uploadBody = await uploadResponse.json().catch(() => null) as { success?: boolean; id?: string; error?: string } | null
    if (!uploadResponse.ok || !uploadBody?.success) throw new Error(uploadBody?.error ?? `Upload failed: ${uploadResponse.status}`)

    await deleteMedia(originalItem.id)
    await refreshList()
    closeEdit()
    toast.success('Applied change — original replaced')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to apply change.')
  } finally {
    applyingChange.value = false
  }
}

async function onSaveAsNew() {
  if (!editResultUrl.value || !editResultItem.value) return
  savingNew.value = true
  try {
    const imgResponse = await fetch(editResultUrl.value)
    const blob = await imgResponse.blob()
    const fileName = (editItem.value?.title || 'edited').replace(/[^a-z0-9_-]/gi, '_')
    const formData = new FormData()
    formData.set('file', new File([blob], `${fileName}.png`, { type: blob.type || 'image/png' }))
    if (editItem.value?.title) formData.set('title', editItem.value.title)
    if (editItem.value?.category) formData.set('categories', JSON.stringify([editItem.value.category]))
    if (editItem.value?.tags?.length) formData.set('tags', JSON.stringify(editItem.value.tags))

    const baseUrl = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_MEDIA_API_URL ?? 'https://media.tikoapi.org/v1'
    const response = await fetch(`${baseUrl}/media/upload`, {
      method: 'POST',
      headers: { authorization: `Bearer ${getAdminToken()}` },
      body: formData,
    })
    const body = await response.json().catch(() => null) as { success?: boolean; error?: string } | null
    if (!response.ok || !body?.success) throw new Error(body?.error ?? `Upload failed: ${response.status}`)

    await refreshList()
    closeEdit()
    toast.success('Saved as new image')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to save as new image.')
  } finally {
    savingNew.value = false
  }
}
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div :class="bemm('intro')">
        <h1 :class="bemm('title')">Media library</h1>
        <p :class="bemm('subtitle')">Upload, edit, search, and manage all Tiko Media assets.</p>
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
        <li
          v-for="item in items"
          :key="item.id"
          :class="[bemm('row'), { 'media-library__row--inactive': item.is_active === false, 'media-library__row--hidden': item.is_hidden }]"
        >
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
            <div :class="bemm('row-title-line')">
              <span :class="bemm('row-title')">{{ item.title || item.file_name || item.id }}</span>
              <span v-if="item.is_active === false" :class="bemm('badge', { inactive: true })">Inactive</span>
              <span v-if="item.is_hidden" :class="bemm('badge', { hidden: true })">Hidden</span>
            </div>
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

          <div :class="bemm('row-actions')">
            <button
              v-if="mediaKind(item) === 'image'"
              :class="bemm('icon-btn')"
              title="Edit image"
              :disabled="editLoading"
              @click="onEditImage(item)"
            ><Icon name="ui/edit-fat" size="small" aria-hidden="true" /></button>
            <button
              :class="bemm('icon-btn')"
              :title="item.is_hidden ? 'Unhide from apps' : 'Hide from apps'"
              @click="onToggleHidden(item)"
            ><Icon :name="item.is_hidden ? 'ui/eye-closed' : 'ui/eye'" size="small" aria-hidden="true" /></button>
            <button
              :class="bemm('icon-btn')"
              :title="item.is_active === false ? 'Activate' : 'Deactivate'"
              @click="onToggleActive(item)"
            >
              <Icon :name="item.is_active === false ? 'ui/play' : 'ui/pause'" size="small" aria-hidden="true" />
            </button>
            <a :class="bemm('icon-btn')" :href="itemUrl(item)" target="_blank" rel="noreferrer" title="Open">
              <Icon name="ui/external-link" size="small" aria-hidden="true" />
            </a>
            <button
              :class="bemm('icon-btn', { danger: true })"
              title="Delete permanently"
              @click="onDelete(item)"
            ><Icon name="ui/trash" size="small" aria-hidden="true" /></button>
          </div>
        </li>
      </ul>
    </div>

    <footer :class="bemm('pager')">
      <Button variant="outline" :disabled="page <= 1 || loading" @click="go(-1)">Previous</Button>
      <span :class="bemm('pager-status')">Page {{ page }} / {{ totalPages }}</span>
      <Button variant="outline" :disabled="page >= totalPages || loading" @click="go(1)">Next</Button>
    </footer>

    <!-- Edit Modal -->
    <ImageEditModal
      v-if="editItem"
      :item="editItem"
      :image-src="imageSrc"
      @close="closeEdit"
      @submit="onSubmitEdit"
    />

    <!-- Edit Result Modal -->
    <div v-if="editResultUrl && editMode === 'result'" :class="bemm('result-overlay')" @click.self="closeEdit">
      <div :class="bemm('result-panel')">
        <header :class="bemm('result-header')">
          <h3 :class="bemm('result-title')">Edit result</h3>
          <button :class="bemm('result-close')" @click="closeEdit">Close</button>
        </header>
        <div :class="bemm('result-body')">
          <div :class="bemm('result-compare')">
            <div :class="bemm('result-col')">
              <span :class="bemm('result-label')">Original</span>
              <img :class="bemm('result-img')" :src="editSourceUrl" alt="Original" />
            </div>
            <div :class="bemm('result-col')">
              <span :class="bemm('result-label')">Edited</span>
              <img :class="bemm('result-img')" :src="editResultUrl" alt="Edited" />
            </div>
          </div>
          <div :class="bemm('result-actions')">
            <Button variant="outline" :loading="savingNew" @click="onSaveAsNew">Save as new</Button>
            <Button :loading="applyingChange" @click="onApplyChange">Apply change (replace original)</Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading overlay for edit/import -->
    <div v-if="editLoading" :class="bemm('loading-overlay')">
      <div :class="bemm('loading-spinner')"></div>
    </div>
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
    transition: background 0.12s ease, opacity 0.12s ease;

    &:hover {
      background: var(--admin-surface-hover);
    }

    &--inactive {
      opacity: 0.55;
    }

    &--hidden {
      border-left: 3px solid var(--color-warning, #f59e0b);
    }
  }

  &__thumb {
    width: calc(var(--space) * 4);
    height: calc(var(--space) * 4);
    border-radius: var(--border-radius-m);
    object-fit: cover;
    flex-shrink: 0;
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

  &__row-title-line {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__row-title {
    font-weight: 600;
    font-size: var(--font-size-s);
    color: var(--admin-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

  &__badge {
    display: inline-flex;
    align-items: center;
    padding: 1px var(--space-s);
    border-radius: var(--border-radius-s);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;

    &--inactive {
      background: color-mix(in srgb, var(--color-error) 12%, transparent);
      color: var(--color-error);
    }

    &--hidden {
      background: color-mix(in srgb, #f59e0b 12%, transparent);
      color: #b45309;
    }
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

  &__row-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    align-items: center;
  }

  &__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--admin-text-muted);
    border-radius: var(--border-radius-xs);
    cursor: pointer;
    text-decoration: none;
    transition: background 0.12s ease, color 0.12s ease;

    &:hover {
      background: var(--admin-surface-hover);
      color: var(--admin-text);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &--danger {
      &:hover {
        background: color-mix(in srgb, var(--color-error) 8%, transparent);
        color: var(--color-error);
      }
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

  &__result-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.65);
    padding: var(--space-m);
  }

  &__result-panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-m);
    width: 100%;
    max-width: 800px;
    max-height: 92vh;
    overflow-y: auto;
  }

  &__result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-m);
    border-bottom: 1px solid var(--admin-border);
  }

  &__result-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__result-close {
    border: 0;
    background: transparent;
    color: var(--admin-text-muted);
    font: inherit;
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--border-radius-xs);

    &:hover { background: var(--admin-nav-hover); color: var(--admin-text); }
  }

  &__result-body {
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  &__result-compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-m);
  }

  &__result-col {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__result-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__result-img {
    width: 100%;
    border-radius: var(--border-radius-s);
    object-fit: cover;
    @include checkeredBackground;
  }

  &__result-actions {
    display: flex;
    gap: var(--space-s);
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
  }

  &__loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
  }

  &__loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--admin-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: media-library-spin 0.7s linear infinite;
  }

  @keyframes media-library-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 860px) {
    &__upload-grid { grid-template-columns: 1fr; }
    &__toolbar { flex-wrap: wrap; }
    &__row { flex-wrap: wrap; }
    &__row-meta, &__row-date { display: none; }
    &__result-compare { grid-template-columns: 1fr; }
  }
}
</style>
