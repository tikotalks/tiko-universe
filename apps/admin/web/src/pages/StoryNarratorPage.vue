<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputRange, InputText, InputTextArea } from '@sil/ui'
import { useStoryNarration, type StoryDraft, type StoryGalleryItem, type VoiceSample } from '../composables/useStoryNarration'
import { useAdminMediaLibrary, type AudioLibraryAlbum } from '../composables/useAdminMediaLibrary'
import type { StorySegmentInput, StoryTryoutResult } from '../types/admin'

type Tab = 'library' | 'drafts' | 'create'

const page = useBemm('story-page', { return: 'string', includeBaseClass: true })
const card = useBemm('story-card', { return: 'string', includeBaseClass: true })
const segment = useBemm('segment-card', { return: 'string', includeBaseClass: true })

const fallbackVoices = [
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel', provider: 'elevenlabs', model: 'eleven_multilingual_v2' },
  { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi', provider: 'elevenlabs', model: 'eleven_multilingual_v2' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella', provider: 'elevenlabs', model: 'eleven_multilingual_v2' },
]

const { tryout, render: renderStory, audioSrc, listStories, listVoices, createDraft, listDrafts, promoteStory, deleteStory } = useStoryNarration()
const { listAudioAlbums } = useAdminMediaLibrary()

const activeTab = ref<Tab>('library')

const libraryItems = ref<StoryGalleryItem[]>([])
const draftItems = ref<StoryGalleryItem[]>([])
const galleryLoading = ref(false)
const galleryError = ref<string | null>(null)
const voiceSamples = ref<VoiceSample[]>([])
const savedDrafts = ref<StoryDraft[]>([])
const audioAlbums = ref<AudioLibraryAlbum[]>([])
const creatorLoading = ref(false)

const title = ref('')
const description = ref('')
const language = ref('en')
const voice = ref('21m00Tcm4TlvDq8ikWAM')
const model = ref('eleven_multilingual_v2')
const speed = ref(1)
const category = ref('story')
const tagsText = ref('tiko-radio, story')
const coverMediaId = ref('')
const targetAlbumId = ref('')
const segments = ref<StorySegmentInput[]>([
  { id: crypto.randomUUID(), text: '', pauseAfterMs: 350 },
])
const selectedSegmentId = ref(segments.value[0].id)
const tryoutLoading = ref(false)
const renderLoading = ref(false)
const formError = ref<string | null>(null)
const tryoutResult = ref<StoryTryoutResult | null>(null)

const selectedSegment = computed(() => segments.value.find(s => s.id === selectedSegmentId.value) ?? segments.value[0])
const totalCharacters = computed(() => segments.value.reduce((sum, s) => sum + s.text.length, 0))
const canRender = computed(() => title.value.trim() && segments.value.some(s => s.text.trim()))
const voiceOptions = computed(() => {
  const selectedProvider = model.value.startsWith('eleven_') ? 'elevenlabs' : 'openai'
  const source = voiceSamples.value.length ? voiceSamples.value : fallbackVoices.map(item => ({ ...item, sampleUrl: `/v1/generation/voice-samples/${item.id}?provider=${item.provider}&model=${item.model}` }))
  return source.filter(option => option.provider === selectedProvider).map(option => ({ ...option, model: model.value }))
})

function parseTags(): string[] {
  return tagsText.value.split(',').map(tag => tag.trim()).filter(Boolean)
}

function addSegment() {
  const next = { id: crypto.randomUUID(), text: '', pauseAfterMs: 350 }
  segments.value.push(next)
  selectedSegmentId.value = next.id
}

function removeSegment(id: string) {
  if (segments.value.length === 1) return
  segments.value = segments.value.filter(s => s.id !== id)
  if (selectedSegmentId.value === id) selectedSegmentId.value = segments.value[0].id
}

function duplicateSegment(target: StorySegmentInput) {
  const copy = { ...target, id: crypto.randomUUID() }
  const index = segments.value.findIndex(item => item.id === target.id)
  segments.value.splice(index + 1, 0, copy)
  selectedSegmentId.value = copy.id
}

