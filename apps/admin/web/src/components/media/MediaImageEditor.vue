<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, Icon } from '@sil/ui'
import {
  containPlacement,
  IDENTITY_PLACEMENT,
  MaskHistory,
  maskedFileName,
  placementRect,
  stackBottomFirst,
  viewToImagePoint,
  type LayerOrder,
  type LayerPlacement,
  type MaskLayerId,
  type MaskTool,
  type Size,
} from './imageMaskEditor'

const props = defineProps<{
  /** What is being edited, used for the heading and the exported filename. */
  name: string
  /** Full-resolution, CORS-readable URL of the picture to edit. */
  sourceUrl: string
  saving?: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'save', payload: { blob: Blob; mode: 'replace' | 'new' }): void
}>()

const bemm = useBemm('media-image-editor', { return: 'string', includeBaseClass: true })

interface EditorLayer {
  source: HTMLImageElement | null
  /** Alpha-only canvas in editor space: opaque where the layer shows through. */
  mask: HTMLCanvasElement | null
  placement: LayerPlacement
  visible: boolean
  label: string
}

const MAX_TOOL_ZOOM = 4
const MIN_TOOL_ZOOM = 0.1

const layers = reactive<Record<MaskLayerId, EditorLayer>>({
  base: { source: null, mask: null, placement: { ...IDENTITY_PLACEMENT }, visible: true, label: 'Current image' },
  overlay: { source: null, mask: null, placement: { ...IDENTITY_PLACEMENT }, visible: true, label: 'Uploaded image' },
})

const canvasSize = ref<Size>({ width: 0, height: 0 })
const order = ref<LayerOrder>('base-on-top')
const activeLayer = ref<MaskLayerId>('base')
const tool = ref<MaskTool | 'move'>('erase')
const brushSize = ref(40)
const zoom = ref(1)
const loading = ref(true)
const loadError = ref<string | null>(null)
const exportError = ref<string | null>(null)

const displayCanvas = ref<HTMLCanvasElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const overlayInput = ref<HTMLInputElement | null>(null)

interface MaskSnapshot {
  layer: MaskLayerId
  alpha: Uint8ClampedArray
}

const history = new MaskHistory<MaskSnapshot>()
const undoDepth = ref(0)
const redoDepth = ref(0)
let scratch: HTMLCanvasElement | null = null
let overlayObjectUrl: string | null = null
let strokeFrom: { x: number; y: number } | null = null
let movingFrom: { x: number; y: number } | null = null

const hasOverlay = computed(() => layers.overlay.source !== null)
const canUndo = computed(() => undoDepth.value > 0)
const canRedo = computed(() => redoDepth.value > 0)
const displayWidth = computed(() => Math.round(canvasSize.value.width * zoom.value))
const canMoveActiveLayer = computed(() => activeLayer.value === 'overlay' && hasOverlay.value)

/**
 * A ring cursor the exact size of the stroke, so the operator can see what a click
 * will cover before making it. Browsers refuse cursors past 128px, so beyond that
 * the plain crosshair stands in.
 */
const brushCursor = computed(() => {
  const size = brushSize.value * zoom.value
  if (size > 128) return 'crosshair'
  const diameter = Math.max(6, size)
  const half = diameter / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">`
    + `<circle cx="${half}" cy="${half}" r="${Math.max(1, half - 1.5)}" fill="none" stroke="black" stroke-width="2"/>`
    + `<circle cx="${half}" cy="${half}" r="${Math.max(1, half - 1.5)}" fill="none" stroke="white" stroke-width="1"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${half} ${half}, crosshair`
})

/** Mirrors the history's depths into refs, because the class itself is not reactive. */
function syncHistory() {
  undoDepth.value = history.undoDepth
  redoDepth.value = history.redoDepth
}

function makeCanvas(size: Size): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  return canvas
}

/** A mask that hides nothing: the layer starts fully visible and is carved back. */
function makeFullMask(size: Size): HTMLCanvasElement {
  const canvas = makeCanvas(size)
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = '#fff'
    context.fillRect(0, 0, size.width, size.height)
  }
  return canvas
}

