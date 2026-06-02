<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText, InputTextArea } from '@sil/ui'
import { useImageGeneration, type ImageGalleryItem } from '../composables/useImageGeneration'
import type { ImageGenerationResult } from '../types/admin'

type Tab = 'library' | 'drafts' | 'create'

const page = useBemm('image-page', { return: 'string', includeBaseClass: true })
const card = useBemm('image-card', { return: 'string', includeBaseClass: true })

const { generateImage, listImages, promoteImage, deleteImage, imageSrc } = useImageGeneration()

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
const style = ref<'vivid' | 'natural'>('vivid')
const generating = ref(false)
const generateError = ref<string | null>(null)
const lastGenerated = ref<ImageGenerationResult | null>(null)

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
    await promoteImage(item.id)
    draftItems.value = draftItems.value.filter(i => i.id !== item.id)
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not promote image.'
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

async function onGenerate() {
  if (!prompt.value.trim()) {
    generateError.value = 'Describe what image to generate first.'
    return
  }

  generating.value = true
  generateError.value = null
  try {
    const result = await generateImage({
      prompt: fullPrompt.value,
      title: title.value.trim() || undefined,
      category: category.value.trim() || 'generated',
      tags: parseTags(),
      size: size.value,
      quality: quality.value,
      style: style.value,
    })
    lastGenerated.value = result
    if (activeTab.value !== 'create') return
  } catch (e) {
    generateError.value = e instanceof Error ? e.message : 'Image generation failed.'
  } finally {
    generating.value = false
  }
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
          <img :class="card('image')" :src="imageSrc(item)" :alt="item.prompt" />
          <div :class="card('body')">
            <strong :class="card('title')">{{ item.title || item.category }}</strong>
            <p :class="card('prompt')">{{ item.revisedPrompt || item.prompt }}</p>
            <div :class="card('actions')">
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
          <img :class="card('image')" :src="imageSrc(item)" :alt="item.prompt" />
          <div :class="card('body')">
            <strong :class="card('title')">{{ item.title || item.category }}</strong>
            <p :class="card('prompt')">{{ item.revisedPrompt || item.prompt }}</p>
            <div :class="card('actions')">
              <Button size="small" @click="onPromote(item)">Promote</Button>
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
            <span :class="page('label-text')">Size</span>
            <select :class="page('select')" v-model="size">
              <option value="1024x1024">Square</option>
              <option value="1024x1792">Portrait</option>
              <option value="1792x1024">Landscape</option>
            </select>
          </label>
          <label :class="page('label')">
            <span :class="page('label-text')">Quality</span>
            <select :class="page('select')" v-model="quality">
              <option value="standard">Standard</option>
              <option value="hd">HD</option>
            </select>
          </label>
          <label :class="page('label')">
            <span :class="page('label-text')">Style</span>
            <select :class="page('select')" v-model="style">
              <option value="vivid">Vivid</option>
              <option value="natural">Natural</option>
            </select>
          </label>
        </div>

        <p v-if="generateError" :class="page('error')">{{ generateError }}</p>

        <Button :loading="generating" :disabled="generating" type="submit" block>
          {{ generating ? 'Generating…' : 'Generate image' }}
        </Button>

        <p :class="page('hint')">Generated images appear in <button type="button" :class="page('inline-link')" @click="viewDrafts">Drafts</button> until you promote them.</p>
      </form>

      <aside v-if="lastGenerated" :class="page('preview')">
        <h3 :class="page('panel-title')">Last generated</h3>
        <img :class="page('preview-image')" :src="imageSrc(lastGenerated)" :alt="lastGenerated.prompt" />
        <p :class="page('preview-meta')">{{ lastGenerated.size }} · {{ lastGenerated.quality }} · {{ lastGenerated.style }}</p>
        <Button variant="outline" size="small" @click="viewDrafts">View in drafts</Button>
      </aside>
    </section>
  </section>
</template>

<style lang="scss">
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
    border-radius: var(--border-radius-s);
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
    grid-template-columns: minmax(0, 1fr) calc(var(--space) * 18);
    gap: var(--space-m);

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  &__form {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
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
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
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
    background: color-mix(in srgb, var(--color-foreground), transparent 92%);
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

  &__image {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    background: color-mix(in srgb, var(--color-foreground), transparent 92%);
    display: block;
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
}
</style>
