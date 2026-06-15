<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import ImageCreateForm from '../components/images/ImageCreateForm.vue'
import ImageEditModal from '../components/images/ImageEditModal.vue'
import ImageGenerationQueue from '../components/images/ImageGenerationQueue.vue'
import type { EditInput, GenerateInput, UpscaleInput } from '../components/images/imageGenerationQueueTypes'
import { useImageGeneration, type ImageGalleryItem } from '../composables/useImageGeneration'
import { useJobQueue } from '../composables/useJobQueue'
import { useToast } from '../composables/useToast'

type Tab = 'library' | 'drafts' | 'create'

const page = useBemm('image-page', { return: 'string', includeBaseClass: true })
const card = useBemm('image-card', { return: 'string', includeBaseClass: true })

const { listImages, promoteImage, pushToMedia, deleteImage, enrichImage, enqueueJobs, deleteJob, imageSrc } = useImageGeneration()
const toast = useToast()
const { jobs, activeCount, hasActiveJobs, refresh: refreshJobs, startPolling } = useJobQueue()

const activeTab = ref<Tab>('library')
const queueOpen = ref(false)

const libraryItems = ref<ImageGalleryItem[]>([])
const draftItems = ref<ImageGalleryItem[]>([])
const galleryLoading = ref(false)
const galleryError = ref<string | null>(null)

const pushingToMediaIds = ref<Set<string>>(new Set())
const enrichingIds = ref<Set<string>>(new Set())

const upscalingIds = computed(() => new Set(
  jobs.value
    .filter(j => j.type === 'upscale' && (j.status === 'pending' || j.status === 'processing'))
    .map(j => (j.input as UpscaleInput).sourceId),
))

const editItem = ref<ImageGalleryItem | null>(null)

async function loadLibrary() {
  galleryLoading.value = true
  galleryError.value = null
  try {
    const result = await listImages('promoted', 1, 60)
    libraryItems.value = result.data
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not load library.'
  } finally {
    galleryLoading.value = false
  }
}

async function loadDrafts() {
  galleryLoading.value = true
  galleryError.value = null
  try {
    const result = await listImages('draft', 1, 60)
    draftItems.value = result.data
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not load drafts.'
  } finally {
    galleryLoading.value = false
  }
}

async function refreshGallery() {
  if (activeTab.value === 'library') await loadLibrary()
  else if (activeTab.value === 'drafts') await loadDrafts()
}

async function onPromote(item: ImageGalleryItem) {
  try {
    await promoteImage(item.id, item)
    draftItems.value = draftItems.value.filter(i => i.id !== item.id)
    toast.success(`Promoted "${item.title || item.id}" to library`)
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not promote image.'
    toast.error('Promote failed')
  }
}

async function onPushToMedia(item: ImageGalleryItem) {
  pushingToMediaIds.value = new Set([...pushingToMediaIds.value, item.id])
  galleryError.value = null
  try {
    const mediaId = await pushToMedia(item)
    if (mediaId) {
      const idx = libraryItems.value.findIndex(i => i.id === item.id)
      if (idx !== -1) libraryItems.value[idx] = { ...libraryItems.value[idx], mediaId }
      toast.success('Sent to Tiko Media')
    }
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not send image to Tiko Media.'
    toast.error('Media upload failed')
  } finally {
    const next = new Set(pushingToMediaIds.value)
    next.delete(item.id)
    pushingToMediaIds.value = next
  }
}

// ── Enqueue handlers ───────────────────────────────────────────

async function onGenerate(input: GenerateInput) {
  galleryError.value = null
  try {
    const created = await enqueueJobs([input])
    jobs.value = [...created, ...jobs.value]
    toast.info(`Added "${input.title || 'generation'}" to queue`)
    startPolling()
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Failed to enqueue generation.'
    toast.error('Failed to add to queue')
  }
}

async function onEnrich(item: ImageGalleryItem, list: 'library' | 'drafts') {
  enrichingIds.value = new Set([...enrichingIds.value, item.id])
  galleryError.value = null
  try {
    const result = await enrichImage(item.id)
    const items = list === 'library' ? libraryItems : draftItems
    const idx = items.value.findIndex(i => i.id === item.id)
    if (idx !== -1) {
      items.value[idx] = {
        ...items.value[idx],
        title: result.title || items.value[idx].title,
        description: result.description,
        tags: result.tags,
        category: result.categories[0] ?? items.value[idx].category,
      }
    }
    toast.success('Enriched image metadata')
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Enrich failed.'
    toast.error('Enrich failed')
  } finally {
    const next = new Set(enrichingIds.value)
    next.delete(item.id)
    enrichingIds.value = next
  }
}

