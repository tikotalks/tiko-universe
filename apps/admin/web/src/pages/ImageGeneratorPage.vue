<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText, InputTextArea } from '@sil/ui'
import ImageEditModal from '../components/images/ImageEditModal.vue'
import ImageGenerationQueue from '../components/images/ImageGenerationQueue.vue'
import type { EnrichInput, GenerateInput, QueueItem, TikoStyle, UpscaleInput } from '../components/images/imageGenerationQueueTypes'
import { useImageGeneration, type ImageGalleryItem } from '../composables/useImageGeneration'

type Tab = 'library' | 'drafts' | 'create'

const page = useBemm('image-page', { return: 'string', includeBaseClass: true })
const card = useBemm('image-card', { return: 'string', includeBaseClass: true })

const { generateImage, listImages, promoteImage, pushToMedia, deleteImage, enrichImage, editImage, upscaleImage, imageSrc } = useImageGeneration()

const activeTab = ref<Tab>('library')

const libraryItems = ref<ImageGalleryItem[]>([])
const draftItems = ref<ImageGalleryItem[]>([])
const galleryLoading = ref(false)
const galleryError = ref<string | null>(null)

const prompt = ref('')
const title = ref('')
const category = ref('generated')
const tagsText = ref('tiko, child-friendly')
const size = ref<'1024x1024' | '1024x1792' | '1792x1024'>('1024x1024')
const quality = ref<'standard' | 'hd'>('standard')
const tikoStyle = ref<TikoStyle>('tiko-v2')
const previewCount = ref(4)
const pushingToMediaIds = ref<Set<string>>(new Set())

const queue = ref<QueueItem[]>([])
const isProcessingQueue = ref(false)
let queueCounter = 0

const enrichingIds = computed(() => new Set(
  queue.value
    .filter(i => i.input.type === 'enrich' && (i.status === 'pending' || i.status === 'generating'))
    .map(i => (i.input as EnrichInput).sourceId),
))

const upscalingIds = computed(() => new Set(
  queue.value
    .filter(i => i.input.type === 'upscale' && (i.status === 'pending' || i.status === 'generating'))
    .map(i => (i.input as UpscaleInput).sourceId),
))

const editItem = ref<ImageGalleryItem | null>(null)

const tikoStylePrompt = `
Use the Tiko visual style: warm, child-friendly, simple readable shapes, rounded forms, soft tactile surfaces, clear subject silhouette, cheerful but not chaotic, suitable for young children, no text, no logos, no scary details.
`.trim()

const fullPrompt = computed(() => {
  const base = prompt.value.trim()
  if (!base) return ''
  return `${base}\n\n${tikoStylePrompt}`
})

function parseTags(): string[] {
  return tagsText.value.split(',').map(t => t.trim()).filter(Boolean)
}

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

function onEnrich(item: ImageGalleryItem, list: 'library' | 'drafts') {
  queueCounter += 1
  queue.value.push({
    id: `q${queueCounter}`,
    label: `Enrich: ${item.title || item.id.slice(0, 8)}`,
    input: { type: 'enrich', sourceId: item.id, list },
    status: 'pending',
    result: null,
    error: null,
  })
  void processQueue()
}

