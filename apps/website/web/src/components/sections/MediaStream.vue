<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBemm } from 'bemm'

/** Auto-scrolling marquee of Tiko Media images. Pauses on hover; reduced-motion aware. */
const props = withDefaults(defineProps<{ limit?: number; category?: string }>(), { limit: 24 })

const bemm = useBemm('media-stream', { return: 'string', includeBaseClass: true })
const MEDIA_API = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_MEDIA_API_URL
  ?? 'https://media.tikoapi.org/v1'

const images = ref<string[]>([])

function sized(url: string, w = 320): string {
  try {
    const u = new URL(url)
    if (u.hostname === 'data.tikocdn.org') return `https://data.tikocdn.org/cdn-cgi/image/width=${w},quality=85,f=auto${u.pathname}`
  } catch { /* ignore */ }
  return url
}

onMounted(async () => {
  try {
    const q = props.category ? `&category=${encodeURIComponent(props.category)}` : ''
    const res = await fetch(`${MEDIA_API}/media?type=image&limit=${props.limit}&page=1${q}`)
    const body = await res.json() as { data?: Array<{ id?: string; original_url?: string }> }
    images.value = (body.data ?? [])
      .map((m) => m.original_url || (m.id ? `${MEDIA_API}/media/${m.id}/download` : ''))
      .filter(Boolean)
      .map((u) => sized(u))
  } catch { images.value = [] }
})
</script>

<template>
  <div v-if="images.length" :class="bemm()">
    <div :class="bemm('track')">
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

  &:hover &__track { animation-play-state: paused; }

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
