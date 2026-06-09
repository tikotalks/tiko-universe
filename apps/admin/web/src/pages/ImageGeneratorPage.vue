<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText, InputTextArea } from '@sil/ui'
import { useImageGeneration, type ImageGalleryItem } from '../composables/useImageGeneration'
import type { ImageGenerationResult } from '../types/admin'

type Tab = 'library' | 'drafts' | 'create'

interface GenerateInput {
  type: 'generate'
  prompt: string
  size: '1024x1024' | '1024x1792' | '1792x1024'
  quality: 'standard' | 'hd'
  style: 'vivid' | 'natural'
  title?: string
  category?: string
  tags?: string[]
  count?: number
}

interface EditInput {
  type: 'edit'
  sourceId: string
  prompt: string
  maskBase64?: string
  size: '1024x1024' | '1024x1792' | '1792x1024'
}

interface EnrichInput {
  type: 'enrich'
  sourceId: string
  list: 'library' | 'drafts'
}

interface QueueItem {
  id: string
  label: string
  input: GenerateInput | EditInput | EnrichInput
  status: 'pending' | 'generating' | 'done' | 'error'
  result: ImageGenerationResult | ImageGenerationResult[] | null
  error: string | null
}

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
const style = ref<'vivid' | 'natural'>('vivid')
const upscalingId = ref<string | null>(null)
const pushingToMediaIds = ref<Set<string>>(new Set())

const queue = ref<QueueItem[]>([])
const isProcessingQueue = ref(false)
let queueCounter = 0

const enrichingIds = computed(() => new Set(
  queue.value
    .filter(i => i.input.type === 'enrich' && (i.status === 'pending' || i.status === 'generating'))
    .map(i => (i.input as EnrichInput).sourceId),
))

const editItem = ref<ImageGalleryItem | null>(null)
const editPrompt = ref('')
const editMode = ref<'whole' | 'selection'>('whole')
const editSize = ref<'1024x1024' | '1024x1792' | '1792x1024'>('1024x1024')
const editBrushSize = ref(30)
const editCanvasRef = ref<HTMLCanvasElement | null>(null)
let editIsDrawing = false

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
    await pushToMedia(item)
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

async function onUpscale(item: ImageGalleryItem) {
  upscalingId.value = item.id
  galleryError.value = null
  try {
    const result = await upscaleImage(item.id, '1024x1024', 'medium')
    draftItems.value = draftItems.value.filter(i => i.id !== item.id)
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
      title: item.title,
      description: item.description,
      category: item.category,
      tags: item.tags,
      status: 'draft',
      isPreview: false,
      createdAt: result.createdAt,
    })
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not upscale image.'
  } finally {
    upscalingId.value = null
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
      style: style.value,
      count: 4,
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
  editPrompt.value = ''
  editMode.value = 'whole'
  editSize.value = (item.size as '1024x1024' | '1024x1792' | '1792x1024') || '1024x1024'
  editIsDrawing = false
}

function closeEdit() {
  editItem.value = null
  editIsDrawing = false
}

function syncCanvasDimensions() {
  const canvas = editCanvasRef.value
  if (!canvas) return
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
}

function clearEditCanvas() {
  const canvas = editCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx?.clearRect(0, 0, canvas.width, canvas.height)
}

function getCanvasPos(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const touch = e instanceof MouseEvent ? e : e.touches[0]
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
}

function paintAt(pos: { x: number; y: number }) {
  const canvas = editCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = 'rgba(255, 60, 60, 0.55)'
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, editBrushSize.value / 2, 0, Math.PI * 2)
  ctx.fill()
}

function onCanvasDown(e: MouseEvent | TouchEvent) {
  editIsDrawing = true
  paintAt(getCanvasPos(e, editCanvasRef.value!))
}

function onCanvasMove(e: MouseEvent | TouchEvent) {
  if (!editIsDrawing) return
  paintAt(getCanvasPos(e, editCanvasRef.value!))
}

function onCanvasUp() {
  editIsDrawing = false
}

function generateMaskBase64(): string | undefined {
  const paintCanvas = editCanvasRef.value
  if (!paintCanvas || paintCanvas.width === 0) return undefined

  const [w, h] = editSize.value.split('x').map(Number)
  const scaled = document.createElement('canvas')
  scaled.width = w
  scaled.height = h
  const scaledCtx = scaled.getContext('2d')!
  scaledCtx.drawImage(paintCanvas, 0, 0, w, h)
  const paintData = scaledCtx.getImageData(0, 0, w, h)

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = w
  maskCanvas.height = h
  const maskCtx = maskCanvas.getContext('2d')!
  const maskData = maskCtx.createImageData(w, h)
  for (let i = 0; i < paintData.data.length; i += 4) {
    if (paintData.data[i + 3] > 10) {
      maskData.data[i] = 0; maskData.data[i + 1] = 0; maskData.data[i + 2] = 0; maskData.data[i + 3] = 0
    } else {
      maskData.data[i] = 255; maskData.data[i + 1] = 255; maskData.data[i + 2] = 255; maskData.data[i + 3] = 255
    }
  }
  maskCtx.putImageData(maskData, 0, 0)
  return maskCanvas.toDataURL('image/png').split(',')[1]
}