async function onTryout(target = selectedSegment.value) {
  if (!target?.text.trim()) {
    formError.value = 'Add text to the selected segment first.'
    return
  }
  tryoutLoading.value = true
  formError.value = null
  try {
    tryoutResult.value = await tryout({
      text: target.text,
      language: language.value,
      voice: voice.value,
      model: model.value,
      speed: speed.value,
    })
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Tryout failed.'
  } finally {
    tryoutLoading.value = false
  }
}

async function onRender() {
  if (!canRender.value) {
    formError.value = 'Add a title and at least one segment first.'
    return
  }
  renderLoading.value = true
  formError.value = null
  try {
    await renderStory({
      title: title.value,
      description: description.value,
      language: language.value,
      voice: voice.value,
      model: model.value,
      speed: speed.value,
      segments: segments.value.filter(s => s.text.trim()),
      category: category.value,
      tags: parseTags(),
    })
    activeTab.value = 'drafts'
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Story render failed.'
  } finally {
    renderLoading.value = false
  }
}

async function onSaveCreatorDraft() {
  if (!canRender.value) {
    formError.value = 'Add a title and at least one chapter first.'
    return
  }
  creatorLoading.value = true
  formError.value = null
  try {
    const draft = await createDraft({
      title: title.value,
      description: description.value || undefined,
      coverMediaId: coverMediaId.value || undefined,
      targetAlbumId: targetAlbumId.value || undefined,
      defaultVoice: voice.value,
      defaultSpeed: speed.value,
      chapters: segments.value.filter(s => s.text.trim()).map((item, index) => ({
        id: item.id,
        title: `Chapter ${index + 1}`,
        text: item.text,
        voice: voice.value,
        speed: speed.value,
        position: index + 1,
      })),
    })
    savedDrafts.value = [draft, ...savedDrafts.value.filter(item => item.id !== draft.id)]
    activeTab.value = 'drafts'
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Could not save story draft.'
  } finally {
    creatorLoading.value = false
  }
}

function loadTemplate(kind: 'short' | 'radio') {
  title.value = kind === 'short' ? 'Tiko Good Morning' : 'Tiko Radio Adventure'
  description.value = kind === 'short' ? 'Short narrated greeting for Tiko.' : 'A calm multi-part story for Tiko Radio.'
  segments.value = kind === 'short'
    ? [
        { id: crypto.randomUUID(), text: 'Good morning. Today is a new day, and we can take it step by step.', pauseAfterMs: 450 },
      ]
    : [
        { id: crypto.randomUUID(), text: 'Once upon a time, Tiko found a tiny glowing pebble beside the path.', pauseAfterMs: 550 },
        { id: crypto.randomUUID(), text: 'The pebble hummed softly, like it was singing a song only kind hearts could hear.', pauseAfterMs: 550 },
        { id: crypto.randomUUID(), text: 'Tiko smiled, picked it up carefully, and followed the gentle sound into the garden.', pauseAfterMs: 350 },
      ]
  selectedSegmentId.value = segments.value[0].id
}

async function loadLibrary() {
  galleryLoading.value = true
  galleryError.value = null
  try {
    const result = await listStories('promoted', 1, 60)
    libraryItems.value = result.data
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not load stories.'
  } finally {
    galleryLoading.value = false
  }
}

async function loadDrafts() {
  galleryLoading.value = true
  galleryError.value = null
  try {
    const [renderedResult, creatorDrafts] = await Promise.all([
      listStories('draft', 1, 60),
      listDrafts().catch(() => []),
    ])
    draftItems.value = renderedResult.data
    savedDrafts.value = creatorDrafts
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not load drafts.'
  } finally {
    galleryLoading.value = false
  }
}

async function loadCreatorResources() {
  try {
    const [voices, albums] = await Promise.all([
      listVoices().catch(() => []),
      listAudioAlbums().catch(() => []),
    ])
    voiceSamples.value = voices
    audioAlbums.value = albums
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Could not load story creator options.'
  }
}