function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    // The export reads the canvas back, so an image the browser considers
    // cross-origin without permission would poison it.
    if (crossOrigin) image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load the image.'))
    image.src = src
  })
}

async function loadBase() {
  loading.value = true
  loadError.value = null
  try {
    const image = await loadImage(props.sourceUrl, true)
    const size = { width: image.naturalWidth, height: image.naturalHeight }
    if (!size.width || !size.height) throw new Error('The image reported no dimensions.')
    canvasSize.value = size
    scratch = makeCanvas(size)
    // markRaw: a canvas or image behind a deep reactive proxy stops behaving like
    // the element the 2D context expects.
    layers.base.source = markRaw(image)
    layers.base.mask = markRaw(makeFullMask(size))
    layers.base.placement = { ...IDENTITY_PLACEMENT }
    history.clear()
    syncHistory()
    await fitToViewport()
    render()
  } catch (error) {
    loadError.value = error instanceof Error
      ? `${error.message} The editor needs to read the picture's pixels, which needs a CORS-readable source.`
      : 'Could not load the image.'
  } finally {
    loading.value = false
  }
}

async function fitToViewport() {
  await new Promise(resolve => requestAnimationFrame(resolve))
  const available = viewport.value?.clientWidth ?? 0
  if (!available || !canvasSize.value.width) return
  // Never zoom past 1:1 on open — enlarging a small icon just hides how coarse it is.
  zoom.value = Math.max(MIN_TOOL_ZOOM, Math.min(1, available / canvasSize.value.width))
}

function render() {
  const canvas = displayCanvas.value
  const size = canvasSize.value
  if (!canvas || !scratch || !size.width) return
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  const scratchContext = scratch.getContext('2d')
  if (!context || !scratchContext) return

  context.clearRect(0, 0, size.width, size.height)
  for (const id of stackBottomFirst(order.value)) {
    const layer = layers[id]
    if (!layer.source || !layer.mask || !layer.visible) continue
    scratchContext.globalCompositeOperation = 'source-over'
    scratchContext.clearRect(0, 0, size.width, size.height)
    const rect = placementRect(
      { width: layer.source.naturalWidth, height: layer.source.naturalHeight },
      layer.placement,
    )
    scratchContext.drawImage(layer.source, rect.x, rect.y, rect.width, rect.height)
    scratchContext.globalCompositeOperation = 'destination-in'
    scratchContext.drawImage(layer.mask, 0, 0)
    context.drawImage(scratch, 0, 0)
  }
}

function readAlpha(mask: HTMLCanvasElement): Uint8ClampedArray {
  const context = mask.getContext('2d', { willReadFrequently: true })
  if (!context) return new Uint8ClampedArray(0)
  const pixels = context.getImageData(0, 0, mask.width, mask.height).data
  const alpha = new Uint8ClampedArray(mask.width * mask.height)
  for (let index = 0; index < alpha.length; index += 1) alpha[index] = pixels[index * 4 + 3]
  return alpha
}

function writeAlpha(mask: HTMLCanvasElement, alpha: Uint8ClampedArray) {
  const context = mask.getContext('2d')
  if (!context || alpha.length !== mask.width * mask.height) return
  const image = context.createImageData(mask.width, mask.height)
  for (let index = 0; index < alpha.length; index += 1) {
    image.data[index * 4] = 255
    image.data[index * 4 + 1] = 255
    image.data[index * 4 + 2] = 255
    image.data[index * 4 + 3] = alpha[index]
  }
  context.putImageData(image, 0, 0)
}

function snapshotActiveLayer() {
  const mask = layers[activeLayer.value].mask
  if (!mask) return
  history.record({ layer: activeLayer.value, alpha: readAlpha(mask) })
  syncHistory()
}

/**
 * Steps the history in one direction. Each snapshot names the layer it belongs to,
 * so a step lands where the stroke did even if the operator has since switched
 * layers — which is why the target has to be peeked before it is consumed.
 */
