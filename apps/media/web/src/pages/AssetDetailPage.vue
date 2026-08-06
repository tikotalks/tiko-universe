<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useBemm } from 'bemm'
import { SilIcon } from '@tiko/ui'
import { useMediaLibrary } from '../composables/useMediaLibrary'
import ImagePreview from '../components/ImagePreview.vue'
import AudioPreview from '../components/AudioPreview.vue'
import type { MediaItem } from '../types/media'

const bemm = useBemm('asset-detail', { return: 'string', includeBaseClass: true })

const route = useRoute()
const { fetchMediaItem, getDownloadUrl } = useMediaLibrary()

const item = ref<MediaItem | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const assetId = computed(() => route.params.id as string)

onMounted(async () => {
  const result = await fetchMediaItem(assetId.value)
  if (result) item.value = result
  else error.value = 'That asset could not be found.'
  loading.value = false
})

function downloadAsset(format?: string) {
  window.open(getDownloadUrl(assetId.value, format), '_blank')
}

function formatDate(iso: string): string {
  if (!iso) return 'Unknown'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

const alternativeFormats = computed(() => {
  const current = item.value
  if (!current) return []
  const formats = current.fileType === 'image'
    ? [
        { label: 'PNG', format: 'png' },
        { label: 'JPG', format: 'jpg' },
        { label: 'WebP', format: 'webp' },
      ]
    : current.fileType === 'audio'
      ? [
          { label: 'MP3', format: 'mp3' },
          { label: 'WAV', format: 'wav' },
        ]
      : []
  return formats.filter((entry) => entry.format !== current.fileExtension)
})

interface DetailField {
  label: string
  value: string
}

// Only the human-readable words get title case. A MIME type must not — CSS `capitalize`
// on the whole value turned `image/png` into `Image/Png`.
function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value
}

const fields = computed<DetailField[]>(() => {
  const current = item.value
  if (!current) return []
  const rows: DetailField[] = [
    { label: 'Type', value: `${capitalize(current.fileType)} · ${current.mimeType}` },
    { label: 'Size', value: formatSize(current.fileSizeBytes) },
  ]
  if (current.width && current.height) {
    rows.push({ label: 'Dimensions', value: `${current.width} × ${current.height}` })
  }
  if (current.durationSeconds) {
    rows.push({ label: 'Duration', value: formatDuration(current.durationSeconds) })
  }
  rows.push({ label: 'Category', value: capitalize(current.category) })
  rows.push({ label: 'Source', value: capitalize(current.source) })
  rows.push({ label: 'Added', value: formatDate(current.createdAt) })
  return rows
})
</script>

<template>
  <div :class="[bemm(''), 'container']">
    <RouterLink :class="bemm('back')" :to="{ name: 'gallery' }">
      <SilIcon name="arrows/arrow-left" />
      Back to the library
    </RouterLink>

    <p v-if="loading" :class="bemm('status')" role="status">Loading asset…</p>
    <p v-else-if="error" :class="bemm('status')" role="status">{{ error }}</p>

    <div v-else-if="item" :class="bemm('layout')">
      <section :class="bemm('preview')">
        <ImagePreview
          v-if="item.fileType === 'image'"
          :src="item.url"
          :alt="item.title"
          :width="item.width"
          :height="item.height"
        />
        <AudioPreview
          v-else-if="item.fileType === 'audio'"
          :src="item.url"
          :title="item.title"
          :duration-seconds="item.durationSeconds"
        />
        <p v-else :class="bemm('status')">
          There is no in-page preview for {{ item.fileType }} files yet — download it instead.
        </p>
      </section>

      <aside :class="bemm('meta')">
        <div :class="bemm('heading')">
          <p class="eyebrow">{{ item.category }}</p>
          <h1 :class="bemm('title')">{{ item.title }}</h1>
          <p v-if="item.description" class="body-sm">{{ item.description }}</p>
        </div>

        <dl :class="bemm('fields')">
          <div v-for="field in fields" :key="field.label" :class="bemm('field')">
            <dt :class="bemm('field-label')">{{ field.label }}</dt>
            <dd :class="bemm('field-value')">{{ field.value }}</dd>
          </div>
        </dl>

        <div v-if="item.tags.length" :class="bemm('tags')">
          <span v-for="tag in item.tags" :key="tag" :class="bemm('tag')">{{ tag }}</span>
        </div>

        <div v-if="item.generationPrompt" :class="bemm('prompt')">
          <p :class="bemm('field-label')">Prompt</p>
          <p :class="bemm('prompt-text')">{{ item.generationPrompt }}</p>
        </div>

        <div :class="bemm('downloads')">
          <button class="btn btn--primary" @click="downloadAsset()">
            <SilIcon name="arrows/arrow-download" />
            Download {{ item.fileExtension.toUpperCase() }}
          </button>

          <div v-if="alternativeFormats.length" :class="bemm('formats')">
            <span :class="bemm('field-label')">Also available as</span>
            <div :class="bemm('format-list')">
              <button
                v-for="entry in alternativeFormats"
                :key="entry.format"
                class="btn btn--quiet"
                @click="downloadAsset(entry.format)"
              >
                {{ entry.label }}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style lang="scss">
.asset-detail {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space) * 2);
  padding-block: clamp(var(--space), 4vw, calc(var(--space) * 3));

  &__back {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: var(--space-s);
    padding: 8px 16px 8px 12px;
    border-radius: 999px;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 600;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);

    &:hover {
      background: var(--surface-ink-wash);
      color: var(--color-foreground);
    }
  }

  &__status {
    padding: calc(var(--space) * 3) var(--space);
    text-align: center;
    color: var(--text-muted);
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    align-items: start;
    gap: clamp(calc(var(--space) * 1.5), 4vw, calc(var(--space) * 3.5));
  }

  &__preview {
    min-width: 0;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 1.5);
    position: sticky;
    top: calc(var(--header-height) + var(--space) * 2);
  }

  &__heading {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__title {
    font-size: clamp(1.5rem, 3vw, 2rem);
    line-height: 1.1;
    letter-spacing: -0.01em;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    margin: 0;
  }

  &__field {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space);
    padding-bottom: var(--space-s);
    border-bottom: 1px solid var(--border);
    font-size: 0.875rem;
  }

  &__field-label {
    flex-shrink: 0;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  &__field-value {
    margin: 0;
    text-align: right;
    overflow-wrap: anywhere;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__tag {
    padding: 3px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-primary), transparent 85%);
    color: color-mix(in srgb, var(--color-foreground), var(--color-primary) 30%);
    font-size: 0.75rem;
    font-weight: 600;
  }

  &__prompt {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__prompt-text {
    max-height: 9rem;
    overflow-y: auto;
    padding: var(--space);
    border-radius: 12px;
    background: var(--surface-subtle);
    font-family: var(--font-family-monospace);
    font-size: 0.8rem;
    line-height: 1.55;
    white-space: pre-wrap;
  }

  &__downloads {
    display: flex;
    flex-direction: column;
    gap: var(--space);
  }

  &__formats {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__format-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
  }
}

@media (max-width: 900px) {
  .asset-detail {
    &__layout {
      grid-template-columns: 1fr;
    }

    &__meta {
      position: static;
    }
  }
}
</style>
