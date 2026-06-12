<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useBemm } from 'bemm'
import { tikoApps } from '../content/appUniverse'
import { trustPrinciples, platformNotes, whyTikoPillars, whyFreePillars } from '../siteContent'

const bemm = useBemm('home', { return: 'string', includeBaseClass: true })

interface MediaImage {
  id: string
  title: string
  original_url: string
}

interface MediaStreamImage extends MediaImage {
  style: string
}

interface MediaApiImage {
  id: string
  title?: string
  original_url?: string
  file_name?: string
}

interface MediaApiResponse {
  data?: MediaApiImage[]
  meta?: {
    total?: number
  }
}

const mediaImages = ref<MediaStreamImage[]>([])
const mediaStream = ref<HTMLElement | null>(null)
const mediaTrack = ref<HTMLElement | null>(null)
const mediaTrackStyle = ref<Record<string, string>>({ transform: 'translateX(0px)' })

let mediaAnimationFrame = 0
let mediaLastFrame = 0
let mediaOffset = 0
let mediaVelocity = -28
let mediaLoopWidth = 0
let mediaPointerX: number | null = null
let mediaPointerY: number | null = null
let mediaStreamVisible = true
let mediaObserver: IntersectionObserver | null = null

const appImages: Record<string, MediaImage> = {
  'yes-no': {
    id: 'boy-im-hungry',
    title: 'Boy saying I am hungry',
    original_url: 'https://data.tikocdn.org/uploads/1754856272700-boy-im-hungry.png',
  },
  type: {
    id: 'mechanical-keyboard',
    title: 'Mechanical Keyboard',
    original_url: 'https://data.tikocdn.org/uploads/1754986243669-mechanical-keyboard.png',
  },
  cards: {
    id: 'happy-boy',
    title: 'Happy Boy',
    original_url: 'https://data.tikocdn.org/uploads/1756901925456-happy-boy-disney-pixar-style.png',
  },
  sequence: {
    id: 'sequence-icon',
    title: 'Sequence Icon',
    original_url: 'https://data.tikocdn.org/uploads/1755680504224-sequence-icon.png',
  },
  timer: {
    id: 'timer',
    title: 'Timer',
    original_url: 'https://data.tikocdn.org/uploads/1754413853153-timer2.png',
  },
}

const CDN_ORIGIN = 'data.tikocdn.org'

function cdnUrl(originalUrl: string, width = 200): string {
  try {
    const u = new URL(originalUrl)
    return `https://${CDN_ORIGIN}/cdn-cgi/image/width=${width},quality=85,f=auto${u.pathname}`
  } catch {
    return originalUrl
  }
}

