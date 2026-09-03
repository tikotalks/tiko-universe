<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputSearch, InputText } from '@sil/ui'
import { TikoQrCode } from '@tiko/ui'
import ColorSwatchPicker from '../components/ColorSwatchPicker.vue'
import MediaPicker from '../components/MediaPicker.vue'
import {
  useRadioCollections,
  type RadioSharedCollection,
  type RadioSharedSong,
  type YouTubeSearchResult,
} from '../composables/useRadioCollections'

const page = useBemm('radio-collections', { return: 'string', includeBaseClass: true })

const api = useRadioCollections()

const editingCode = ref<string | null>(null)
const name = ref('')
const color = ref('purple')
const imageUrl = ref('')
const songs = ref<RadioSharedSong[]>([])
const search = ref('')
const results = ref<YouTubeSearchResult[]>([])
const searching = ref(false)
const shared = ref<RadioSharedCollection | null>(null)

const canSave = computed(() => name.value.trim().length > 0 && songs.value.length > 0)
const editingLabel = computed(() => (editingCode.value ? 'Save collection' : 'Publish collection'))

onMounted(() => { void api.list() })

function resetDraft() {
  editingCode.value = null
  name.value = ''
  color.value = 'purple'
  imageUrl.value = ''
  songs.value = []
  search.value = ''
  results.value = []
  shared.value = null
}

function editCollection(collection: RadioSharedCollection) {
  editingCode.value = collection.code
  name.value = collection.name
  color.value = collection.color
  imageUrl.value = collection.imageUrl ?? ''
  songs.value = [...collection.songs]
  shared.value = collection
}

async function runSearch() {
  searching.value = true
  try {
    results.value = await api.searchYouTube(search.value)
  } finally {
    searching.value = false
  }
}

function addSong(result: YouTubeSearchResult) {
  if (songs.value.some(song => song.youtubeVideoId === result.videoId)) return
  songs.value = [...songs.value, {
    title: result.title,
    artist: result.channelTitle || undefined,
    source: 'youtube',
    youtubeVideoId: result.videoId,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.durationSeconds,
  }]
}

function removeSong(index: number) {
  songs.value = songs.value.filter((_, position) => position !== index)
}

function moveSong(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= songs.value.length) return
  const next = [...songs.value]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  songs.value = next
}

async function save() {
  if (!canSave.value) return
  const draft = {
    name: name.value.trim(),
    color: color.value,
    imageUrl: imageUrl.value || undefined,
    songs: songs.value,
    // Everything published here is a curated set families can browse.
    featured: true,
  }
  const collection = editingCode.value
    ? await api.update(editingCode.value, draft)
    : await api.create(draft)
  if (!collection) return
  shared.value = collection
  editingCode.value = collection.code
}

async function removeCollection(collection: RadioSharedCollection) {
  if (!confirm(`Remove "${collection.name}"? Families who already scanned it keep their copy.`)) return
  const removed = await api.remove(collection.code)
  if (removed && editingCode.value === collection.code) resetDraft()
}

function formatCode(code: string): string {
  return `${code.slice(0, 4)} ${code.slice(4)}`
}
</script>

