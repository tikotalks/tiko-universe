<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useBemm } from 'bemm'
import { tikoImageUrl } from '@tiko/ui'
import { showcaseCategories } from '../../content/mediaImages'

/** Auto-scrolling marquee of Tiko Media images. Pauses on hover; reduced-motion aware. */
const props = withDefaults(defineProps<{ limit?: number; category?: string }>(), {
  limit: 24,
  // Unfiltered, the API returns newest-first, so the marquee showed whatever had
  // just been generated. Default to the child-facing categories.
  category: showcaseCategories,
})

const bemm = useBemm('media-stream', { return: 'string', includeBaseClass: true })
const MEDIA_API = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_MEDIA_API_URL
  ?? 'https://media.tikoapi.org/v1'

const images = ref<string[]>([])
const root = ref<HTMLElement | null>(null)
/**
 * Whether the marquee is on screen. The animation translates a 48-image track
 * behind a `mask-image`, which forces the compositor to re-rasterise the whole
 * strip every frame. Left running unconditionally on all four pages that embed
 * it, that is enough to keep the page busy even when the marquee is scrolled
 * far out of view.
 */
const visible = ref(false)
let observer: IntersectionObserver | null = null

onBeforeUnmount(() => observer?.disconnect())

onMounted(async () => {
  if (root.value && typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => { visible.value = entries[0]?.isIntersecting ?? false },
      { rootMargin: '200px' },
    )
    observer.observe(root.value)
  } else {
    visible.value = true
  }

  try {
    const q = props.category ? `&category=${encodeURIComponent(props.category)}` : ''
    const res = await fetch(`${MEDIA_API}/media?type=image&limit=${props.limit}&page=1${q}`)
    const body = await res.json() as { data?: Array<{ id?: string; original_url?: string }> }
    images.value = (body.data ?? [])
      .map((m) => m.original_url || (m.id ? `${MEDIA_API}/media/${m.id}/download` : ''))
      .filter(Boolean)
      .map((u) => tikoImageUrl(u, 'small'))
  } catch { images.value = [] }
})
</script>

<template>
  <!-- Not v-if'd on `images`: the observer needs a node to watch from mount. -->
  <div ref="root" :class="bemm('', { paused: !visible })">
    <div v-if="images.length" :class="bemm('track')">
      <img
        v-for="(src, i) in [...images, ...images]"
        :key="i"
        :src="src"
        alt=""
        loading="lazy"
        :class="bemm('tile')"
      />
    </div>
  </div>
</template>

<style lang="scss">
.media-stream {
  overflow: hidden;
  width: 100%;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);

  &__track {
    display: flex;
    gap: 1rem;
    width: max-content;
    animation: media-stream-scroll 60s linear infinite;
  }

  &:hover &__track,
  &--paused &__track { animation-play-state: paused; }

  // Lets the browser skip layout and paint for the strip entirely while it is
  // off screen, not just stop advancing it.
  content-visibility: auto;
  contain-intrinsic-size: auto 200px;

  &__tile {
    width: clamp(120px, 16vw, 200px);
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 20px;
    box-shadow: 0 16px 34px -24px color-mix(in srgb, var(--color-foreground), transparent 30%);
  }

  @media (prefers-reduced-motion: reduce) {
    &__track { animation: none; }
  }
}

@keyframes media-stream-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
</style>