function step(direction: 'undo' | 'redo') {
  const target = direction === 'undo' ? history.peekUndo() : history.peekRedo()
  if (!target) return
  const mask = layers[target.layer].mask
  if (!mask) return
  const current: MaskSnapshot = { layer: target.layer, alpha: readAlpha(mask) }
  const entry = direction === 'undo' ? history.undo(current) : history.redo(current)
  if (!entry) return
  writeAlpha(mask, entry.alpha)
  activeLayer.value = entry.layer
  syncHistory()
  render()
}

function undo() {
  step('undo')
}

function redo() {
  step('redo')
}

/** The active layer's mask context, set up for the current tool. */
function maskContext(): CanvasRenderingContext2D | null {
  const context = layers[activeLayer.value].mask?.getContext('2d')
  if (!context) return null
  // Erasing subtracts from the mask; restoring adds back to it.
  context.globalCompositeOperation = tool.value === 'erase' ? 'destination-out' : 'source-over'
  context.fillStyle = '#fff'
  context.strokeStyle = '#fff'
  context.lineWidth = brushSize.value
  context.lineCap = 'round'
  context.lineJoin = 'round'
  return context
}

/** A single brush mark. A zero-length stroke draws nothing, so a click needs its own path. */
function dab(point: { x: number; y: number }) {
  const context = maskContext()
  if (!context) return
  context.beginPath()
  context.arc(point.x, point.y, brushSize.value / 2, 0, Math.PI * 2)
  context.fill()
  render()
}

function paintTo(point: { x: number; y: number }) {
  const context = maskContext()
  if (!context || !strokeFrom) return
  context.beginPath()
  context.moveTo(strokeFrom.x, strokeFrom.y)
  context.lineTo(point.x, point.y)
  context.stroke()
  strokeFrom = point
  render()
}

function pointerPoint(event: PointerEvent): { x: number; y: number } {
  const canvas = displayCanvas.value
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  return viewToImagePoint({ x: event.clientX, y: event.clientY }, rect, canvasSize.value)
}

function onPointerDown(event: PointerEvent) {
  if (loading.value || loadError.value) return
  const layer = layers[activeLayer.value]
  if (!layer.source || !layer.mask) return
  const point = pointerPoint(event)
  ;(event.target as HTMLElement).setPointerCapture(event.pointerId)

  if (tool.value === 'move') {
    if (!canMoveActiveLayer.value) return
    movingFrom = point
    return
  }
  snapshotActiveLayer()
  strokeFrom = point
  dab(point)
}

function onPointerMove(event: PointerEvent) {
  const point = pointerPoint(event)
  if (movingFrom) {
    const layer = layers[activeLayer.value]
    layer.placement = {
      ...layer.placement,
      offsetX: layer.placement.offsetX + (point.x - movingFrom.x),
      offsetY: layer.placement.offsetY + (point.y - movingFrom.y),
    }
    movingFrom = point
    render()
    return
  }
  if (!strokeFrom) return
  paintTo(point)
}

function onPointerUp(event: PointerEvent) {
  const target = event.target as HTMLElement
  if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId)
  strokeFrom = null
  movingFrom = null
}

async function onOverlayChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (overlayObjectUrl) URL.revokeObjectURL(overlayObjectUrl)
  overlayObjectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(overlayObjectUrl, false)
    layers.overlay.source = markRaw(image)
    layers.overlay.mask = markRaw(makeFullMask(canvasSize.value))
    layers.overlay.placement = containPlacement(
      { width: image.naturalWidth, height: image.naturalHeight },
      canvasSize.value,
    )
    layers.overlay.visible = true
    activeLayer.value = 'base'
    tool.value = 'erase'
    render()
  } catch {
    loadError.value = 'Could not read that file as an image.'
  } finally {
    if (overlayInput.value) overlayInput.value.value = ''
  }
}

function removeOverlay() {
  layers.overlay.source = null
  layers.overlay.mask = null
  layers.overlay.placement = { ...IDENTITY_PLACEMENT }
  if (overlayObjectUrl) {
    URL.revokeObjectURL(overlayObjectUrl)
    overlayObjectUrl = null
  }
  if (activeLayer.value === 'overlay') activeLayer.value = 'base'
  order.value = 'base-on-top'
  render()
}

