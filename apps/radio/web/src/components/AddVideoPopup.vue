<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button, Icon as SilIcon } from '@sil/ui'
import { useYouTubeMeta } from '../composables/useYouTubeMeta'
import { useCategories } from '../composables/useCategories'

interface Props {
  categoryId?: string
  hasEmail?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  categoryId: '',
  hasEmail: false,
})

const emit = defineEmits<{
  (e: 'add', track: {
    title: string
    source: 'youtube'
    youtubeVideoId: string
    thumbnailUrl?: string
    duration?: number
    categoryId?: string
    artist?: string
  }): void
  (e: 'upload', track: { title: string; source: 'upload'; file: File; categoryId?: string }): void
  (e: 'close'): void
}>()

const youtubeUrl = ref('')
const displayName = ref('')
const addVideoCategoryId = ref(props.categoryId)
const videoPreview = ref<{ title: string; thumbnailUrl: string; duration: number } | null>(null)
const youtubeMeta = useYouTubeMeta()
const categories = useCategories()

const newCatName = ref('')
const newCatIcon = ref('')
const newCatOpen = ref(false)

const EMOJI_OPTIONS = ['🎵', '📖', '🐾', '🌙', '🎨', '🌟', '🚗', '🌈', '🎪', '🏠', '🦁', 'ABC']

function pickRandomEmoji() {
  const used = new Set(categories.categories.value.map(c => c.icon))
  const available = EMOJI_OPTIONS.filter(e => !used.has(e))
  return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : '🎵'
}

function handleNewCat() {
  const name = newCatName.value.trim()
  if (!name) return
  const icon = newCatIcon.value.trim() || pickRandomEmoji()
  const hue = Math.floor(Math.random() * 360)
  const color = `hsl(${hue}, 65%, 70%)`
  const cat = categories.addCategory({ name, icon, color })
  addVideoCategoryId.value = cat.id
  newCatName.value = ''
  newCatIcon.value = ''
  newCatOpen.value = false
}

// Auto-fetch YouTube metadata when URL is pasted
watch(youtubeUrl, async (url) => {
  const videoId = youtubeMeta.getVideoId(url)
  if (videoId) {
    const meta = await youtubeMeta.fetchMeta(videoId)
    if (meta) {
      videoPreview.value = { title: meta.title, thumbnailUrl: meta.thumbnailUrl, duration: meta.duration }
      if (!displayName.value) displayName.value = meta.title
    }
  } else {
    videoPreview.value = null
  }
})

function handleAddVideo() {
  const url = youtubeUrl.value.trim()
  if (!url) return
  const videoId = youtubeMeta.getVideoId(url)
  if (!videoId) return

  emit('add', {
    title: displayName.value || videoPreview.value?.title || `Video ${videoId}`,
    source: 'youtube',
    youtubeVideoId: videoId,
    thumbnailUrl: videoPreview.value?.thumbnailUrl,
    duration: videoPreview.value?.duration,
    categoryId: addVideoCategoryId.value || undefined,
  })

  // Reset form
  youtubeUrl.value = ''
  displayName.value = ''
  videoPreview.value = null
}

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  emit('upload', {
    title: file.name.replace(/\.[^.]+$/, ''),
    source: 'upload',
    file,
    categoryId: addVideoCategoryId.value || undefined,
  })
  input.value = ''
}
</script>