async function onUpscale(item: ImageGalleryItem) {
  galleryError.value = null
  const input: UpscaleInput = {
    type: 'upscale',
    sourceId: item.id,
    size: '1024x1024',
    quality: 'medium',
    title: item.title ?? undefined,
    description: item.description ?? undefined,
    category: item.category,
    tags: item.tags,
  }
  try {
    const created = await enqueueJobs([input])
    jobs.value = [...created, ...jobs.value]
    toast.info(`Enhance queued for "${item.title || item.id}"`)
    startPolling()
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Failed to enqueue.'
    toast.error('Failed to add to queue')
  }
}

async function onDelete(item: ImageGalleryItem, list: 'library' | 'drafts') {
  if (!confirm(`Delete "${item.title || item.id}"? This cannot be undone.`)) return
  try {
    await deleteImage(item.id)
    if (list === 'library') libraryItems.value = libraryItems.value.filter(i => i.id !== item.id)
    else draftItems.value = draftItems.value.filter(i => i.id !== item.id)
    toast.success('Image deleted')
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not delete image.'
    toast.error('Delete failed')
  }
}

function openEdit(item: ImageGalleryItem) {
  editItem.value = item
}

function closeEdit() {
  editItem.value = null
}

async function onSubmitEdit(input: { sourceId: string; prompt: string; maskBase64?: string; size: '1024x1024' | '1024x1792' | '1792x1024' }) {
  galleryError.value = null
  const jobInput: EditInput = {
    type: 'edit',
    sourceId: input.sourceId,
    prompt: input.prompt,
    maskBase64: input.maskBase64,
    size: input.size,
  }
  try {
    const created = await enqueueJobs([jobInput])
    jobs.value = [...created, ...jobs.value]
    closeEdit()
    toast.info('Edit queued')
    startPolling()
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Failed to enqueue edit.'
    toast.error('Failed to add to queue')
  }
}

async function retryQueueItem(item: typeof jobs.value[number]) {
  galleryError.value = null
  try {
    const created = await enqueueJobs([item.input])
    jobs.value = [...created, ...jobs.value]
    await deleteJob(item.id).catch(() => {})
    jobs.value = jobs.value.filter(j => j.id !== item.id)
    toast.info('Retry queued')
    startPolling()
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Failed to retry job.'
    toast.error('Retry failed')
  }
}

async function clearQueue() {
  const finished = jobs.value.filter(j => j.status === 'done' || j.status === 'error')
  for (const job of finished) {
    await deleteJob(job.id).catch(() => {})
  }
  jobs.value = jobs.value.filter(j => j.status === 'pending' || j.status === 'processing')
}

function viewDrafts() {
  activeTab.value = 'drafts'
}

watch(activeTab, () => { void refreshGallery() })

watch(hasActiveJobs, (active) => {
  if (!active && draftItems.value.length >= 0) {
    void refreshJobs().then(() => {
      if (activeTab.value === 'drafts') void loadDrafts()
    })
  }
})

onMounted(async () => {
  await loadLibrary()
})
</script>