async function onPromote(item: StoryGalleryItem) {
  try {
    await promoteStory(item.id)
    draftItems.value = draftItems.value.filter(i => i.id !== item.id)
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not promote story.'
  }
}

async function onDelete(item: StoryGalleryItem, list: 'library' | 'drafts') {
  if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return
  try {
    await deleteStory(item.id)
    if (list === 'library') libraryItems.value = libraryItems.value.filter(i => i.id !== item.id)
    else draftItems.value = draftItems.value.filter(i => i.id !== item.id)
  } catch (e) {
    galleryError.value = e instanceof Error ? e.message : 'Could not delete story.'
  }
}


watch(model, () => {
  const firstVoice = voiceOptions.value[0]
  if (firstVoice && !voiceOptions.value.some(option => option.id === voice.value)) {
    voice.value = firstVoice.id
  }
})

watch(activeTab, async () => {
  if (activeTab.value === 'library') await loadLibrary()
  if (activeTab.value === 'drafts') await loadDrafts()
  if (activeTab.value === 'create') await loadCreatorResources()
})

onMounted(() => {
  void loadLibrary()
  void loadCreatorResources()
})
</script>

<template>
  <section :class="page('')">
    <header :class="page('header')">
      <div :class="page('intro')">
        <h1 :class="page('title')">Stories</h1>
        <p :class="page('subtitle')">
          Browse Tiko's narrated story library, review drafts, and create new ones.
        </p>
      </div>
      <Button v-if="activeTab !== 'create'" @click="activeTab = 'create'">Create new story</Button>
    </header>

    <nav :class="page('tabs')" aria-label="Story sections">
      <button type="button" :class="page('tab', { active: activeTab === 'library' })" @click="activeTab = 'library'">
        <span>Library</span>
        <span :class="page('tab-count')">{{ libraryItems.length }}</span>
      </button>
      <button type="button" :class="page('tab', { active: activeTab === 'drafts' })" @click="activeTab = 'drafts'">
        <span>Drafts</span>
        <span :class="page('tab-count')">{{ draftItems.length + savedDrafts.length }}</span>
      </button>
      <button type="button" :class="page('tab', { active: activeTab === 'create' })" @click="activeTab = 'create'">
        Create
      </button>
    </nav>

    <p v-if="galleryError" :class="page('error')">{{ galleryError }}</p>

    <section v-if="activeTab === 'library'" :class="page('panel')">
      <header :class="page('panel-head')">
        <div :class="page('panel-intro')">
          <h2 :class="page('panel-title')">Tiko Radio stories</h2>
          <p :class="page('panel-meta')">Stories promoted from drafts. Available to Tiko Radio.</p>
        </div>
        <Button variant="outline" :loading="galleryLoading" :disabled="galleryLoading" @click="loadLibrary">Reload</Button>
      </header>

      <div v-if="galleryLoading && libraryItems.length === 0" :class="page('empty')">Loading library…</div>
      <div v-else-if="libraryItems.length === 0" :class="page('empty')">
        No stories promoted yet. <button type="button" :class="page('inline-link')" @click="activeTab = 'create'">Create one</button>.
      </div>
      <div v-else :class="page('grid')">
        <article v-for="item in libraryItems" :key="item.id" :class="card('')">
          <header :class="card('head')">
            <h3 :class="card('title')">{{ item.title }}</h3>
            <p :class="card('meta')">{{ item.voice }} · {{ item.segmentCount }} segments</p>
          </header>
          <p v-if="item.description" :class="card('description')">{{ item.description }}</p>
          <audio v-if="item.audioUrl" :class="card('audio')" :src="audioSrc(item.audioUrl)" controls />
          <div :class="card('actions')">
            <Button variant="ghost" size="small" @click="onDelete(item, 'library')">Delete</Button>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'drafts'" :class="page('panel')">
      <header :class="page('panel-head')">
        <div :class="page('panel-intro')">
          <h2 :class="page('panel-title')">Story creator drafts</h2>
          <p :class="page('panel-meta')">Chapter plans with voice, cover, and target Radio album settings.</p>
        </div>
        <Button variant="outline" :loading="galleryLoading" :disabled="galleryLoading" @click="loadDrafts">Reload</Button>
      </header>

      <div v-if="savedDrafts.length === 0" :class="page('empty')">
        No creator drafts yet. <button type="button" :class="page('inline-link')" @click="activeTab = 'create'">Plan one</button>.
      </div>
      <div v-else :class="page('grid')">
        <article v-for="draft in savedDrafts" :key="draft.id" :class="card('', { draft: true })">
          <header :class="card('head')">
            <h3 :class="card('title')">{{ draft.title }}</h3>
            <p :class="card('meta')">{{ draft.defaultVoice }} · {{ draft.chapters.length }} chapters · {{ draft.status }}</p>
          </header>
          <p v-if="draft.description" :class="card('description')">{{ draft.description }}</p>
          <p :class="card('description')">
            Cover: {{ draft.coverMediaId || 'not assigned' }}<br />
            Radio album: {{ audioAlbums.find(album => album.id === draft.targetAlbumId)?.title || draft.targetAlbumId || 'not assigned' }}
          </p>
        </article>
      </div>

      <header :class="page('panel-head')">
        <div :class="page('panel-intro')">
          <h2 :class="page('panel-title')">Generated drafts</h2>
          <p :class="page('panel-meta')">Render output stays here until promoted to Tiko Radio.</p>
        </div>
      </header>

      <div v-if="galleryLoading && draftItems.length === 0" :class="page('empty')">Loading drafts…</div>
      <div v-else-if="draftItems.length === 0" :class="page('empty')">
        No drafts yet. <button type="button" :class="page('inline-link')" @click="activeTab = 'create'">Create one</button>.
      </div>
      <div v-else :class="page('grid')">
        <article v-for="item in draftItems" :key="item.id" :class="card('', { draft: true })">
          <header :class="card('head')">
            <h3 :class="card('title')">{{ item.title }}</h3>
            <p :class="card('meta')">{{ item.voice }} · {{ item.segmentCount }} segments</p>
          </header>
          <p v-if="item.description" :class="card('description')">{{ item.description }}</p>
          <audio v-if="item.audioUrl" :class="card('audio')" :src="audioSrc(item.audioUrl)" controls />
          <div :class="card('actions')">
            <Button size="small" @click="onPromote(item)">Promote</Button>
            <Button variant="ghost" size="small" @click="onDelete(item, 'drafts')">Delete</Button>
          </div>
        </article>
      </div>
    </section>

    <section v-else :class="page('create')">
      <form :class="page('form')" @submit.prevent="onRender">
        <header :class="page('form-head')">
          <h2 :class="page('panel-title')">Create new story</h2>
          <div :class="page('templates')">
            <Button type="button" variant="outline" size="small" @click="loadTemplate('short')">Short tryout</Button>
            <Button type="button" variant="outline" size="small" @click="loadTemplate('radio')">Radio story</Button>
          </div>
        </header>

        <div :class="page('two-col')">
          <InputText v-model="title" label="Title" placeholder="Story title" />
          <InputText v-model="language" label="Language" placeholder="en" />
        </div>

        <InputTextArea v-model="description" label="Description" :min-rows="2" :max-rows="6" :allow-resize="true" placeholder="Optional description" />

        <div :class="page('controls')">
          <label :class="page('label')">
            <span :class="page('label-text')">Voice</span>
            <select :class="page('select')" v-model="voice">
              <option v-for="option in voiceOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>
          <label :class="page('label')">
            <span :class="page('label-text')">Model</span>
            <select :class="page('select')" v-model="model">
              <option value="eleven_multilingual_v2">ElevenLabs multilingual v2</option>
              <option value="eleven_turbo_v2_5">ElevenLabs turbo v2.5</option>
              <option value="eleven_flash_v2_5">ElevenLabs flash v2.5</option>
              <option value="tts-1">OpenAI tts-1</option>
              <option value="tts-1-hd">OpenAI tts-1-hd</option>
              <option value="gpt-4o-mini-tts">OpenAI gpt-4o-mini-tts</option>
            </select>
          </label>
          <InputRange v-model="speed" :label="`Speed ${speed.toFixed(2)}x`" :min="0.5" :max="1.5" :step="0.05" />
        </div>

        <div :class="page('two-col')">
          <InputText v-model="category" label="Category" />
          <InputText v-model="tagsText" label="Tags" placeholder="comma, separated" />
        </div>

        <div :class="page('two-col')">
          <InputText v-model="coverMediaId" label="Cover media ID" placeholder="Optional media catalog id" />
          <label :class="page('label')">
            <span :class="page('label-text')">Target Radio album</span>
            <select :class="page('select')" v-model="targetAlbumId">
              <option value="">No album assigned</option>
              <option v-for="album in audioAlbums" :key="album.id" :value="album.id">{{ album.title }}</option>
            </select>
          </label>
        </div>

        <section :class="page('voice-grid')" aria-label="Voice samples">
          <article v-for="option in voiceOptions" :key="option.id" :class="page('voice-card', { active: voice === option.id })">
            <button type="button" :class="page('voice-button')" @click="voice = option.id">
              <strong>{{ option.label }}</strong>
              <span>{{ option.provider }} · {{ option.model }}</span>
            </button>
            <audio :src="audioSrc(option.sampleUrl)" controls />
          </article>
        </section>

        <section :class="page('segments')">
          <header :class="page('segments-header')">
            <h3 :class="page('segments-title')">Segments</h3>
            <Button type="button" variant="outline" size="small" @click="addSegment">Add segment</Button>
          </header>

          <article
            v-for="(item, index) in segments"
            :key="item.id"
            :class="segment('', { active: selectedSegmentId === item.id })"
            @click="selectedSegmentId = item.id"
          >
            <div :class="segment('header')">
              <strong :class="segment('label')">Segment {{ index + 1 }}</strong>
              <div :class="segment('actions')">
                <Button type="button" variant="ghost" size="small" @click.stop="duplicateSegment(item)">Copy</Button>
                <Button type="button" variant="ghost" size="small" :disabled="segments.length === 1" @click.stop="removeSegment(item.id)">Remove</Button>
              </div>
            </div>
            <InputTextArea v-model="item.text" :min-rows="3" :max-rows="8" :allow-resize="true" placeholder="Narration text…" />
            <InputRange v-model="item.pauseAfterMs" :label="`Pause after: ${item.pauseAfterMs}ms`" :min="0" :max="2000" :step="50" suffix="ms" />
            <Button
              type="button"
              variant="outline"
              size="small"
              :loading="tryoutLoading && selectedSegmentId === item.id"
              :disabled="tryoutLoading"
              @click.stop="onTryout(item)"
            >
              {{ tryoutLoading && selectedSegmentId === item.id ? 'Rendering…' : 'Try this segment' }}
            </Button>
          </article>
        </section>

        <p :class="page('meta')">{{ segments.length }} segments · {{ totalCharacters }} characters</p>
        <p v-if="formError" :class="page('error')">{{ formError }}</p>

        <div :class="page('actions')">
          <Button :loading="creatorLoading" :disabled="creatorLoading || !canRender" type="button" variant="outline" @click="onSaveCreatorDraft">
            {{ creatorLoading ? 'Saving draft…' : 'Save creator draft' }}
          </Button>
          <Button :loading="renderLoading" :disabled="renderLoading || !canRender" type="submit">
            {{ renderLoading ? 'Rendering full story…' : 'Render full story' }}
          </Button>
        </div>

        <p :class="page('hint')">Save keeps chapter/cover/album settings. Rendered stories appear in <button type="button" :class="page('inline-link')" @click="activeTab = 'drafts'">Drafts</button> until you promote them.</p>
      </form>

      <aside v-if="tryoutResult" :class="page('preview')">
        <h3 :class="page('panel-title')">Tryout</h3>
        <p :class="page('preview-meta')">{{ voice }} · {{ model }} · {{ speed.toFixed(2) }}×</p>
        <audio :class="page('preview-audio')" :src="audioSrc(tryoutResult.audioUrl)" controls />
      </aside>
    </section>
  </section>
