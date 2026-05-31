<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMediaLibrary } from '../composables/useMediaLibrary'
import SearchBar from '../components/SearchBar.vue'
import TypeFilter from '../components/TypeFilter.vue'
import MediaGrid from '../components/MediaGrid.vue'
import Pagination from '../components/Pagination.vue'
import type { MediaItem } from '../types/media'
import type { MediaType } from '../types/media'

const router = useRouter()
const {
  items,
  page,
  totalPages,
  loading,
  searchQuery,
  activeType,
  hasNextPage,
  hasPrevPage,
  fetchMedia,
  getDownloadUrl,
  goToPage,
  nextPage,
  prevPage,
  setSearch,
  setType,
} = useMediaLibrary()

onMounted(() => {
  fetchMedia()
})

function onCardClick(item: MediaItem) {
  router.push({ name: 'asset-detail', params: { id: item.id } })
}

function onDownload(item: MediaItem) {
  const url = getDownloadUrl(item.id)
  window.open(url, '_blank')
}

function onSearch(query: string) {
  setSearch(query)
}

function onTypeChange(type: MediaType | undefined) {
  setType(type)
}
</script>

<template>
  <div class="gallery-page">
    <header class="gallery-page__header">
      <div class="gallery-page__title-row">
        <h1 class="gallery-page__title">Media Library</h1>
        <span class="gallery-page__count">{{ totalPages > 0 ? `Page ${page} of ${totalPages}` : '' }}</span>
      </div>
      <SearchBar
        :model-value="searchQuery"
        placeholder="Search images, audio, stories…"
        @search="onSearch"
      />
      <TypeFilter
        :model-value="activeType"
        @update:model-value="onTypeChange"
      />
    </header>

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
  </div>
</template>

<style lang="scss" scoped>
.gallery-page {
  &__header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  &__title-row {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  &__title {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0;
  }

  &__count {
    font-size: 0.85rem;
    color: color-mix(in srgb, var(--color-foreground) 50%, transparent);
  }
}
</style>