<template>
  <div class="radio-add-popup">
    <!-- YouTube link input -->
    <label class="radio-add-popup__label">
      <SilIcon name="ui/link" size="small" />
      <input
        type="url"
        v-model="youtubeUrl"
        placeholder="Paste YouTube link"
        @keyup.enter="handleAddVideo"
      />
    </label>

    <!-- Display name -->
    <label class="radio-add-popup__label">
      <SilIcon name="ui/check-fat" size="small" />
      <input
        type="text"
        v-model="displayName"
        placeholder="Display name (optional)"
      />
    </label>

    <!-- Category selector -->
    <div class="radio-add-popup__category">
      <span class="radio-add-popup__category-label">Category</span>
      <div class="radio-add-popup__category-list">
        <button
          v-for="cat in categories.categories.value"
          :key="cat.id"
          class="radio-add-popup__category-chip"
          :class="{
            'radio-add-popup__category-chip--active': addVideoCategoryId === cat.id,
          }"
          :style="{ '--chip-color': cat.color }"
          @click="addVideoCategoryId = addVideoCategoryId === cat.id ? '' : cat.id"
        >
          <span class="radio-add-popup__category-chip-icon">{{ cat.icon }}</span>
          <span class="radio-add-popup__category-chip-name">{{ cat.name }}</span>
        </button>
        <button
          class="radio-add-popup__category-chip radio-add-popup__category-chip--new"
          @click="newCatOpen = !newCatOpen"
        >
          + New
        </button>
      </div>
    </div>

    <!-- New category inline form -->
    <div v-if="newCatOpen" class="radio-add-popup__new-cat">
      <input
        v-model="newCatName"
        placeholder="Category name"
        @keyup.enter="handleNewCat"
      />
      <input
        v-model="newCatIcon"
        placeholder="Emoji (optional)"
        class="radio-add-popup__new-cat-icon"
        maxlength="4"
      />
      <Button
        variant="primary"
        size="small"
        :disabled="!newCatName.trim()"
        @click="handleNewCat"
      >
        Add
      </Button>
    </div>

    <!-- Preview -->
    <div v-if="videoPreview" class="radio-add-popup__preview">
      <span class="radio-add-popup__preview-label">Preview</span>
      <div class="radio-add-popup__preview-card">
        <img
          :src="videoPreview.thumbnailUrl"
          :alt="videoPreview.title"
          class="radio-add-popup__preview-thumb"
        />
        <div class="radio-add-popup__preview-info">
          <span class="radio-add-popup__preview-title">{{ videoPreview.title }}</span>
        </div>
      </div>
    </div>

    <!-- Submit -->
    <Button
      variant="primary"
      :disabled="!youtubeUrl.trim() || !youtubeMeta.getVideoId(youtubeUrl)"
      @click="handleAddVideo"
      class="radio-add-popup__submit"
    >
      + Add video
    </Button>

    <!-- File upload alternative -->
    <label class="radio-add-popup__upload">
      <input type="file" accept="audio/*" hidden @change="handleFileUpload" />
      Upload audio file
    </label>

    <!-- Parent notice — only when user has a linked email -->
    <p v-if="hasEmail" class="radio-add-popup__notice">
      <SilIcon name="ui/lock" size="small" />
      Only parents can manage videos
    </p>
  </div>
</template>

<style scoped lang="scss">
// ==========================================================================
//  AddVideoPopup – "Add video" form for the radio app
//  Rendered inside a popupService overlay
// ==========================================================================

