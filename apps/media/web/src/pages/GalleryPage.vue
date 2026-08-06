<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBemm } from 'bemm'
import { useMediaLibrary } from '../composables/useMediaLibrary'
import SearchBar from '../components/SearchBar.vue'
import TypeFilter from '../components/TypeFilter.vue'
import MediaGrid from '../components/MediaGrid.vue'
import Pagination from '../components/Pagination.vue'
import type { MediaItem, MediaType } from '../types/media'

const bemm = useBemm('gallery', { return: 'string', includeBaseClass: true })

const router = useRouter()
const {
  items,
  total,
  page,
  totalPages,
  loading,
  error,
  searchQuery,
  activeType,
  activeCategory,
  hasNextPage,
  hasPrevPage,
  fetchMedia,
  getDownloadUrl,
  goToPage,
  nextPage,
  prevPage,
  setSearch,
  setType,
  setCategory,
} = useMediaLibrary()

// The hero shows real library content rather than a stand-in illustration.
const previewItems = computed(() => items.value.filter((item) => item.thumbnailUrl || item.url).slice(0, 4))

const visibleCategories = computed(() => {
  const counts = new Map<string, number>()
  for (const item of items.value) {
    const category = item.category || 'media'
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }))
})

onMounted(() => {
  fetchMedia()
})

function onCardClick(item: MediaItem) {
  router.push({ name: 'asset-detail', params: { id: item.id } })
}

function onDownload(item: MediaItem) {
  window.open(getDownloadUrl(item.id), '_blank')
}

function onTypeChange(type: MediaType | undefined) {
  setType(type)
}
</script>

<template>
  <div :class="bemm('')">
    <section :class="[bemm('hero'), 'container']">
      <div :class="bemm('intro')">
        <p class="eyebrow">Tiko media library</p>
        <h1 :class="bemm('title')">Every image and sound behind the Tiko apps.</h1>
        <p :class="[bemm('lead'), 'body-lg']">
          Images, audio, thumbnails and generated assets, served straight from the Tiko Media
          API. Search it, filter it, download what you need.
        </p>

        <dl :class="bemm('stats')">
          <div :class="bemm('stat')">
            <dt :class="bemm('stat-label')">Media items</dt>
            <dd :class="bemm('stat-value')">{{ total.toLocaleString() }}</dd>
          </div>
          <div v-if="visibleCategories.length" :class="bemm('stat')">
            <dt :class="bemm('stat-label')">Categories in view</dt>
            <dd :class="bemm('stat-value')">{{ visibleCategories.length }}</dd>
          </div>
        </dl>
      </div>

      <ul v-if="previewItems.length" :class="bemm('preview')" aria-label="Recently added media">
        <li v-for="item in previewItems" :key="item.id" :class="bemm('preview-item')">
          <button :class="bemm('preview-button')" @click="onCardClick(item)">
            <img
              :class="bemm('preview-image')"
              :src="item.thumbnailUrl || item.url"
              :alt="item.title"
              loading="lazy"
            >
          </button>
        </li>
      </ul>
    </section>

    <section id="browse" :class="[bemm('browse'), 'container']">
      <div :class="bemm('browse-head')">
        <p class="eyebrow">Browse</p>
        <h2 :class="bemm('browse-title')">Search the library</h2>
      </div>

      <div :class="bemm('controls')">
        <SearchBar
          :model-value="searchQuery"
          placeholder="Search images, audio, stories…"
          @search="setSearch"
        />
        <TypeFilter :model-value="activeType" @update:model-value="onTypeChange" />
      </div>

      <div v-if="visibleCategories.length > 1 || activeCategory" :class="bemm('categories')">
        <button
          v-for="category in visibleCategories"
          :key="category.name"
          :class="bemm('category', ['', activeCategory === category.name ? 'active' : ''])"
          :aria-pressed="activeCategory === category.name"
          @click="setCategory(activeCategory === category.name ? undefined : category.name)"
        >
          <span :class="bemm('category-name')">{{ category.name }}</span>
          <span :class="bemm('category-count')">{{ category.count }}</span>
        </button>
        <button
          v-if="activeCategory"
          :class="bemm('category-clear')"
          @click="setCategory(undefined)"
        >
          Clear category
        </button>
      </div>

      <p v-if="error" :class="bemm('error')">
        Could not load media: {{ error }}
      </p>

      <MediaGrid
        :items="items"
        :loading="loading"
        @card-click="onCardClick"
        @download="onDownload"
      />

      <Pagination
        :page="page"
        :total-pages="totalPages"
        :has-next="hasNextPage"
        :has-prev="hasPrevPage"
        @prev="prevPage"
        @next="nextPage"
        @goto="goToPage"
      />
    </section>
  </div>
