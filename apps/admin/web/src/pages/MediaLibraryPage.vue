<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAdminMediaLibrary } from '../composables/useAdminMediaLibrary'
import type { AdminMediaItem } from '../composables/useAdminMediaLibrary'

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
  <section class="media-library-admin">
    <header class="media-library-admin__header">
      <div>
        <h1>Media Library</h1>
        <p>Upload, inspect, search, and open assets in Tiko Media.</p>
      </div>
      <strong>{{ total }} items</strong>
    </header>

    <section class="media-library-admin__upload">
      <h2>Upload media</h2>
      <div class="media-library-admin__upload-grid">
        <label>
          <span>File</span>
          <input type="file" accept="image/*,audio/*,video/*" @change="onFileChange" />
        </label>
        <label>
          <span>Video thumbnail (optional)</span>
          <input type="file" accept="image/*" @change="onThumbnailChange" />
        </label>
        <button :disabled="!selectedFile || uploading" @click="onUpload">
          {{ uploading ? 'Uploading…' : 'Upload' }}
        </button>
      </div>
      <p v-if="selectedFile" class="media-library-admin__hint">Selected: {{ selectedFile.name }} · {{ formatSize(selectedFile.size) }}</p>
      <p v-if="uploadResult" class="media-library-admin__success">{{ uploadResult }}</p>
    </section>

    <section class="media-library-admin__toolbar">
      <input v-model="search" placeholder="Search media…" @keyup.enter="onSearch" />
      <select v-model="type">
        <option value="">All types</option>
        <option value="image">Images</option>
        <option value="audio">Audio</option>
        <option value="video">Video</option>
      </select>
      <button :disabled="loading" @click="onSearch">Search</button>
    </section>

    <p v-if="error" class="media-library-admin__error">{{ error }}</p>

    <section class="media-library-admin__table-wrap">
      <div v-if="loading" class="media-library-admin__empty">Loading media…</div>
      <div v-else-if="items.length === 0" class="media-library-admin__empty">No media found.</div>
      <table v-else class="media-library-admin__table">
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
              <img v-if="mediaKind(item) === 'image'" :src="itemUrl(item)" :alt="item.title || item.file_name || item.id" />
              <span v-else class="media-library-admin__kind">{{ mediaKind(item) }}</span>
            </td>
            <td>
              <strong>{{ item.title || item.file_name || item.id }}</strong>
              <small>{{ item.description }}</small>
            </td>
            <td>{{ item.mime_type || mediaKind(item) }}</td>
            <td>{{ formatSize(item.file_size) }}</td>
            <td>
              <span v-for="tag in item.tags || []" :key="tag" class="media-library-admin__tag">{{ tag }}</span>
            </td>
            <td>{{ item.createdAt || item.created_at || '—' }}</td>
            <td><a :href="itemUrl(item)" target="_blank" rel="noreferrer">Open</a></td>
          </tr>
        </tbody>
      </table>
    </section>

    <footer class="media-library-admin__pager">
      <button :disabled="page <= 1 || loading" @click="go(-1)">Previous</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages || loading" @click="go(1)">Next</button>
    </footer>
  </section>
</template>

<style lang="scss" scoped>
.media-library-admin {
  &__header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
  h1 { margin: 0; font-size: 1.4rem; }
  h2 { margin: 0 0 0.75rem; font-size: 1rem; }
  p { color: var(--tiko-admin-muted); margin: 0.25rem 0 0; }

  &__upload,
  &__toolbar,
  &__table-wrap,
  &__pager { border: 1px solid var(--tiko-admin-border); border-radius: 1rem; background: var(--tiko-admin-card); padding: 1rem; margin-bottom: 1rem; }

  &__upload-grid { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.75rem; align-items: end; }
  &__toolbar { display: grid; grid-template-columns: 1fr 10rem auto; gap: 0.75rem; }

  label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; font-weight: 700; }
  input,
  select { width: 100%; box-sizing: border-box; border: 1px solid var(--tiko-admin-border); border-radius: 0.7rem; padding: 0.65rem 0.75rem; background: var(--color-background); color: var(--color-foreground); }
  button,
  a { border: 1px solid var(--tiko-admin-border); border-radius: 999px; padding: 0.55rem 0.85rem; background: var(--color-background); color: var(--color-foreground); text-decoration: none; cursor: pointer; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }

  &__success { color: var(--color-success) !important; }
  &__error { color: var(--color-error) !important; margin-bottom: 1rem !important; }
  &__hint { font-size: 0.85rem; }
  &__empty { color: var(--tiko-admin-muted); text-align: center; padding: 2rem; }

  &__table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th,
  td { padding: 0.75rem; border-bottom: 1px solid var(--tiko-admin-border); text-align: left; vertical-align: top; }
  th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--tiko-admin-muted); }
  img { width: 4rem; height: 4rem; object-fit: cover; border-radius: 0.65rem; background: color-mix(in srgb, var(--color-foreground), transparent 92%); }
  small { display: block; color: var(--tiko-admin-muted); margin-top: 0.2rem; }

  &__kind { display: grid; place-items: center; width: 4rem; height: 4rem; border-radius: 0.65rem; background: color-mix(in srgb, var(--color-foreground), transparent 92%); color: var(--tiko-admin-muted); font-size: 0.75rem; }
  &__tag { display: inline-block; border: 1px solid var(--tiko-admin-border); border-radius: 999px; padding: 0.2rem 0.45rem; margin: 0 0.25rem 0.25rem 0; font-size: 0.75rem; }
  &__pager { display: flex; justify-content: center; align-items: center; gap: 1rem; }

  @media (max-width: 860px) {
    &__upload-grid,
    &__toolbar { grid-template-columns: 1fr; }
    &__table-wrap { overflow-x: auto; }
    &__table { min-width: 52rem; }
  }
}
</style>
