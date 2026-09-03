<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { Icon as SilIcon } from '@sil/ui'
import type { PopupService } from '@sil/ui'
import { tikoImageUrl } from '@tiko/ui'
import type { RadioCategory, RadioServiceProvider } from '@tiko/data'
import { useYouTubeSearch, youTubeVideoId, type YouTubeSearchItem } from '../composables/useYouTubeSearch'
import { useYouTubeMeta } from '../composables/useYouTubeMeta'
import { useMusicLinks, radioServiceFor, radioServices } from '../composables/useSubscriptions'
import { radioCollectionArtwork } from '../radioCollections'

type Step = 'source' | 'youtube' | 'upload' | 'service'

export interface AddSongTrack {
  title: string
  artist?: string
  source: 'youtube' | 'spotify' | 'apple-music'
  youtubeVideoId?: string
  externalId?: string
  externalUrl?: string
  thumbnailUrl?: string
  duration?: number
  categoryId: string
}

export interface AddSongLabels {
  addSong: string
  youtube: string
  youtubeHint: string
  upload: string
  uploadHint: string
  uploadTitle: string
  chooseFile: string
  searchYouTube: string
  searchPlaceholder: string
  searchEmpty: string
  searchUnavailable: string
  pasteLink: string
  pasteLinkPlaceholder: string
  pasteServiceLink: string
  pasteServiceLinkPlaceholder: string
  collection: string
  toCollection: string
  audioOnly: string
  linkNotRecognised: string
  addFrom: string
  back: string
  close: string
  services: string
  servicesHint: string
}

interface Props {
  collections: RadioCategory[]
  /** Preselected when the popup was opened from inside a collection. */
  collectionId?: string
  linkedProviders: RadioServiceProvider[]
  labels: AddSongLabels
}

const props = withDefaults(defineProps<Props>(), { collectionId: '' })

const emit = defineEmits<{
  (e: 'add', track: AddSongTrack): void
  (e: 'upload', track: { title: string; source: 'upload'; file: File; categoryId: string }): void
  (e: 'open-services'): void
}>()

const popup = inject<PopupService>('popupService')
const youtubeSearch = useYouTubeSearch()
const youtubeMeta = useYouTubeMeta()
const musicLinks = useMusicLinks()

const step = ref<Step>('source')
const selectedCollectionId = ref(props.collectionId || props.collections[0]?.id || '')
const activeProvider = ref<RadioServiceProvider>('spotify')

// ---- YouTube state ----
const searchQuery = ref('')
const youtubeUrl = ref('')
const selectedVideo = ref<YouTubeSearchItem | null>(null)

// ---- Service link state ----
const serviceUrl = ref('')
const serviceSong = ref<AddSongTrack | null>(null)

// ---- Upload state ----
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const selectedCollection = computed(
  () => props.collections.find(collection => collection.id === selectedCollectionId.value) ?? null,
)

/**
 * The button says where the song actually lands. On a screen that is not inside
 * a collection it never claims "this collection" — it names the one chosen.
 */
const submitLabel = computed(() => (
  selectedCollection.value
    ? props.labels.toCollection.replace('{collection}', selectedCollection.value.name)
    : props.labels.addSong
))

const canAddYouTube = computed(() => Boolean(
  selectedCollectionId.value && (selectedVideo.value || youTubeVideoId(youtubeUrl.value)),
))

const canAddService = computed(() => Boolean(selectedCollectionId.value && serviceSong.value))

const canUpload = computed(() => Boolean(selectedCollectionId.value && selectedFile.value))

const availableServices = computed(
  () => radioServices.filter(service => props.linkedProviders.includes(service.provider)),
)

watch(searchQuery, (query) => {
  selectedVideo.value = null
  youtubeSearch.searchDebounced({ query, limit: 12 })
})

// A pasted link is resolved into the same preview card a search result gives.
watch(youtubeUrl, async (url) => {
  const videoId = youTubeVideoId(url)
  if (!videoId) return
  const meta = await youtubeMeta.fetchMeta(videoId)
  selectedVideo.value = {
    videoId,
    title: meta?.title ?? `Video ${videoId}`,
    channelTitle: '',
    thumbnailUrl: meta?.thumbnailUrl ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
  }
})

