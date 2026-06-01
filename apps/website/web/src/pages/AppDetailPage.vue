<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed, ref, watch, onMounted } from 'vue'
import { useBemm } from 'bemm'
import { getAppBySlug } from '../content/appUniverse'

const bemm = useBemm('app-detail', { return: 'string', includeBaseClass: true })

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
const cardMockupImages = computed(() => visibleMediaImages.value.slice(0, 6))

function resolveOriginalUrl(item: MediaImage): string {
  return item.original_url || (item.file_name ? `https://${CDN_ORIGIN}/${item.file_name}` : '')
}

function cdnUrl(originalUrl: string, width = 400): string {
  try {
    const u = new URL(originalUrl)
    return `https://${CDN_ORIGIN}/cdn-cgi/image/width=${width},quality=85,f=auto${u.pathname}`
  } catch {
    return originalUrl
  }
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
  <div v-if="!app" :class="[bemm('404'), 'section']">
    <div class="container">
      <p class="eyebrow">Not found</p>
      <h1 class="display-2">App not found.</h1>
      <p class="body-lg">There is no Tiko app with that name.</p>
      <RouterLink to="/apps" :class="bemm('404-link')">Back to all apps</RouterLink>
    </div>
  </div>

  <div v-else :class="bemm('')">
    <!-- Hero -->
    <header
      :class="bemm('hero')"
      :style="{ '--app-color': app.color, '--app-color-light': app.colorLight }"
    >
      <div :class="[bemm('hero-inner'), 'container']">
        <div :class="bemm('hero-copy')">
          <RouterLink to="/apps" :class="bemm('back')">All apps</RouterLink>
          <p class="eyebrow" :style="{ color: app.color }">Tiko</p>
          <h1 :class="['display-1', bemm('name')]">{{ app.name }}</h1>
          <p :class="bemm('headline')">{{ app.headline }}</p>
          <p :class="['body-lg', bemm('desc')]">{{ app.description }}</p>
          <div :class="bemm('hero-actions')">
            <a
              v-if="app.appUrl && app.status === 'available'"
              :href="app.appUrl"
              :class="bemm('btn', 'primary')"
              target="_blank"
              rel="noopener"
              :style="{ background: app.color }"
            >
              Open {{ app.name }}
            </a>
            <span v-else :class="bemm('btn', 'coming')">Coming soon</span>
            <span
              class="badge"
              :class="app.status === 'available' ? 'badge--available' : 'badge--planned'"
            >
              {{ app.statusLabel }}
            </span>
          </div>
        </div>

        <div :class="bemm('hero-visual')" aria-hidden="true">
          <div :class="bemm('mockup')" :style="{ borderTopColor: app.color }">
            <div :class="bemm('mockup-bar')">
              <span :class="bemm('mockup-dot')" />
              <span :class="bemm('mockup-dot')" />
            </div>
            <!-- Yes No mockup -->
            <template v-if="slug === 'yes-no'">
              <p :class="bemm('mockup-label')">Are you ready?</p>
              <div :class="bemm('mockup-yn')">
                <span :class="bemm('mockup-yn-yes')" :style="{ background: app.color }">Yes</span>
                <span :class="bemm('mockup-yn-no')">No</span>
              </div>
            </template>
            <!-- Cards mockup -->
            <template v-else-if="slug === 'cards'">
              <p :class="bemm('mockup-label')">Choose a card</p>
              <div :class="bemm('mockup-cards')">
                <span
                  v-for="img in cardMockupImages"
                  :key="img.id"
                  :class="bemm('mockup-card')"
                >
                  <img
                    :src="cdnUrl(resolveOriginalUrl(img), 160)"
                    :alt="img.title"
                    loading="lazy"
                    :class="bemm('mockup-card-img')"
                  />
                </span>
              </div>
            </template>
            <!-- Type mockup -->
            <template v-else-if="slug === 'type'">
              <div :class="bemm('mockup-type')">
                <span :class="bemm('mockup-type-text')">I want a drink of water</span>
              </div>
              <button :class="bemm('mockup-speak')" :style="{ background: app.color }">Speak</button>
            </template>
            <!-- Sequence mockup -->
            <template v-else-if="slug === 'sequence'">
              <div :class="bemm('mockup-step')">
                <span :class="bemm('mockup-step-num')" :style="{ background: app.color }">2</span>
                <span :class="bemm('mockup-step-label')">Wash hands</span>
              </div>
              <div :class="bemm('mockup-progress')">
                <div :class="bemm('mockup-progress-fill')" :style="{ background: app.color, width: '40%' }" />
              </div>
            </template>
            <!-- Timer mockup -->
            <template v-else-if="slug === 'timer'">
              <div :class="bemm('mockup-timer')">
                <span :class="bemm('mockup-timer-text')" :style="{ color: app.color }">4:30</span>
              </div>
              <div :class="bemm('mockup-timer-ring')">
                <div :class="bemm('mockup-timer-arc')" :style="{ borderColor: app.color }" />
              </div>
            </template>
          </div>
        </div>
      </div>
    </header>

    <!-- Features -->
    <section :class="[bemm('features'), 'section']">
      <div class="container">
        <p class="eyebrow">What it does</p>
        <h2 :class="['display-2', bemm('features-heading')]">Built for one clear job.</h2>
        <div :class="bemm('features-grid')">
          <article
            v-for="feature in app.features"
            :key="feature.title"
            :class="[bemm('feature'), 'card']"
          >
            <div :class="bemm('feature-dot')" :style="{ background: app.color }" />
            <h3 :class="bemm('feature-title')">{{ feature.title }}</h3>
            <p class="body-sm">{{ feature.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Media images -->
    <section v-if="hasMediaSection && mediaSection" :class="[bemm('media'), 'section']">
      <div class="container">
        <p class="eyebrow">{{ mediaSection.eyebrow }}</p>
        <h2 :class="['display-2', bemm('media-heading')]">{{ mediaSection.heading }}</h2>
        <p :class="['body-lg', bemm('media-lede')]">
          {{ mediaSection.lede }}
        </p>
        <a :href="MEDIA_SITE_URL" :class="bemm('media-link')" target="_blank" rel="noopener">
          Browse Tiko Media
        </a>
        <div v-if="mediaLoading && !visibleMediaImages.length" :class="bemm('media-loading')">
          <div v-for="i in 9" :key="i" :class="bemm('media-placeholder')" />
        </div>
        <div v-else-if="mediaImages.length" :class="bemm('media-grid')">
          <div
            v-for="img in mediaImages"
            :key="img.id"
            :class="bemm('media-item')"
          >
            <img
              :src="cdnUrl(resolveOriginalUrl(img), 300)"
              :alt="img.title"
              loading="lazy"
              :class="bemm('media-img')"
            />
            <span :class="bemm('media-caption')">{{ img.title }}</span>
          </div>
        </div>
        <div v-else :class="bemm('media-grid')">
          <div
            v-for="img in visibleMediaImages"
            :key="img.id"
            :class="bemm('media-item')"
          >
            <img
              :src="cdnUrl(resolveOriginalUrl(img), 300)"
              :alt="img.title"
              loading="lazy"
              :class="bemm('media-img')"
            />
            <span :class="bemm('media-caption')">{{ img.title }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Human moment -->
    <section :class="[bemm('moment'), 'section']">
      <div class="container">
        <div :class="bemm('moment-layout')">
          <div :class="bemm('moment-copy')">
            <p class="eyebrow">The human moment</p>
            <h2 class="display-2">{{ app.moment }}</h2>
          </div>
          <div :class="bemm('moment-cards')">
            <article :class="bemm('moment-card')">
              <h3 :class="bemm('moment-card-title')">Why it stays small</h3>
              <p class="body-sm">{{ app.whySmall }}</p>
            </article>
            <article :class="bemm('moment-card')">
              <h3 :class="bemm('moment-card-title')">How it stays calm</h3>
              <p class="body-sm">{{ app.calmDetail }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- Use when -->
    <section :class="[bemm('use'), 'section']">
      <div class="container">
        <div :class="bemm('use-layout')">
          <div :class="bemm('use-copy')">
            <p class="eyebrow">Use cases</p>
            <h2 class="display-2">When to reach for {{ app.name }}</h2>
          </div>
          <ul :class="bemm('use-list')">
            <li
              v-for="use in app.useWhen"
              :key="use"
              :class="bemm('use-item')"
              :style="{ '--app-color': app.color }"
            >
              <span :class="bemm('use-dot')" />
              {{ use }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Platform notes -->
    <section :class="[bemm('platform'), 'section']">
      <div class="container">
        <div :class="[bemm('platform-inner'), 'card card--raised']">
          <div :class="bemm('platform-copy')">
            <p class="eyebrow">Availability</p>
            <h2 class="display-3">{{ app.status === 'available' ? 'Open now on the web.' : 'Coming soon.' }}</h2>
            <p class="body-lg">{{ app.platformNotes }}</p>
          </div>
          <div :class="bemm('platform-actions')">
            <a
              v-if="app.appUrl && app.status === 'available'"
              :href="app.appUrl"
              :class="bemm('btn', 'primary')"
              target="_blank"
              rel="noopener"
              :style="{ background: app.color }"
            >
              Open {{ app.name }}
            </a>
            <RouterLink to="/apps" :class="bemm('btn', 'outline')">
              All apps
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss">
.app-detail {
  &__404-link {
    display: inline-flex;
    margin-top: var(--space);
    font-weight: 700;
    color: var(--text-secondary);
    text-decoration: none;
    &:hover { color: var(--color-foreground); }
  }

  &__hero {
    background: var(--color-background);
    overflow: hidden;
  }

  &__hero-inner {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.7fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: center;
    padding-top: clamp(3rem, 8vw, 5rem);
    padding-bottom: clamp(3rem, 8vw, 5rem);
  }

  &__hero-copy {
    display: flex;
    flex-direction: column;
    gap: var(--space);
  }

  &__back {
    display: inline-flex;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-muted);
    text-decoration: none;
    &:hover { color: var(--text-secondary); }
  }

  &__name {
    max-width: 10ch;
    line-height: 1.0;
  }

  &__headline {
    font-family: var(--font-family-heading);
    font-size: clamp(1.1rem, 2.5vw, 1.5rem);
    font-weight: 700;
    color: var(--text-secondary);
    margin-top: calc(-1 * var(--space-s));
  }

  &__desc {
    max-width: 48ch;
  }

  &__hero-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: calc(var(--space) * 0.75);
    margin-top: var(--space-s);
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    padding: 12px 24px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.95rem;
    text-decoration: none;
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;

    &:hover {
      opacity: 0.88;
      transform: translateY(-2px);
      box-shadow: var(--shadow-m);
    }

    &--primary {
      color: white;
    }

    &--outline {
      background: transparent;
      color: var(--text-secondary);

      &:hover {
        color: var(--color-foreground);
        background: var(--surface-card);
      }
    }

    &--coming {
      background: var(--surface-subtle);
      color: var(--text-muted);
      cursor: default;
      &:hover {
        transform: none;
        box-shadow: none;
        opacity: 1;
      }
    }
  }

  &__hero-visual {
    display: flex;
    justify-content: center;
  }

  &__mockup {
    background: var(--surface-card);
    border-radius: 20px;
    width: 220px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: var(--shadow-m);
    min-height: 200px;
  }

  &__mockup-bar {
    display: flex;
    gap: 6px;
  }

  &__mockup-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border);
  }

  &__mockup-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    text-align: center;
  }

  &__mockup-yn {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  &__mockup-yn-yes,
  &__mockup-yn-no {
    display: grid;
    place-items: center;
    height: 56px;
    border-radius: 12px;
    font-family: var(--font-family-heading);
    font-weight: 900;
    font-size: 1.2rem;
    color: white;
    cursor: pointer;
  }

  &__mockup-yn-no {
    background: #ff8a65;
  }

  &__mockup-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  &__mockup-card {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    background: var(--app-color-light);
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
  }

  &__mockup-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__mockup-type {
    background: var(--surface-subtle);
    border-radius: 10px;
    padding: 10px;
    font-size: 0.8rem;
    color: var(--color-foreground);
    min-height: 60px;
  }

  &__mockup-speak {
    border-radius: 999px;
    padding: 8px 16px;
    color: white;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    align-self: flex-start;
  }

  &__mockup-step {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: var(--surface-subtle);
    border-radius: 12px;
  }

  &__mockup-step-num {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: white;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 1rem;
    flex-shrink: 0;
  }

  &__mockup-step-label {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--color-foreground);
  }

  &__mockup-progress {
    height: 6px;
    background: var(--surface-subtle);
    border-radius: 999px;
    overflow: hidden;
  }

  &__mockup-progress-fill {
    height: 100%;
    border-radius: 999px;
  }

  &__mockup-timer {
    display: flex;
    justify-content: center;
    padding: 16px 0 8px;
  }

  &__mockup-timer-text {
    font-family: var(--font-family-heading);
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: 0;
  }

  &__mockup-timer-ring {
    display: flex;
    justify-content: center;
  }

  &__mockup-timer-arc {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border-right-color: transparent;
    opacity: 0.3;
  }

  // Features
  &__features {
    background: var(--surface-subtle);
  }

  &__features-heading {
    max-width: 16ch;
    margin-top: var(--space-s);
    margin-bottom: var(--space-l);
  }

  &__features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--space);
  }

  &__feature {
    padding: calc(var(--space) * 1.5);
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 0.75);
  }

  &__feature-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__feature-title {
    font-family: var(--font-family-heading);
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-foreground);
    line-height: 1.3;
  }

  // Media section
  &__media {
  }

  &__media-heading {
    max-width: 20ch;
    margin-top: var(--space-s);
    margin-bottom: calc(var(--space) * 0.75);
  }

  &__media-lede {
    max-width: 48ch;
    margin-bottom: var(--space);
  }

  &__media-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-l);
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--color-foreground);
    color: var(--color-background);
    font-weight: 800;
    text-decoration: none;
    transition: transform 0.15s ease, opacity 0.15s ease;

    &:hover {
      transform: translateY(-2px);
      opacity: 0.9;
    }
  }

  &__media-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: calc(var(--space) * 0.75);
  }

  &__media-loading {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: calc(var(--space) * 0.75);
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
    gap: var(--space-s);
    background: var(--surface-card);
    border-radius: 16px;
    overflow: hidden;
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
    padding: var(--space-s) calc(var(--space) * 0.75) calc(var(--space) * 0.75);
  }

  // Use when
  &__moment {
    background: var(--surface-subtle);
  }

  &__moment-layout {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: start;
  }

  &__moment-copy {
    display: flex;
    flex-direction: column;
    gap: var(--space);
  }

  &__moment-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space);
  }

  &__moment-card {
    padding: calc(var(--space) * 1.25);
    background: var(--surface-card);
    border-radius: 18px;
    box-shadow: var(--shadow-s);
  }

  &__moment-card-title {
    font-family: var(--font-family-heading);
    font-size: 1rem;
    font-weight: 850;
    color: var(--color-foreground);
    margin-bottom: calc(var(--space) * 0.75);
  }

  &__use-layout {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: start;
  }

  &__use-copy {
    display: flex;
    flex-direction: column;
    gap: var(--space);
    position: sticky;
    top: calc(var(--header-height) + calc(var(--space) * 1.5));
  }

  &__use-list {
    display: flex;
    flex-direction: column;
    gap: var(--space);
  }

  &__use-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-foreground);
    padding: calc(var(--space) * 1.25);
    background: var(--surface-card);
    border-radius: 16px;
    box-shadow: var(--shadow-s);
  }

  &__use-dot {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--app-color);
    margin-top: 5px;
  }

  // Platform notes
  &__platform-inner {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: clamp(2rem, 5vw, 4rem);
    align-items: center;
    padding: clamp(var(--space-l), 5vw, calc(var(--space) * 3));
  }

  &__platform-copy {
    display: flex;
    flex-direction: column;
    gap: var(--space);
    max-width: 48ch;
  }

  &__platform-actions {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 0.75);
    align-items: flex-start;
  }
}

@keyframes media-pulse {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

@media (max-width: 900px) {
  .app-detail__hero-inner {
    grid-template-columns: 1fr;
  }

  .app-detail__hero-visual {
    display: none;
  }

  .app-detail__moment-layout,
  .app-detail__use-layout {
    grid-template-columns: 1fr;
  }

  .app-detail__use-copy {
    position: static;
  }

  .app-detail__platform-inner {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .app-detail__moment-cards {
    grid-template-columns: 1fr;
  }

  .app-detail__media-grid,
  .app-detail__media-loading {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
