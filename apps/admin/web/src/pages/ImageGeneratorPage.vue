<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import ImageCreateForm from '../components/images/ImageCreateForm.vue'
import ImageEditModal from '../components/images/ImageEditModal.vue'
import ImageGenerationQueue from '../components/images/ImageGenerationQueue.vue'
import type { EditInput, GenerateInput, JobDto, UpscaleInput } from '../components/images/imageGenerationQueueTypes'
import { extractJobResults } from '../components/images/imageGenerationQueueTypes'
import { useImageGeneration, type ImageGalleryItem } from '../composables/useImageGeneration'

type Tab = 'library' | 'drafts' | 'create'

const page = useBemm('image-page', { return: 'string', includeBaseClass: true })
const card = useBemm('image-card', { return: 'string', includeBaseClass: true })

const { listImages, promoteImage, pushToMedia, deleteImage, enrichImage, enqueueJobs, listJobs, deleteJob, imageSrc } = useImageGeneration()

const activeTab = ref<Tab>('library')

const libraryItems = ref<ImageGalleryItem[]>([])
const draftItems = ref<ImageGalleryItem[]>([])
const galleryLoading = ref(false)
const galleryError = ref<string | null>(null)

const pushingToMediaIds = ref<Set<string>>(new Set())
const enrichingIds = ref<Set<string>>(new Set())

// Server-backed job queue — survives page reload because jobs live in D1.
const jobs = ref<JobDto[]>([])
const autoEnrichedJobIds = new Set<string>()
let pollTimer: ReturnType<typeof setInterval> | null = null

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

async function refresh() {
  if (activeTab.value === 'library') await loadLibrary()
  else if (activeTab.value === 'drafts') await loadDrafts()
}

async function onPromote(item: ImageGalleryItem) {
  try {
    await promoteImage(item.id, item)
    draftItems.value = draftItems.value.filter(i => i.id !== item.id)
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not promote image.'
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
    }
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not send image to Tiko Media.'
  } finally {
    const next = new Set(pushingToMediaIds.value)
    next.delete(item.id)
    pushingToMediaIds.value = next
  }
}

// ── Server-backed job queue ────────────────────────────────────

async function loadJobs() {
  try {
    jobs.value = await listJobs()
  } catch (e) {
    console.error('[jobs] Failed to load jobs', e)
  }
}

function hasActiveJobs(): boolean {
  return jobs.value.some(j => j.status === 'pending' || j.status === 'processing')
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(pollJobs, 2500)
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollJobs() {
  if (!hasActiveJobs()) {
    stopPolling()
    return
  }

  const prevStatuses = new Map(jobs.value.map(j => [j.id, j.status]))
  await loadJobs()

  let draftsChanged = false

  for (const job of jobs.value) {
    const prev = prevStatuses.get(job.id)
    const wasActive = prev === 'pending' || prev === 'processing'
    if (wasActive && job.status === 'done') {
      draftsChanged = true
      if (job.type === 'generate' && !autoEnrichedJobIds.has(job.id)) {
        autoEnrichedJobIds.add(job.id)
        for (const res of extractJobResults(job)) {
          if (res?.id) void enrichImage(res.id).catch(e => console.warn('[jobs] Auto-enrich failed', e))
        }
      }
    }
  }

  if (draftsChanged && activeTab.value === 'drafts') await loadDrafts()
}

// ── Enqueue handlers ───────────────────────────────────────────

async function onGenerate(input: GenerateInput) {
  galleryError.value = null
  try {
    const created = await enqueueJobs([input])
    jobs.value = [...created, ...jobs.value]
    startPolling()
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Failed to enqueue generation.'
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
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Enrich failed.'
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
    activeTab.value = 'create'
    startPolling()
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Failed to enqueue upscale.'
  }
}

async function onDelete(item: ImageGalleryItem, list: 'library' | 'drafts') {
  if (!confirm(`Delete "${item.title || item.id}"? This cannot be undone.`)) return
  try {
    await deleteImage(item.id)
    if (list === 'library') libraryItems.value = libraryItems.value.filter(i => i.id !== item.id)
    else draftItems.value = draftItems.value.filter(i => i.id !== item.id)
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not delete image.'
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
    activeTab.value = 'create'
    startPolling()
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Failed to enqueue edit.'
  }
}

async function retryQueueItem(item: JobDto) {
  galleryError.value = null
  try {
    const created = await enqueueJobs([item.input])
    jobs.value = [...created, ...jobs.value]
    await deleteJob(item.id).catch(() => {})
    jobs.value = jobs.value.filter(j => j.id !== item.id)
    startPolling()
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Failed to retry job.'
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

watch(activeTab, () => { void refresh() })

onMounted(async () => {
  await loadLibrary()
  await loadJobs()
  if (hasActiveJobs()) startPolling()
})

onUnmounted(() => stopPolling())
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
      <Button v-if="activeTab !== 'create'" @click="activeTab = 'create'">Create new image</Button>
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
            <span v-if="item.model === 'gpt-image-2'" :class="card('badge', { upscaled: true })">High quality</span>
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
            <span v-else :class="card('badge', { upscaled: true })">High quality</span>
          </div>
          <div :class="card('body')">
            <strong :class="card('title')">{{ item.title || item.category }}</strong>
            <p v-if="item.description" :class="card('description')">{{ item.description }}</p>
            <p v-else :class="card('prompt')">{{ item.revisedPrompt || item.prompt }}</p>
            <div :class="card('actions')">
              <Button v-if="!item.isPreview" size="small" @click="onPromote(item)">Promote</Button>
              <Button v-if="item.isPreview" size="small" variant="outline" :loading="upscalingIds.has(item.id)" @click="onUpscale(item)">High quality</Button>
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

  &__preview {
    background: var(--admin-surface);
    border: 0;
    border-radius: var(--admin-card-radius);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    align-self: start;
  }

  &__preview-image {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: var(--border-radius-xs);
    @include checkeredBackground;
  }

  &__preview-meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
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

    &--upscaled {
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
