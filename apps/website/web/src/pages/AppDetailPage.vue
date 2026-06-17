<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed, ref, watch, onMounted } from 'vue'
import { tikoImageUrl } from '@tiko/ui'
import { getAppBySlug } from '../content/appUniverse'
import PageSection from '../components/sections/PageSection.vue'
import CardGrid from '../components/sections/CardGrid.vue'
import ColorCard from '../components/sections/ColorCard.vue'
import SplitMedia from '../components/sections/SplitMedia.vue'
import CtaBanner from '../components/sections/CtaBanner.vue'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const app = computed(() => getAppBySlug(slug.value))

interface MediaImage {
  id: string
  title: string
  original_url: string
  file_name?: string
  tags?: string[]
}

interface MediaApiResponse {
  data?: MediaImage[]
}

interface MediaSectionConfig {
  category: string
  eyebrow: string
  heading: string
  lede: string
}

const mediaImages = ref<MediaImage[]>([])
const mediaLoading = ref(false)

const MEDIA_API_BASE = 'https://media.tikoapi.org/v1'
const MEDIA_SITE_URL = 'https://media.tikoapps.org'
const CDN_ORIGIN = 'data.tikocdn.org'

const APP_MEDIA_SECTION: Partial<Record<string, MediaSectionConfig>> = {
  cards: {
    category: 'animals',
    eyebrow: 'Built-in image library',
    heading: 'Tiko Media images, ready for Cards.',
    lede: 'Cards can start with clear, recognizable images from Tiko Media. Browse the public library or use them directly inside card sets.',
  },
}

const FALLBACK_CARD_MEDIA: MediaImage[] = [
  { id: 'aefee19f-c8fb-4910-baa9-82706e1950fe', title: 'Indigo Bird', original_url: 'https://data.tikocdn.org/uploads/1756901949615-indigo-bird.png' },
  { id: '02e4604a-637b-4c31-9fdf-4bc22a85cf0e', title: 'Red Velvet Mite', original_url: 'https://data.tikocdn.org/uploads/1756293164075-red-velvet-mite.png' },
  { id: '527fb7eb-2b1e-4cd0-b7fd-29d1c1521faf', title: 'Brine Shrimp', original_url: 'https://data.tikocdn.org/uploads/1756293081692-brine-shrimp.png' },
  { id: '00ea4b86-1c2f-451a-84c1-9826baf15595', title: 'Koi Fish', original_url: 'https://data.tikocdn.org/uploads/1756293057193-koi-fish.png' },
  { id: 'b8bd1648-8758-469d-828e-ed1af48cf040', title: 'Oyster Pearl', original_url: 'https://data.tikocdn.org/uploads/1756293036779-oyster-pearl.png' },
  { id: '2598e9fc-e3c5-4fdd-8c84-e4602c288a30', title: 'Frog', original_url: 'https://data.tikocdn.org/uploads/1756291805861-frog.png' },
  { id: '2bc04576-d96b-4e97-b550-0a40479f97b6', title: 'Toad', original_url: 'https://data.tikocdn.org/uploads/1756291794903-toad.png' },
  { id: 'fcf423bc-5538-4d98-9a57-166b2fed55bf', title: 'Froglet', original_url: 'https://data.tikocdn.org/uploads/1756291782509-froglet.png' },
  { id: '0d29c4fe-161f-4628-9425-1cd8e6374953', title: 'Tadpole', original_url: 'https://data.tikocdn.org/uploads/1756291773294-tadpole.png' },
]

const mediaSection = computed(() => APP_MEDIA_SECTION[slug.value])
const hasMediaSection = computed(() => Boolean(mediaSection.value))
const visibleMediaImages = computed(() => mediaImages.value.length ? mediaImages.value : FALLBACK_CARD_MEDIA)
const heroMediaImage = computed(() => {
  const first = visibleMediaImages.value[0]
  return first ? tikoImageUrl(resolveOriginalUrl(first), 'large') : undefined
})

function resolveOriginalUrl(item: MediaImage): string {
  return item.original_url || (item.file_name ? `https://${CDN_ORIGIN}/${item.file_name}` : '')
}

function cdnUrl(originalUrl: string, width = 400): string {
  return tikoImageUrl(originalUrl, width <= 400 ? 'small' : 'large')
}

function normalizeMediaImages(items: MediaImage[]): MediaImage[] {
  return items
    .map((item): MediaImage | null => {
      const originalUrl = resolveOriginalUrl(item)
      if (!originalUrl) return null
      return {
        ...item,
        title: item.title || 'Tiko Media image',
        original_url: originalUrl,
      }
    })
    .filter((item): item is MediaImage => item !== null)
}

async function loadMedia(appSlug: string) {
  const config = APP_MEDIA_SECTION[appSlug]
  mediaImages.value = []
  if (!config) {
    mediaLoading.value = false
    return
  }

  mediaLoading.value = true
  try {
    const res = await fetch(`${MEDIA_API_BASE}/media?category=${config.category}&limit=9&type=image`)
    if (res.ok) {
      const json = await res.json() as MediaApiResponse | MediaImage[]
      const items = Array.isArray(json) ? json : (json.data ?? [])
      mediaImages.value = normalizeMediaImages(items).slice(0, 9)
    }
  } catch {
    // Keep the checked-in Tiko Media image fallback.
  } finally {
    mediaLoading.value = false
  }
}

onMounted(() => {
  loadMedia(slug.value)
})

watch(slug, (newSlug) => {
  loadMedia(newSlug)
})
</script>

