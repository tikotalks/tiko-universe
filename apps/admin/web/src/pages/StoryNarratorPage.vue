<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStoryNarration } from '../composables/useStoryNarration'
import type { StoryRenderResult, StorySegmentInput, StoryTryoutResult } from '../types/admin'

const voices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse']

const { tryout, render, audioSrc } = useStoryNarration()

const title = ref('')
const description = ref('')
const language = ref('en')
const voice = ref('nova')
const model = ref('tts-1')
const speed = ref(1)
const category = ref('story')
const tagsText = ref('tiko-radio, story')
const segments = ref<StorySegmentInput[]>([
  { id: crypto.randomUUID(), text: '', pauseAfterMs: 350 },
])
const selectedSegmentId = ref(segments.value[0].id)
const tryoutLoading = ref(false)
const renderLoading = ref(false)
const error = ref<string | null>(null)
const tryoutResult = ref<StoryTryoutResult | null>(null)
const renderResults = ref<StoryRenderResult[]>([])

const selectedSegment = computed(() => segments.value.find(segment => segment.id === selectedSegmentId.value) ?? segments.value[0])
const totalCharacters = computed(() => segments.value.reduce((sum, segment) => sum + segment.text.length, 0))
const canRender = computed(() => title.value.trim() && segments.value.some(segment => segment.text.trim()))

function tags(): string[] {
  return tagsText.value.split(',').map(tag => tag.trim()).filter(Boolean)
}

function addSegment() {
  const segment = { id: crypto.randomUUID(), text: '', pauseAfterMs: 350 }
  segments.value.push(segment)
  selectedSegmentId.value = segment.id
}

function removeSegment(id: string) {
  if (segments.value.length === 1) return
  segments.value = segments.value.filter(segment => segment.id !== id)
  if (selectedSegmentId.value === id) selectedSegmentId.value = segments.value[0].id
}

function duplicateSegment(segment: StorySegmentInput) {
  const copy = { ...segment, id: crypto.randomUUID() }
  const index = segments.value.findIndex(item => item.id === segment.id)
  segments.value.splice(index + 1, 0, copy)
  selectedSegmentId.value = copy.id
}

