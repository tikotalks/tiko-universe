<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, Icon } from '@sil/ui'
import StoryDraftsPanel from '../components/stories/StoryDraftsPanel.vue'
import StoryPublishSettingsCard from '../components/stories/StoryPublishSettingsCard.vue'
import StorySegmentsEditor from '../components/stories/StorySegmentsEditor.vue'
import StoryVoiceCard from '../components/stories/StoryVoiceCard.vue'
import { useStoryNarration, type StoryDraft, type StoryGalleryItem, type VoiceSample } from '../composables/useStoryNarration'
import { useAdminMediaLibrary, type AudioLibraryAlbum } from '../composables/useAdminMediaLibrary'
import type { StorySegmentInput, StoryTryoutResult } from '../types/admin'

type Tab = 'library' | 'drafts' | 'create'

const page = useBemm('story-page', { return: 'string', includeBaseClass: true })
const card = useBemm('story-card', { return: 'string', includeBaseClass: true })

const fallbackVoices = [
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel', provider: 'elevenlabs', model: 'eleven_multilingual_v2' },
  { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi', provider: 'elevenlabs', model: 'eleven_multilingual_v2' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella', provider: 'elevenlabs', model: 'eleven_multilingual_v2' },
]

const { tryout, render: renderStory, audioSrc, listStories, listVoices, createDraft, listDrafts, promoteStory, deleteStory } = useStoryNarration()
const { listAudioAlbums, list: listMedia, items: mediaItems, loading: mediaLoading, itemUrl } = useAdminMediaLibrary()

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
const coverMediaSearch = ref('')
const coverMediaOpen = ref(false)
const targetAlbumId = ref('')
const segments = ref<StorySegmentInput[]>([
  { id: crypto.randomUUID(), text: '', pauseAfterMs: 350 },
])
const selectedSegmentId = ref(segments.value[0].id)
const tryoutLoading = ref(false)
const renderLoading = ref(false)
const formError = ref<string | null>(null)
const tryoutResult = ref<StoryTryoutResult | null>(null)
const voicePreviewAudio = ref<HTMLAudioElement | null>(null)
const voicePreviewPlayingId = ref<string | null>(null)

const selectedSegment = computed(() => segments.value.find(s => s.id === selectedSegmentId.value) ?? segments.value[0])
const selectedSegmentText = computed({
  get: () => selectedSegment.value?.text ?? '',
  set: value => {
    const target = selectedSegment.value
    if (target) target.text = value
  },
})
const totalCharacters = computed(() => segments.value.reduce((sum, s) => sum + s.text.length, 0))
const canRender = computed(() => title.value.trim() && segments.value.some(s => s.text.trim()))
const voiceOptions = computed(() => {
  const selectedProvider = model.value.startsWith('eleven_') ? 'elevenlabs' : 'openai'
  const source = voiceSamples.value.length ? voiceSamples.value : fallbackVoices.map(item => ({ ...item, sampleUrl: `/v1/generation/voice-samples/${item.id}?provider=${item.provider}&model=${item.model}` }))
  return source.filter(option => option.provider === selectedProvider).map(option => ({ ...option, model: model.value }))
})

const selectedVoiceOption = computed(() => voiceOptions.value.find(option => option.id === voice.value))
const selectedPreviewAudioUrl = computed(() => tryoutResult.value?.audioUrl || selectedVoiceOption.value?.sampleUrl || '')
const selectedVoiceDescription = computed(() => {
  const label = selectedVoiceOption.value?.label || ''
  if (label.toLowerCase().includes('rachel')) return 'Warm, gentle, comforting'
  if (label.toLowerCase().includes('domi')) return 'Playful, bright, upbeat'
  if (label.toLowerCase().includes('bella')) return 'Soft, calm, soothing'
  return selectedVoiceOption.value?.provider === 'elevenlabs' ? 'Expressive child-friendly narration' : 'Clear narration voice'
})
const estimatedMinutes = computed(() => Math.max(1, Math.ceil(totalCharacters.value / 900)))
const selectedCoverMedia = computed(() => mediaItems.value.find(m => m.id === coverMediaId.value))

