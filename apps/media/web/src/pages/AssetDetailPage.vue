<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMediaLibrary } from '../composables/useMediaLibrary'
import ImagePreview from '../components/ImagePreview.vue'
import AudioPreview from '../components/AudioPreview.vue'
import type { MediaItem } from '../types/media'

const route = useRoute()
const router = useRouter()
const { fetchMediaItem, getDownloadUrl } = useMediaLibrary()

const item = ref<MediaItem | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const assetId = computed(() => route.params.id as string)

onMounted(async () => {
  const result = await fetchMediaItem(assetId.value)
  if (result) {
    item.value = result
  } else {
    error.value = 'Asset not found'
  }
  loading.value = false
})

function downloadAsset(format?: string) {
  const url = getDownloadUrl(assetId.value, format)
  window.open(url, '_blank')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const downloadFormats = computed(() => {
  if (!item.value) return []
  switch (item.value.fileType) {
    case 'image':
      return [
        { label: 'PNG', format: 'png' },
        { label: 'JPG', format: 'jpg' },
        { label: 'WebP', format: 'webp' },
      ]
    case 'audio':
      return [
        { label: 'MP3', format: 'mp3' },
        { label: 'WAV', format: 'wav' },
      ]
    default:
      return []
  }
})
</script>

<template>
  <div class="asset-detail">
    <button class="asset-detail__back" @click="router.push({ name: 'gallery' })">
      ← Back to Gallery
    </button>

    <div v-if="loading" class="asset-detail__loading">Loading…</div>
    <div v-else-if="error" class="asset-detail__error">{{ error }}</div>

    <template v-else-if="item">
      <div class="asset-detail__layout">
        <!-- Preview area -->
        <section class="asset-detail__preview">
          <ImagePreview
            v-if="item.fileType === 'image'"
            :src="item.url"
            :alt="item.title"
            :width="item.width"
            :height="item.height"
            @download="downloadAsset()"
          />
          <AudioPreview
            v-else-if="item.fileType === 'audio'"
            :src="item.url"
            :title="item.title"
            :duration-seconds="item.durationSeconds"
            @download="downloadAsset()"
          />
          <div v-else class="asset-detail__unsupported">
            <p>Preview not available for {{ item.fileType }} files.</p>
            <button @click="downloadAsset()">↓ Download</button>
          </div>
        </section>

        <!-- Metadata sidebar -->
        <aside class="asset-detail__meta">
          <h1 class="asset-detail__title">{{ item.title }}</h1>
          <p v-if="item.description" class="asset-detail__desc">{{ item.description }}</p>

          <dl class="asset-detail__fields">
            <div class="asset-detail__field">
              <dt>Type</dt>
              <dd>{{ item.fileType }} ({{ item.mimeType }})</dd>
            </div>
            <div class="asset-detail__field">
              <dt>Size</dt>
              <dd>{{ formatSize(item.fileSizeBytes) }}</dd>
            </div>
            <div v-if="item.width && item.height" class="asset-detail__field">
              <dt>Dimensions</dt>
              <dd>{{ item.width }} × {{ item.height }}</dd>
            </div>
            <div v-if="item.durationSeconds" class="asset-detail__field">
              <dt>Duration</dt>
              <dd>{{ Math.floor(item.durationSeconds / 60) }}:{{ String(Math.floor(item.durationSeconds % 60)).padStart(2, '0') }}</dd>
            </div>
            <div class="asset-detail__field">
              <dt>Category</dt>
              <dd>{{ item.category }}</dd>
            </div>
            <div v-if="item.tags.length" class="asset-detail__field">
              <dt>Tags</dt>
              <dd class="asset-detail__tags">
                <span v-for="tag in item.tags" :key="tag" class="asset-detail__tag">{{ tag }}</span>
              </dd>
            </div>
            <div class="asset-detail__field">
              <dt>Source</dt>
              <dd>{{ item.source }}</dd>
            </div>
            <div v-if="item.generationPrompt" class="asset-detail__field">
              <dt>Prompt</dt>
              <dd class="asset-detail__prompt">{{ item.generationPrompt }}</dd>
            </div>
            <div class="asset-detail__field">
              <dt>Created</dt>
              <dd>{{ formatDate(item.createdAt) }}</dd>
            </div>
          </dl>

          <!-- Download buttons -->
          <div class="asset-detail__downloads">
            <button
              class="asset-detail__dl-btn asset-detail__dl-btn--primary"
              @click="downloadAsset()"
            >
              ↓ Download {{ item.fileExtension.toUpperCase() }}
            </button>
            <div v-if="downloadFormats.length > 1" class="asset-detail__alt-formats">
              <span class="asset-detail__alt-label">Also available as:</span>
              <button
                v-for="fmt in downloadFormats.filter(f => f.format !== item.fileExtension)"
                :key="fmt.format"
                class="asset-detail__dl-btn asset-detail__dl-btn--ghost"
                @click="downloadAsset(fmt.format)"
              >
                {{ fmt.label }}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.asset-detail {
  &__back {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--tiko-border);
    border-radius: 0.5rem;
    background: var(--tiko-surface);
    color: var(--color-foreground);
    font-size: 0.85rem;
    cursor: pointer;
    margin-bottom: 1.25rem;

    &:hover { background: var(--tiko-surface-raised); }
  }

  &__loading,
  &__error {
    text-align: center;
    padding: 3rem 1rem;
    color: color-mix(in srgb, var(--color-foreground) 50%, transparent);
  }

  &__error { color: var(--color-error, #ef405d); }

  &__layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  &__preview {
    flex: 1;
    min-width: 0;

    @media (min-width: 768px) {
      max-width: 60%;
    }
  }

  &__unsupported {
    text-align: center;
    padding: 2rem;
    color: color-mix(in srgb, var(--color-foreground) 50%, transparent);
  }

  &__meta {
    flex-shrink: 0;
    width: 100%;

    @media (min-width: 768px) {
      width: 16rem;
    }
  }

  &__title {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }

  &__desc {
    font-size: 0.9rem;
    color: color-mix(in srgb, var(--color-foreground) 70%, transparent);
    margin: 0 0 1rem;
    line-height: 1.5;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0 0 1rem;
  }

  &__field {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.85rem;

    dt {
      color: color-mix(in srgb, var(--color-foreground) 55%, transparent);
      flex-shrink: 0;
    }

    dd {
      text-align: right;
      font-weight: 500;
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: flex-end;
  }

  &__tag {
    padding: 0.1rem 0.45rem;
    background: color-mix(in srgb, var(--tiko-app-primary) 15%, var(--color-background));
    color: var(--tiko-app-primary);
    border-radius: 999px;
    font-size: 0.75rem;
  }

  &__prompt {
    font-family: monospace;
    font-size: 0.8rem;
    max-height: 6rem;
    overflow-y: auto;
    white-space: pre-wrap;
  }

  &__downloads {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--tiko-border);
  }

  &__dl-btn {
    padding: 0.55rem 1rem;
    border: none;
    border-radius: 0.6rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    text-align: center;

    &--primary {
      background: var(--tiko-app-primary);
      color: var(--tiko-app-primary-text);
    }

    &--ghost {
      background: transparent;
      border: 1px solid var(--tiko-border);
      color: var(--color-foreground);
    }

    &:hover { opacity: 0.85; }
  }

  &__alt-formats {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  &__alt-label {
    font-size: 0.75rem;
    color: color-mix(in srgb, var(--color-foreground) 50%, transparent);
  }
}
</style>