<template>
  <section :class="page('')">
    <header :class="page('header')">
      <div :class="page('intro')">
        <h1 :class="page('title')">Images</h1>
        <p :class="page('subtitle')">
          Browse the Tiko image library, review drafts from the generator, and create new images.
        </p>
      </div>
      <div :class="page('header-actions')">
        <div :class="page('queue-trigger-wrap')">
          <Button
            variant="outline"
            size="small"
            :class="page('queue-btn', { active: queueOpen })"
            @click="queueOpen = !queueOpen"
          >
            <span>Queue</span>
            <span v-if="activeCount" :class="page('queue-badge', { active: hasActiveJobs })">{{ activeCount }}</span>
            <span v-else-if="jobs.length" :class="page('queue-badge')">{{ jobs.length }}</span>
          </Button>
          <div v-if="queueOpen" :class="page('queue-popover')">
            <ImageGenerationQueue
              :queue="jobs"
              :image-src="imageSrc"
              @clear="clearQueue"
              @retry="retryQueueItem"
            />
          </div>
        </div>
        <Button v-if="activeTab !== 'create'" @click="activeTab = 'create'">Create new image</Button>
      </div>
    </header>

    <nav :class="page('tabs')" aria-label="Image sections">
      <button type="button" :class="page('tab', { active: activeTab === 'library' })" @click="activeTab = 'library'">
        <span>Library</span>
        <span :class="page('tab-count')">{{ libraryItems.length }}</span>
      </button>
      <button type="button" :class="page('tab', { active: activeTab === 'drafts' })" @click="activeTab = 'drafts'">
        <span>Drafts</span>
        <span :class="page('tab-count')">{{ draftItems.length }}</span>
      </button>
      <button type="button" :class="page('tab', { active: activeTab === 'create' })" @click="activeTab = 'create'">
        Create
      </button>
    </nav>

    <p v-if="galleryError" :class="page('error')">{{ galleryError }}</p>

    <section v-if="activeTab === 'library'" :class="page('panel')">
      <header :class="page('panel-head')">
        <div :class="page('panel-intro')">
          <h2 :class="page('panel-title')">Tiko Media images</h2>
          <p :class="page('panel-meta')">Images promoted from drafts. Available to all Tiko apps.</p>
        </div>
        <Button variant="outline" :loading="galleryLoading" :disabled="galleryLoading" @click="loadLibrary">Reload</Button>
      </header>

      <div v-if="galleryLoading && libraryItems.length === 0" :class="page('empty')">Loading library…</div>
      <div v-else-if="libraryItems.length === 0" :class="page('empty')">
        No images promoted yet. Generate one in <button type="button" :class="page('inline-link')" @click="viewDrafts">Drafts</button>.
      </div>
      <div v-else :class="page('grid')">
        <article v-for="item in libraryItems" :key="item.id" :class="card('')">
          <div :class="card('image-wrap')">
            <img :class="card('image')" :src="imageSrc(item)" :alt="item.prompt" />
            <span v-if="item.model === 'gpt-image-2'" :class="card('badge', { enhanced: true })">Enhanced</span>
          </div>
          <div :class="card('body')">
            <strong :class="card('title')">{{ item.title || item.category }}</strong>
            <p v-if="item.description" :class="card('description')">{{ item.description }}</p>
            <p v-else :class="card('prompt')">{{ item.revisedPrompt || item.prompt }}</p>
            <div :class="card('actions')">
              <Button v-if="!item.mediaId" size="small" :loading="pushingToMediaIds.has(item.id)" :disabled="pushingToMediaIds.has(item.id)" @click="onPushToMedia(item)">Send to Tiko Media</Button>
              <Button size="small" variant="outline" :loading="enrichingIds.has(item.id)" @click="onEnrich(item, 'library')">Enrich</Button>
              <Button size="small" variant="outline" @click="openEdit(item)">Edit</Button>
              <Button variant="ghost" size="small" :href="imageSrc(item)" target="_blank" rel="noreferrer">Open</Button>
              <Button variant="ghost" size="small" @click="onDelete(item, 'library')">Delete</Button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'drafts'" :class="page('panel')">
      <header :class="page('panel-head')">
        <div :class="page('panel-intro')">
          <h2 :class="page('panel-title')">Generated drafts</h2>
          <p :class="page('panel-meta')">New images stay here until promoted. Tiko apps don't see drafts.</p>
        </div>
        <Button variant="outline" :loading="galleryLoading" :disabled="galleryLoading" @click="loadDrafts">Reload</Button>
      </header>

      <div v-if="galleryLoading && draftItems.length === 0" :class="page('empty')">Loading drafts…</div>
      <div v-else-if="draftItems.length === 0" :class="page('empty')">
        No drafts yet. <button type="button" :class="page('inline-link')" @click="activeTab = 'create'">Create one</button>.
      </div>
      <div v-else :class="page('grid')">
        <article v-for="item in draftItems" :key="item.id" :class="card('', { draft: true })">
          <div :class="card('image-wrap')">
            <img :class="card('image')" :src="imageSrc(item)" :alt="item.prompt" />
            <span v-if="item.isPreview" :class="card('badge', { preview: true })">Preview</span>
            <span v-else :class="card('badge', { enhanced: true })">Enhanced</span>
          </div>
          <div :class="card('body')">
            <strong :class="card('title')">{{ item.title || item.category }}</strong>
            <p v-if="item.description" :class="card('description')">{{ item.description }}</p>
            <p v-else :class="card('prompt')">{{ item.revisedPrompt || item.prompt }}</p>
            <div :class="card('actions')">
              <Button v-if="!item.isPreview" size="small" @click="onPromote(item)">Promote</Button>
              <Button v-if="item.isPreview" size="small" variant="outline" :loading="upscalingIds.has(item.id)" @click="onUpscale(item)">Enhance</Button>
              <Button size="small" variant="outline" :loading="enrichingIds.has(item.id)" @click="onEnrich(item, 'drafts')">Enrich</Button>
              <Button size="small" variant="outline" @click="openEdit(item)">Edit</Button>
              <Button variant="ghost" size="small" :href="imageSrc(item)" target="_blank" rel="noreferrer">Open</Button>
              <Button variant="ghost" size="small" @click="onDelete(item, 'drafts')">Delete</Button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-else :class="page('create')">
      <ImageCreateForm
        @submit="onGenerate"
        @view-drafts="viewDrafts"
      />

      <ImageGenerationQueue
        :queue="jobs"
        :image-src="imageSrc"
        @clear="clearQueue"
        @retry="retryQueueItem"
      />
    </section>
  </section>

  <div v-if="queueOpen" class="queue-popover-backdrop" @click="queueOpen = false" />

  <ImageEditModal
    v-if="editItem"
    :item="editItem"
    :image-src="imageSrc"
    @close="closeEdit"
    @submit="onSubmitEdit"
  />