<template>
  <section :class="page('')">
    <header :class="page('header')">
      <div :class="page('intro')">
        <h1 :class="page('title')">Radio — Shared collections</h1>
        <p :class="page('subtitle')">
          Build a set here — Disney, bedtime, a birthday party — and a family adds it
          by scanning its code. Everything published on this page is offered to every
          Radio in the import screen.
        </p>
      </div>
      <Button variant="outline" :loading="api.loading.value" @click="api.list()">Reload</Button>
    </header>

    <p v-if="api.error.value" :class="page('error')">{{ api.error.value }}</p>

    <div :class="page('layout')">
      <!-- ── Editor ─────────────────────────────────────────── -->
      <div :class="page('editor')">
        <h2 :class="page('section-title')">{{ editingCode ? 'Edit collection' : 'New collection' }}</h2>

        <InputText v-model="name" label="Name" placeholder="Disney" />

        <label :class="page('label')">Colour</label>
        <ColorSwatchPicker v-model="color" mode="name" />

        <label :class="page('label')">Picture</label>
        <MediaPicker v-model="imageUrl" />

        <label :class="page('label')">Songs</label>
        <div :class="page('search')">
          <InputSearch v-model="search" placeholder="Search YouTube…" @keyup.enter="runSearch" />
          <Button variant="outline" :loading="searching" :disabled="!search.trim()" @click="runSearch">Search</Button>
        </div>

        <ul v-if="results.length" :class="page('results')">
          <li v-for="result in results" :key="result.videoId" :class="page('result')">
            <img :src="result.thumbnailUrl" :alt="result.title" :class="page('result-thumb')" loading="lazy" />
            <div :class="page('result-info')">
              <span :class="page('result-title')">{{ result.title }}</span>
              <span :class="page('result-channel')">{{ result.channelTitle }}</span>
            </div>
            <Button size="small" @click="addSong(result)">Add</Button>
          </li>
        </ul>

        <ol v-if="songs.length" :class="page('songs')">
          <li v-for="(song, index) in songs" :key="`${song.youtubeVideoId ?? song.externalId ?? song.title}-${index}`" :class="page('song')">
            <img v-if="song.thumbnailUrl" :src="song.thumbnailUrl" :alt="song.title" :class="page('song-thumb')" loading="lazy" />
            <div :class="page('song-info')">
              <span :class="page('song-title')">{{ song.title }}</span>
              <span :class="page('song-artist')">{{ song.artist }}</span>
            </div>
            <div :class="page('song-actions')">
              <Button size="small" variant="ghost" :disabled="index === 0" @click="moveSong(index, -1)">↑</Button>
              <Button size="small" variant="ghost" :disabled="index === songs.length - 1" @click="moveSong(index, 1)">↓</Button>
              <Button size="small" variant="ghost" @click="removeSong(index)">Remove</Button>
            </div>
          </li>
        </ol>
        <p v-else :class="page('empty')">Search for songs to put in this collection.</p>

        <div :class="page('editor-actions')">
          <Button variant="ghost" @click="resetDraft">New</Button>
          <Button :loading="api.saving.value" :disabled="!canSave || api.saving.value" @click="save">{{ editingLabel }}</Button>
        </div>

        <!-- The published code, ready to print or send -->
        <div v-if="shared" :class="page('share')">
          <div :class="page('share-qr')">
            <TikoQrCode :value="shared.shareUrl" :size="180" :label="shared.name" />
          </div>
          <div :class="page('share-details')">
            <span :class="page('share-code')">{{ formatCode(shared.code) }}</span>
            <a :href="shared.shareUrl" target="_blank" rel="noreferrer" :class="page('share-link')">{{ shared.shareUrl }}</a>
          </div>
        </div>
      </div>

      <!-- ── Published sets ─────────────────────────────────── -->
      <div :class="page('list')">
        <h2 :class="page('section-title')">Published</h2>
        <p v-if="api.loading.value && api.collections.value.length === 0" :class="page('empty')">Loading…</p>
        <p v-else-if="api.collections.value.length === 0" :class="page('empty')">Nothing published yet.</p>
        <ul v-else :class="page('published')">
          <li v-for="collection in api.collections.value" :key="collection.code" :class="page('published-item')">
            <img v-if="collection.imageUrl" :src="collection.imageUrl" :alt="collection.name" :class="page('published-art')" loading="lazy" />
            <div :class="page('published-info')">
              <span :class="page('published-name')">{{ collection.name }}</span>
              <span :class="page('published-meta')">{{ collection.songCount }} songs · {{ formatCode(collection.code) }}</span>
            </div>
            <div :class="page('published-actions')">
              <Button size="small" variant="outline" @click="editCollection(collection)">Edit</Button>
              <Button size="small" variant="ghost" @click="removeCollection(collection)">Remove</Button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style lang="scss">
.radio-collections {
  display: flex;
  flex-direction: column;
  gap: var(--space, 1rem);

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  &__title {
    margin: 0;
    font-size: 1.5rem;
  }

  &__subtitle {
    margin: 0.35rem 0 0;
    max-width: 46rem;
    color: color-mix(in srgb, currentColor 60%, transparent);
  }

  &__error {
    padding: 0.6rem 0.85rem;
    border-radius: 0.6rem;
    background: color-mix(in srgb, #e03131 12%, transparent);
    color: #e03131;
  }

  &__layout {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);

    @media (max-width: 60rem) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  &__section-title {
    margin: 0 0 0.75rem;
    font-size: 1.05rem;
  }

  &__label {
    display: block;
    margin: 1rem 0 0.35rem;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  &__search {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
  }

  &__results,
  &__songs,
  &__published {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin: 0.75rem 0 0;
    padding: 0;
  }

  &__results { max-height: 18rem; overflow-y: auto; }

  &__result,
  &__song,
  &__published-item {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.5rem;
    border-radius: 0.65rem;
    background: color-mix(in srgb, currentColor 4%, transparent);
  }

  &__result-thumb,
  &__song-thumb {
    width: 5rem;
    height: 2.9rem;
    border-radius: 0.4rem;
    object-fit: cover;
    flex-shrink: 0;
  }

  &__published-art {
    width: 2.5rem;
    height: 2.5rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  &__result-info,
  &__song-info,
  &__published-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  &__result-title,
  &__song-title,
  &__published-name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__result-channel,
  &__song-artist,
  &__published-meta {
    font-size: 0.8rem;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  &__song-actions,
  &__published-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  &__empty {
    margin: 0.75rem 0 0;
    color: color-mix(in srgb, currentColor 50%, transparent);
  }

  &__editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.25rem;
  }

  &__share {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1.25rem;
    padding: 1rem;
    border-radius: 0.85rem;
    background: color-mix(in srgb, currentColor 5%, transparent);
  }

  &__share-qr {
    padding: 0.5rem;
    border-radius: 0.6rem;
    background: #fff;
    line-height: 0;
  }

  &__share-details {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  &__share-code {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  &__share-link {
    font-size: 0.8rem;
    word-break: break-all;
  }
}
</style>
