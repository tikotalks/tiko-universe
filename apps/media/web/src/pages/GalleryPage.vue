<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMediaLibrary } from '../composables/useMediaLibrary'
import SearchBar from '../components/SearchBar.vue'
import TypeFilter from '../components/TypeFilter.vue'
import MediaGrid from '../components/MediaGrid.vue'
import Pagination from '../components/Pagination.vue'
import type { MediaItem, MediaType } from '../types/media'

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

const featuredItems = computed(() => items.value.slice(0, 6))
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
  <div class="media-home">
    <section class="media-home__hero">
      <div class="media-home__hero-copy">
        <p class="media-home__eyebrow">Tiko media library</p>
        <h1>All Tiko media in one browsable place.</h1>
        <p>
          Browse the live Tiko Media API: images, stories, audio, thumbnails and generated assets for the apps.
        </p>
        <div class="media-home__stats">
          <span><strong>{{ total.toLocaleString() }}</strong> media items</span>
          <span><strong>{{ visibleCategories.length }}</strong> visible categories</span>
          <span><strong>Live</strong> API</span>
        </div>
      </div>

      <div v-if="featuredItems.length" class="media-home__hero-stack" aria-label="Featured media preview">
        <button
          v-for="item in featuredItems.slice(0, 4)"
          :key="item.id"
          class="media-home__hero-card"
          @click="onCardClick(item)"
        >
          <img v-if="item.thumbnailUrl || item.url" :src="item.thumbnailUrl || item.url" :alt="item.title" loading="lazy">
          <span v-else>{{ item.fileType }}</span>
        </button>
      </div>
    </section>

    <section id="featured" class="media-home__section">
      <div class="media-home__section-head">
        <div>
          <p class="media-home__eyebrow">Featured</p>
          <h2>Recently added</h2>
        </div>
      </div>
      <MediaGrid
        :items="featuredItems"
        :loading="loading"
        @card-click="onCardClick"
        @download="onDownload"
      />
    </section>

    <section id="browse" class="media-home__section media-home__section--panel">
      <div class="media-home__section-head media-home__section-head--stacked">
        <div>
          <p class="media-home__eyebrow">Browse</p>
          <h2>Search the library</h2>
        </div>
        <SearchBar
          :model-value="searchQuery"
          placeholder="Search images, audio, stories…"
          @search="setSearch"
        />
        <TypeFilter
          :model-value="activeType"
          @update:model-value="onTypeChange"
        />
      </div>

      <p v-if="error" class="media-home__error">
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

    <section id="categories" class="media-home__section">
      <div class="media-home__section-head">
        <div>
          <p class="media-home__eyebrow">Sections</p>
          <h2>Categories</h2>
        </div>
        <button
          v-if="activeCategory"
          class="media-home__clear"
          @click="setCategory(undefined)"
        >
          Clear filter
        </button>
      </div>

      <div class="media-home__categories">
        <button
          v-for="category in visibleCategories"
          :key="category.name"
          class="media-home__category"
          :class="{ 'media-home__category--active': activeCategory === category.name }"
          @click="setCategory(category.name)"
        >
          <span>{{ category.name }}</span>
          <strong>{{ category.count }}</strong>
        </button>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.media-home {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: clamp(1.25rem, 4vw, 3.5rem) 0 4rem;

  &__hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(19rem, 0.78fr);
    gap: clamp(1.5rem, 5vw, 4rem);
    align-items: center;
    min-height: 30rem;
  }

  &__hero-copy {
    h1 {
      max-width: 12ch;
      margin: 0;
      font-size: clamp(3rem, 8vw, 6.8rem);
      line-height: 0.86;
      letter-spacing: -0.07em;
      font-weight: 950;
    }

    > p:not(.media-home__eyebrow) {
      max-width: 40rem;
      color: color-mix(in srgb, var(--color-foreground) 66%, transparent);
      font-size: clamp(1.05rem, 2vw, 1.35rem);
      font-weight: 700;
      line-height: 1.45;
    }
  }

  &__eyebrow {
    margin: 0 0 0.6rem;
    color: var(--color-primary);
    font-size: 0.78rem;
    font-weight: 950;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  &__stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    margin-top: 1.6rem;

    span {
      display: inline-flex;
      gap: 0.35rem;
      align-items: baseline;
      padding: 0.65rem 0.85rem;
      border-radius: 999px;
      background: var(--tiko-surface-raised);
      border: 1px solid var(--tiko-border);
      color: color-mix(in srgb, var(--color-foreground) 70%, transparent);
      font-weight: 800;
    }

    strong { color: var(--color-foreground); }
  }

  &__hero-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
    transform: rotate(2deg);
  }

  &__hero-card {
    overflow: hidden;
    min-height: 11rem;
    padding: 0;
    border: 0;
    border-radius: 2rem;
    background: var(--tiko-surface-raised);
    box-shadow: 0 1.4rem 3rem var(--tiko-shadow);
    cursor: pointer;

    &:nth-child(2), &:nth-child(3) { transform: translateY(1.4rem); }

    img {
      width: 100%;
      height: 100%;
      min-height: 11rem;
      object-fit: cover;
      display: block;
    }
  }

  &__section {
    margin-top: clamp(2.5rem, 8vw, 5rem);

    &--panel {
      padding: clamp(1rem, 3vw, 1.5rem);
      border-radius: 2rem;
      background: color-mix(in srgb, var(--tiko-surface-raised) 78%, transparent);
      border: 1px solid var(--tiko-border);
    }
  }

  &__section-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;

    h2 {
      margin: 0;
      font-size: clamp(1.7rem, 4vw, 3rem);
      letter-spacing: -0.04em;
      line-height: 1;
    }

    &--stacked {
      align-items: stretch;
      flex-direction: column;
    }
  }

  &__error {
    padding: 0.85rem 1rem;
    border-radius: 1rem;
    background: color-mix(in srgb, var(--color-error) 12%, var(--color-background));
    color: var(--color-error);
    font-weight: 800;
  }

  &__categories {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 0.8rem;
  }

  &__category,
  &__clear {
    border: 1px solid var(--tiko-border);
    background: var(--tiko-surface-raised);
    color: var(--color-foreground);
    cursor: pointer;
    font-weight: 900;
  }

  &__category {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 5rem;
    padding: 1rem;
    border-radius: 1.25rem;
    text-transform: capitalize;

    strong {
      display: grid;
      place-items: center;
      min-width: 2.2rem;
      height: 2.2rem;
      padding-inline: 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-primary) 18%, transparent);
    }

    &--active {
      background: var(--color-primary);
      color: var(--color-primary-text);
    }
  }

  &__clear {
    padding: 0.65rem 0.9rem;
    border-radius: 999px;
  }
}

@media (max-width: 760px) {
  .media-home {
    &__hero { grid-template-columns: 1fr; min-height: initial; }
    &__hero-copy h1 { max-width: 9ch; }
    &__section-head { align-items: flex-start; flex-direction: column; }
  }
}
</style>