</template>

<style lang="scss">
.story-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
    flex-wrap: wrap;
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

  &__tabs {
    display: flex;
    gap: var(--space-xs);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-xs);
    width: max-content;
  }

  &__tab {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-s);
    border: 0;
    background: transparent;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    font-weight: 500;
    border-radius: var(--border-radius-xs);
    cursor: pointer;

    &:hover {
      background: var(--admin-nav-hover);
      color: var(--admin-text);
    }

    &--active {
      background: var(--admin-nav-active);
      color: var(--admin-text);
    }
  }

  &__tab-count {
    color: var(--admin-text-muted);
    background: var(--admin-page-bg);
    border-radius: var(--border-radius-round);
    padding: 0 var(--space-xs);
    font-size: var(--font-size-xs);
  }

  &__error {
    color: var(--color-error);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  &__panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
    flex-wrap: wrap;
  }

  &__panel-intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__panel-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__panel-meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__empty {
    background: var(--admin-surface);
    border: 1px dashed var(--admin-border-strong);
    border-radius: var(--border-radius-s);
    padding: var(--space-l);
    text-align: center;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__inline-link {
    border: 0;
    background: transparent;
    color: var(--color-primary);
    font: inherit;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space) * 18), 1fr));
    gap: var(--space-s);
  }

  &__create {
    display: grid;
    grid-template-columns: minmax(0, 1fr) calc(var(--space) * 18);
    gap: var(--space-m);

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  &__form {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__form-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-s);
    flex-wrap: wrap;
  }

  &__templates {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  &__two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-s);
  }

  &__controls {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr;
    gap: var(--space-s);
  }

  &__voice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space) * 13), 1fr));
    gap: var(--space-xs);
  }

  &__voice-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
    background: var(--admin-page-bg);

    &--active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 1px var(--color-primary);
    }

    audio {
      width: 100%;
    }
  }

  &__voice-button {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    border: 0;
    background: transparent;
    color: var(--admin-text);
    text-align: left;
    cursor: pointer;
    padding: 0;

    span {
      color: var(--admin-text-muted);
      font-size: var(--font-size-xs);
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__label-text {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
  }

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

  &__segments {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__segments-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-m);
  }

  &__segments-title {
    font-size: var(--font-size-s);
    font-weight: 600;
    color: var(--admin-text);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__meta,
  &__hint {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
  }

  &__preview {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    align-self: start;
  }

  &__preview-meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__preview-audio {
    width: 100%;
  }

  @media (max-width: 980px) {
    &__two-col,
    &__controls {
      grid-template-columns: 1fr;
    }
  }
}

.story-card {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--border-radius-s);
  padding: var(--space-m);
  display: flex;
  flex-direction: column;
  gap: var(--space-s);

  &--draft {
    border-color: color-mix(in srgb, var(--color-warning), transparent 60%);
  }

  &__head {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    color: var(--admin-text);
    font-size: var(--font-size-m);
    font-weight: 600;
  }

  &__meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__description {
    color: var(--admin-text);
    font-size: var(--font-size-s);
    line-height: 1.4;
  }

  &__audio {
    width: 100%;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
}

.segment-card {
  border: 1px solid var(--admin-border);
  border-radius: var(--border-radius-s);
  padding: var(--space-s);
  background: var(--admin-page-bg);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-s);
  transition: border-color 0.12s ease;

  &:hover {
    border-color: var(--admin-border-strong);
  }

  &--active {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px var(--color-primary);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-s);
  }

  &__label {
    color: var(--admin-text);
    font-weight: 600;
    font-size: var(--font-size-s);
  }

  &__actions {
    display: flex;
    gap: var(--space-xs);
  }
}
</style>