watch(serviceUrl, async (url) => {
  serviceSong.value = null
  if (!url.trim()) return
  const resolved = await musicLinks.resolveLink(url)
  if (!resolved) return
  serviceSong.value = {
    title: resolved.title,
    artist: resolved.artist,
    source: resolved.provider,
    externalId: resolved.externalId,
    externalUrl: resolved.externalUrl,
    thumbnailUrl: resolved.thumbnailUrl,
    duration: resolved.durationSeconds,
    categoryId: selectedCollectionId.value,
  }
})

function collectionArtwork(collection: RadioCategory): string {
  const url = radioCollectionArtwork(collection)
  return url ? tikoImageUrl(url, 'small') : ''
}

function goToStep(next: Step, provider?: RadioServiceProvider) {
  if (provider) activeProvider.value = provider
  step.value = next
}

function goBack() {
  step.value = 'source'
  searchQuery.value = ''
  youtubeUrl.value = ''
  serviceUrl.value = ''
  serviceSong.value = null
  selectedVideo.value = null
  selectedFile.value = null
  youtubeSearch.reset()
}

function closePopup() {
  popup?.closeAllPopups()
}

function selectVideo(video: YouTubeSearchItem) {
  selectedVideo.value = selectedVideo.value?.videoId === video.videoId ? null : video
}

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) selectedFile.value = file
  input.value = ''
}

function handleAddYouTube() {
  if (!canAddYouTube.value) return
  const video = selectedVideo.value
  const videoId = video?.videoId ?? youTubeVideoId(youtubeUrl.value)
  if (!videoId) return

  emit('add', {
    title: video?.title ?? `Video ${videoId}`,
    artist: video?.channelTitle || undefined,
    source: 'youtube',
    youtubeVideoId: videoId,
    thumbnailUrl: video?.thumbnailUrl ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    duration: video?.durationSeconds,
    categoryId: selectedCollectionId.value,
  })
  closePopup()
}

function handleAddService() {
  if (!canAddService.value || !serviceSong.value) return
  emit('add', { ...serviceSong.value, categoryId: selectedCollectionId.value })
  closePopup()
}

function handleUpload() {
  if (!canUpload.value || !selectedFile.value) return
  emit('upload', {
    title: selectedFile.value.name.replace(/\.[^.]+$/, ''),
    source: 'upload',
    file: selectedFile.value,
    categoryId: selectedCollectionId.value,
  })
  closePopup()
}

