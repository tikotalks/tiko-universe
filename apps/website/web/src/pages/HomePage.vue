<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ref, onMounted } from 'vue'
import { useBemm } from 'bemm'
import { tikoApps } from '../content/appUniverse'
import { trustPrinciples, platformNotes, whyTikoPillars, whyFreePillars } from '../siteContent'

const bemm = useBemm('home', { return: 'string', includeBaseClass: true })

interface MediaImage {
  id: string
  title: string
  original_url: string
}

interface MediaApiImage {
  id: string
  title?: string
  original_url?: string
  file_name?: string
}

const mediaImages = ref<MediaImage[]>([])

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

async function loadHomeImages() {
  try {
    const res = await fetch('https://media.tikoapi.org/v1/media?category=animals&limit=8&type=image')
    if (res.ok) {
      const json = await res.json() as { data?: MediaApiImage[] }
      mediaImages.value = (json.data ?? [])
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
        .slice(0, 8)
    }
  } catch {
    // silently fail — fallback tiles shown
  }
}

onMounted(() => {
  loadHomeImages()
})
</script>

<template>
  <!-- Hero -->
  <section :class="bemm('hero')">
    <div :class="[bemm('hero-inner'), 'container']">
      <div :class="bemm('hero-copy')">
        <p class="eyebrow">Small free apps. No ads. Ever.</p>
        <h1 :class="['display-1', bemm('hero-heading')]">
          Tiko exists because support should be available in the moment.
        </h1>
        <p :class="['body-lg', bemm('hero-lede')]">
          Tiko is a family of small, free apps that help children answer, choose, type, follow routines,
          and understand time. No ads. No account wall. No payment step. Just simple tools that open when they are needed.
        </p>
        <div :class="bemm('hero-actions')">
          <RouterLink to="/apps/yes-no" :class="bemm('hero-btn', 'primary')">
            Try Yes No — it's free
          </RouterLink>
          <RouterLink to="/why-tiko" :class="bemm('hero-btn', 'outline')">
            Why Tiko exists
          </RouterLink>
        </div>
        <p :class="bemm('hero-note')">Free, always. No ads, ever. Works on any device.</p>
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
  <section :class="[bemm('why'), 'section section--tight']">
    <div class="container">
      <div :class="bemm('why-header')">
        <p class="eyebrow">Why Tiko exists</p>
        <h2 class="display-2">Everyday support should not depend on setup, payment, or ads.</h2>
        <p class="body-lg">
          A child may need a way to say yes or no, ask for food, choose an activity, or understand what happens next.
          Those moments should not wait behind an account form, a subscription decision, or a complicated control panel.
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
  <section class="section section--tight">
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
  <section :class="[bemm('media'), 'section section--tight']">
    <div class="container">
      <p class="eyebrow">Familiar pictures help</p>
      <h2 :class="['display-2', bemm('media-heading')]">Images make choices easier to understand.</h2>
      <p :class="['body-lg', bemm('media-lede')]">Cards can use simple, recognizable images so children can choose without needing the right words first.</p>
      <div :class="bemm('media-grid')">
        <template v-if="mediaImages.length">
          <div
            v-for="img in mediaImages"
            :key="img.id"
            :class="bemm('media-item')"
          >
            <img
              :src="cdnUrl(img.original_url, 280)"
              :alt="img.title"
              loading="lazy"
              :class="bemm('media-img')"
            />
          </div>
        </template>
        <template v-else>
          <div
            v-for="(color, i) in ['#9b3fbd','#2488ff','#ff8a1f','#16b8a6','#f8c22e','#9b3fbd','#2488ff','#ff8a1f']"
            :key="i"
            :class="[bemm('media-item'), bemm('media-item', 'placeholder')]"
            :style="{ background: color }"
          />
        </template>
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
  <section :class="[bemm('cta'), 'section--tight']">
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
  }

  &__media-heading {
    max-width: 22ch;
    margin-top: var(--space-s);
    margin-bottom: var(--space);
  }

  &__media-lede {
    max-width: 52ch;
    margin-bottom: var(--space-l);
  }

  &__media-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: calc(var(--space) * 0.75);
  }

  &__media-item {
    aspect-ratio: 1;
    border-radius: 16px;
    overflow: hidden;
    background: var(--surface-card);

    &--placeholder {
      opacity: 0.6;
    }
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
    background: var(--app-yes-no);
    margin-top: clamp(calc(var(--space) * 3), 10vw, calc(var(--space) * 6));
  }

  &__cta-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: calc(var(--space) * 1.5);
    padding-block: clamp(calc(var(--space) * 2.5), 7vw, var(--space-xl));
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

  .home__media-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
</style>
