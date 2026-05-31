<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed, ref, onMounted } from 'vue'
import { getAppBySlug } from '../content/appUniverse'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const app = computed(() => getAppBySlug(slug.value))

// Media images for Cards app
const mediaImages = ref<Array<{ id: string; title: string; original_url: string; tags?: string[] }>>([])
const mediaLoading = ref(false)

const API_BASE = 'https://api.tikotalks.com/v1'
const CDN_ORIGIN = 'data.tikocdn.org'

function cdnUrl(originalUrl: string, width = 400): string {
  try {
    const u = new URL(originalUrl)
    return `https://${CDN_ORIGIN}/cdn-cgi/image/width=${width},quality=85,f=auto${u.pathname}`
  } catch {
    return originalUrl
  }
}

async function loadCardImages() {
  if (slug.value !== 'cards') return
  mediaLoading.value = true
  try {
    const res = await fetch(`${API_BASE}/media?category=animals&limit=9&type=image`)
    if (res.ok) {
      const json = await res.json()
      mediaImages.value = (json.data ?? []).slice(0, 9)
    }
  } catch {
    // Silently fail — API may not be reachable
  } finally {
    mediaLoading.value = false
  }
}

onMounted(() => {
  loadCardImages()
})

function getAppScreenshotUrl(appSlug: string): string | null {
  // Once we have actual screenshot images from the media API, return their CDN URLs here
  return null
}
</script>