<template>
  <PageSection v-if="!app" width="narrow">
    <p class="eyebrow">Not found</p>
    <h1 class="display-2">App not found.</h1>
    <p class="body-lg">There is no Tiko app with that name.</p>
    <RouterLink to="/apps" class="button button--ghost">Back to all apps</RouterLink>
  </PageSection>

  <div v-else class="app-detail" :style="{ '--app-color': app.color, '--app-color-text': app.colorText }">
    <!-- Hero / headline + description -->
    <PageSection :tone="app.id">
      <SplitMedia :image="app.iconUrl" :image-alt="`${app.name} app icon`" media-side="right">
        <RouterLink to="/apps" class="app-detail__back">All apps</RouterLink>
        <p class="app-detail__eyebrow">Tiko · {{ app.statusLabel }}</p>
        <h1 class="app-detail__name">{{ app.name }}</h1>
        <p class="app-detail__headline">{{ app.headline }}</p>
        <p class="app-detail__desc">{{ app.description }}</p>
        <div class="app-detail__actions">
          <a
            v-if="app.appUrl && app.status === 'available'"
            :href="app.appUrl"
            class="button button--light"
            target="_blank"
            rel="noopener"
          >
            Open {{ app.name }}
          </a>
          <span v-else class="button button--ghost-light">Coming soon</span>
        </div>
      </SplitMedia>
    </PageSection>

    <!-- Features -->
    <PageSection
      eyebrow="What it does"
      title="Built for one clear job."
    >
      <CardGrid min="240px">
        <ColorCard
          v-for="feature in app.features"
          :key="feature.title"
          :tone="app.id"
          :title="feature.title"
          :body="feature.body"
        />
      </CardGrid>
    </PageSection>

    <!-- Media images (apps with a configured Tiko Media category) -->
    <PageSection
      v-if="hasMediaSection && mediaSection"
      :eyebrow="mediaSection.eyebrow"
      :title="mediaSection.heading"
      :intro="mediaSection.lede"
    >
      <template #actions>
        <a :href="MEDIA_SITE_URL" class="button button--primary" target="_blank" rel="noopener">
          Browse Tiko Media
        </a>
      </template>
      <div v-if="mediaLoading && !visibleMediaImages.length" class="app-detail__media-grid">
        <div v-for="i in 9" :key="i" class="app-detail__media-placeholder" />
      </div>
      <div v-else class="app-detail__media-grid">
        <figure
          v-for="img in visibleMediaImages"
          :key="img.id"
          class="app-detail__media-item"
        >
          <img
            :src="cdnUrl(resolveOriginalUrl(img), 300)"
            :alt="img.title"
            loading="lazy"
            class="app-detail__media-img"
          />
          <figcaption class="app-detail__media-caption">{{ img.title }}</figcaption>
        </figure>
      </div>
    </PageSection>

    <!-- The human moment -->
    <PageSection tone="dark">
      <SplitMedia
        :image="heroMediaImage"
        :image-alt="`A calm ${app.name} moment`"
        media-side="left"
      >
        <p class="app-detail__eyebrow">The human moment</p>
        <h2 class="app-detail__moment-title">{{ app.moment }}</h2>
      </SplitMedia>
      <CardGrid min="280px" gap="1.5rem">
        <ColorCard title="Why it stays small" :body="app.whySmall" />
        <ColorCard title="How it stays calm" :body="app.calmDetail" />
      </CardGrid>
    </PageSection>

    <!-- Use when -->
    <PageSection
      eyebrow="Use cases"
      :title="`When to reach for ${app.name}`"
    >
      <CardGrid min="260px">
        <ColorCard
          v-for="use in app.useWhen"
          :key="use"
          :tone="app.id"
          :body="use"
        />
      </CardGrid>
    </PageSection>

    <!-- Availability / platform notes + CTA -->
    <PageSection align="center">
      <CtaBanner
        :tone="app.id"
        :title="app.status === 'available' ? 'Open now on the web.' : 'Coming soon.'"
        :body="app.platformNotes"
      >
        <template #actions>
          <a
            v-if="app.appUrl && app.status === 'available'"
            :href="app.appUrl"
            class="button button--light"
            target="_blank"
            rel="noopener"
          >
            Open {{ app.name }}
          </a>
          <RouterLink to="/apps" class="button button--ghost-light">All apps</RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </div>
</template>

<style lang="scss">
.app-detail {
  &__back {
    display: inline-flex;
    font-size: 0.85rem;
    font-weight: 700;
    color: inherit;
    opacity: 0.75;
    text-decoration: none;
    &:hover { opacity: 1; }
  }

  &__eyebrow {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.75;
    margin-bottom: 0.5rem;
  }

  &__name {
    font-family: var(--font-family-heading);
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    line-height: 1.0;
    color: inherit;
    margin-bottom: 0.5rem;
  }

  &__headline {
    font-family: var(--font-family-heading);
    font-size: clamp(1.1rem, 2.5vw, 1.5rem);
    font-weight: 700;
    opacity: 0.9;
    margin-bottom: 0.75rem;
  }

  &__desc {
    max-width: 48ch;
    line-height: 1.6;
    opacity: 0.92;
    margin-bottom: 1.25rem;
  }

  &__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  &__moment-title {
    font-family: var(--font-family-heading);
    font-size: clamp(1.6rem, 3.5vw, 2.6rem);
    line-height: 1.1;
    color: inherit;
  }

  &__media-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  &__media-placeholder {
    aspect-ratio: 1;
    background: var(--border);
    border-radius: 16px;
    animation: media-pulse 1.5s ease-in-out infinite alternate;
  }

  &__media-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: var(--surface-card);
    border-radius: 16px;
    overflow: hidden;
    margin: 0;
  }

  &__media-img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
  }

  &__media-caption {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
    text-align: center;
    padding: 0.25rem 0.75rem 0.75rem;
  }
}

@keyframes media-pulse {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

@media (max-width: 640px) {
  .app-detail__media-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
