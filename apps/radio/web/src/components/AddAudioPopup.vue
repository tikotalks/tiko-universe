<script setup lang="ts">
import { ref, watch, computed, inject, nextTick } from 'vue'
import { Icon as SilIcon } from '@sil/ui'
import type { PopupService } from '@sil/ui'
import { useYouTubeMeta } from '../composables/useYouTubeMeta'
import { useCategories } from '../composables/useCategories'
import { useTrackLibrary } from '../composables/useTrackLibrary'

type Step = 'source' | 'youtube' | 'upload'

interface Props {
  hasEmail?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hasEmail: false,
})

const emit = defineEmits<{
  (e: 'add', track: {
    title: string
    source: 'youtube'
    youtubeVideoId: string
    thumbnailUrl?: string
    duration?: number
    artist?: string
    categoryId: string
  }): void
  (e: 'upload', track: { title: string; source: 'upload'; file: File; categoryId: string }): void
  (e: 'close'): void
}>()

// ---- Inject popup service to close programmatically ----
const popup = inject<PopupService>('popupService')

// ---- Step navigation ----
const step = ref<Step>('source')
const selectedCategoryId = ref('')

// ---- Composables ----
const youtubeMeta = useYouTubeMeta()
const categories = useCategories()
const library = useTrackLibrary('tiko:radio:tracks')

// ---- YouTube state ----
const youtubeUrl = ref('')
const displayName = ref('')
const videoPreview = ref<{ title: string; thumbnailUrl: string; duration: number; artist?: string } | null>(null)

// ---- Upload state ----
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// ---- Derived ----
const canAddYoutube = computed(() =>
  !!youtubeMeta.getVideoId(youtubeUrl.value) && !!selectedCategoryId.value,
)

const canUpload = computed(() =>
  !!selectedFile.value && !!selectedCategoryId.value,
)

const categoryCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const track of library.tracks.value) {
    if (track.categoryId) {
      counts[track.categoryId] = (counts[track.categoryId] || 0) + 1
    }
  }
  return counts
})

// ---- YouTube metadata fetch ----
watch(youtubeUrl, async (url) => {
  const videoId = youtubeMeta.getVideoId(url)
  if (videoId) {
    const meta = await youtubeMeta.fetchMeta(videoId)
    if (meta) {
      videoPreview.value = {
        title: meta.title,
        thumbnailUrl: meta.thumbnailUrl,
        duration: meta.duration,
      }
      if (!displayName.value) displayName.value = meta.title
    }
  } else {
    videoPreview.value = null
  }
})

// ---- Handlers ----
function closePopup() {
  popup?.closeAllPopups()
}

function goBack() {
  step.value = 'source'
  youtubeUrl.value = ''
  displayName.value = ''
  videoPreview.value = null
  selectedFile.value = null
  selectedCategoryId.value = ''
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
  const url = youtubeUrl.value.trim()
  if (!url) return
  const videoId = youtubeMeta.getVideoId(url)
  if (!videoId || !selectedCategoryId.value) return

  emit('add', {
    title: displayName.value || videoPreview.value?.title || `Video ${videoId}`,
    source: 'youtube',
    youtubeVideoId: videoId,
    thumbnailUrl: videoPreview.value?.thumbnailUrl,
    duration: videoPreview.value?.duration,
    categoryId: selectedCategoryId.value,
  })

  goBack()
}

function handleUpload() {
  if (!selectedFile.value || !selectedCategoryId.value) return

  emit('upload', {
    title: selectedFile.value.name.replace(/\.[^.]+$/, ''),
    source: 'upload',
    file: selectedFile.value,
    categoryId: selectedCategoryId.value,
  })

  goBack()
}