</template>

<style lang="scss">
.gallery {
  display: flex;
  flex-direction: column;
  gap: var(--section-space);
  padding-bottom: var(--space);

  &__hero {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    align-items: center;
    gap: clamp(calc(var(--space) * 2), 6vw, calc(var(--space) * 5));
    padding-block: clamp(calc(var(--space) * 2), 7vw, calc(var(--space) * 5));
  }

  &__intro {
    display: flex;
    flex-direction: column;
    gap: var(--space);
  }

  // The `.display-*` helpers are set at `line-height: 0.8`, which only clears itself on a
  // single line — the website uses them for short titles like "App not found." and gives its
  // own wrapping headings a component class. This heading wraps, so it does the same.
  &__title {
    font-size: clamp(2.25rem, 4.5vw, 3.5rem);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  &__lead {
    max-width: 46ch;
  }

  &__stats {
    display: flex;
    flex-wrap: wrap;
    gap: calc(var(--space) * 2);
    margin: 0;
    padding-top: var(--space-s);
  }

  &__stat {
    display: flex;
    // Label above value in the DOM reads better for screen readers; the visual
    // order is value-first.
    flex-direction: column-reverse;
    gap: 2px;
  }

  &__stat-value {
    margin: 0;
    font-family: var(--font-family-heading);
    font-size: 1.75rem;
    font-weight: 800;
    line-height: 1.1;
    color: var(--color-foreground);
  }

  &__stat-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  &__preview {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space);
  }

  &__preview-item {
    display: flex;
  }

  &__preview-button {
    width: 100%;
    aspect-ratio: 1;
    padding: 0;
    border: none;
    border-radius: 20px;
    overflow: hidden;
    background: var(--surface-card);
    cursor: pointer;
    box-shadow: var(--shadow-s);
    transition: transform 0.18s var(--ease-out), box-shadow 0.18s var(--ease-out);

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-m);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 3px;
    }
  }

  &__preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__browse {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 1.5);
    // Anchor target: clear the fixed header when the in-page link jumps here.
    scroll-margin-top: calc(var(--header-height) + var(--space) * 2);
  }

  &__browse-head {
    display: flex;
    flex-direction: column;
  }

  &__browse-title {
    font-size: clamp(1.5rem, 3vw, 2.25rem);
    line-height: 1.05;
    letter-spacing: -0.02em;
  }

  &__controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space);
  }

  &__categories {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
  }

  // Selection is a tint, not an outline.
  &__category {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-s);
    padding: 6px 14px;
    border: none;
    border-radius: 999px;
    background: var(--surface-subtle);
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: capitalize;
    cursor: pointer;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);

    &:hover {
      background: color-mix(in srgb, var(--color-primary), transparent 88%);
      color: var(--color-foreground);
    }

    &--active {
      background: color-mix(in srgb, var(--color-primary), transparent 78%);
      color: color-mix(in srgb, var(--color-foreground), var(--color-primary) 30%);
    }
  }

  &__category-count {
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }

  &__category-clear {
    padding: 6px 14px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;

    &:hover { color: var(--color-foreground); }
  }

  &__error {
    padding: var(--space) calc(var(--space) * 1.25);
    border-radius: 16px;
    background: color-mix(in srgb, var(--color-error), var(--color-background) 88%);
    color: color-mix(in srgb, var(--color-error), var(--color-foreground) 20%);
    font-weight: 600;
  }
}

@media (max-width: 900px) {
  .gallery {
    &__hero {
      grid-template-columns: 1fr;
    }
  }
}
</style>