async function onTryout(segment = selectedSegment.value) {
  if (!segment?.text.trim()) {
    error.value = 'Add text to the selected segment first.'
    return
  }
  tryoutLoading.value = true
  error.value = null
  try {
    tryoutResult.value = await tryout({
      text: segment.text,
      language: language.value,
      voice: voice.value,
      model: model.value,
      speed: speed.value,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Tryout failed.'
  } finally {
    tryoutLoading.value = false
  }
}

async function onRender() {
  if (!canRender.value) {
    error.value = 'Add a title and at least one segment first.'
    return
  }
  renderLoading.value = true
  error.value = null
  try {
    const result = await render({
      title: title.value,
      description: description.value,
      language: language.value,
      voice: voice.value,
      model: model.value,
      speed: speed.value,
      segments: segments.value.filter(segment => segment.text.trim()),
      category: category.value,
      tags: tags(),
    })
    renderResults.value.unshift(result)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Story render failed.'
  } finally {
    renderLoading.value = false
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
</script>

<template>
  <section class="story-narrator">
    <header class="story-narrator__header">
      <div>
        <h1>Story Narrator</h1>
        <p>Try voices segment-by-segment, then render the full story for Tiko Radio.</p>
      </div>
      <div class="story-narrator__templates">
        <button @click="loadTemplate('short')">Short tryout</button>
        <button @click="loadTemplate('radio')">Radio story</button>
      </div>
    </header>

    <div class="story-narrator__layout">
      <form class="story-narrator__panel" @submit.prevent="onRender">
        <div class="story-narrator__two-col">
          <label class="story-narrator__field">
            <span>Title</span>
            <input v-model="title" placeholder="Story title" />
          </label>
          <label class="story-narrator__field">
            <span>Language</span>
            <input v-model="language" placeholder="en" />
          </label>
        </div>

        <label class="story-narrator__field">
          <span>Description</span>
          <textarea v-model="description" rows="2" placeholder="Optional description" />
        </label>

        <div class="story-narrator__controls">
          <label class="story-narrator__field">
            <span>Voice</span>
            <select v-model="voice">
              <option v-for="option in voices" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label class="story-narrator__field">
            <span>Model</span>
            <select v-model="model">
              <option value="tts-1">tts-1</option>
              <option value="tts-1-hd">tts-1-hd</option>
              <option value="gpt-4o-mini-tts">gpt-4o-mini-tts</option>
            </select>
          </label>
          <label class="story-narrator__field">
            <span>Speed {{ speed.toFixed(2) }}×</span>
            <input v-model.number="speed" type="range" min="0.5" max="1.5" step="0.05" />
          </label>
        </div>

        <div class="story-narrator__two-col">
          <label class="story-narrator__field">
            <span>Category</span>
            <input v-model="category" />
          </label>
          <label class="story-narrator__field">
            <span>Tags</span>
            <input v-model="tagsText" placeholder="comma, separated" />
          </label>
        </div>

        <section class="segments">
          <header>
            <h2>Segments</h2>
            <button type="button" @click="addSegment">+ Add segment</button>
          </header>

          <article
            v-for="(segment, index) in segments"
            :key="segment.id"
            class="segment-card"
            :class="{ 'segment-card--active': selectedSegmentId === segment.id }"
            @click="selectedSegmentId = segment.id"
          >
            <div class="segment-card__header">
              <strong>Segment {{ index + 1 }}</strong>
              <div>
                <button type="button" @click.stop="duplicateSegment(segment)">Copy</button>
                <button type="button" :disabled="segments.length === 1" @click.stop="removeSegment(segment.id)">Remove</button>
              </div>
            </div>
            <textarea v-model="segment.text" rows="4" placeholder="Narration text…" />
            <label class="story-narrator__field story-narrator__field--compact">
              <span>Pause after: {{ segment.pauseAfterMs }}ms</span>
              <input v-model.number="segment.pauseAfterMs" type="range" min="0" max="2000" step="50" />
            </label>
            <button type="button" class="segment-card__try" :disabled="tryoutLoading" @click.stop="onTryout(segment)">
              {{ tryoutLoading && selectedSegmentId === segment.id ? 'Rendering…' : 'Try this segment' }}
            </button>
          </article>
        </section>

        <p class="story-narrator__meta">{{ segments.length }} segments · {{ totalCharacters }} characters</p>
        <p v-if="error" class="story-narrator__error">{{ error }}</p>

        <button class="story-narrator__submit" :disabled="renderLoading || !canRender" type="submit">
          {{ renderLoading ? 'Rendering full story…' : 'Render full story' }}
        </button>
      </form>

      <aside class="story-narrator__panel story-narrator__preview">
        <h2>Preview</h2>
        <section class="preview-card">
          <strong>Selected voice</strong>
          <p>{{ voice }} · {{ model }} · {{ speed.toFixed(2) }}×</p>
        </section>

        <section class="preview-card">
          <strong>Tryout audio</strong>
          <audio v-if="tryoutResult" :src="audioSrc(tryoutResult.audioUrl)" controls />
          <p v-else>Try a segment to hear it here.</p>
        </section>

        <section class="preview-card">
          <strong>Rendered stories</strong>
          <div v-if="renderResults.length === 0" class="story-narrator__empty">Full renders will appear here.</div>
          <article v-for="result in renderResults" :key="result.id" class="render-result">
            <div>
              <strong>{{ result.title }}</strong>
              <p>{{ result.voice }} · {{ Math.round(result.fileSizeBytes / 1024) }} KB</p>
            </div>
            <audio :src="audioSrc(result.audioUrl)" controls />
            <a :href="audioSrc(result.audioUrl)" target="_blank" rel="noreferrer">Open audio</a>
          </article>
        </section>
      </aside>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.story-narrator {
  &__header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 1rem;

    h1 { margin: 0; font-size: 1.4rem; }
    p { margin: 0.25rem 0 0; color: var(--tiko-admin-muted); }
  }

  &__templates {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;

    button { border: 1px solid var(--tiko-admin-border); border-radius: 999px; background: var(--color-background); color: var(--color-foreground); padding: 0.4rem 0.75rem; cursor: pointer; }
  }

  &__layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.65fr); gap: 1rem; }
  &__panel { border: 1px solid var(--tiko-admin-border); border-radius: 1rem; background: var(--tiko-admin-card); padding: 1rem; }
  &__field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.75rem; }
  &__field--compact { margin: 0.5rem 0; }
  &__two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  &__controls { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 0.75rem; }
  &__meta { color: var(--tiko-admin-muted); font-size: 0.85rem; }
  &__error { color: var(--color-error); font-size: 0.85rem; }
  &__submit { width: 100%; border: none; border-radius: 999px; padding: 0.8rem 1rem; background: var(--tiko-app-primary); color: var(--tiko-app-primary-text); font-weight: 800; cursor: pointer; }
  &__submit:disabled { opacity: 0.55; cursor: not-allowed; }
  &__empty { color: var(--tiko-admin-muted); font-size: 0.85rem; padding: 0.75rem 0; }

  textarea,
  input,
  select { width: 100%; box-sizing: border-box; border: 1px solid var(--tiko-admin-border); border-radius: 0.7rem; padding: 0.65rem 0.75rem; background: var(--color-background); color: var(--color-foreground); font: inherit; }
  textarea { resize: vertical; line-height: 1.45; }

  @media (max-width: 980px) {
    &__layout,
    &__two-col,
    &__controls { grid-template-columns: 1fr; }
  }
}

.segments {
  header { display: flex; justify-content: space-between; align-items: center; margin: 1rem 0 0.5rem; }
  h2 { margin: 0; font-size: 1rem; }
  header button { border: 1px solid var(--tiko-admin-border); border-radius: 999px; background: transparent; color: var(--color-foreground); padding: 0.4rem 0.75rem; cursor: pointer; }
}

.segment-card {
  border: 1px solid var(--tiko-admin-border);
  border-radius: 0.85rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background: color-mix(in srgb, var(--color-background), transparent 10%);
  cursor: pointer;

  &--active { border-color: var(--tiko-app-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--tiko-app-primary), transparent 78%); }
  &__header { display: flex; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.5rem; }
  &__header button,
  &__try { border: 1px solid var(--tiko-admin-border); border-radius: 999px; background: transparent; color: var(--color-foreground); padding: 0.35rem 0.6rem; cursor: pointer; }
  &__try { width: 100%; margin-top: 0.35rem; }
}

.preview-card {
  border: 1px solid var(--tiko-admin-border);
  border-radius: 0.85rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background: var(--color-background);

  p { color: var(--tiko-admin-muted); margin: 0.35rem 0; }
  audio { width: 100%; margin-top: 0.5rem; }
}

.render-result {
  border-top: 1px solid var(--tiko-admin-border);
  padding-top: 0.75rem;
  margin-top: 0.75rem;

  p { margin: 0.25rem 0; color: var(--tiko-admin-muted); font-size: 0.82rem; }
  a { color: var(--tiko-app-primary); font-size: 0.85rem; }
}
</style>