function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="add-song" data-test="radio-add-song">
    <input ref="fileInput" type="file" accept="audio/*" hidden @change="handleFileSelect" />

    <!-- Header -->
    <div class="add-song__header">
      <button
        v-if="step !== 'source'"
        class="add-song__header-btn"
        :aria-label="labels.back"
        @click="goBack"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
        </svg>
      </button>
      <div v-else class="add-song__header-spacer" />
      <h2 class="add-song__header-title">
        {{
          step === 'source' ? labels.addSong
          : step === 'youtube' ? labels.youtube
          : step === 'upload' ? labels.uploadTitle
          : labels.addFrom.replace('{service}', radioServiceFor(activeProvider).name)
        }}
      </h2>
      <button class="add-song__header-btn" :aria-label="labels.close" @click="closePopup">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- ==================== SOURCE ==================== -->
    <template v-if="step === 'source'">
      <div class="add-song__cards">
        <button class="add-song__card" data-test="radio-add-source-youtube" @click="goToStep('youtube')">
          <div class="add-song__card-icon add-song__card-icon--youtube">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </div>
          <div class="add-song__card-text">
            <span class="add-song__card-title">{{ labels.youtube }}</span>
            <span class="add-song__card-sub">{{ labels.youtubeHint }}</span>
          </div>
        </button>

        <button
          v-for="service in availableServices"
          :key="service.provider"
          class="add-song__card"
          :data-test="`radio-add-source-${service.provider}`"
          @click="goToStep('service', service.provider)"
        >
          <div class="add-song__card-icon" :class="`add-song__card-icon--${service.provider}`">
            <SilIcon name="media/music-note" size="small" />
          </div>
          <div class="add-song__card-text">
            <span class="add-song__card-title">{{ service.name }}</span>
            <span class="add-song__card-sub">{{ service.linkExample }}</span>
          </div>
        </button>

        <button class="add-song__card" data-test="radio-add-source-upload" @click="goToStep('upload')">
          <div class="add-song__card-icon add-song__card-icon--upload">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div class="add-song__card-text">
            <span class="add-song__card-title">{{ labels.upload }}</span>
            <span class="add-song__card-sub">{{ labels.uploadHint }}</span>
          </div>
        </button>

        <button class="add-song__card add-song__card--quiet" data-test="radio-add-source-services" @click="emit('open-services')">
          <div class="add-song__card-icon add-song__card-icon--services">
            <SilIcon name="ui/link" size="small" />
          </div>
          <div class="add-song__card-text">
            <span class="add-song__card-title">{{ labels.services }}</span>
            <span class="add-song__card-sub">{{ labels.servicesHint }}</span>
          </div>
        </button>
      </div>
    </template>

    <!-- ==================== YOUTUBE ==================== -->
    <template v-else-if="step === 'youtube'">
      <div class="add-song__section">
        <label class="add-song__label" for="add-song-search">{{ labels.searchYouTube }}</label>
        <div class="add-song__input-wrap">
          <svg class="add-song__input-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            id="add-song-search"
            v-model="searchQuery"
            type="search"
            class="add-song__input"
            data-test="radio-youtube-search"
            :placeholder="labels.searchPlaceholder"
          />
        </div>
      </div>

      <div v-if="youtubeSearch.results.value.length" class="add-song__results" data-test="radio-youtube-results">
        <button
          v-for="video in youtubeSearch.results.value"
          :key="video.videoId"
          class="add-song__result"
          :class="{ 'add-song__result--active': selectedVideo?.videoId === video.videoId }"
          @click="selectVideo(video)"
        >
          <img :src="video.thumbnailUrl" :alt="video.title" class="add-song__result-thumb" loading="lazy" />
          <span class="add-song__result-info">
            <span class="add-song__result-title">{{ video.title }}</span>
            <span class="add-song__result-meta">
              {{ video.channelTitle }}<template v-if="video.durationSeconds"> • {{ formatDuration(video.durationSeconds) }}</template>
            </span>
          </span>
        </button>
      </div>
      <p v-else-if="youtubeSearch.unavailable.value" class="add-song__note">{{ labels.searchUnavailable }}</p>
      <p v-else-if="youtubeSearch.searched.value && !youtubeSearch.loading.value" class="add-song__note">
        {{ labels.searchEmpty }}
      </p>

      <div class="add-song__section">
        <label class="add-song__label" for="add-song-url">{{ labels.pasteLink }}</label>
        <div class="add-song__input-wrap">
          <input
            id="add-song-url"
            v-model="youtubeUrl"
            type="url"
            class="add-song__input"
            data-test="radio-youtube-url"
            :placeholder="labels.pasteLinkPlaceholder"
            @keyup.enter="handleAddYouTube"
          />
        </div>
      </div>

      <div v-if="selectedVideo" class="add-song__preview">
        <img :src="selectedVideo.thumbnailUrl" :alt="selectedVideo.title" class="add-song__preview-thumb" loading="lazy" />
        <span class="add-song__preview-title">{{ selectedVideo.title }}</span>
      </div>

      <div class="add-song__section">
        <span class="add-song__label">{{ labels.collection }}</span>
        <div class="add-song__chips">
          <button
            v-for="collection in collections"
            :key="collection.id"
            class="add-song__chip"
            :class="{ 'add-song__chip--active': selectedCollectionId === collection.id }"
            :data-test="`radio-collection-chip-${collection.id}`"
            @click="selectedCollectionId = collection.id"
          >
            <img v-if="collectionArtwork(collection)" :src="collectionArtwork(collection)" :alt="collection.name" class="add-song__chip-art" />
            <SilIcon v-else :name="collection.icon" size="small" />
            <span class="add-song__chip-name">{{ collection.name }}</span>
          </button>
        </div>
      </div>

      <button
        class="add-song__submit"
        data-test="radio-add-youtube-submit"
        :disabled="!canAddYouTube"
        @click="handleAddYouTube"
      >
        {{ submitLabel }}
      </button>
      <p class="add-song__hint">{{ labels.audioOnly }}</p>
    </template>

    <!-- ==================== STREAMING SERVICE ==================== -->
    <template v-else-if="step === 'service'">
      <div class="add-song__section">
        <label class="add-song__label" for="add-song-service-url">{{ labels.pasteServiceLink }}</label>
        <div class="add-song__input-wrap">
          <input
            id="add-song-service-url"
            v-model="serviceUrl"
            type="url"
            class="add-song__input"
            data-test="radio-service-url"
            :placeholder="radioServiceFor(activeProvider).linkExample || labels.pasteServiceLinkPlaceholder"
          />
        </div>
      </div>

      <div v-if="serviceSong" class="add-song__preview">
        <img v-if="serviceSong.thumbnailUrl" :src="serviceSong.thumbnailUrl" :alt="serviceSong.title" class="add-song__preview-thumb" />
        <span class="add-song__preview-title">
          {{ serviceSong.title }}<template v-if="serviceSong.artist"> — {{ serviceSong.artist }}</template>
        </span>
      </div>
      <p v-else-if="musicLinks.error.value" class="add-song__note">{{ labels.linkNotRecognised }}</p>

      <div class="add-song__section">
        <span class="add-song__label">{{ labels.collection }}</span>
        <div class="add-song__chips">
          <button
            v-for="collection in collections"
            :key="collection.id"
            class="add-song__chip"
            :class="{ 'add-song__chip--active': selectedCollectionId === collection.id }"
            @click="selectedCollectionId = collection.id"
          >
            <img v-if="collectionArtwork(collection)" :src="collectionArtwork(collection)" :alt="collection.name" class="add-song__chip-art" />
            <SilIcon v-else :name="collection.icon" size="small" />
            <span class="add-song__chip-name">{{ collection.name }}</span>
          </button>
        </div>
      </div>

      <button
        class="add-song__submit"
        data-test="radio-add-service-submit"
        :disabled="!canAddService"
        @click="handleAddService"
      >
        {{ submitLabel }}
      </button>
    </template>

    <!-- ==================== UPLOAD ==================== -->
    <template v-else>
      <button v-if="!selectedFile" class="add-song__dropzone" @click="openFilePicker">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span class="add-song__dropzone-text">{{ labels.chooseFile }}</span>
        <span class="add-song__dropzone-hint">{{ labels.uploadHint }}</span>
      </button>

      <div v-else class="add-song__preview">
        <span class="add-song__preview-title">
          {{ selectedFile.name }} • {{ formatFileSize(selectedFile.size) }}
        </span>
      </div>

      <div class="add-song__section">
        <span class="add-song__label">{{ labels.collection }}</span>
        <div class="add-song__chips">
          <button
            v-for="collection in collections"
            :key="collection.id"
            class="add-song__chip"
            :class="{ 'add-song__chip--active': selectedCollectionId === collection.id }"
            @click="selectedCollectionId = collection.id"
          >
            <img v-if="collectionArtwork(collection)" :src="collectionArtwork(collection)" :alt="collection.name" class="add-song__chip-art" />
            <SilIcon v-else :name="collection.icon" size="small" />
            <span class="add-song__chip-name">{{ collection.name }}</span>
          </button>
        </div>
      </div>

      <button
        class="add-song__submit"
        data-test="radio-add-upload-submit"
        :disabled="!canUpload"
        @click="handleUpload"
      >
        {{ submitLabel }}
      </button>
    </template>
  </div>
</template>
