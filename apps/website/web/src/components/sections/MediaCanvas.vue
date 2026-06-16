<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Hero canvas: a drifting field of Tiko Media image tiles that respond to the
 * cursor (parallax + gentle repulsion). Honors prefers-reduced-motion (static).
 */
const props = withDefaults(defineProps<{ count?: number }>(), { count: 14 })

const MEDIA_API = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_MEDIA_API_URL
  ?? 'https://media.tikoapi.org/v1'

// Fallback imagery if the media API is unreachable.
const FALLBACK = [
  'https://media.tikoapi.org/v1/media/c8bfb9e8-0427-4cd9-89e2-74e09d20b8ec/download',
  'https://media.tikoapi.org/v1/media/eecf2917-a885-4025-a762-9c7a8783f5af/download',
  'https://media.tikoapi.org/v1/media/e37943b4-582c-40ee-be3a-c47be7c6e658/download',
  'https://media.tikoapi.org/v1/media/c2e7188c-1ac4-41d6-a29c-2b122ec812e8/download',
  'https://media.tikoapi.org/v1/media/ec6bad5e-8cbe-4934-b1c8-d66d80098f95/download',
  'https://media.tikoapi.org/v1/media/da85b30b-6865-41ef-9b75-71e46999de22/download',
]

const canvas = ref<HTMLCanvasElement | null>(null)

interface Tile {
  img: HTMLImageElement
  bx: number; by: number      // base position (0..1 of canvas)
  size: number                // 0..1 of min dimension
  depth: number               // parallax depth 0.2..1
  phase: number; speed: number
  x: number; y: number        // current px
}

let tiles: Tile[] = []
let raf = 0
let running = false
let dpr = 1
let pointer = { x: -1, y: -1, active: false }
let observer: IntersectionObserver | null = null
const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function fetchUrls(): Promise<string[]> {
  try {
    const res = await fetch(`${MEDIA_API}/media?type=image&limit=${props.count * 2}&page=1`)
    if (!res.ok) throw new Error(String(res.status))
    const body = await res.json() as { data?: Array<{ id?: string; original_url?: string }> }
    const urls = (body.data ?? [])
      .map((m) => m.original_url || (m.id ? `${MEDIA_API}/media/${m.id}/download` : ''))
      .filter(Boolean)
    return urls.length ? urls : FALLBACK
  } catch {
    return FALLBACK
  }
}

function resize() {
  const c = canvas.value
  if (!c) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = c.getBoundingClientRect()
  c.width = Math.max(1, Math.floor(rect.width * dpr))
  c.height = Math.max(1, Math.floor(rect.height * dpr))
}

function drawRoundedImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size: number) {
  const r = size * 0.28
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, r)
  ctx.closePath()
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = size * 0.18
  ctx.shadowOffsetY = size * 0.08
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.clip()
  // cover-fit the image into the square
  const s = Math.min(img.width, img.height)
  ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, x, y, size, size)
  ctx.restore()
}

function frame(t: number) {
  const c = canvas.value
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return
  const W = c.width, H = c.height
  const min = Math.min(W, H)
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'

  const px = pointer.active ? pointer.x * dpr : W / 2
  const py = pointer.active ? pointer.y * dpr : H * 0.4

  for (const tile of tiles) {
    const size = tile.size * min
    // slow drift + parallax toward/away from pointer
    const drift = reduceMotion ? 0 : Math.sin(t * 0.00018 * tile.speed + tile.phase) * min * 0.02
    const par = (1 - tile.depth) * 0.06
    let cx = tile.bx * W + (px - W / 2) * par
    let cy = tile.by * H + drift + (py - H / 2) * par
    // gentle repulsion near the pointer
    if (pointer.active) {
      const dx = cx - px, dy = cy - py
      const dist = Math.hypot(dx, dy)
      const radius = min * 0.34
      if (dist < radius && dist > 0.001) {
        const push = (1 - dist / radius) * min * 0.10 * tile.depth
        cx += (dx / dist) * push
        cy += (dy / dist) * push
      }
    }
    tile.x = cx; tile.y = cy
    drawRoundedImage(ctx, tile.img, cx - size / 2, cy - size / 2, size)
  }

  if (running && !reduceMotion) raf = requestAnimationFrame(frame)
}

function start() {
  if (running) return
  running = true
  raf = requestAnimationFrame(frame)
}
function stop() {
  running = false
  cancelAnimationFrame(raf)
}

function onPointer(e: PointerEvent) {
  const c = canvas.value
  if (!c) return
  const rect = c.getBoundingClientRect()
  pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true }
  if (reduceMotion) requestAnimationFrame(frame)
}
function onLeave() { pointer.active = false }

onMounted(async () => {
  const urls = await fetchUrls()
  const imgs = (await Promise.all(urls.map(loadImage))).filter(Boolean) as HTMLImageElement[]
  if (!imgs.length) return
  // scatter tiles across the canvas with varied size/depth
  tiles = Array.from({ length: Math.min(props.count, Math.max(6, imgs.length * 2)) }, (_, i) => {
    const cols = 5
    const row = Math.floor(i / cols), col = i % cols
    const jitter = (n: number) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1
    return {
      img: imgs[i % imgs.length],
      bx: (col + 0.5) / cols + (Math.abs(jitter(1)) - 0.5) * 0.12,
      by: (row + 0.5) / 3 + (Math.abs(jitter(2)) - 0.5) * 0.18,
      size: 0.12 + Math.abs(jitter(3)) * 0.12,
      depth: 0.3 + Math.abs(jitter(4)) * 0.7,
      phase: Math.abs(jitter(5)) * Math.PI * 2,
      speed: 0.6 + Math.abs(jitter(6)) * 1.2,
      x: 0, y: 0,
    }
  })
  resize()
  window.addEventListener('resize', resize)
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) start()
    else stop()
  })
  if (canvas.value) observer.observe(canvas.value)
  requestAnimationFrame(frame) // initial paint (covers reduced-motion)
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', resize)
  observer?.disconnect()
})
</script>

<template>
  <canvas
    ref="canvas"
    class="media-canvas"
    aria-hidden="true"
    @pointermove="onPointer"
    @pointerleave="onLeave"
  />
</template>

<style lang="scss">
.media-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>