function resetMask(id: MaskLayerId) {
  const layer = layers[id]
  if (!layer.mask) return
  history.record({ layer: id, alpha: readAlpha(layer.mask) })
  syncHistory()
  layer.mask = markRaw(makeFullMask(canvasSize.value))
  render()
}

function resetPlacement() {
  const source = layers.overlay.source
  if (!source) return
  layers.overlay.placement = containPlacement(
    { width: source.naturalWidth, height: source.naturalHeight },
    canvasSize.value,
  )
  render()
}

function setOverlayScale(value: number) {
  const source = layers.overlay.source
  if (!source) return
  const previous = layers.overlay.placement
  const rectBefore = placementRect({ width: source.naturalWidth, height: source.naturalHeight }, previous)
  const centreX = rectBefore.x + rectBefore.width / 2
  const centreY = rectBefore.y + rectBefore.height / 2
  // Scale about the layer's own centre, so it does not crawl away from the subject.
  layers.overlay.placement = {
    scale: value,
    offsetX: centreX - (source.naturalWidth * value) / 2,
    offsetY: centreY - (source.naturalHeight * value) / 2,
  }
  render()
}

function toggleOrder() {
  order.value = order.value === 'base-on-top' ? 'overlay-on-top' : 'base-on-top'
  render()
}

function toggleLayerVisible(id: MaskLayerId) {
  layers[id].visible = !layers[id].visible
  render()
}

function selectLayer(id: MaskLayerId) {
  activeLayer.value = id
  if (tool.value === 'move' && id !== 'overlay') tool.value = 'erase'
}

function exportBlob(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = displayCanvas.value
    if (!canvas) {
      reject(new Error('The editor canvas is not ready.'))
      return
    }
    try {
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('The browser could not encode the edited image.'))
      }, 'image/png')
    } catch {
      reject(new Error('The browser refused to read the canvas back, because the source image was not served with CORS headers.'))
    }
  })
}

async function save(mode: 'replace' | 'new') {
  exportError.value = null
  try {
    emit('save', { blob: await exportBlob(), mode })
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : 'Could not export the edited image.'
  }
}

const exportName = computed(() => maskedFileName(props.name))

watch(() => props.sourceUrl, () => {
  removeOverlay()
  void loadBase()
})

onMounted(() => {
  void loadBase()
})

onBeforeUnmount(() => {
  if (overlayObjectUrl) URL.revokeObjectURL(overlayObjectUrl)
})
</script>

