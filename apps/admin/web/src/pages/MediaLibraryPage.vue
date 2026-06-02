<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputSearch } from '@sil/ui'
import { useAdminMediaLibrary } from '../composables/useAdminMediaLibrary'
import type { AdminMediaItem } from '../composables/useAdminMediaLibrary'

const bemm = useBemm('media-library', { return: 'string', includeBaseClass: true })

const { items, total, page, totalPages, loading, uploading, error, list, upload, itemUrl } = useAdminMediaLibrary()

const search = ref('')
const type = ref('')
const selectedFile = ref<File | null>(null)
const selectedThumbnail = ref<File | null>(null)
const uploadResult = ref<string | null>(null)

onMounted(() => list())

function onFileChange(event: Event) {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function onThumbnailChange(event: Event) {
  selectedThumbnail.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function onSearch() {
  await list({ search: search.value, type: type.value, page: 1 })
}

async function go(delta: number) {
  await list({ search: search.value, type: type.value, page: page.value + delta })
}

async function onUpload() {
  if (!selectedFile.value) return
  const result = await upload(selectedFile.value, { thumbnail: selectedThumbnail.value })
  uploadResult.value = `Uploaded ${result.filename}`
  selectedFile.value = null
  selectedThumbnail.value = null
}

function mediaKind(item: AdminMediaItem): string {
  const mime = item.mime_type || ''
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  return item.type || 'file'
}

function formatSize(size?: number): string {
  if (!size) return '—'
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div :class="bemm('intro')">
        <h1 :class="bemm('title')">Media library</h1>
        <p :class="bemm('subtitle')">Upload, inspect, search, and open assets in Tiko Media.</p>
      </div>
      <span :class="bemm('total')">{{ total }} items</span>
    </header>

    <section :class="bemm('panel')">
      <h2 :class="bemm('panel-title')">Upload media</h2>
      <div :class="bemm('upload-grid')">
        <label :class="bemm('label')">
          <span :class="bemm('label-text')">File</span>
          <input :class="bemm('file-input')" type="file" accept="image/*,audio/*,video/*" @change="onFileChange" />
        </label>
        <label :class="bemm('label')">
          <span :class="bemm('label-text')">Video thumbnail (optional)</span>
          <input :class="bemm('file-input')" type="file" accept="image/*" @change="onThumbnailChange" />
        </label>
        <Button :loading="uploading" :disabled="!selectedFile || uploading" @click="onUpload">
          {{ uploading ? 'Uploading…' : 'Upload' }}
        </Button>
      </div>
      <p v-if="selectedFile" :class="bemm('hint')">
        Selected: {{ selectedFile.name }} · {{ formatSize(selectedFile.size) }}
      </p>
      <p v-if="uploadResult" :class="bemm('success')">{{ uploadResult }}</p>
    </section>

    <section :class="bemm('toolbar')">
      <InputSearch v-model="search" placeholder="Search media…" :search-action="onSearch" @search="onSearch" />
      <select :class="bemm('select')" v-model="type">
        <option value="">All types</option>
        <option value="image">Images</option>
        <option value="audio">Audio</option>
        <option value="video">Video</option>
      </select>
      <Button :loading="loading" :disabled="loading" @click="onSearch">Search</Button>
    </section>

    <p v-if="error" :class="bemm('error')">{{ error }}</p>

    <section :class="bemm('table-wrap')">
      <div v-if="loading" :class="bemm('empty')">Loading media…</div>
      <div v-else-if="items.length === 0" :class="bemm('empty')">No media found.</div>
      <table v-else :class="bemm('table')">
        <thead>
          <tr>
            <th>Preview</th>
            <th>Title</th>
            <th>Type</th>
            <th>Size</th>
            <th>Tags</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <img
                v-if="mediaKind(item) === 'image'"
                :class="bemm('thumb')"
                :src="itemUrl(item)"
                :alt="item.title || item.file_name || item.id"
              />
              <span v-else :class="bemm('kind')">{{ mediaKind(item) }}</span>
            </td>
            <td>
              <div :class="bemm('item-title')">
                <strong>{{ item.title || item.file_name || item.id }}</strong>
                <small :class="bemm('item-description')">{{ item.description }}</small>
              </div>
            </td>
            <td>{{ item.mime_type || mediaKind(item) }}</td>
            <td>{{ formatSize(item.file_size) }}</td>
            <td>
              <span :class="bemm('tags')">
                <span v-for="tag in item.tags || []" :key="tag" :class="bemm('tag')">{{ tag }}</span>
              </span>
            </td>
            <td>{{ item.createdAt || item.created_at || '—' }}</td>
            <td><a :class="bemm('link')" :href="itemUrl(item)" target="_blank" rel="noreferrer">Open</a></td>
          </tr>
        </tbody>
      </table>
    </section>

    <footer :class="bemm('pager')">
      <Button variant="outline" :disabled="page <= 1 || loading" @click="go(-1)">Previous</Button>
      <span :class="bemm('pager-status')">Page {{ page }} / {{ totalPages }}</span>
      <Button variant="outline" :disabled="page >= totalPages || loading" @click="go(1)">Next</Button>
    </footer>
  </section>
</template>

<style lang="scss">
.media-library {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
  }

  &__intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--admin-text);
  }

  &__subtitle {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__total {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__panel-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__upload-grid {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: var(--space-s);
    align-items: end;
  }

  &__toolbar {
    display: grid;
    grid-template-columns: 1fr calc(var(--space) * 10) auto;
    gap: var(--space-s);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
  }

  &__file-input,
  &__select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font: inherit;
  }

  &__link {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 600;
    font-size: var(--font-size-s);
  }

  &__hint {
    font-size: var(--font-size-s);
    color: var(--admin-text-muted);
  }

  &__success {
    color: var(--color-success);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__error {
    color: var(--color-error);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__empty {
    color: var(--admin-text-muted);
    text-align: center;
    padding: var(--space-l);
  }

  &__table-wrap {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    overflow: hidden;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-s);

    th,
    td {
      padding: var(--space-s);
      border-bottom: 1px solid var(--admin-border);
      text-align: left;
      vertical-align: top;
    }

    th {
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--admin-text-muted);
      background: var(--admin-page-bg);
    }

    tr:last-child td {
      border-bottom: 0;
    }
  }

  &__thumb,
  &__kind {
    width: calc(var(--space) * 4);
    height: calc(var(--space) * 4);
    border-radius: var(--border-radius-s);
    background: color-mix(in srgb, var(--color-foreground), transparent 92%);
  }

  &__thumb {
    object-fit: cover;
  }

  &__kind {
    display: grid;
    place-items: center;
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
  }

  &__item-title {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__item-description {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__tag {
    display: inline-block;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-round);
    padding: 0 var(--space-s);
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
  }

  &__pager {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-m);
  }

  &__pager-status {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  @media (max-width: 860px) {
    &__upload-grid,
    &__toolbar {
      grid-template-columns: 1fr;
    }

    &__table-wrap {
      overflow-x: auto;
    }

    &__table {
      min-width: calc(var(--space) * 52);
    }
  }
}
</style>
