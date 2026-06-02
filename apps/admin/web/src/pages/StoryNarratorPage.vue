<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputRange, InputText, InputTextArea } from '@sil/ui'
import { useStoryNarration } from '../composables/useStoryNarration'
import type { StoryRenderResult, StorySegmentInput, StoryTryoutResult } from '../types/admin'

const page = useBemm('story-narrator', { return: 'string', includeBaseClass: true })
const segment = useBemm('segment-card', { return: 'string', includeBaseClass: true })
const preview = useBemm('preview-card', { return: 'string', includeBaseClass: true })
const render = useBemm('render-result', { return: 'string', includeBaseClass: true })

const voices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse']

const { tryout, render: renderStory, audioSrc } = useStoryNarration()

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

const selectedSegment = computed(() => segments.value.find(s => s.id === selectedSegmentId.value) ?? segments.value[0])
const totalCharacters = computed(() => segments.value.reduce((sum, s) => sum + s.text.length, 0))
const canRender = computed(() => title.value.trim() && segments.value.some(s => s.text.trim()))

function tags(): string[] {
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
    error.value = 'Add text to the selected segment first.'
    return
  }
  tryoutLoading.value = true
  error.value = null
  try {
    tryoutResult.value = await tryout({
      text: target.text,
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
    const result = await renderStory({
      title: title.value,
      description: description.value,
      language: language.value,
      voice: voice.value,
      model: model.value,
      speed: speed.value,
      segments: segments.value.filter(s => s.text.trim()),
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
  <section :class="page('')">
    <header :class="page('header')">
      <div :class="page('intro')">
        <h1 :class="page('title')">Story narrator</h1>
        <p :class="page('subtitle')">Try voices segment-by-segment, then render the full story for Tiko Radio.</p>
      </div>
      <div :class="page('templates')">
        <Button variant="outline" size="small" @click="loadTemplate('short')">Short tryout</Button>
        <Button variant="outline" size="small" @click="loadTemplate('radio')">Radio story</Button>
      </div>
    </header>

    <div :class="page('layout')">
      <form :class="page('panel')" @submit.prevent="onRender">
        <div :class="page('two-col')">
          <InputText v-model="title" label="Title" placeholder="Story title" />
          <InputText v-model="language" label="Language" placeholder="en" />
        </div>

        <InputTextArea v-model="description" label="Description" :min-rows="2" :max-rows="6" :allow-resize="true" placeholder="Optional description" />

        <div :class="page('controls')">
          <label :class="page('label')">
            <span :class="page('label-text')">Voice</span>
            <select :class="page('select')" v-model="voice">
              <option v-for="option in voices" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label :class="page('label')">
            <span :class="page('label-text')">Model</span>
            <select :class="page('select')" v-model="model">
              <option value="tts-1">tts-1</option>
              <option value="tts-1-hd">tts-1-hd</option>
              <option value="gpt-4o-mini-tts">gpt-4o-mini-tts</option>
            </select>
          </label>
          <InputRange v-model="speed" :label="`Speed ${speed.toFixed(2)}x`" :min="0.5" :max="1.5" :step="0.05" />
        </div>

        <div :class="page('two-col')">
          <InputText v-model="category" label="Category" />
          <InputText v-model="tagsText" label="Tags" placeholder="comma, separated" />
        </div>

        <section :class="page('segments')">
          <header :class="page('segments-header')">
            <h2 :class="page('segments-title')">Segments</h2>
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
            <InputTextArea v-model="item.text" :min-rows="4" :max-rows="10" :allow-resize="true" placeholder="Narration text…" />
            <InputRange v-model="item.pauseAfterMs" :label="`Pause after: ${item.pauseAfterMs}ms`" :min="0" :max="2000" :step="50" suffix="ms" />
            <Button
              type="button"
              :loading="tryoutLoading && selectedSegmentId === item.id"
              :disabled="tryoutLoading"
              block
              @click.stop="onTryout(item)"
            >
              {{ tryoutLoading && selectedSegmentId === item.id ? 'Rendering…' : 'Try this segment' }}
            </Button>
          </article>
        </section>

        <p :class="page('meta')">{{ segments.length }} segments · {{ totalCharacters }} characters</p>
        <p v-if="error" :class="page('error')">{{ error }}</p>

        <Button :loading="renderLoading" :disabled="renderLoading || !canRender" type="submit" block>
          {{ renderLoading ? 'Rendering full story…' : 'Render full story' }}
        </Button>
      </form>

      <aside :class="page('preview')">
        <div :class="preview('')">
          <strong :class="preview('label')">Selected voice</strong>
          <p :class="preview('text')">{{ voice }} · {{ model }} · {{ speed.toFixed(2) }}×</p>
        </div>

        <div :class="preview('')">
          <strong :class="preview('label')">Tryout audio</strong>
          <audio v-if="tryoutResult" :class="preview('audio')" :src="audioSrc(tryoutResult.audioUrl)" controls />
          <p v-else :class="preview('text')">Try a segment to hear it here.</p>
        </div>

        <div :class="preview('')">
          <strong :class="preview('label')">Rendered stories</strong>
          <div v-if="renderResults.length === 0" :class="page('empty')">Full renders will appear here.</div>
          <article v-for="result in renderResults" :key="result.id" :class="render('')">
            <div :class="render('head')">
              <strong :class="render('title')">{{ result.title }}</strong>
              <p :class="render('meta')">{{ result.voice }} · {{ Math.round(result.fileSizeBytes / 1024) }} KB</p>
            </div>
            <audio :class="render('audio')" :src="audioSrc(result.audioUrl)" controls />
            <a :class="render('link')" :href="audioSrc(result.audioUrl)" target="_blank" rel="noreferrer">Open audio</a>
          </article>
        </div>
      </aside>
    </div>
  </section>
</template>

<style lang="scss">
.story-narrator {
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

  &__templates {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(calc(var(--space) * 18), 0.65fr);
    gap: var(--space-m);
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

  &__preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    align-content: start;
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
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__error {
    color: var(--color-error);
    font-size: var(--font-size-s);
  }

  &__empty {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    padding: var(--space-s) 0;
  }

  @media (max-width: 980px) {
    &__layout,
    &__two-col,
    &__controls {
      grid-template-columns: 1fr;
    }
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
  transition: border-color 0.12s ease, background 0.12s ease;

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

.preview-card {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--border-radius-s);
  padding: var(--space-m);
  display: flex;
  flex-direction: column;
  gap: var(--space-s);

  &__label {
    color: var(--admin-text);
    font-weight: 600;
    font-size: var(--font-size-s);
  }

  &__text {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__audio {
    width: 100%;
  }
}

.render-result {
  border-top: 1px solid var(--admin-border);
  padding-top: var(--space-s);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);

  &__head {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    color: var(--admin-text);
    font-weight: 600;
    font-size: var(--font-size-s);
  }

  &__meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
  }

  &__audio {
    width: 100%;
  }

  &__link {
    color: var(--color-primary);
    font-size: var(--font-size-s);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
