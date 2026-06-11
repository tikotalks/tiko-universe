<script setup lang="ts">
import { ref } from 'vue'
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import { useTikoMedia, type TikoMedia } from '@tiko/media'
import { TikoField, TikoSheet } from '@tiko/ui'
import { resizedCDNURL } from '../composables/cardsMedia'

const props = defineProps<{
  query: string
  labels: {
    pickImage: string
    search: string
    searching: string
    searchImages: string
    typeToSearch: string
  }
}>()

const emit = defineEmits<{
  select: [value: string]
}>()

const bemm = useBemm('cards-image-picker', { return: 'string', includeBaseClass: true })
const { search } = useTikoMedia()
const searchQuery = ref(props.query)
const results = ref<TikoMedia[]>([])
const searching = ref(false)

async function runSearch() {
  const query = searchQuery.value.trim()
  if (!query) return
  searching.value = true
  try {
    results.value = await search(query, { limit: 36 })
  } finally {
    searching.value = false
  }
}

void runSearch()
</script>

<template>
  <TikoSheet :title="labels.pickImage" icon="image">
    <div :class="bemm('search')">
      <TikoField v-model="searchQuery" :label="labels.search" :placeholder="labels.searchImages" />
      <Button type="button" variant="primary" :disabled="!searchQuery.trim() || searching" @click="runSearch">
        {{ searching ? labels.searching : labels.search }}
      </Button>
    </div>
    <div :class="bemm('grid')">
      <button
        v-for="item in results"
        :key="item.id"
        type="button"
        :class="bemm('result')"
        @click="emit('select', item.id)"
      >
        <img :src="resizedCDNURL(item.original_url)" :alt="item.title || item.name" loading="lazy">
      </button>
    </div>
    <p v-if="!results.length" :class="bemm('empty')">{{ searching ? labels.searching : labels.typeToSearch }}</p>
  </TikoSheet>
</template>