function parseTags(): string[] {
  return tagsText.value.split(',').map(tag => tag.trim()).filter(Boolean)
}

async function toggleCoverPicker() {
  coverMediaOpen.value = !coverMediaOpen.value
  if (coverMediaOpen.value && mediaItems.value.length === 0) {
    await listMedia({ type: 'image', limit: 40 })
  }
}

function selectCoverMedia(id: string) {
  coverMediaId.value = id
  coverMediaOpen.value = false
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

function previewVoice(option: { id: string; sampleUrl?: string }) {
  if (voicePreviewPlayingId.value === option.id) {
    voicePreviewAudio.value?.pause()
    voicePreviewPlayingId.value = null
    return
  }
  if (voicePreviewAudio.value) {
    voicePreviewAudio.value.pause()
  }
  const sampleUrl = option.sampleUrl || `/v1/generation/voice-samples/${option.id}?provider=elevenlabs&model=${model.value}`
  const audio = new Audio(sampleUrl)
  audio.addEventListener('ended', () => { voicePreviewPlayingId.value = null })
  audio.addEventListener('error', () => { voicePreviewPlayingId.value = null })
  voicePreviewAudio.value = audio
  voicePreviewPlayingId.value = option.id
  voice.value = option.id
  audio.play().catch(() => { voicePreviewPlayingId.value = null })
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

    <StoryDraftsPanel
      v-else-if="activeTab === 'drafts'"
      :saved-drafts="savedDrafts"
      :rendered-drafts="draftItems"
      :audio-albums="audioAlbums"
      :loading="galleryLoading"
      :audio-src="audioSrc"
      @reload="loadDrafts"
      @create="activeTab = 'create'"
      @promote="onPromote"
      @delete-rendered="onDelete($event, 'drafts')"
    />

    <section v-else :class="page('create')">
      <form :class="page('form')" @submit.prevent="onRender">
        <header :class="page('form-head')">
          <div :class="page('form-title-row')">
            <span :class="page('section-icon')" aria-hidden="true">
              <Icon name="media/music-note" size="small" />
            </span>
            <div :class="page('panel-intro')">
              <h2 :class="page('panel-title')">New story</h2>
              <p :class="page('panel-meta')">Write your story and bring it to life.</p>
            </div>
          </div>
          <div :class="page('templates')" role="group" aria-label="Story templates">
            <button type="button" :class="page('chip', { active: segments.length === 1 })" @click="loadTemplate('short')">Short tryout</button>
            <button type="button" :class="page('chip')" @click="loadTemplate('radio')">Radio story</button>
          </div>
        </header>

        <label :class="page('field')">
          <span :class="page('label-text')">Title</span>
          <span :class="page('input-wrap')">
            <input v-model="title" :class="page('input')" type="text" maxlength="120" placeholder="The Sleepy Turtle" />
            <span :class="page('counter')">{{ title.length }} / 120</span>
          </span>
        </label>

        <div :class="page('field')">
          <span :class="page('label-text')">Cover image</span>
          <div v-if="selectedCoverMedia" :class="page('cover-selected')">
            <img :src="itemUrl(selectedCoverMedia)" :alt="selectedCoverMedia.title || 'Cover'" :class="page('cover-thumb')" />
            <div :class="page('cover-info')">
              <strong>{{ selectedCoverMedia.title || selectedCoverMedia.file_name || 'Selected image' }}</strong>
              <button type="button" :class="page('text-action')" @click="coverMediaId = ''">Remove</button>
            </div>
          </div>
          <button v-else type="button" :class="page('upload')" @click="toggleCoverPicker">
            <Icon name="arrows/arrow-headed-upload" size="medium" />
            <strong>Select from media library</strong>
            <span>Choose an existing image</span>
          </button>
          <div v-if="coverMediaOpen" :class="page('cover-picker')">
            <input v-model="coverMediaSearch" :class="page('input')" type="text" placeholder="Search images…" @input="listMedia({ type: 'image', search: coverMediaSearch || undefined, limit: 40 })" />
            <div v-if="mediaLoading" :class="page('empty')">Loading media…</div>
            <div v-else-if="mediaItems.length === 0" :class="page('empty')">No images found in media library.</div>
            <div v-else :class="page('cover-grid')">
              <button v-for="item in mediaItems" :key="item.id" type="button" :class="page('cover-tile', { active: item.id === coverMediaId })" @click="selectCoverMedia(item.id)">
                <img :src="itemUrl(item)" :alt="item.title || item.file_name || ''" />
              </button>
            </div>
          </div>
        </div>

        <StorySegmentsEditor
          v-model:selected-segment-id="selectedSegmentId"
          v-model:selected-text="selectedSegmentText"
          :segments="segments"
          @add="addSegment"
          @duplicate="duplicateSegment"
          @remove="removeSegment"
        />

        <footer :class="page('form-meta')">
          <span><Icon name="ui/clock" size="small" /> Estimated length <strong>~{{ estimatedMinutes }} min</strong></span>
          <span>Characters <strong>{{ totalCharacters }}</strong></span>
        </footer>

        <p v-if="formError" :class="page('error')">{{ formError }}</p>
      </form>

      <aside :class="page('sidebar')">
        <StoryVoiceCard
          :voices="voiceOptions"
          :selected-voice-id="voice"
          :selected-description="selectedVoiceDescription"
          :playing-voice-id="voicePreviewPlayingId"
          @select="voice = $event"
          @preview="previewVoice"
        />

        <section :class="page('side-card')">
          <header :class="page('side-head')">
            <Icon name="media/headphones" size="small" />
            <div>
              <h3 :class="page('panel-title')">Preview</h3>
              <p :class="page('panel-meta')">Listen to how your story sounds.</p>
            </div>
          </header>
          <div :class="page('player')">
            <button type="button" :class="page('player-button')" :loading="tryoutLoading" :disabled="tryoutLoading || !selectedSegment.text.trim()" @click="onTryout()">
              <Icon name="media/playback-play" size="small" />
            </button>
            <span>0:00</span>
            <div :class="page('player-track')"><span></span></div>
            <span>2:48</span>
          </div>
          <audio v-if="selectedPreviewAudioUrl" :class="page('preview-audio')" :src="audioSrc(selectedPreviewAudioUrl)" controls />
        </section>

        <StoryPublishSettingsCard
          v-model:target-album-id="targetAlbumId"
          v-model:language="language"
          v-model:speed="speed"
          v-model:category="category"
          v-model:tags-text="tagsText"
          :audio-albums="audioAlbums"
        />
      </aside>

      <footer :class="page('footer-bar')">
        <Button :loading="creatorLoading" :disabled="creatorLoading || !canRender" type="button" variant="outline" @click="onSaveCreatorDraft">
          Save draft
        </Button>
        <Button :loading="tryoutLoading" :disabled="tryoutLoading || !selectedSegment.text.trim()" type="button" variant="outline" @click="onTryout()">
          Preview story
        </Button>
        <Button :loading="renderLoading" :disabled="renderLoading || !canRender" type="submit" @click="onRender">
          Render full story
        </Button>
        <p :class="page('hint')"><Icon name="misc/shield-check" size="small" /> Your draft is saved automatically.</p>
      </footer>
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
    border-radius: var(--admin-card-radius);
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
    border: 0;
    border-radius: var(--admin-card-radius);
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
    border: 0;
    border-radius: var(--admin-card-radius);
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

/* Reference-inspired Stories creator */
.story-page {
  max-width: min(calc(var(--space) * 62), 100%);
  margin: 0 auto;
  gap: calc(var(--space) * 1.2);

  &__header {
    max-width: calc(var(--space) * 34);
  }

  &__intro {
    position: relative;
    padding-left: calc(var(--space) * 2.8);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: calc(var(--space) * 0.2);
      width: calc(var(--space) * 1.9);
      height: calc(var(--space) * 1.9);
      border-radius: var(--border-radius-s);
      background: color-mix(in srgb, var(--color-foreground), transparent 88%);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-foreground), transparent 82%);
    }
  }

  &__title {
    font-size: clamp(2rem, 3vw, 2.8rem);
    line-height: 1;
    letter-spacing: 0;
  }

  &__subtitle {
    font-size: var(--font-size-m);
  }

  &__tabs {
    width: min(calc(var(--space) * 18), 100%);
    padding: 0;
    gap: 0;
    overflow: hidden;
    border-radius: var(--border-radius-s);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 5%);
  }

  &__tab {
    position: relative;
    flex: 1;
    justify-content: center;
    min-width: calc(var(--space) * 5.8);
    padding: var(--space-s) var(--space-m);
    border-radius: 0;

    &--active {
      background: color-mix(in srgb, var(--color-background), var(--color-foreground) 9%);

      &::after {
        content: '';
        position: absolute;
        left: 25%;
        right: 25%;
        bottom: 0;
        height: 2px;
        border-radius: 999px;
        background: currentColor;
      }
    }
  }

  &__tab-count {
    display: none;
  }

  &__create {
    grid-template-columns: minmax(0, 1.45fr) minmax(calc(var(--space) * 19), 0.95fr);
    grid-template-areas:
      'form sidebar'
      'footer footer';
    align-items: start;
    gap: var(--space-m);
  }

  &__form,
  &__side-card,
  &__footer-bar {
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 5%);
    border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 88%);
    border-radius: var(--border-radius-m);
    box-shadow: 0 24px 80px color-mix(in srgb, var(--color-foreground), transparent 95%);
  }

  &__form {
    grid-area: form;
    padding: 0;
    gap: 0;
    overflow: hidden;
  }

  &__form-head,
  &__field,
  &__editor,
  &__segments,
  &__form-meta,
  &__error {
    padding-left: calc(var(--space) * 1.35);
    padding-right: calc(var(--space) * 1.35);
  }

  &__form-head {
    padding-top: calc(var(--space) * 1.35);
    padding-bottom: var(--space-m);
  }

  &__form-title-row,
  &__side-head {
    display: flex;
    align-items: flex-start;
    gap: var(--space-s);
  }

  &__section-icon,
  &__side-head > .icon {
    width: calc(var(--space) * 1.8);
    height: calc(var(--space) * 1.8);
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: color-mix(in srgb, var(--color-foreground), transparent 12%);
    --icon-stroke-color: currentColor;
  }

  &__panel-title {
    font-size: var(--font-size-m);
    line-height: 1.1;
  }

  &__chip,
  &__add-paragraph,
  &__text-action {
    border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 88%);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 3%);
    color: var(--admin-text-muted);
    border-radius: 999px;
    padding: var(--space-xs) var(--space-s);
    font: inherit;
    font-size: var(--font-size-s);
    cursor: pointer;
  }

  &__chip--active,
  &__add-paragraph:hover,
  &__text-action:hover:not(:disabled) {
    color: var(--admin-text);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 10%);
  }

  &__field,
  &__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__input-wrap {
    position: relative;
    display: block;
  }

  &__input,
  &__select {
    min-height: calc(var(--space) * 2.35);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 2%);
    border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 86%);
    border-radius: var(--border-radius-s);
    color: var(--admin-text);
    -webkit-text-fill-color: var(--admin-text);
    padding: var(--space-s) var(--space-m);
  }

  &__input {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
  }

  &__counter {
    position: absolute;
    right: var(--space-s);
    top: 50%;
    transform: translateY(-50%);
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
  }

  &__upload {
    min-height: calc(var(--space) * 7.6);
    border: 1px dashed color-mix(in srgb, var(--color-foreground), transparent 72%);
    border-radius: var(--border-radius-m);
    background: color-mix(in srgb, var(--color-background), transparent 20%);
    color: var(--admin-text);
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--space-xs);
    cursor: pointer;

    .icon {
      color: var(--admin-text-muted);
      --icon-stroke-color: currentColor;
    }

    span {
      color: var(--admin-text-muted);
      font-size: var(--font-size-xs);
    }
  }

  &__cover-selected {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-s);
    border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 86%);
    border-radius: var(--border-radius-s);
  }

  &__cover-thumb {
    width: calc(var(--space) * 5);
    height: calc(var(--space) * 5);
    object-fit: cover;
    border-radius: var(--border-radius-xs);
  }

  &__cover-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);

    strong {
      color: var(--admin-text);
      font-size: var(--font-size-s);
    }
  }

  &__cover-picker {
    margin-top: var(--space-xs);
    border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 86%);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    max-height: calc(var(--space) * 25);
    overflow-y: auto;
  }

  &__cover-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space) * 5), 1fr));
    gap: var(--space-xs);
  }

  &__cover-tile {
    aspect-ratio: 1;
    border: 2px solid transparent;
    border-radius: var(--border-radius-xs);
    overflow: hidden;
    cursor: pointer;
    padding: 0;
    background: transparent;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &--active {
      border-color: var(--color-primary);
    }

    &:hover {
      border-color: color-mix(in srgb, var(--color-foreground), transparent 50%);
    }
  }

  &__editor {
    padding-top: var(--space-m);
  }

  &__editor :deep(.input-textarea__label) {
    display: none;
  }

  &__editor :deep(textarea) {
    min-height: calc(var(--space) * 15);
    line-height: 1.85;
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 2%);
  }

  &__add-paragraph {
    width: max-content;
    margin: var(--space-s) calc(var(--space) * 1.35);
    color: var(--admin-text);
  }

  &__segments {
    padding-bottom: var(--space-m);
  }

  &__form-meta {
    border-top: 1px solid color-mix(in srgb, var(--color-foreground), transparent 90%);
    padding-top: var(--space-m);
    padding-bottom: calc(var(--space) * 1.35);
    display: flex;
    justify-content: space-between;
    gap: var(--space-m);
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);

    span {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
    }

    strong {
      color: var(--admin-text);
      font-weight: 600;
    }
  }

  &__sidebar {
    grid-area: sidebar;
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  &__side-card {
    padding: calc(var(--space) * 1.25);
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  &__player-button {
    width: calc(var(--space) * 2.2);
    height: calc(var(--space) * 2.2);
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 78%);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 8%);
    color: var(--admin-text);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  &__player {
    min-height: calc(var(--space) * 3);
    border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 90%);
    border-radius: var(--border-radius-s);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 4%);
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-s);
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
  }

  &__player-track {
    flex: 1;
    height: 2px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-foreground), transparent 88%);

    span {
      display: block;
      width: 18%;
      height: 100%;
      border-radius: inherit;
      background: currentColor;
    }
  }

  &__footer-bar {
    grid-area: footer;
    padding: var(--space-m) calc(var(--space) * 1.35);
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--space-s);
    align-items: center;

    .button,
    .sil-button {
      border-radius: var(--border-radius-s);
      min-height: calc(var(--space) * 2.8);
    }
  }

  &__hint {
    grid-column: 1 / -1;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-xs);
  }

  @media (max-width: 1120px) {
    &__create {
      grid-template-columns: 1fr;
      grid-template-areas:
        'form'
        'sidebar'
        'footer';
    }
  }

  @media (max-width: 720px) {
    max-width: 100%;

    &__footer-bar {
      grid-template-columns: 1fr;
    }

    &__form-meta {
      flex-direction: column;
    }
  }
}

</style>