</template>

<style lang="scss">
@use '../styles/mixins' as *;

.image-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
    flex-wrap: wrap;
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    flex-wrap: wrap;
  }

  &__queue-trigger-wrap {
    position: relative;
  }

  &__queue-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);

    &--active {
      border-color: var(--color-primary);
    }
  }

  &__queue-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--admin-page-bg);
    color: var(--admin-text-muted);
    font-size: 11px;
    font-weight: 700;

    &--active {
      background: var(--color-primary);
      color: #fff;
    }
  }

  &__queue-popover {
    position: absolute;
    top: calc(100% + var(--space-xs));
    right: 0;
    width: 400px;
    max-width: calc(100vw - var(--space-l) * 2);
    z-index: 100;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--admin-card-radius);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    overflow: hidden;
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

  &__tabs {
    display: flex;
    gap: var(--space-xs);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-xs);
    width: max-content;
  }

  &__tab {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-s);
    border: 0;
    background: transparent;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    font-weight: 500;
    border-radius: var(--border-radius-xs);
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;

    &:hover {
      background: var(--admin-nav-hover);
      color: var(--admin-text);
    }

    &--active {
      background: var(--admin-nav-active);
      color: var(--admin-text);
    }
  }

  &__tab-count {
    color: var(--admin-text-muted);
    background: var(--admin-page-bg);
    border-radius: var(--border-radius-round);
    padding: 0 var(--space-xs);
    font-size: var(--font-size-xs);
  }

  &__error {
    color: var(--color-error);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  &__panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
    flex-wrap: wrap;
  }

  &__panel-intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__panel-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__panel-meta {
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

  &__create {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--space-m);
    align-items: start;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }
}

.queue-popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.image-card {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--border-radius-s);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.12s ease;

  &:hover {
    border-color: var(--admin-border-strong);
  }

  &--draft {
    border-color: color-mix(in srgb, var(--color-warning), transparent 60%);
  }

  &__image-wrap {
    position: relative;
  }

  &__image {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    display: block;
    @include checkeredBackground;
  }

  &__badge {
    position: absolute;
    top: var(--space-xs);
    right: var(--space-xs);
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 2px var(--space-s);
    border-radius: var(--border-radius-xs);
    letter-spacing: 0.03em;
    pointer-events: none;

    &--preview {
      background: rgba(0, 80, 200, 0.72);
    }

    &--enhanced {
      background: rgba(20, 130, 60, 0.72);
    }
  }

  &__body {
    padding: var(--space-s);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    color: var(--admin-text);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__prompt {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    line-height: 1.4;
    max-height: calc(var(--space) * 4);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__description {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    line-height: 1.4;
    max-height: calc(var(--space) * 4);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }
}
</style>
