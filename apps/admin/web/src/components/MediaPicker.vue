<script setup lang="ts">
import { ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'
import { useAdminMediaLibrary, type AdminMediaItem } from '../composables/useAdminMediaLibrary'

const props = defineProps<{
  modelValue: string
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const bemm = useBemm('media-picker', { return: 'string', includeBaseClass: true })
const { items, loading, uploading, list, upload, itemUrl, itemPreviewUrl, previewUrl } = useAdminMediaLibrary()

const open = ref(false)
const search = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
let searchTimer: number | undefined

function select(item: AdminMediaItem) {
  emit('update:modelValue', itemUrl(item))
  open.value = false
}

function clear() {
  emit('update:modelValue', '')
}

function loadMedia() {
  void list({ search: search.value || undefined, type: 'image', limit: 24 })
}

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const result = await upload(file)
    emit('update:modelValue', result.url)
    open.value = false
  } finally {
    input.value = ''
  }
}

watch(search, () => {
  if (!open.value) return
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(loadMedia, 250)
})
watch(open, (v) => { if (v) loadMedia() })
</script>

<template>
  <div :class="bemm('')">
    <div :class="bemm('preview')" v-if="modelValue">
      <img :class="bemm('image')" :src="previewUrl(modelValue, 96)" alt="Selected icon" decoding="async" />
      <Button size="small" variant="ghost" @click="clear">Remove</Button>
    </div>
    <Button size="small" variant="outline" @click="open = true">
      {{ modelValue ? 'Change image' : 'Pick from Media' }}
    </Button>

    <div v-if="open" :class="bemm('modal')" @click.self="open = false">
      <div :class="bemm('modal-panel')">
        <header :class="bemm('modal-header')">
          <h3 :class="bemm('modal-title')">Select image from Tiko Media</h3>
          <button type="button" :class="bemm('modal-close')" @click="open = false">✕</button>
        </header>
        <InputText v-model="search" label="Search" placeholder="Search media…" />
        <div :class="bemm('upload-row')">
          <input ref="fileInput" type="file" accept="image/*" :class="bemm('file-input')" @change="uploadFile">
          <Button size="small" variant="outline" :loading="uploading" :disabled="uploading" @click="fileInput?.click()">
            Upload image
          </Button>
        </div>
        <div v-if="loading" :class="bemm('modal-loading')">Loading…</div>
        <div v-else-if="items.length === 0" :class="bemm('modal-empty')">No images found.</div>
        <div v-else :class="bemm('modal-grid')">
          <button
            v-for="item in items"
            :key="item.id"
            type="button"
            :class="[bemm('modal-item'), { [bemm('modal-item--selected')]: itemUrl(item) === modelValue }]"
            @click="select(item)"
          >
            <img :src="itemPreviewUrl(item, 180)" :alt="item.title || item.file_name" loading="lazy" decoding="async" />
            <span>{{ item.title || item.category || item.file_name }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use '../styles/mixins' as *;

.media-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);

  &__preview {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  &__image {
    width: calc(var(--space) * 4);
    height: calc(var(--space) * 4);
    object-fit: cover;
    border-radius: var(--border-radius-xs);
    border: 1px solid var(--admin-border);
    --block-size: 0.5em;
    @include checkeredBackground;
  }

  &__modal {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.65);
    padding: var(--space-m);
  }

  &__modal-panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-m);
    width: 100%;
    max-width: 640px;
    max-height: 80vh;
    overflow-y: auto;
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__modal-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__modal-close {
    border: 0;
    background: transparent;
    color: var(--admin-text-muted);
    font-size: var(--font-size-m);
    cursor: pointer;
    padding: var(--space-xs);
  }

  &__modal-loading,
  &__modal-empty {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    text-align: center;
    padding: var(--space-m);
  }

  &__upload-row {
    display: flex;
    justify-content: flex-end;
  }

  &__file-input {
    display: none;
  }

  &__modal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space) * 10), 1fr));
    gap: var(--space-xs);
  }

  &__modal-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--space-xs);
    border: 2px solid var(--admin-border);
    border-radius: var(--border-radius-xs);
    background: var(--admin-page-bg);
    cursor: pointer;
    text-align: left;

    img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 2px;
      --block-size: 0.5em;
      @include checkeredBackground;
    }

    span {
      font-size: var(--font-size-xs);
      color: var(--admin-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &:hover {
      border-color: var(--admin-border-strong);
    }

    &--selected {
      border-color: var(--color-primary);
    }
  }
}
</style>