// ---- Formatting ----
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="add-audio">
    <!-- Hidden file input -->
    <input ref="fileInput" type="file" accept="audio/*" hidden @change="handleFileSelect" />

    <!-- Header -->
    <div class="add-audio__header">
      <button
        v-if="step !== 'source'"
        class="add-audio__header-btn"
        aria-label="Back"
        @click="goBack"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
        </svg>
      </button>
      <div v-else class="add-audio__header-spacer" />
      <h2 class="add-audio__header-title">
        {{ step === 'source' ? 'Add audio' : step === 'youtube' ? 'Add from YouTube' : 'Upload audio' }}
      </h2>
      <button class="add-audio__header-btn" aria-label="Close" @click="closePopup">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- ==================== SOURCE STEP ==================== -->
    <template v-if="step === 'source'">
      <div class="add-audio__cards">
        <button class="add-audio__card" @click="step = 'youtube'">
          <div class="add-audio__card-icon add-audio__card-icon--youtube">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </div>
          <div class="add-audio__card-text">
            <span class="add-audio__card-title">YouTube</span>
            <span class="add-audio__card-sub">Search YouTube or paste a link</span>
          </div>
          <svg class="add-audio__card-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <button class="add-audio__card" @click="step = 'upload'">
          <div class="add-audio__card-icon add-audio__card-icon--upload">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div class="add-audio__card-text">
            <span class="add-audio__card-title">Upload audio</span>
            <span class="add-audio__card-sub">Upload MP3, WAV, M4A</span>
          </div>
          <svg class="add-audio__card-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <!-- Collections list -->
      <div v-if="categories.categories.value.length" class="add-audio__collections">
        <h3 class="add-audio__collections-heading">Your collections</h3>
        <div class="add-audio__collections-list">
          <div
            v-for="cat in categories.categories.value"
            :key="cat.id"
            class="add-audio__collections-item"
          >
            <div class="add-audio__collections-item-icon" :style="{ background: cat.color }">
              <SilIcon :name="cat.icon" size="small" />
            </div>
            <span class="add-audio__collections-item-name">{{ cat.name }}</span>
            <span class="add-audio__collections-item-count">
              {{ categoryCounts[cat.id] ?? 0 }} {{ (categoryCounts[cat.id] ?? 0) === 1 ? 'item' : 'items' }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== YOUTUBE STEP ==================== -->
    <template v-else-if="step === 'youtube'">
      <div class="add-audio__section">
        <label class="add-audio__label">Search YouTube</label>
        <div class="add-audio__input-wrap">
          <svg class="add-audio__input-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            class="add-audio__input"
            placeholder="Search for songs, stories…"
            disabled
          />
        </div>
      </div>

      <div class="add-audio__or">or</div>

      <div class="add-audio__section">
        <label class="add-audio__label">Paste YouTube URL</label>
        <div class="add-audio__input-wrap">
          <svg class="add-audio__input-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <input
            v-model="youtubeUrl"
            type="url"
            class="add-audio__input"
            placeholder="https://youtube.com/..."
            @keyup.enter="handleAddYouTube"
          />
        </div>
      </div>

      <!-- Preview card -->
      <div v-if="videoPreview" class="add-audio__preview">
        <img
          :src="videoPreview.thumbnailUrl"
          :alt="videoPreview.title"
          class="add-audio__preview-thumb"
          loading="lazy"
        />
        <div class="add-audio__preview-info">
          <span class="add-audio__preview-title">{{ videoPreview.title }}</span>
        </div>
      </div>

      <!-- Collection selector -->
      <div class="add-audio__section">
        <label class="add-audio__label">Collection</label>
        <div class="add-audio__chips">
          <button
            v-for="cat in categories.categories.value"
            :key="cat.id"
            class="add-audio__chip"
            :class="{ 'add-audio__chip--active': selectedCategoryId === cat.id }"
            :style="selectedCategoryId === cat.id ? { '--chip-color': cat.color } : {}"
            @click="selectedCategoryId = selectedCategoryId === cat.id ? '' : cat.id"
          >
            <span class="add-audio__chip-icon">
              <SilIcon :name="cat.icon" size="small" />
            </span>
            <span class="add-audio__chip-name">{{ cat.name }}</span>
          </button>
        </div>
      </div>

      <!-- Submit -->
      <button
        class="add-audio__submit"
        :disabled="!canAddYoutube"
        @click="handleAddYouTube"
      >
        Add to collection
      </button>

      <p class="add-audio__hint">Selecting a video will add the audio to your collection.</p>
    </template>

    <!-- ==================== UPLOAD STEP ==================== -->
    <template v-else-if="step === 'upload'">
      <!-- File picker zone (no file selected) -->
      <button v-if="!selectedFile" class="add-audio__dropzone" @click="openFilePicker">
        <div class="add-audio__dropzone-icon">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <span class="add-audio__dropzone-text">Tap to choose audio file</span>
        <span class="add-audio__dropzone-hint">MP3, WAV, M4A</span>
      </button>

      <!-- File preview -->
      <div v-else class="add-audio__file-preview">
        <div class="add-audio__file-preview-icon">🎵</div>
        <div class="add-audio__file-preview-info">
          <span class="add-audio__file-preview-name">{{ selectedFile.name }}</span>
          <span class="add-audio__file-preview-meta">
            {{ formatFileSize(selectedFile.size) }} • {{ selectedFile.name.split('.').pop()?.toUpperCase() }}
          </span>
        </div>
      </div>

      <!-- Collection selector -->
      <div class="add-audio__section">
        <label class="add-audio__label">Collection</label>
        <div class="add-audio__chips">
          <button
            v-for="cat in categories.categories.value"
            :key="cat.id"
            class="add-audio__chip"
            :class="{ 'add-audio__chip--active': selectedCategoryId === cat.id }"
            :style="selectedCategoryId === cat.id ? { '--chip-color': cat.color } : {}"
            @click="selectedCategoryId = selectedCategoryId === cat.id ? '' : cat.id"
          >
            <span class="add-audio__chip-icon">
              <SilIcon :name="cat.icon" size="small" />
            </span>
            <span class="add-audio__chip-name">{{ cat.name }}</span>
          </button>
        </div>
      </div>

      <!-- Submit -->
      <button
        class="add-audio__submit"
        :disabled="!canUpload"
        @click="handleUpload"
      >
        Add to collection
      </button>
    </template>

    <!-- Parent notice -->
    <p v-if="hasEmail" class="add-audio__notice">
      🔒 Only parents can manage videos
    </p>
  </div>
</template>

<style scoped lang="scss">
// ==========================================================================
//  AddAudioPopup – Multi-step add audio flow
// ==========================================================================

.add-audio {
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-family: inherit;

  // ---- Header (back | title | close) ------------------------------------
  &__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-foreground, #1a1a2e) 8%, transparent);
    flex-shrink: 0;
  }

  &__header-spacer {
    width: 2.25rem;
    height: 2.25rem;
  }

  &__header-btn {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 50%, transparent);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover {
      background: color-mix(in srgb, var(--color-foreground, #1a1a2e) 8%, transparent);
      color: var(--color-foreground, #1a1a2e);
    }
  }

  &__header-title {
    flex: 1;
    text-align: center;
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // ---- Source cards ------------------------------------------------------
  &__cards {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1rem;
  }

  &__card {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 1rem;
    border-radius: 0.85rem;
    border: 1.5px solid color-mix(in srgb, var(--color-foreground, #1a1a2e) 10%, transparent);
    background: var(--color-background);
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
    text-align: left;
    font-family: inherit;
    color: inherit;

    &:hover {
      border-color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 20%, transparent);
      background: color-mix(in srgb, var(--color-foreground, #1a1a2e) 3%, var(--color-background));
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &__card-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &--youtube {
      background: #FF0000;
    }

    &--upload {
      background: var(--color-primary, #e84057);
    }
  }

  &__card-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  &__card-title {
    font-weight: 700;
    font-size: 0.95rem;
  }

  &__card-sub {
    font-size: 0.8rem;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 45%, transparent);
  }

  &__card-chevron {
    flex-shrink: 0;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 25%, transparent);
  }

  // ---- Collections list --------------------------------------------------
  &__collections {
    padding: 0.5rem 1rem 1rem;

    &-heading {
      font-size: 0.9rem;
      font-weight: 700;
      margin: 0 0 0.6rem;
      color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 70%, transparent);
    }

    &-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    &-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.6rem 0.75rem;
      border-radius: 0.65rem;
      transition: background 0.15s ease;

      &:hover {
        background: color-mix(in srgb, var(--color-foreground, #1a1a2e) 4%, transparent);
      }
    }

    &-item-icon {
      width: 2rem;
      height: 2rem;
      border-radius: 0.45rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    &-item-name {
      flex: 1;
      font-weight: 600;
      font-size: 0.85rem;
    }

    &-item-count {
      font-size: 0.78rem;
      color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 40%, transparent);
    }
  }

  // ---- Section / labels / inputs ------------------------------------------
  &__section {
    padding: 0.5rem 1rem 0;
  }

  &__label {
    display: block;
    font-size: 0.85rem;
    font-weight: 700;
    margin-bottom: 0.45rem;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 80%, transparent);
  }

  &__input-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.85rem;
    border-radius: 0.7rem;
    border: 1.5px solid color-mix(in srgb, var(--color-foreground, #1a1a2e) 12%, transparent);
    background: color-mix(in srgb, var(--tiko-surface, var(--color-background)), var(--color-foreground, #1a1a2e) 4%);
    transition: border-color 0.15s ease;

    &:focus-within {
      border-color: var(--color-primary, #e84057);
    }
  }

  &__input-icon {
    flex-shrink: 0;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 35%, transparent);
  }

  &__input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.88rem;
    color: inherit;
    outline: none;
    font-family: inherit;

    &::placeholder {
      color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 35%, transparent);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &__or {
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 30%, transparent);
    padding: 0.5rem 0;
  }

  // ---- YouTube preview card -----------------------------------------------
  &__preview {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    animation: add-audio-fade 0.2s ease;

    &-thumb {
      width: 6rem;
      height: 3.4rem;
      border-radius: 0.5rem;
      object-fit: cover;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--color-primary, #e84057) 10%, var(--color-background));
    }

    &-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.15rem;
      min-width: 0;
    }

    &-title {
      font-size: 0.88rem;
      font-weight: 700;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }

  // ---- Category chips ----------------------------------------------------
  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.35rem 0.7rem;
    border: 1.5px solid color-mix(in srgb, var(--color-foreground, #1a1a2e) 12%, transparent);
    border-radius: 2rem;
    background: transparent;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    color: var(--color-foreground, #1a1a2e);

    &:hover {
      background: color-mix(in srgb, var(--color-foreground, #1a1a2e) 4%, transparent);
    }

    &--active {
      background: var(--chip-color, var(--color-primary, #e84057));
      border-color: var(--chip-color, var(--color-primary, #e84057));
      color: #fff;
    }

    &-icon {
      font-size: 0.85rem;
    }

    &-name {
      font-size: 0.78rem;
    }
  }

  // ---- Submit button ------------------------------------------------------
  &__submit {
    width: calc(100% - 2rem);
    margin: 1rem auto 0;
    padding: 0.7rem 1rem;
    border: none;
    border-radius: 0.75rem;
    background: var(--color-primary, #e84057);
    color: #fff;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.1s ease;
    font-family: inherit;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:not(:disabled):active {
      transform: scale(0.97);
    }
  }

  &__hint {
    text-align: center;
    font-size: 0.78rem;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 35%, transparent);
    padding: 0.6rem 1rem 0.25rem;
    font-style: italic;
  }

  // ---- Upload dropzone ----------------------------------------------------
  &__dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2.5rem 1rem;
    margin: 1rem;
    border: 2px dashed color-mix(in srgb, var(--color-foreground, #1a1a2e) 15%, transparent);
    border-radius: 0.85rem;
    background: color-mix(in srgb, var(--tiko-surface, var(--color-background)), var(--color-foreground, #1a1a2e) 2%);
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
    font-family: inherit;
    color: inherit;
    text-align: center;

    &:hover {
      border-color: var(--color-primary, #e84057);
      background: color-mix(in srgb, var(--color-primary, #e84057) 5%, var(--color-background));
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &__dropzone-icon {
    color: var(--color-primary, #e84057);
    opacity: 0.7;
  }

  &__dropzone-text {
    font-size: 0.9rem;
    font-weight: 600;
  }

  &__dropzone-hint {
    font-size: 0.8rem;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 40%, transparent);
  }

  // ---- File preview card --------------------------------------------------
  &__file-preview {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    margin: 1rem;
    padding: 0.85rem;
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--tiko-surface, var(--color-background)), var(--color-foreground, #1a1a2e) 4%);
    animation: add-audio-fade 0.2s ease;

    &-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 0.5rem;
      background: var(--color-primary, #e84057);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    &-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    &-name {
      font-weight: 700;
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &-meta {
      font-size: 0.78rem;
      color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 40%, transparent);
    }
  }

  // ---- Parent notice ------------------------------------------------------
  &__notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    font-weight: 500;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e) 35%, transparent);
    padding: 0.5rem 1rem 0.75rem;
    margin-top: auto;
  }
}

// ---- Animation ------------------------------------------------------------
@keyframes add-audio-fade {
  from { opacity: 0; transform: translateY(-0.25rem); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