<template>
  <div v-if="!app" class="app-detail-404 section">
    <div class="container">
      <p class="eyebrow">Not found</p>
      <h1 class="display-2">App not found.</h1>
      <p class="body-lg">There is no Tiko app with that name.</p>
      <RouterLink to="/apps" class="app-detail-404__link">← Back to all apps</RouterLink>
    </div>
  </div>

  <div v-else class="app-detail">
    <!-- Hero -->
    <header
      class="app-detail__hero"
      :style="{ '--app-color': app.color, '--app-color-light': app.colorLight }"
    >
      <div class="app-detail__hero-inner container">
        <div class="app-detail__hero-copy">
          <RouterLink to="/apps" class="app-detail__back">← All apps</RouterLink>
          <p class="eyebrow" :style="{ color: app.color }">Tiko</p>
          <h1 class="display-1 app-detail__name">{{ app.name }}</h1>
          <p class="app-detail__headline">{{ app.headline }}</p>
          <p class="body-lg app-detail__desc">{{ app.description }}</p>
          <div class="app-detail__hero-actions">
            <a
              v-if="app.appUrl && app.status === 'available'"
              :href="app.appUrl"
              class="app-detail__btn app-detail__btn--primary"
              target="_blank"
              rel="noopener"
              :style="{ background: app.color }"
            >
              Open {{ app.name }} →
            </a>
            <span
              v-else
              class="app-detail__btn app-detail__btn--coming"
            >
              Coming soon
            </span>
            <span
              class="badge"
              :class="app.status === 'available' ? 'badge--available' : 'badge--planned'"
            >
              {{ app.statusLabel }}
            </span>
          </div>
        </div>

        <div class="app-detail__hero-visual" aria-hidden="true">
          <div class="app-detail__mockup" :style="{ borderTopColor: app.color }">
            <div class="app-detail__mockup-bar">
              <span class="app-detail__mockup-dot" />
              <span class="app-detail__mockup-dot" />
            </div>
            <!-- Yes No mockup -->
            <template v-if="slug === 'yes-no'">
              <p class="app-detail__mockup-label">Are you ready?</p>
              <div class="app-detail__mockup-yn">
                <span class="app-detail__mockup-yn-yes" :style="{ background: app.color }">Yes</span>
                <span class="app-detail__mockup-yn-no">No</span>
              </div>
            </template>
            <!-- Cards mockup -->
            <template v-else-if="slug === 'cards'">
              <p class="app-detail__mockup-label">Choose a card</p>
              <div class="app-detail__mockup-cards">
                <span v-for="label in ['🐶', '🐱', '🐦', '🐠', '🐸', '🦋']" :key="label" class="app-detail__mockup-card">{{ label }}</span>
              </div>
            </template>
            <!-- Type mockup -->
            <template v-else-if="slug === 'type'">
              <div class="app-detail__mockup-type">
                <span class="app-detail__mockup-type-text">I want a drink of water</span>
              </div>
              <button class="app-detail__mockup-speak" :style="{ background: app.color }">Speak ▶</button>
            </template>
            <!-- Sequence mockup -->
            <template v-else-if="slug === 'sequence'">
              <div class="app-detail__mockup-step">
                <span class="app-detail__mockup-step-num" :style="{ background: app.color }">2</span>
                <span class="app-detail__mockup-step-label">Wash hands</span>
              </div>
              <div class="app-detail__mockup-progress">
                <div class="app-detail__mockup-progress-fill" :style="{ background: app.color, width: '40%' }" />
              </div>
            </template>
            <!-- Timer mockup -->
            <template v-else-if="slug === 'timer'">
              <div class="app-detail__mockup-timer">
                <span class="app-detail__mockup-timer-text" :style="{ color: app.color }">4:30</span>
              </div>
              <div class="app-detail__mockup-timer-ring">
                <div class="app-detail__mockup-timer-arc" :style="{ borderColor: app.color }" />
              </div>
            </template>
          </div>
        </div>
      </div>
    </header>

    <!-- Features -->
    <section class="section app-detail-features">
      <div class="container">
        <p class="eyebrow">What it does</p>
        <h2 class="display-2 app-detail-features__heading">Built for one clear job.</h2>
        <div class="app-detail-features__grid">
          <article
            v-for="feature in app.features"
            :key="feature.title"
            class="app-detail-feature card"
          >
            <div class="app-detail-feature__dot" :style="{ background: app.color }" />
            <h3 class="app-detail-feature__title">{{ feature.title }}</h3>
            <p class="body-sm">{{ feature.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Media images — Cards only -->
    <section v-if="slug === 'cards'" class="section app-detail-media">
      <div class="container">
        <p class="eyebrow">Built-in library</p>
        <h2 class="display-2 app-detail-media__heading">Hundreds of 4K images, ready to use.</h2>
        <p class="body-lg app-detail-media__lede">
          Animals, food, emotions, shapes, colours, transport, numbers, and letters —
          all included and served in full quality.
        </p>
        <div v-if="mediaLoading" class="app-detail-media__loading">
          <div v-for="i in 9" :key="i" class="app-detail-media__placeholder" />
        </div>
        <div v-else-if="mediaImages.length" class="app-detail-media__grid">
          <div
            v-for="img in mediaImages"
            :key="img.id"
            class="app-detail-media__item"
          >
            <img
              :src="cdnUrl(img.original_url, 400)"
              :alt="img.title"
              loading="lazy"
              class="app-detail-media__img"
            />
            <span class="app-detail-media__caption">{{ img.title }}</span>
          </div>
        </div>
        <div v-else class="app-detail-media__grid">
          <!-- Fallback emoji grid when API is not reachable -->
          <div
            v-for="item in [
              { emoji: '🐶', label: 'Dog' }, { emoji: '🐱', label: 'Cat' }, { emoji: '🐦', label: 'Bird' },
              { emoji: '🐠', label: 'Fish' }, { emoji: '🐸', label: 'Frog' }, { emoji: '🦋', label: 'Butterfly' },
              { emoji: '🍎', label: 'Apple' }, { emoji: '🥦', label: 'Broccoli' }, { emoji: '😊', label: 'Happy' }
            ]"
            :key="item.label"
            class="app-detail-media__item app-detail-media__item--fallback"
          >
            <span class="app-detail-media__emoji">{{ item.emoji }}</span>
            <span class="app-detail-media__caption">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Use when -->
    <section class="section app-detail-use">
      <div class="container">
        <div class="app-detail-use__layout">
          <div class="app-detail-use__copy">
            <p class="eyebrow">Use cases</p>
            <h2 class="display-2">When to reach for {{ app.name }}</h2>
          </div>
          <ul class="app-detail-use__list">
            <li
              v-for="use in app.useWhen"
              :key="use"
              class="app-detail-use__item"
              :style="{ '--app-color': app.color }"
            >
              <span class="app-detail-use__dot" />
              {{ use }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Platform notes -->
    <section class="section app-detail-platform">
      <div class="container">
        <div class="app-detail-platform__inner card card--raised">
          <div class="app-detail-platform__copy">
            <p class="eyebrow">Availability</p>
            <h2 class="display-3">{{ app.status === 'available' ? 'Open now on the web.' : 'Coming soon.' }}</h2>
            <p class="body-lg">{{ app.platformNotes }}</p>
          </div>
          <div class="app-detail-platform__actions">
            <a
              v-if="app.appUrl && app.status === 'available'"
              :href="app.appUrl"
              class="app-detail__btn app-detail__btn--primary"
              target="_blank"
              rel="noopener"
              :style="{ background: app.color }"
            >
              Open {{ app.name }} →
            </a>
            <RouterLink to="/apps" class="app-detail__btn app-detail__btn--outline">
              ← All apps
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.app-detail-404 {
  &__link {
    display: inline-flex;
    margin-top: var(--sp-4);
    font-weight: 600;
    color: var(--text-secondary);
    text-decoration: none;
    &:hover { color: var(--text-primary); }
  }
}

.app-detail {
  &__hero {
    background: color-mix(in srgb, var(--app-color-light) 60%, white);
    border-bottom: 1px solid color-mix(in srgb, var(--app-color) 20%, transparent);
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
    gap: var(--sp-4);
  }

  &__back {
    display: inline-flex;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    text-decoration: none;
    &:hover { color: var(--text-secondary); }
  }

  &__name {
    max-width: 10ch;
    line-height: 1.0;
  }

  &__headline {
    font-family: var(--font-display);
    font-size: clamp(1.1rem, 2.5vw, 1.5rem);
    font-weight: 700;
    color: var(--text-secondary);
    margin-top: calc(-1 * var(--sp-2));
  }

  &__desc {
    max-width: 48ch;
  }

  &__hero-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-3);
    margin-top: var(--sp-2);
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    padding: 12px 24px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;

    &:hover {
      opacity: 0.88;
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    &--primary {
      color: white;
    }

    &--outline {
      background: transparent;
      color: var(--text-secondary);
      border: 1.5px solid var(--border-strong);

      &:hover {
        color: var(--text-primary);
        background: white;
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

  // Hero mockup
  &__hero-visual {
    display: flex;
    justify-content: center;
  }

  &__mockup {
    background: white;
    border: 1.5px solid var(--border);
    border-top: 4px solid var(--app-color);
    border-radius: 20px;
    width: 220px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: var(--shadow-md);
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

  // Yes No mockup
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
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.2rem;
    color: white;
    cursor: pointer;
  }

  &__mockup-yn-no {
    background: #ff8a65;
  }

  // Cards mockup
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

  // Type mockup
  &__mockup-type {
    background: var(--surface-subtle);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px;
    font-size: 0.8rem;
    color: var(--text-primary);
    min-height: 60px;
  }

  &__mockup-speak {
    border: none;
    border-radius: 999px;
    padding: 8px 16px;
    color: white;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    align-self: flex-start;
  }

  // Sequence mockup
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
    font-weight: 600;
    font-size: 0.9rem;
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
    transition: width 0.3s;
  }

  // Timer mockup
  &__mockup-timer {
    display: flex;
    justify-content: center;
    padding: 16px 0 8px;
  }

  &__mockup-timer-text {
    font-family: var(--font-display);
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
}

// Features
.app-detail-features {
  &__heading {
    max-width: 16ch;
    margin-top: var(--sp-2);
    margin-bottom: var(--sp-8);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--sp-4);
  }
}

.app-detail-feature {
  padding: var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.3;
  }
}

// Media (Cards page)
.app-detail-media {
  background: var(--surface-subtle);
  border-block: 1px solid var(--border);

  &__heading {
    max-width: 20ch;
    margin-top: var(--sp-2);
    margin-bottom: var(--sp-3);
  }

  &__lede {
    max-width: 48ch;
    margin-bottom: var(--sp-8);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--sp-3);
  }

  &__loading {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--sp-3);
  }

  &__placeholder {
    aspect-ratio: 1;
    background: var(--border);
    border-radius: 16px;
    animation: pulse 1.5s ease-in-out infinite alternate;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    background: white;
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;

    &--fallback {
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      padding: var(--sp-4);
    }
  }

  &__img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
  }

  &__emoji {
    font-size: 3rem;
    line-height: 1;
  }

  &__caption {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-align: center;
    padding: var(--sp-2) var(--sp-3) var(--sp-3);
  }
}

@keyframes pulse {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

// Use when
.app-detail-use {
  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: start;
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    position: sticky;
    top: calc(var(--header-height) + var(--sp-6));
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-4);
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-primary);
    padding: var(--sp-5);
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-sm);
  }

  &__dot {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--app-color);
    margin-top: 5px;
  }
}

// Platform notes
.app-detail-platform {
  &__inner {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: clamp(2rem, 5vw, 4rem);
    align-items: center;
    padding: clamp(var(--sp-8), 5vw, var(--sp-12));
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    max-width: 48ch;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    align-items: flex-start;
  }
}

@media (max-width: 900px) {
  .app-detail {
    &__hero-inner,
    &__hero-visual {
      grid-template-columns: 1fr;
    }

    &__hero-visual {
      display: none;
    }
  }

  .app-detail-use {
    &__layout {
      grid-template-columns: 1fr;
    }

    &__copy {
      position: static;
    }
  }

  .app-detail-platform {
    &__inner {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 640px) {
  .app-detail-media__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
