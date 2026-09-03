<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { Icon as SilIcon } from '@sil/ui'
import type { PopupService } from '@sil/ui'
import { tikoImageUrl } from '@tiko/ui'
import {
  shareCodeFromScan,
  useSharedCollections,
  type SharedCollection,
} from '../composables/useSharedCollections'
import { useQrScanner } from '../composables/useQrScanner'

export interface ImportCollectionLabels {
  title: string
  subtitle: string
  scan: string
  scanHint: string
  scanUnsupported: string
  cameraBlocked: string
  codeLabel: string
  codePlaceholder: string
  find: string
  notFound: string
  featured: string
  songs: string
  import: string
  close: string
}

interface Props {
  labels: ImportCollectionLabels
  /** Preloaded when a link or QR opened the app straight onto a collection. */
  collection?: SharedCollection | null
}

const props = withDefaults(defineProps<Props>(), { collection: null })

const emit = defineEmits<{ (e: 'import', collection: SharedCollection): void }>()

const popup = inject<PopupService>('popupService')
const shared = useSharedCollections()
const scanner = useQrScanner()

const code = ref('')
const found = ref<SharedCollection | null>(props.collection)
const notFound = ref(false)
const video = ref<HTMLVideoElement | null>(null)

const featured = computed(() => shared.featured.value)

onMounted(() => {
  if (!found.value) void shared.loadFeatured()
})

function artworkFor(collection: SharedCollection): string {
  return collection.imageUrl ? tikoImageUrl(collection.imageUrl, 'small') : ''
}

function songsLabel(collection: SharedCollection): string {
  return props.labels.songs.replace('{count}', String(collection.songCount))
}

async function lookup(rawCode: string) {
  notFound.value = false
  const collection = await shared.fetchByCode(rawCode)
  if (!collection) {
    notFound.value = true
    return
  }
  found.value = collection
}

async function startScanning() {
  const element = video.value
  if (!element) return
  await scanner.start(element, (value) => {
    const scanned = shareCodeFromScan(value)
    if (scanned) void lookup(scanned)
    else notFound.value = true
  })
}

function confirmImport() {
  if (!found.value) return
  emit('import', found.value)
  scanner.stop()
  popup?.closeAllPopups()
}

function close() {
  scanner.stop()
  popup?.closeAllPopups()
}
</script>

<template>
  <div class="import-collection" data-test="radio-import-collection">
    <div class="import-collection__header">
      <h2 class="import-collection__title">{{ labels.title }}</h2>
      <button class="import-collection__close" :aria-label="labels.close" @click="close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- What was scanned or looked up -->
    <template v-if="found">
      <div class="import-collection__found" data-test="radio-import-preview">
        <div class="import-collection__found-art">
          <img v-if="artworkFor(found)" :src="artworkFor(found)" :alt="found.name" />
          <SilIcon v-else name="media/music-note" size="large" />
        </div>
        <div class="import-collection__found-info">
          <span class="import-collection__found-name">{{ found.name }}</span>
          <span class="import-collection__found-count">{{ songsLabel(found) }}</span>
        </div>
      </div>
      <button class="import-collection__submit" data-test="radio-import-confirm" @click="confirmImport">
        {{ labels.import }}
      </button>
    </template>

    <!-- Scan, or type the code -->
    <template v-else>
      <p class="import-collection__subtitle">{{ labels.subtitle }}</p>

      <div v-if="scanner.supported.value" class="import-collection__scanner">
        <video
          ref="video"
          class="import-collection__video"
          :class="{ 'import-collection__video--live': scanner.scanning.value }"
          muted
          playsinline
        />
        <button
          v-if="!scanner.scanning.value"
          class="import-collection__scan-button"
          data-test="radio-import-scan"
          @click="startScanning"
        >
          {{ labels.scan }}
        </button>
        <p v-else class="import-collection__hint">{{ labels.scanHint }}</p>
        <p v-if="scanner.error.value === 'no-camera'" class="import-collection__note">{{ labels.cameraBlocked }}</p>
      </div>
      <p v-else class="import-collection__note">{{ labels.scanUnsupported }}</p>

      <div class="import-collection__code">
        <label class="import-collection__label" for="import-code">{{ labels.codeLabel }}</label>
        <div class="import-collection__code-row">
          <input
            id="import-code"
            v-model="code"
            class="import-collection__input"
            data-test="radio-import-code"
            type="text"
            autocapitalize="characters"
            spellcheck="false"
            :placeholder="labels.codePlaceholder"
            @keyup.enter="lookup(code)"
          />
          <button
            class="import-collection__find"
            data-test="radio-import-find"
            :disabled="!code.trim() || shared.loading.value"
            @click="lookup(code)"
          >
            {{ labels.find }}
          </button>
        </div>
        <p v-if="notFound" class="import-collection__note" data-test="radio-import-not-found">{{ labels.notFound }}</p>
      </div>

      <div v-if="featured.length" class="import-collection__featured">
        <h3 class="import-collection__featured-heading">{{ labels.featured }}</h3>
        <button
          v-for="collection in featured"
          :key="collection.code"
          class="import-collection__set"
          :data-test="`radio-import-featured-${collection.code}`"
          @click="found = collection"
        >
          <span class="import-collection__set-art">
            <img v-if="artworkFor(collection)" :src="artworkFor(collection)" :alt="collection.name" loading="lazy" />
            <SilIcon v-else name="media/music-note" size="small" />
          </span>
          <span class="import-collection__set-info">
            <span class="import-collection__set-name">{{ collection.name }}</span>
            <span class="import-collection__set-count">{{ songsLabel(collection) }}</span>
          </span>
        </button>
      </div>
    </template>
  </div>
</template>