function normalizeMediaImages(items: MediaApiImage[]): MediaImage[] {
  return items
    .map((item): MediaImage | null => {
      const originalUrl = item.original_url
        ?? (item.file_name ? `https://${CDN_ORIGIN}/${item.file_name}` : '')
      if (!originalUrl) return null

      return {
        id: item.id,
        title: item.title ?? 'Tiko media image',
        original_url: originalUrl,
      }
    })
    .filter((item): item is MediaImage => item !== null)
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

function buildMediaStreamImages(images: MediaImage[]): MediaStreamImage[] {
  const source = images.length ? shuffled(images) : shuffled(Object.values(appImages))

  return Array.from({ length: 50 }, (_, index) => {
    const image = source[index % source.length]
    const size = 96 + Math.round(Math.random() * 104)
    const lift = Math.round((Math.random() - 0.5) * 36)
    const rotate = Math.round((Math.random() - 0.5) * 8)

    return {
      ...image,
      id: `${image.id}-${index}`,
      style: `--tile-size: ${size}px; --tile-lift: ${lift}px; --tile-rotate: ${rotate}deg;`,
    }
  })
}

async function loadHomeImages() {
  try {
    const response = await fetch('https://media.tikoapi.org/v1/media?limit=50&type=image&page=1')

    if (response.ok) {
      const payload = await response.json() as MediaApiResponse | MediaApiImage[]
      const items = Array.isArray(payload) ? payload : (payload.data ?? [])
      const uniqueItems = Array.from(new Map(items.map(item => [item.id, item])).values())
      const normalized = normalizeMediaImages(shuffled(uniqueItems).slice(0, 50))
      mediaImages.value = buildMediaStreamImages(normalized)
      await nextTick()
      refreshMediaLoopWidth()
      return
    }
  } catch {
    // silently fail — fallback stream shown
  }

  mediaImages.value = buildMediaStreamImages([])
  await nextTick()
  refreshMediaLoopWidth()
}

function refreshMediaLoopWidth() {
  mediaLoopWidth = Math.max(1, (mediaTrack.value?.scrollWidth ?? 0) / 2)
}

function wrapMediaOffset() {
  if (!mediaLoopWidth) return
  while (mediaOffset <= -mediaLoopWidth) mediaOffset += mediaLoopWidth
  while (mediaOffset > 0) mediaOffset -= mediaLoopWidth
}

function setMediaTrackTransform() {
  mediaTrackStyle.value = { transform: `translateX(${mediaOffset}px)` }
}

function updateMediaTileInfluence() {
  const stream = mediaStream.value
  const pointerX = mediaPointerX
  const pointerY = mediaPointerY
  if (!stream || pointerX === null || pointerY === null) return

  const influenceRadius = 260
  stream.querySelectorAll<HTMLElement>('.home__media-item').forEach((item) => {
    const rect = item.getBoundingClientRect()
    const centerX = rect.left + (rect.width / 2)
    const centerY = rect.top + (rect.height / 2)
    const distance = Math.hypot(pointerX - centerX, pointerY - centerY)
    const influence = Math.max(0, 1 - (distance / influenceRadius)) ** 1.8
    item.style.setProperty('--tile-hover-scale', (1 + (influence * 0.2)).toFixed(3))
    item.style.setProperty('--tile-hover-lift', `${Math.round(influence * -14)}px`)
    item.style.zIndex = `${Math.round(influence * 20)}`
  })
}

function resetMediaTileInfluence() {
  const stream = mediaStream.value
  if (!stream) return

  stream.querySelectorAll<HTMLElement>('.home__media-item').forEach((item) => {
    item.style.removeProperty('--tile-hover-scale')
    item.style.removeProperty('--tile-hover-lift')
    item.style.removeProperty('z-index')
  })
}

function animateMediaStream(frameTime: number) {
  if (!mediaLastFrame) mediaLastFrame = frameTime
  const deltaSeconds = Math.min(0.05, (frameTime - mediaLastFrame) / 1000)
  mediaLastFrame = frameTime

  if (mediaStreamVisible) {
    mediaOffset += mediaVelocity * deltaSeconds
    wrapMediaOffset()
    setMediaTrackTransform()
  }

  mediaAnimationFrame = window.requestAnimationFrame(animateMediaStream)
}

function onMediaStreamPointerMove(event: PointerEvent) {
  mediaPointerX = event.clientX
  mediaPointerY = event.clientY

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const xRatio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const distanceFromCenter = Math.abs(xRatio - 0.5) * 2
  const speed = 18 + (distanceFromCenter * 86)
  mediaVelocity = xRatio < 0.5 ? speed : -speed
  updateMediaTileInfluence()
}

function onMediaStreamPointerLeave() {
  mediaPointerX = null
  mediaPointerY = null
  mediaVelocity = -28
  resetMediaTileInfluence()
}

onMounted(() => {
  loadHomeImages()
  window.addEventListener('resize', refreshMediaLoopWidth)
  if ('IntersectionObserver' in window) {
    mediaObserver = new IntersectionObserver((entries) => {
      mediaStreamVisible = entries.some(entry => entry.isIntersecting)
    })
    if (mediaStream.value) mediaObserver.observe(mediaStream.value)
  }
  mediaAnimationFrame = window.requestAnimationFrame(animateMediaStream)
})

onUnmounted(() => {
  window.cancelAnimationFrame(mediaAnimationFrame)
  window.removeEventListener('resize', refreshMediaLoopWidth)
  mediaObserver?.disconnect()
  mediaObserver = null
})
</script>

<template>
  <!-- Hero -->
  <section :class="bemm('hero')">
    <div :class="[bemm('hero-inner'), 'container']">
      <div :class="bemm('hero-copy')">
        <p class="eyebrow">Free. Beautiful. Any language.</p>
        <h1 :class="['display-1', bemm('hero-heading')]">
          Tiny apps for everyday moments.
        </h1>
        <p :class="['body-lg', bemm('hero-lede')]">
          Tiko is a collection of small, beautiful communication apps. Each one does one clear thing,
          opens instantly, and works in any language — with no account, no ads, and nothing in the way.
        </p>
        <div :class="bemm('hero-actions')">
          <RouterLink to="/apps/yes-no" :class="bemm('hero-btn', 'primary')">
            Try Yes No — it's free
          </RouterLink>
          <RouterLink to="/apps" :class="bemm('hero-btn', 'outline')">
            See all five apps
          </RouterLink>
        </div>
        <p :class="bemm('hero-note')">Free forever. No ads. Works on any device, in any language.</p>
      </div>

      <div :class="bemm('hero-visual')" aria-hidden="true">
        <div :class="bemm('device')">
          <div :class="bemm('device-top')">
            <span :class="bemm('device-dot')" />
            <span :class="bemm('device-dot')" style="background:#f6c85f" />
          </div>
          <p :class="bemm('device-question')">Are you hungry?</p>
          <div :class="bemm('device-choices')">
            <span :class="bemm('choice', 'yes')">Yes</span>
            <span :class="bemm('choice', 'no')">No</span>
          </div>
        </div>
        <div :class="[bemm('floating-card'), bemm('floating-card', '1')]">
          <span :class="bemm('fc-dot')" style="background:var(--app-type)" />
          <span>Type</span>
        </div>
        <div :class="[bemm('floating-card'), bemm('floating-card', '2')]">
          <span :class="bemm('fc-dot')" style="background:var(--app-cards)" />
          <span>Cards</span>
        </div>
        <div :class="[bemm('floating-card'), bemm('floating-card', '3')]">
          <span :class="bemm('fc-dot')" style="background:var(--app-timer)" />
          <span>Timer</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Why Tiko exists -->
  <section :class="[bemm('why'), 'section']">
    <div class="container">
      <div :class="bemm('why-header')">
        <p class="eyebrow">What makes Tiko different</p>
        <h2 class="display-2">Simple, beautiful, and built for every child.</h2>
        <p class="body-lg">
          Communication shouldn't have a waiting room. Every Tiko app opens in seconds, speaks any language,
          and gets out of the way — so the moment between a child and their choice is as short as possible.
        </p>
      </div>
      <div :class="bemm('why-grid')">
        <article v-for="pillar in whyTikoPillars" :key="pillar.title" :class="bemm('why-card')">
          <h3 :class="bemm('why-card-title')">{{ pillar.title }}</h3>
          <p class="body-sm">{{ pillar.body }}</p>
        </article>
      </div>
    </div>
  </section>

  <!-- App universe strip -->
  <section class="section">
    <div class="container">
      <div :class="bemm('apps-header')">
        <div>
          <p class="eyebrow">The app universe</p>
          <h2 class="display-2">One everyday moment.<br />One tiny app.</h2>
        </div>
        <RouterLink to="/apps" :class="bemm('apps-see-all')">
          View all apps →
        </RouterLink>
      </div>

      <div :class="bemm('apps-grid')">
        <RouterLink
          v-for="app in tikoApps"
          :key="app.id"
          :to="app.path"
          :class="bemm('app-card')"
          :style="{ '--app-color': app.color, '--app-color-light': app.colorLight }"
        >
          <div :class="bemm('app-card-image-wrap')">
            <img
              :src="cdnUrl(appImages[app.id].original_url, 360)"
              :alt="appImages[app.id].title"
              loading="lazy"
              :class="bemm('app-card-image')"
            />
          </div>
          <div :class="bemm('app-card-label')">
            <h3 :class="bemm('app-card-name')">{{ app.name }}</h3>
            <span
              class="badge"
              :class="app.status === 'available' ? 'badge--available' : 'badge--planned'"
            >
              {{ app.statusLabel }}
            </span>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- Trust section -->
  <section :class="[bemm('trust'), 'section']">
    <div class="container">
      <div :class="bemm('trust-layout')">
        <div :class="bemm('trust-copy')">
          <p class="eyebrow">Caregiver trust</p>
          <h2 class="display-2">Built so the first moment is help, not an account form.</h2>
          <p class="body-lg">
            You should be able to try a tool before trusting it.
            Tiko is designed so a caregiver can open an app, see whether it helps,
            and only add recovery or sync when that actually matters.
          </p>
          <RouterLink to="/caregivers" :class="bemm('trust-link')">
            Read our trust principles →
          </RouterLink>
        </div>
        <ul :class="bemm('trust-list')" aria-label="Trust principles">
          <li v-for="principle in trustPrinciples" :key="principle" :class="bemm('trust-item')">
            <span :class="bemm('trust-check')" aria-hidden="true">✓</span>
            <span>{{ principle }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <!-- Media images section -->
  <section :class="[bemm('media'), 'section']">
    <div class="container">
      <div :class="bemm('media-header')">
        <div :class="bemm('media-copy')">
          <p class="eyebrow">Familiar pictures help</p>
          <h2 :class="['display-2', bemm('media-heading')]">Images make choices easier to understand.</h2>
          <p :class="['body-lg', bemm('media-lede')]">
            Cards can use simple, recognizable images so children can choose without needing the right words first.
            The shared media library keeps those pictures ready across Tiko.
          </p>
        </div>
        <a
          href="https://media.tikoapps.org"
          :class="bemm('media-link')"
          target="_blank"
          rel="noopener"
        >
          Open Tiko Media →
        </a>
      </div>

      <div
        ref="mediaStream"
        :class="bemm('media-stream')"
        aria-label="A moving stream of random Tiko Media images"
        @pointermove="onMediaStreamPointerMove"
        @pointerleave="onMediaStreamPointerLeave"
      >
        <div ref="mediaTrack" :class="bemm('media-track')" :style="mediaTrackStyle">
          <div
            v-for="(img, index) in [...mediaImages, ...mediaImages]"
            :key="`${img.id}-loop-${index}`"
            :class="bemm('media-item')"
            :style="img.style"
          >
            <img
              :src="cdnUrl(img.original_url, 320)"
              :alt="img.title"
              loading="lazy"
              :class="bemm('media-img')"
            />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Why free -->
  <section :class="[bemm('free'), 'section']">
    <div class="container">
      <div :class="bemm('free-layout')">
        <div :class="bemm('free-copy')">
          <p class="eyebrow">Why free?</p>
          <h2 class="display-2">Because basic support should not wait behind payment.</h2>
          <p class="body-lg">
            Tiko is free, always, because the first job is access. The child-facing core is not a trial,
            a teaser, an ad-supported bargain, or an upgrade funnel. It should open when it is needed.
          </p>
        </div>
        <div :class="bemm('free-grid')">
          <article v-for="pillar in whyFreePillars" :key="pillar.title" :class="bemm('free-card')">
            <h3 :class="bemm('free-card-title')">{{ pillar.title }}</h3>
            <p class="body-sm">{{ pillar.body }}</p>
          </article>
        </div>
      </div>
    </div>
  </section>

  <!-- Platform section -->
  <section class="section">
    <div class="container">
      <div :class="bemm('platform-header')">
        <p class="eyebrow">One Tiko, many screens</p>
        <h2 class="display-2">A link is the fastest way to try a tool.</h2>
        <p class="body-lg">
          iOS and Android are planned as equal clients, not afterthoughts.
          Native apps follow the same calm behaviour as the web apps.
        </p>
      </div>
      <div :class="bemm('platform-grid')">
        <article v-for="item in platformNotes" :key="item.label" :class="[bemm('platform-card'), 'card']">
          <strong :class="bemm('platform-card-label')">{{ item.label }}</strong>
          <p class="body-sm">{{ item.copy }}</p>
        </article>
      </div>
    </div>
  </section>

  <!-- CTA banner -->
  <section :class="[bemm('cta'), 'section']">
    <div class="container">
      <div :class="bemm('cta-inner')">
        <div :class="bemm('cta-copy')">
          <h2 class="display-3" style="color:white">Ready to try?</h2>
          <p style="color:rgba(255,255,255,0.75);font-size:1rem;line-height:1.65">
            Yes No is live on the web right now. Free, no ads, no account, no setup.
          </p>
        </div>
        <div :class="bemm('cta-actions')">
          <a href="https://yesno.tikoapps.org" :class="bemm('cta-btn')" target="_blank" rel="noopener">
            Open Yes No
          </a>
          <RouterLink to="/apps" :class="bemm('cta-btn', 'ghost')">
            See all apps
          </RouterLink>
          <RouterLink to="/why-tiko" :class="bemm('cta-btn', 'ghost')">
            Why Tiko exists
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss">
// Hero
.home {
  &__hero {
    background: var(--color-background);
    overflow: hidden;
  }

  &__hero-inner {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.7fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: center;
    padding-top: clamp(3rem, 8vw, 6rem);
    padding-bottom: clamp(3rem, 8vw, 6rem);
  }

  &__hero-copy {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 1.5);
  }

  &__hero-heading {
    max-width: 14ch;
  }

  &__hero-lede {
    max-width: 44ch;
  }

  &__hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: calc(var(--space) * 0.75);
    margin-top: var(--space-s);
  }

  &__hero-btn {
    display: inline-flex;
    align-items: center;
    padding: 14px 28px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.95rem;
    text-decoration: none;
    transition: transform 0.15s, opacity 0.15s, box-shadow 0.15s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-m);
    }

    &--primary {
      background: var(--app-yes-no);
      color: white;
    }

    &--outline {
      background: var(--surface-card);
      color: var(--color-foreground);
    }
  }

  &__hero-note {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  &__hero-visual {
    position: relative;
    display: flex;
    justify-content: center;
  }

  &__device {
    background: var(--app-yes-no);
    color: white;
    border-radius: 28px;
    padding: 20px;
    width: 240px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-l), 0 0 0 6px rgba(155, 63, 189, 0.15);
  }

  &__device-top {
    display: flex;
    gap: 6px;
  }

  &__device-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-background), transparent 75%);
  }

  &__device-question {
    font-size: 0.95rem;
    color: rgba(255,255,255,0.8);
    text-align: center;
    padding: 0 4px;
    font-weight: 600;
  }

  &__device-choices {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__choice {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
    border-radius: 16px;
    font-family: var(--font-family-heading);
    font-weight: 900;
    font-size: 1.5rem;

    &--yes {
      background: white;
      color: var(--app-yes-no);
    }

    &--no {
      background: color-mix(in srgb, var(--color-background), transparent 85%);
      color: white;
    }
  }

  &__floating-card {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--surface-card);
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-foreground);
    box-shadow: var(--shadow-m);

    &--1 { top: 0; right: 0; }
    &--2 { bottom: 20%; left: -10%; }
    &--3 { bottom: 0; right: 10%; }
  }

  &__fc-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: block;
  }

  // Why
  &__why {
    background: var(--surface-subtle);
  }

  &__why-header {
    display: flex;
    flex-direction: column;
    gap: var(--space);
    max-width: 68ch;
    margin-bottom: var(--space-l);
  }

  &__why-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space);
  }

  &__why-card {
    padding: calc(var(--space) * 1.25);
    background: var(--surface-card);
    border-radius: 20px;
    box-shadow: var(--shadow-s);
  }

  &__why-card-title {
    font-family: var(--font-family-heading);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.2;
    color: var(--color-foreground);
    margin-bottom: calc(var(--space) * 0.75);
  }

  // App grid
  &__apps-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space);
    margin-bottom: var(--space-l);
  }

  &__apps-see-all {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-decoration: none;
    white-space: nowrap;

    &:hover { color: var(--color-foreground); }
  }

  &__apps-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: calc(var(--space) * 0.75);
  }

  &__app-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    text-decoration: none;
    transition: transform 0.15s;

    &:hover {
      transform: translateY(-3px);
    }
  }

  &__app-card-image-wrap {
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    padding: clamp(0.75rem, 2vw, 1.25rem);
    border-radius: 24px;
    background: var(--app-color);
    overflow: hidden;
    box-shadow: var(--shadow-s);
  }

  &__app-card-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 14px 20px color-mix(in srgb, var(--color-foreground), transparent 76%));
  }

  &__app-card-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    text-align: center;
    padding-inline: var(--space-xs);
  }

  &__app-card-name {
    font-family: var(--font-family-heading);
    font-size: 1rem;
    font-weight: 900;
    color: var(--color-foreground);
  }

  // Trust
  &__trust {
    background: var(--surface-subtle);
  }

  &__trust-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: start;
  }

  &__trust-copy {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 1.5);
  }

  &__trust-link {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-decoration: none;

    &:hover { color: var(--color-foreground); }
  }

  &__trust-list {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 0.75);
    padding: var(--space-l);
    background: var(--surface-card);
    border-radius: 20px;
    box-shadow: var(--shadow-s);
  }

  &__trust-item {
    display: flex;
    align-items: flex-start;
    gap: calc(var(--space) * 0.75);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-foreground);
  }

  &__trust-check {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    background: #d1fae5;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 0.7rem;
    color: #065f46;
    font-weight: 700;
  }

  // Media
  &__media {
    background: var(--surface-subtle);
    overflow: hidden;
  }

  &__media-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: calc(var(--space) * 1.5);
    margin-bottom: var(--space-l);
  }

  &__media-copy {
    max-width: 58ch;
  }

  &__media-heading {
    max-width: 22ch;
    margin-top: var(--space-s);
    margin-bottom: var(--space);
  }

  &__media-lede {
    max-width: 56ch;
  }

  &__media-link {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 22px;
    border-radius: 999px;
    background: var(--color-primary);
    color: white;
    font-size: 0.95rem;
    font-weight: 800;
    text-decoration: none;
    box-shadow: var(--shadow-s);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-m);
      opacity: 0.92;
    }
  }

  &__media-stream {
    position: relative;
    width: 100vw;
    margin-left: calc(50% - 50vw);
    overflow: hidden;
    padding-block: 42px;
    mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
  }

  &__media-track {
    display: flex;
    align-items: center;
    width: max-content;
    gap: calc(var(--space) * 0.9);
    will-change: transform;
  }

  &__media-item {
    flex: 0 0 auto;
    width: var(--tile-size, 144px);
    height: var(--tile-size, 144px);
    transform: translateY(calc(var(--tile-lift, 0px) + var(--tile-hover-lift, 0px))) rotate(var(--tile-rotate, 0)) scale(var(--tile-hover-scale, 1));
    transform-origin: center;
    transition: transform 140ms ease-out;
    border-radius: 24px;
    overflow: hidden;
    background: var(--surface-card);
    box-shadow: 0 18px 42px color-mix(in srgb, var(--color-foreground), transparent 88%);
  }

  &__media-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  // Free
  &__free {
    background: var(--color-background);
  }

  &__free-layout {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
    gap: clamp(calc(var(--space) * 2), 6vw, calc(var(--space) * 4));
    align-items: start;
  }

  &__free-copy {
    display: flex;
    flex-direction: column;
    gap: var(--space);
    max-width: 56ch;
  }

  &__free-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space);
  }

  &__free-card {
    padding: calc(var(--space) * 1.25);
    background: var(--surface-card);
    border-radius: 20px;
    box-shadow: var(--shadow-s);
  }

  &__free-card-title {
    font-family: var(--font-family-heading);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.2;
    color: var(--color-foreground);
    margin-bottom: calc(var(--space) * 0.75);
  }

  // Platform
  &__platform-header {
    display: flex;
    flex-direction: column;
    gap: var(--space);
    max-width: 52ch;
    margin-bottom: var(--space-l);
  }

  &__platform-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space);
  }

  &__platform-card {
    padding: calc(var(--space) * 1.5);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__platform-card-label {
    font-family: var(--font-family-heading);
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--color-foreground);
  }

  // CTA
  &__cta {
    --section-container-background: var(--app-yes-no);

    --section-container-padding: var(--spacing);
  }

  &__cta-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: calc(var(--space) * 1.5);
  }

  &__cta-copy {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 0.75);
  }

  &__cta-actions {
    display: flex;
    flex-wrap: wrap;
    gap: calc(var(--space) * 0.75);
  }

  &__cta-btn {
    display: inline-flex;
    align-items: center;
    padding: 14px 28px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.95rem;
    text-decoration: none;
    background: white;
    color: var(--app-yes-no);
    transition: opacity 0.15s, transform 0.15s;

    &:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }

    &--ghost {
      background: color-mix(in srgb, var(--color-background), transparent 85%);
      color: white;
    }
  }
}

// Responsive
@media (max-width: 900px) {
  .home__why-grid,
  .home__apps-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .home__media-header {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .home__hero-inner {
    grid-template-columns: 1fr;
  }

  .home__hero-visual {
    display: none;
  }

  .home__free-layout,
  .home__trust-layout {
    grid-template-columns: 1fr;
  }

  .home__cta-inner {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 560px) {
  .home__why-grid,
  .home__free-grid,
  .home__apps-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 420px) {
  .home__why-grid,
  .home__free-grid {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .home__media-track {
    transition: none;
  }
}
</style>