<template>
  <div :class="bemm('')" @click.self="emit('close')">
    <div :class="bemm('panel')">
      <header :class="bemm('header')">
        <div :class="bemm('heading')">
          <h3 :class="bemm('title')">Edit image</h3>
          <p :class="bemm('subtitle')">
            {{ name }}
            <template v-if="canvasSize.width"> · {{ canvasSize.width }} × {{ canvasSize.height }}</template>
          </p>
        </div>
        <button type="button" :class="bemm('close')" aria-label="Close" @click="emit('close')">Close</button>
      </header>

      <div :class="bemm('body')">
        <div :class="bemm('stage')">
          <div :class="bemm('toolbar')">
            <div :class="bemm('tools')" role="group" aria-label="Tool">
              <button
                type="button"
                :class="bemm('tool', { active: tool === 'erase' })"
                title="Erase — cut the active layer away so the layer beneath shows through"
                @click="tool = 'erase'"
              >Erase</button>
              <button
                type="button"
                :class="bemm('tool', { active: tool === 'restore' })"
                title="Restore — paint the active layer back where it was erased"
                @click="tool = 'restore'"
              >Restore</button>
              <button
                type="button"
                :class="bemm('tool', { active: tool === 'move' })"
                :disabled="!canMoveActiveLayer"
                title="Move — drag the uploaded layer into alignment"
                @click="tool = 'move'"
              >Move</button>
            </div>

            <label :class="bemm('slider')">
              <span :class="bemm('slider-label')">Brush {{ brushSize }}px</span>
              <input v-model.number="brushSize" type="range" min="2" max="300" step="1" :class="bemm('range')" />
            </label>

            <label :class="bemm('slider')">
              <span :class="bemm('slider-label')">Zoom {{ Math.round(zoom * 100) }}%</span>
              <input
                v-model.number="zoom"
                type="range"
                :min="MIN_TOOL_ZOOM"
                :max="MAX_TOOL_ZOOM"
                step="0.05"
                :class="bemm('range')"
              />
            </label>

            <div :class="bemm('history')">
              <button type="button" :class="bemm('icon-btn')" :disabled="!canUndo" title="Undo" @click="undo">
                <Icon name="arrows/arrow-headed-corner-left" size="small" aria-hidden="true" />
              </button>
              <button type="button" :class="bemm('icon-btn')" :disabled="!canRedo" title="Redo" @click="redo">
                <Icon name="arrows/arrow-headed-corner-right" size="small" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div ref="viewport" :class="bemm('viewport')">
            <p v-if="loading" :class="bemm('status')" role="status">Loading image…</p>
            <p v-else-if="loadError" :class="bemm('status', { error: true })" role="alert">{{ loadError }}</p>
            <div
              v-show="!loading && !loadError"
              :class="bemm('canvas-wrap')"
              :style="{ width: `${displayWidth}px` }"
            >
              <canvas
                ref="displayCanvas"
                :class="bemm('canvas')"
                :style="{ cursor: tool === 'move' ? 'grab' : brushCursor }"
                @pointerdown.prevent="onPointerDown"
                @pointermove.prevent="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerUp"
              />
            </div>
          </div>
        </div>

        <aside :class="bemm('side')">
          <section :class="bemm('section')">
            <h4 :class="bemm('section-title')">Layers</h4>
            <p :class="bemm('hint')">
              Erasing the top layer reveals the one below it. To repair an over-removed background,
              upload the original underneath and erase or restore against it.
            </p>

            <ul :class="bemm('layers')">
              <li
                v-for="id in stackBottomFirst(order).slice().reverse()"
                :key="id"
                :class="bemm('layer', { active: activeLayer === id, empty: !layers[id].source })"
              >
                <button
                  type="button"
                  :class="bemm('layer-select')"
                  :disabled="!layers[id].source"
                  @click="selectLayer(id)"
                >
                  <span :class="bemm('layer-name')">{{ layers[id].label }}</span>
                  <span v-if="!layers[id].source" :class="bemm('layer-note')">Not loaded</span>
                  <span v-else-if="activeLayer === id" :class="bemm('layer-note')">Editing</span>
                </button>
                <button
                  type="button"
                  :class="bemm('icon-btn')"
                  :disabled="!layers[id].source"
                  :title="layers[id].visible ? 'Hide layer' : 'Show layer'"
                  @click="toggleLayerVisible(id)"
                >
                  <Icon :name="layers[id].visible ? 'ui/visible-m' : 'ui/invisible-m'" size="small" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  :class="bemm('icon-btn')"
                  :disabled="!layers[id].source"
                  title="Reset this layer's mask"
                  @click="resetMask(id)"
                >
                  <Icon name="arrows/arrow-reload-down-up" size="small" aria-hidden="true" />
                </button>
              </li>
            </ul>

            <div :class="bemm('layer-actions')">
              <input
                ref="overlayInput"
                :class="bemm('file-input')"
                type="file"
                accept="image/*"
                @change="onOverlayChange"
              />
              <Button v-if="hasOverlay" variant="outline" size="small" @click="toggleOrder">
                {{ order === 'base-on-top' ? 'Bring upload to front' : 'Send upload behind' }}
              </Button>
              <Button v-if="hasOverlay" variant="outline" size="small" @click="removeOverlay">Remove upload</Button>
            </div>
          </section>

          <section v-if="hasOverlay" :class="bemm('section')">
            <h4 :class="bemm('section-title')">Uploaded layer placement</h4>
            <label :class="bemm('slider')">
              <span :class="bemm('slider-label')">Scale {{ layers.overlay.placement.scale.toFixed(2) }}×</span>
              <input
                :value="layers.overlay.placement.scale"
                type="range"
                min="0.05"
                max="4"
                step="0.01"
                :class="bemm('range')"
                @input="setOverlayScale(Number(($event.target as HTMLInputElement).value))"
              />
            </label>
            <Button variant="outline" size="small" @click="resetPlacement">Fit to canvas</Button>
            <p :class="bemm('hint')">
              Position the upload before you mask it — the mask is painted in canvas space and
              does not follow the layer.
            </p>
          </section>

          <section :class="bemm('section')">
            <h4 :class="bemm('section-title')">Save</h4>
            <p v-if="exportError" :class="bemm('error')" role="alert">{{ exportError }}</p>
            <p :class="bemm('hint')">Exported as {{ exportName }}, transparency preserved.</p>
            <Button block :loading="saving" :disabled="loading || !!loadError || saving" @click="save('replace')">
              Replace this image
            </Button>
            <Button
              block
              variant="outline"
              :loading="saving"
              :disabled="loading || !!loadError || saving"
              @click="save('new')"
            >
              Save as a new asset
            </Button>
            <p :class="bemm('hint')">Replacing keeps the media id, so apps that reference it keep working.</p>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use '../../styles/mixins' as *;

