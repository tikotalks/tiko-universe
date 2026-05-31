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
  tags?: string[]
}

const mediaImages = ref<MediaImage[]>([])
const mediaLoading = ref(false)

const API_BASE = 'https://api.tikotalks.com/v1'
const CDN_ORIGIN = 'data.tikocdn.org'

const APP_MEDIA_CATEGORY: Record<string, string> = {
  'yes-no': 'emotions',
  'type': 'letters',
  'cards': 'animals',
  'sequence': 'food',
  'timer': 'transport',
}

function cdnUrl(originalUrl: string, width = 400): string {
  try {
    const u = new URL(originalUrl)
    return `https://${CDN_ORIGIN}/cdn-cgi/image/width=${width},quality=85,f=auto${u.pathname}`
  } catch {
    return originalUrl
  }
}

async function loadMedia(appSlug: string) {
  const category = APP_MEDIA_CATEGORY[appSlug]
  if (!category) return
  mediaLoading.value = true
  mediaImages.value = []
  try {
    const res = await fetch(`${API_BASE}/media?category=${category}&limit=9&type=image`)
    if (res.ok) {
      const json = await res.json() as { data?: MediaImage[] }
      mediaImages.value = (json.data ?? []).slice(0, 9)
    }
  } catch {
    // silently fail — fallback shown
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

const APP_FALLBACK_EMOJI: Record<string, Array<{ emoji: string; label: string }>> = {
  'yes-no': [
    { emoji: '😊', label: 'Happy' }, { emoji: '😢', label: 'Sad' }, { emoji: '😡', label: 'Angry' },
    { emoji: '😴', label: 'Tired' }, { emoji: '🤔', label: 'Thinking' }, { emoji: '😲', label: 'Surprised' },
    { emoji: '🥰', label: 'Love' }, { emoji: '😰', label: 'Worried' }, { emoji: '😌', label: 'Calm' },
  ],
  'type': [
    { emoji: '🔤', label: 'ABC' }, { emoji: '💬', label: 'Message' }, { emoji: '📢', label: 'Speak' },
    { emoji: '✏️', label: 'Write' }, { emoji: '🔊', label: 'Voice' }, { emoji: '📝', label: 'Notes' },
    { emoji: '💡', label: 'Idea' }, { emoji: '🗣️', label: 'Talk' }, { emoji: '📖', label: 'Words' },
  ],
  'cards': [
    { emoji: '🐶', label: 'Dog' }, { emoji: '🐱', label: 'Cat' }, { emoji: '🐦', label: 'Bird' },
    { emoji: '🐠', label: 'Fish' }, { emoji: '🐸', label: 'Frog' }, { emoji: '🦋', label: 'Butterfly' },
    { emoji: '🍎', label: 'Apple' }, { emoji: '🥦', label: 'Broccoli' }, { emoji: '😊', label: 'Happy' },
  ],
  'sequence': [
    { emoji: '1️⃣', label: 'Step 1' }, { emoji: '2️⃣', label: 'Step 2' }, { emoji: '3️⃣', label: 'Step 3' },
    { emoji: '🍳', label: 'Cook' }, { emoji: '🧼', label: 'Wash' }, { emoji: '👕', label: 'Dress' },
    { emoji: '🎒', label: 'Pack' }, { emoji: '🚌', label: 'Go' }, { emoji: '✅', label: 'Done' },
  ],
  'timer': [
    { emoji: '⏰', label: 'Timer' }, { emoji: '⌚', label: 'Watch' }, { emoji: '⏳', label: 'Waiting' },
    { emoji: '🚗', label: 'Car' }, { emoji: '🚌', label: 'Bus' }, { emoji: '✈️', label: 'Plane' },
    { emoji: '🚂', label: 'Train' }, { emoji: '🚲', label: 'Bike' }, { emoji: '🏃', label: 'Run' },
  ],
}
</script>

<template>
  <div v-if="!app" :class="[bemm('404'), 'section']">
    <div class="container">
      <p class="eyebrow">Not found</p>
      <h1 class="display-2">App not found.</h1>
      <p class="body-lg">There is no Tiko app with that name.</p>
      <RouterLink to="/apps" :class="bemm('404-link')">← Back to all apps</RouterLink>
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
          <RouterLink to="/apps" :class="bemm('back')">← All apps</RouterLink>
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
              Open {{ app.name }} →
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
                <span v-for="label in ['🐶', '🐱', '🐦', '🐠', '🐸', '🦋']" :key="label" :class="bemm('mockup-card')">{{ label }}</span>
              </div>
            </template>
            <!-- Type mockup -->
            <template v-else-if="slug === 'type'">
              <div :class="bemm('mockup-type')">
                <span :class="bemm('mockup-type-text')">I want a drink of water</span>
              </div>
              <button :class="bemm('mockup-speak')" :style="{ background: app.color }">Speak ▶</button>
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

    <!-- Media images — all apps -->
    <section :class="[bemm('media'), 'section']">
      <div class="container">
        <p class="eyebrow">Built-in library</p>
        <h2 :class="['display-2', bemm('media-heading')]">Hundreds of 4K images, ready to use.</h2>
        <p :class="['body-lg', bemm('media-lede')]">
          Animals, food, emotions, shapes, colours, transport, numbers, and letters —
          all included and served in full quality.
        </p>
        <div v-if="mediaLoading" :class="bemm('media-loading')">
          <div v-for="i in 9" :key="i" :class="bemm('media-placeholder')" />
        </div>
        <div v-else-if="mediaImages.length" :class="bemm('media-grid')">
          <div
            v-for="img in mediaImages"
            :key="img.id"
            :class="bemm('media-item')"
          >
            <img
              :src="cdnUrl(img.original_url, 300)"
              :alt="img.title"
              loading="lazy"
              :class="bemm('media-img')"
            />
            <span :class="bemm('media-caption')">{{ img.title }}</span>
          </div>
        </div>
        <div v-else :class="bemm('media-grid')">
          <div
            v-for="item in APP_FALLBACK_EMOJI[slug] ?? APP_FALLBACK_EMOJI['cards']"
            :key="item.label"
            :class="[bemm('media-item'), bemm('media-item', 'fallback')]"
          >
            <span :class="bemm('media-emoji')">{{ item.emoji }}</span>
            <span :class="bemm('media-caption')">{{ item.label }}</span>
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
              Open {{ app.name }} →
            </a>
            <RouterLink to="/apps" :class="bemm('btn', 'outline')">
              ← All apps
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
    border-bottom: 4px solid var(--app-color);
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
      border: 1.5px solid var(--border-strong);

      &:hover {
        color: var(--color-foreground);
        background: var(--surface-card);
      }
    }

    &--coming {
      background: var(--surface-subtle);
      color: var(--text-muted);
      border: 1px solid var(--border);
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
    border: 1.5px solid var(--border);
    border-top: 4px solid var(--app-color);
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
    border: 1px solid var(--border);
    border-radius: 10px;
    font-size: 1.4rem;
    cursor: pointer;
  }

  &__mockup-type {
    background: var(--surface-subtle);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px;
    font-size: 0.8rem;
    color: var(--color-foreground);
    min-height: 60px;
  }

  &__mockup-speak {
    border: none;
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
    letter-spacing: -0.03em;
  }

  &__mockup-timer-ring {
    display: flex;
    justify-content: center;
  }

  &__mockup-timer-arc {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 6px solid;
    border-right-color: transparent;
    opacity: 0.3;
  }

  // Features
  &__features {
    background: var(--surface-subtle);
    border-bottom: 1px solid var(--border);
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
    border-bottom: 1px solid var(--border);
  }

  &__media-heading {
    max-width: 20ch;
    margin-top: var(--space-s);
    margin-bottom: calc(var(--space) * 0.75);
  }

  &__media-lede {
    max-width: 48ch;
    margin-bottom: var(--space-l);
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
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;

    &--fallback {
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      padding: var(--space);
    }
  }

  &__media-img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
  }

  &__media-emoji {
    font-size: 3rem;
    line-height: 1;
  }

  &__media-caption {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
    text-align: center;
    padding: var(--space-s) calc(var(--space) * 0.75) calc(var(--space) * 0.75);
  }

  // Use when
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
    border: 1px solid var(--border);
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
  .app-detail__media-grid,
  .app-detail__media-loading {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