.radio-add-popup {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  max-width: 26rem;
  margin: 0 auto;
  font-family: inherit;
  animation: radio-add-popup-enter 0.2s ease;

  // ---- Label rows (icon + input) ------------------------------------------
  &__label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e), transparent 15%);
    cursor: text;

    input {
      flex: 1;
      padding: 0.6rem 0.85rem;
      border: 2px solid color-mix(in srgb, var(--tiko-surface, #fff), var(--color-foreground, #1a1a2e) 15%);
      border-radius: 0.85rem;
      font-size: 0.9rem;
      background: color-mix(in srgb, var(--tiko-surface, #fff), var(--color-foreground, #1a1a2e) 4%);
      color: inherit;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &::placeholder {
        color: color-mix(in srgb, var(--color-foreground, #1a1a2e), transparent 45%);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary, #e84057);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #e84057), transparent 75%);
      }
    }
  }

  // ---- Category selector --------------------------------------------------
  &__category {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;

    &-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: color-mix(in srgb, var(--color-foreground, #1a1a2e), transparent 15%);
    }

    &-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
  }

  &__category-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.3rem 0.7rem;
    border: 2px solid color-mix(in srgb, var(--chip-color, #ccc), var(--tiko-surface, #fff) 25%);
    border-radius: 2rem;
    background: color-mix(in srgb, var(--tiko-surface, #fff), var(--chip-color, #ccc) 12%);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    color: var(--color-foreground, #1a1a2e);

    &:hover {
      background: color-mix(in srgb, var(--tiko-surface, #fff), var(--chip-color, #ccc) 25%);
    }

    &--active {
      background: var(--chip-color, #e84057);
      border-color: var(--chip-color, #e84057);
      color: #fff;

      &:hover {
        background: color-mix(in srgb, var(--chip-color, #e84057), var(--color-foreground, #1a1a2e) 10%);
      }
    }

    &--new {
      border-style: dashed;
      border-color: color-mix(in srgb, var(--color-foreground, #1a1a2e), transparent 60%);
      background: transparent;
      color: color-mix(in srgb, var(--color-foreground, #1a1a2e), transparent 40%);

      &:hover {
        border-color: var(--color-primary, #e84057);
        color: var(--color-primary, #e84057);
      }
    }

    &-icon {
      font-size: 0.85rem;
    }

    &-name {
      font-size: 0.78rem;
    }
  }

  // ---- New category form --------------------------------------------------
  &__new-cat {
    display: flex;
    align-items: center;
    gap: 0.4rem;

    input {
      padding: 0.4rem 0.6rem;
      border: 2px solid color-mix(in srgb, var(--tiko-surface, #fff), var(--color-foreground, #1a1a2e) 15%);
      border-radius: 0.6rem;
      font-size: 0.85rem;
      background: color-mix(in srgb, var(--tiko-surface, #fff), var(--color-foreground, #1a1a2e) 4%);
      color: inherit;

      &:focus {
        outline: none;
        border-color: var(--color-primary, #e84057);
      }
    }

    &-icon {
      width: 3.5rem;
      text-align: center;
    }
  }

  // ---- Preview card --------------------------------------------------------
  &__preview {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    animation: radio-add-popup-enter 0.2s ease;

    &-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: color-mix(in srgb, var(--color-foreground, #1a1a2e), transparent 15%);
    }

    &-card {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      padding: 0.6rem;
      border-radius: 0.85rem;
      background: color-mix(in srgb, var(--tiko-surface, #fff), var(--color-foreground, #1a1a2e) 6%);
    }
  }

  &__preview-thumb {
    width: 7rem;
    height: 4rem;
    border-radius: 0.5rem;
    object-fit: cover;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--tiko-surface, #fff), var(--color-foreground, #1a1a2e) 10%);
  }

  &__preview-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
    flex: 1;
    overflow: hidden;
  }

  &__preview-title {
    font-size: 0.85rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    color: var(--color-foreground, #1a1a2e);
  }

  // ---- Submit button -------------------------------------------------------
  &__submit {
    width: 100%;
    margin-top: 0.25rem;
  }

  // ---- Upload link ---------------------------------------------------------
  &__upload {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    border-radius: 0.85rem;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    background: color-mix(in srgb, var(--tiko-surface, #fff), var(--color-primary, #e84057) 12%);
    color: var(--color-primary, #e84057);
    transition: background 0.15s ease;
    width: fit-content;
    text-align: center;

    &:hover {
      background: color-mix(in srgb, var(--tiko-surface, #fff), var(--color-primary, #e84057) 20%);
    }
  }

  // ---- Parent notice -------------------------------------------------------
  &__notice {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: color-mix(in srgb, var(--color-foreground, #1a1a2e), transparent 40%);
    margin: 0.25rem 0 0;
    padding: 0;
  }
}

// ==========================================================================
//  Animation
// ==========================================================================
@keyframes radio-add-popup-enter {
  from {
    opacity: 0;
    transform: translateY(-0.35rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