function onUpscale(item: ImageGalleryItem) {
  queueCounter += 1
  queue.value.push({
    id: `q${queueCounter}`,
    label: `Upscale: ${item.title || item.id.slice(0, 8)}`,
    input: {
      type: 'upscale',
      sourceId: item.id,
      size: '1024x1024',
      quality: 'medium',
      title: item.title ?? undefined,
      description: item.description ?? undefined,
      category: item.category,
      tags: item.tags,
    },
    status: 'pending',
    result: null,
    error: null,
  })
  void processQueue()
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

function onGenerate() {
  if (!prompt.value.trim()) return

  queueCounter += 1
  const label = title.value.trim() || prompt.value.trim().slice(0, 40)
  const item: QueueItem = {
    id: `q${queueCounter}`,
    label,
    input: {
      type: 'generate',
      prompt: fullPrompt.value,
      title: title.value.trim() || undefined,
      category: category.value.trim() || 'generated',
      tags: parseTags(),
      size: size.value,
      quality: quality.value,
      tikoStyle: tikoStyle.value,
      count: previewCount.value,
    },
    status: 'pending',
    result: null,
    error: null,
  }
  queue.value.push(item)
  void processQueue()
}

async function processQueue() {
  if (isProcessingQueue.value) return
  isProcessingQueue.value = true
  try {
    while (true) {
      const pending = queue.value.find(i => i.status === 'pending')
      if (!pending) break
      pending.status = 'generating'
      try {
        if (pending.input.type === 'enrich') {
          const result = await enrichImage(pending.input.sourceId)
          const items = pending.input.list === 'library' ? libraryItems : draftItems
          const idx = items.value.findIndex(i => i.id === (pending.input as EnrichInput).sourceId)
          if (idx !== -1) {
            items.value[idx] = {
              ...items.value[idx],
              title: result.title || items.value[idx].title,
              description: result.description,
              tags: result.tags,
              category: result.categories[0] ?? items.value[idx].category,
            }
          }
        } else if (pending.input.type === 'upscale') {
          const input = pending.input
          const result = await upscaleImage(input.sourceId, input.size, input.quality)
          pending.result = result
          draftItems.value = draftItems.value.filter(i => i.id !== input.sourceId)
          draftItems.value.unshift({
            id: result.id,
            imageUrl: result.imageUrl,
            prompt: result.prompt,
            revisedPrompt: result.revisedPrompt,
            model: 'gpt-image-2',
            size: result.size,
            quality: result.quality,
            style: result.style,
            width: result.width,
            height: result.height,
            fileSizeBytes: result.fileSizeBytes,
            title: input.title ?? null,
            description: input.description ?? null,
            category: input.category ?? 'generated',
            tags: input.tags ?? [],
            status: 'draft',
            isPreview: false,
            mediaId: null,
            createdAt: result.createdAt,
          })
        } else if (pending.input.type === 'edit') {
          pending.result = await editImage(pending.input.sourceId, pending.input.prompt, pending.input.maskBase64, pending.input.size)
        } else {
          pending.result = await generateImage(pending.input)
          const results = Array.isArray(pending.result) ? pending.result : [pending.result]
          for (const res of results) {
            if (res?.id) {
              try {
                await enrichImage(res.id)
              } catch (e) {
                console.warn('[queue] Auto-enrich failed for', pending.label, e)
              }
            }
          }
        }
        pending.status = 'done'
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Generation failed.'
        console.error('[queue] Item failed:', pending.label, errMsg, e)
        pending.error = errMsg
        pending.status = 'error'
      }
    }
  } finally {
    isProcessingQueue.value = false
  }
}

function openEdit(item: ImageGalleryItem) {
  editItem.value = item
}

function closeEdit() {
  editItem.value = null
}

function onSubmitEdit(input: { sourceId: string; prompt: string; maskBase64?: string; size: '1024x1024' | '1024x1792' | '1792x1024' }) {
  queueCounter += 1
  queue.value.push({
    id: `q${queueCounter}`,
    label: `Edit: ${input.prompt.slice(0, 40)}`,
    input: { type: 'edit', sourceId: input.sourceId, prompt: input.prompt, maskBase64: input.maskBase64, size: input.size },
    status: 'pending',
    result: null,
    error: null,
  })
  closeEdit()
  activeTab.value = 'create'
  void processQueue()
}

function retryQueueItem(item: QueueItem) {
  item.status = 'pending'
  item.error = null
  void processQueue()
}

function clearQueue() {
  queue.value = queue.value.filter(i => i.status === 'pending' || i.status === 'generating')
}

function useTemplate(kind: 'character' | 'scene' | 'object') {
  if (kind === 'character') {
    prompt.value = 'A friendly animal character for Tiko, standing clearly, expressive but simple, centered on a plain soft background.'
    category.value = 'characters'
    tagsText.value = 'tiko, character, animal, child-friendly'
  }
  if (kind === 'scene') {
    prompt.value = 'A calm story scene for Tiko Radio with one clear focal subject and a cozy environment children can understand.'
    category.value = 'story-scenes'
    tagsText.value = 'tiko, story, radio, scene, child-friendly'
  }
  if (kind === 'object') {
    prompt.value = 'A single everyday object for a child learning app, isolated, clear, recognizable, simple shape.'
    category.value = 'objects'
    tagsText.value = 'tiko, object, learning, child-friendly'
  }
}

function viewDrafts() {
  activeTab.value = 'drafts'
}

watch(activeTab, () => { void refresh() })

onMounted(() => { void loadLibrary() })
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
            <span v-if="item.model === 'gpt-image-2'" :class="card('badge', { upscaled: true })">Upscaled</span>
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
            <span v-else :class="card('badge', { upscaled: true })">Upscaled</span>
          </div>
          <div :class="card('body')">
            <strong :class="card('title')">{{ item.title || item.category }}</strong>
            <p v-if="item.description" :class="card('description')">{{ item.description }}</p>
            <p v-else :class="card('prompt')">{{ item.revisedPrompt || item.prompt }}</p>
            <div :class="card('actions')">
              <Button v-if="!item.isPreview" size="small" @click="onPromote(item)">Promote</Button>
              <Button v-if="item.isPreview" size="small" variant="outline" :loading="upscalingIds.has(item.id)" @click="onUpscale(item)">Upscale</Button>
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
      <form :class="page('form')" @submit.prevent="onGenerate">
        <header :class="page('form-head')">
          <h2 :class="page('panel-title')">Create new image</h2>
          <div :class="page('templates')">
            <Button type="button" variant="outline" size="small" @click="useTemplate('character')">Character</Button>
            <Button type="button" variant="outline" size="small" @click="useTemplate('scene')">Scene</Button>
            <Button type="button" variant="outline" size="small" @click="useTemplate('object')">Object</Button>
          </div>
        </header>

        <InputTextArea
          v-model="prompt"
          label="Prompt"
          :min-rows="6"
          :max-rows="12"
          :allow-resize="true"
          placeholder="Describe the image to generate…"
        />

        <details :class="page('style-info')" open>
          <summary :class="page('style-summary')">Tiko style suffix</summary>
          <p :class="page('style-body')">{{ tikoStylePrompt }}</p>
        </details>

        <InputText v-model="title" label="Title" placeholder="Optional media title" />

        <div :class="page('two-col')">
          <InputText v-model="category" label="Category" />
          <InputText v-model="tagsText" label="Tags" placeholder="comma, separated" />
        </div>

        <div :class="page('controls')">
          <label :class="page('label')">
            <span :class="page('label-text')">Style</span>
            <select :class="page('select')" v-model="tikoStyle">
              <option value="tiko-original">Tiko Original</option>
              <option value="tiko-v2">Tiko V2</option>
              <option value="tiko-natural">Tiko Natural</option>
            </select>
          </label>
          <label :class="page('label')">
            <span :class="page('label-text')">Previews</span>
            <select :class="page('select')" v-model.number="previewCount">
              <option :value="1">1</option>
              <option :value="2">2</option>
              <option :value="3">3</option>
              <option :value="4">4</option>
              <option :value="6">6</option>
              <option :value="8">8</option>
            </select>
          </label>
          <label :class="page('label')">
            <span :class="page('label-text')">Size</span>
            <select :class="page('select')" v-model="size">
              <option value="1024x1024">Square</option>
              <option value="1024x1792">Portrait</option>
              <option value="1792x1024">Landscape</option>
            </select>
          </label>
        </div>

        <Button :disabled="!prompt.trim()" type="submit" block>Add to queue</Button>

        <p :class="page('hint')">Generates {{ previewCount }} preview{{ previewCount > 1 ? 's' : '' }} in <button type="button" :class="page('inline-link')" @click="viewDrafts">Drafts</button>. Pick one and Upscale it to full quality.</p>
      </form>

      <ImageGenerationQueue
        :queue="queue"
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

  &__queue {
    background: var(--admin-surface);
    border: 0;
    border-radius: var(--admin-card-radius);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__queue-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-s);
  }

  &__queue-empty {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    text-align: center;
    padding: var(--space-m) 0;
  }

  &__queue-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__queue-item {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-s);
    border-radius: var(--border-radius-xs);
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);

    &--generating {
      border-color: var(--color-primary);
    }

    &--done {
      border-color: color-mix(in srgb, var(--color-success, green), transparent 60%);
    }

    &--error {
      border-color: color-mix(in srgb, var(--color-error), transparent 60%);
    }
  }

  &__queue-status {
    font-size: var(--font-size-m);
    flex-shrink: 0;
    width: 1.4em;
    text-align: center;
  }

  &__queue-spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  &__queue-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__queue-label {
    font-size: var(--font-size-s);
    font-weight: 600;
    color: var(--admin-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__queue-sub {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
  }

  &__queue-error {
    font-size: var(--font-size-xs);
    color: var(--color-error);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  &__queue-retry {
    flex-shrink: 0;
    border: 1px solid var(--admin-border);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font: inherit;
    font-size: var(--font-size-xs);
    font-weight: 500;
    padding: 2px var(--space-s);
    border-radius: var(--border-radius-xs);
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      border-color: var(--admin-border-strong);
      background: var(--admin-nav-hover);
    }
  }

  &__queue-thumb {
    width: calc(var(--space) * 5);
    height: calc(var(--space) * 5);
    object-fit: cover;
    border-radius: var(--border-radius-xs);
    flex-shrink: 0;
    --block-size: 0.5em;
    @include checkeredBackground;
  }

  &__queue-thumbs {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  &__form {
    background: var(--admin-surface);
    border: 0;
    border-radius: var(--admin-card-radius);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__form-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-s);
    flex-wrap: wrap;
  }

  &__templates {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  &__style-info {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
  }

  &__style-summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--admin-text);
  }

  &__style-body {
    line-height: 1.45;
    padding-top: var(--space-xs);
  }

  &__two-col,
  &__controls {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-s);

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  &__controls {
    grid-template-columns: repeat(3, 1fr);
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__label-text {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
  }

  &__select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font: inherit;
  }

  &__hint {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
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

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
