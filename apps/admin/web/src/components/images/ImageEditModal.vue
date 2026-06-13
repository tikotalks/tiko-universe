<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import type { ImageGalleryItem } from '../../composables/useImageGeneration'

type ImageEditSize = '1024x1024' | '1024x1792' | '1792x1024'
type ImageEditMode = 'whole' | 'selection'

const props = defineProps<{
  item: ImageGalleryItem
  imageSrc: (item: ImageGalleryItem) => string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', input: { sourceId: string; prompt: string; maskBase64?: string; size: ImageEditSize }): void
}>()

const modal = useBemm('image-edit-modal', { return: 'string', includeBaseClass: true })

const editPrompt = ref('')
const editMode = ref<ImageEditMode>('whole')
const editSize = ref<ImageEditSize>('1024x1024')
const editBrushSize = ref(30)
const editCanvasRef = ref<HTMLCanvasElement | null>(null)
let editIsDrawing = false

function resetForItem(item: ImageGalleryItem) {
  editPrompt.value = ''
  editMode.value = 'whole'
  editSize.value = (item.size as ImageEditSize) || '1024x1024'
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
  if (!editCanvasRef.value) return
  editIsDrawing = true
  paintAt(getCanvasPos(e, editCanvasRef.value))
}

function onCanvasMove(e: MouseEvent | TouchEvent) {
  if (!editIsDrawing || !editCanvasRef.value) return
  paintAt(getCanvasPos(e, editCanvasRef.value))
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
  const scaledCtx = scaled.getContext('2d')
  if (!scaledCtx) return undefined
  scaledCtx.drawImage(paintCanvas, 0, 0, w, h)
  const paintData = scaledCtx.getImageData(0, 0, w, h)

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = w
  maskCanvas.height = h
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) return undefined
  const maskData = maskCtx.createImageData(w, h)
  for (let i = 0; i < paintData.data.length; i += 4) {
    if (paintData.data[i + 3] > 10) {
      maskData.data[i] = 0
      maskData.data[i + 1] = 0
      maskData.data[i + 2] = 0
      maskData.data[i + 3] = 0
    } else {
      maskData.data[i] = 255
      maskData.data[i + 1] = 255
      maskData.data[i + 2] = 255
      maskData.data[i + 3] = 255
    }
  }
  maskCtx.putImageData(maskData, 0, 0)
  return maskCanvas.toDataURL('image/png').split(',')[1]
}

function submitEdit() {
  const prompt = editPrompt.value.trim()
  if (!prompt) return
  emit('submit', {
    sourceId: props.item.id,
    prompt,
    maskBase64: editMode.value === 'selection' ? generateMaskBase64() : undefined,
    size: editSize.value,
  })
}

watch(() => props.item, resetForItem, { immediate: true })
watch(editMode, (mode) => {
  if (mode === 'selection') void nextTick(() => { syncCanvasDimensions(); clearEditCanvas() })
})
</script>

<template>
  <div :class="modal('')" @click.self="emit('close')">
    <div :class="modal('panel')">
      <header :class="modal('header')">
        <h3 :class="modal('title')">Edit image</h3>
        <button type="button" :class="modal('close')" aria-label="Close" @click="emit('close')">Close</button>
      </header>
      <div :class="modal('body')">
        <div :class="modal('image-side')">
          <div :class="modal('image-wrap')">
            <img :class="modal('image')" :src="imageSrc(item)" :alt="item.prompt" />
            <canvas
              v-if="editMode === 'selection'"
              ref="editCanvasRef"
              :class="modal('canvas')"
              @mousedown="onCanvasDown"
              @mousemove="onCanvasMove"
              @mouseup="onCanvasUp"
              @mouseleave="onCanvasUp"
              @touchstart.prevent="onCanvasDown"
              @touchmove.prevent="onCanvasMove"
              @touchend="onCanvasUp"
            />
          </div>
          <div v-if="editMode === 'selection'" :class="modal('brush-controls')">
            <span :class="modal('brush-label')">Brush {{ editBrushSize }}px</span>
            <input v-model.number="editBrushSize" type="range" min="5" max="100" step="5" :class="modal('brush-range')" />
            <button type="button" :class="modal('clear-btn')" @click="clearEditCanvas">Clear</button>
          </div>
        </div>
        <div :class="modal('controls-side')">
          <div :class="modal('mode-toggle')">
            <button
              type="button"
              :class="modal('mode-btn', { active: editMode === 'whole' })"
              @click="editMode = 'whole'"
            >
              Whole image
            </button>
            <button
              type="button"
              :class="modal('mode-btn', { active: editMode === 'selection' })"
              @click="editMode = 'selection'"
            >
              Select area
            </button>
          </div>
          <p v-if="editMode === 'selection'" :class="modal('hint')">
            Paint over the region you want to change. The red overlay marks the edit area.
          </p>
          <label :class="modal('field')">
            <span :class="modal('field-label')">What should change?</span>
            <textarea
              v-model="editPrompt"
              :class="modal('textarea')"
              placeholder="Describe the edit, e.g. 'Make the sky orange' or 'Add a hat to the character'"
              rows="4"
            />
          </label>
          <label :class="modal('field')">
            <span :class="modal('field-label')">Output size</span>
            <select v-model="editSize" :class="modal('select')">
              <option value="1024x1024">Square (1024x1024)</option>
              <option value="1024x1792">Portrait (1024x1792)</option>
              <option value="1792x1024">Landscape (1792x1024)</option>
            </select>
          </label>
          <Button block :disabled="!editPrompt.trim()" @click="submitEdit">Add to edit queue</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use '../../styles/mixins' as *;

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
    font: inherit;
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
</style>