.media-image-editor {
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
    max-width: 1200px;
    max-height: 94vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-m);
    padding: var(--space-m);
    border-bottom: 1px solid var(--admin-border);
    flex-shrink: 0;
  }

  &__title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__subtitle {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    margin: 0;
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
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: var(--space-m);
    padding: var(--space-m);
    overflow: hidden;
    min-height: 0;

    @media (max-width: 900px) {
      grid-template-columns: minmax(0, 1fr);
      overflow-y: auto;
    }
  }

  &__stage {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    min-height: 0;
    min-width: 0;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-s);
  }

  &__tools {
    display: flex;
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-xs);
    gap: var(--space-xs);
  }

  &__tool {
    padding: var(--space-xs) var(--space-s);
    border: 0;
    background: transparent;
    color: var(--admin-text-muted);
    font: inherit;
    font-size: var(--font-size-s);
    border-radius: var(--border-radius-xs);
    cursor: pointer;

    &:hover:not(:disabled) {
      background: var(--admin-nav-hover);
      color: var(--admin-text);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &--active {
      background: var(--admin-surface);
      color: var(--admin-text);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
  }

  &__slider {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    min-width: 180px;
    flex: 1;
  }

  &__slider-label {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
    white-space: nowrap;
    min-width: 92px;
  }

  &__range {
    flex: 1;
    accent-color: var(--color-primary);
  }

  &__history {
    display: flex;
    gap: var(--space-xs);
  }

  &__icon-btn {
    border: 1px solid var(--admin-border);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    border-radius: var(--border-radius-xs);
    padding: var(--space-xs);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover:not(:disabled) {
      border-color: var(--admin-border-strong);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &__viewport {
    flex: 1;
    min-height: 0;
    overflow: auto;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    background: var(--admin-page-bg);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: var(--space-s);
  }

  &__status {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    margin: auto;
    text-align: center;
    max-width: 46ch;

    &--error {
      color: var(--color-error, #c0392b);
    }
  }

  &__canvas-wrap {
    --block-size: 16px;
    @include checkeredBackground;
    flex-shrink: 0;
    line-height: 0;
  }

  &__canvas {
    display: block;
    width: 100%;
    height: auto;
    touch-action: none;
  }

  &__side {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
    overflow-y: auto;
    min-height: 0;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__hint {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    line-height: 1.5;
    margin: 0;
  }

  &__error {
    color: var(--color-error, #c0392b);
    font-size: var(--font-size-xs);
    line-height: 1.5;
    margin: 0;
  }

  &__layers {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    list-style: none;
    padding: 0;
    margin: 0;
  }

  &__layer {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-xs);

    &--active {
      border-color: var(--color-primary);
    }

    &--empty {
      opacity: 0.55;
    }
  }

  &__layer-select {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
    color: var(--admin-text);
    padding: var(--space-xs);

    &:disabled {
      cursor: not-allowed;
    }
  }

  &__layer-name {
    font-size: var(--font-size-s);
  }

  &__layer-note {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
  }

  &__layer-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__file-input {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
  }
}
</style>