function onAddEditToQueue() {
  const item = editItem.value
  if (!item || !editPrompt.value.trim()) return
  const maskBase64 = editMode.value === 'selection' ? generateMaskBase64() : undefined
  queueCounter += 1
  queue.value.push({
    id: `q${queueCounter}`,
    label: `Edit: ${editPrompt.value.trim().slice(0, 40)}`,
    input: { type: 'edit', sourceId: item.id, prompt: editPrompt.value.trim(), maskBase64, size: editSize.value },
    status: 'pending',
    result: null,
    error: null,
  })
  closeEdit()
  activeTab.value = 'create'
  void processQueue()
}

watch(editMode, (mode) => {
  if (mode === 'selection') void nextTick(() => { syncCanvasDimensions(); clearEditCanvas() })
})

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
              <Button size="small" :loading="pushingToMediaIds.has(item.id)" :disabled="pushingToMediaIds.has(item.id)" @click="onPushToMedia(item)">Send to Tiko Media</Button>
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
              <Button v-if="item.isPreview" size="small" variant="outline" :loading="upscalingId === item.id" :disabled="upscalingId !== null" @click="onUpscale(item)">Upscale</Button>
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

        <Button :disabled="!prompt.trim()" type="submit" block>Add to queue</Button>

        <p :class="page('hint')">Each generation creates 4 previews in <button type="button" :class="page('inline-link')" @click="viewDrafts">Drafts</button>. Pick one and Upscale it to full quality.</p>
      </form>

      <aside :class="page('queue')">
        <header :class="page('queue-head')">
          <h3 :class="page('panel-title')">Queue <span :class="page('tab-count')">{{ queue.length }}</span></h3>
          <Button v-if="queue.some(i => i.status === 'done' || i.status === 'error')" variant="ghost" size="small" @click="clearQueue">Clear done</Button>
        </header>

        <div v-if="queue.length === 0" :class="page('queue-empty')">
          No items queued. Add a prompt and click "Add to queue".
        </div>

        <ul v-else :class="page('queue-list')">
          <li v-for="item in queue" :key="item.id" :class="page('queue-item', { [item.status]: true })">
            <div :class="page('queue-status')">
              <span v-if="item.status === 'pending'">⏳</span>
              <span v-else-if="item.status === 'generating'" :class="page('queue-spinner')">⟳</span>
              <span v-else-if="item.status === 'done'">✓</span>
              <span v-else>✕</span>
            </div>
            <div :class="page('queue-info')">
              <strong :class="page('queue-label')">{{ item.label }}</strong>
              <span v-if="item.status === 'generating'" :class="page('queue-sub')">Generating…</span>
              <span v-else-if="item.status === 'error'" :class="page('queue-error')" :title="item.error ?? undefined">{{ item.error }}</span>
              <span v-else-if="item.status === 'done'" :class="page('queue-sub')">{{ item.input.type === 'enrich' ? 'Enriched' : Array.isArray(item.result) ? `${item.result.length} images — check Drafts` : 'Done — check Drafts' }}</span>
            </div>
            <img v-if="item.result && !Array.isArray(item.result)" :class="page('queue-thumb')" :src="imageSrc(item.result)" :alt="item.label" />
            <div v-else-if="Array.isArray(item.result)" style="display:flex;gap:2px;">
              <img v-for="r in item.result.slice(0, 4)" :key="r.id" :class="page('queue-thumb')" :src="imageSrc(r)" :alt="item.label" />
            </div>
            <button v-if="item.status === 'error'" type="button" :class="page('queue-retry')" @click="retryQueueItem(item)">Retry</button>
          </li>
        </ul>
      </aside>
    </section>
  </section>

  <div v-if="editItem" class="image-edit-modal" @click.self="closeEdit">
    <div class="image-edit-modal__panel">
      <header class="image-edit-modal__header">
        <h3 class="image-edit-modal__title">Edit image</h3>
        <button type="button" class="image-edit-modal__close" aria-label="Close" @click="closeEdit">✕</button>
      </header>
      <div class="image-edit-modal__body">
        <div class="image-edit-modal__image-side">
          <div class="image-edit-modal__image-wrap">
            <img class="image-edit-modal__image" :src="imageSrc(editItem)" :alt="editItem.prompt" />
            <canvas
              v-if="editMode === 'selection'"
              ref="editCanvasRef"
              class="image-edit-modal__canvas"
              @mousedown="onCanvasDown"
              @mousemove="onCanvasMove"
              @mouseup="onCanvasUp"
              @mouseleave="onCanvasUp"
              @touchstart.prevent="onCanvasDown"
              @touchmove.prevent="onCanvasMove"
              @touchend="onCanvasUp"
            />
          </div>
          <div v-if="editMode === 'selection'" class="image-edit-modal__brush-controls">
            <span class="image-edit-modal__brush-label">Brush {{ editBrushSize }}px</span>
            <input v-model.number="editBrushSize" type="range" min="5" max="100" step="5" class="image-edit-modal__brush-range" />
            <button type="button" class="image-edit-modal__clear-btn" @click="clearEditCanvas">Clear</button>
          </div>
        </div>
        <div class="image-edit-modal__controls-side">
          <div class="image-edit-modal__mode-toggle">
            <button
              type="button"
              :class="['image-edit-modal__mode-btn', { 'image-edit-modal__mode-btn--active': editMode === 'whole' }]"
              @click="editMode = 'whole'"
            >Whole image</button>
            <button
              type="button"
              :class="['image-edit-modal__mode-btn', { 'image-edit-modal__mode-btn--active': editMode === 'selection' }]"
              @click="editMode = 'selection'"
            >Select area</button>
          </div>
          <p v-if="editMode === 'selection'" class="image-edit-modal__hint">
            Paint over the region you want to change. The red overlay marks the edit area.
          </p>
          <label class="image-edit-modal__field">
            <span class="image-edit-modal__field-label">What should change?</span>
            <textarea
              v-model="editPrompt"
              class="image-edit-modal__textarea"
              placeholder="Describe the edit, e.g. 'Make the sky orange' or 'Add a hat to the character'"
              rows="4"
            />
          </label>
          <label class="image-edit-modal__field">
            <span class="image-edit-modal__field-label">Output size</span>
            <select v-model="editSize" class="image-edit-modal__select">
              <option value="1024x1024">Square (1024×1024)</option>
              <option value="1024x1792">Portrait (1024×1792)</option>
              <option value="1792x1024">Landscape (1792×1024)</option>
            </select>
          </label>
          <Button block :disabled="!editPrompt.trim()" @click="onAddEditToQueue">Add to edit queue</Button>
        </div>
      </div>
    </div>
  </div>
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
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--space-m);
    align-items: start;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  &__queue {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
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

.image-edit-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  padding: var(--space-m);

  &__panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-m);
    width: 100%;
    max-width: 760px;
    max-height: 92vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-m);
    border-bottom: 1px solid var(--admin-border);
    flex-shrink: 0;
  }

  &__title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__close {
    border: 0;
    background: transparent;
    color: var(--admin-text-muted);
    font-size: var(--font-size-m);
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--border-radius-xs);
    line-height: 1;

    &:hover {
      background: var(--admin-nav-hover);
      color: var(--admin-text);
    }
  }

  &__body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-m);
    padding: var(--space-m);

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }

  &__image-side {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__image-wrap {
    position: relative;
    border-radius: var(--border-radius-s);
    overflow: hidden;
    @include checkeredBackground;
  }

  &__image {
    display: block;
    width: 100%;
    height: auto;
  }

  &__canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    cursor: crosshair;
    touch-action: none;
  }

  &__brush-controls {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  &__brush-label {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
    white-space: nowrap;
    min-width: 72px;
  }

  &__brush-range {
    flex: 1;
    accent-color: var(--color-primary);
  }

  &__clear-btn {
    border: 1px solid var(--admin-border);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font: inherit;
    font-size: var(--font-size-xs);
    padding: var(--space-xs) var(--space-s);
    border-radius: var(--border-radius-xs);
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      border-color: var(--admin-border-strong);
    }
  }

  &__controls-side {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  &__mode-toggle {
    display: flex;
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-xs);
    gap: var(--space-xs);
  }

  &__mode-btn {
    flex: 1;
    padding: var(--space-s);
    border: 0;
    background: transparent;
    color: var(--admin-text-muted);
    font: inherit;
    font-size: var(--font-size-s);
    border-radius: var(--border-radius-xs);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;

    &:hover {
      background: var(--admin-nav-hover);
      color: var(--admin-text);
    }

    &--active {
      background: var(--admin-surface);
      color: var(--admin-text);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
  }

  &__hint {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    line-height: 1.5;
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-xs);
    padding: var(--space-s);
    margin: 0;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__field-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font: inherit;
    font-size: var(--font-size-s);
    resize: vertical;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
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
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
