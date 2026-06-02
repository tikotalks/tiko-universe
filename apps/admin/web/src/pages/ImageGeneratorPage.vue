<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText, InputTextArea } from '@sil/ui'
import { useAdminAuth } from '../composables/useAdminAuth'
import { useImageGeneration } from '../composables/useImageGeneration'
import type { ImageGenerationResult } from '../types/admin'

const page = useBemm('image-generator', { return: 'string', includeBaseClass: true })
const card = useBemm('image-result', { return: 'string', includeBaseClass: true })

const { config } = useAdminAuth()
const { generateImage } = useImageGeneration()

const prompt = ref('')
const title = ref('')
const category = ref('generated')
const tagsText = ref('tiko, child-friendly')
const size = ref<'1024x1024' | '1024x1792' | '1792x1024'>('1024x1024')
const quality = ref<'standard' | 'hd'>('standard')
const style = ref<'vivid' | 'natural'>('vivid')
const loading = ref(false)
const error = ref<string | null>(null)
const results = ref<ImageGenerationResult[]>([])

const tikoStylePrompt = `
Use the Tiko visual style: warm, child-friendly, simple readable shapes, rounded forms, soft tactile surfaces, clear subject silhouette, cheerful but not chaotic, suitable for young children, no text, no logos, no scary details.
`.trim()

const fullPrompt = computed(() => {
  const base = prompt.value.trim()
  if (!base) return ''
  return `${base}\n\n${tikoStylePrompt}`
})

function tags(): string[] {
  return tagsText.value.split(',').map(t => t.trim()).filter(Boolean)
}

async function onGenerate() {
  if (!prompt.value.trim()) {
    error.value = 'Describe what image to generate first.'
    return
  }

  loading.value = true
  error.value = null
  try {
    const result = await generateImage({
      prompt: fullPrompt.value,
      title: title.value.trim() || undefined,
      category: category.value.trim() || 'generated',
      tags: tags(),
      size: size.value,
      quality: quality.value,
      style: style.value,
    })
    results.value.unshift(result)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Image generation failed.'
  } finally {
    loading.value = false
  }
}

function imageSrc(result: ImageGenerationResult): string {
  if (result.imageUrl.startsWith('http')) return result.imageUrl
  const base = config.value?.generationApiUrl ?? 'https://dev.api.tikotalks.com/v1/generation'
  return `${base.replace(/\/$/, '')}${result.imageUrl.replace('/v1/generation', '')}`
}

function download(result: ImageGenerationResult) {
  const link = document.createElement('a')
  link.href = imageSrc(result)
  link.download = `${result.id}.png`
  link.target = '_blank'
  link.click()
}

function useTemplate(kind: 'character' | 'scene' | 'object') {
  if (kind === 'character') {
    prompt.value = 'A friendly animal character for Tiko, standing clearly, expressive but simple, centered on a plain soft background.'
    category.value = 'characters'
    tagsText.value = 'tiko, character, animal, child-friendly'
  }
  if (kind === 'scene') {
    prompt.value = 'A calm story scene for Tiko Radio with one clear focal subject and a cozy environment children can understand.'
    category.value = 'story-scenes'
    tagsText.value = 'tiko, story, radio, scene, child-friendly'
  }
  if (kind === 'object') {
    prompt.value = 'A single everyday object for a child learning app, isolated, clear, recognizable, simple shape.'
    category.value = 'objects'
    tagsText.value = 'tiko, object, learning, child-friendly'
  }
}
</script>

<template>
  <section :class="page('')">
    <header :class="page('header')">
      <div :class="page('intro')">
        <h1 :class="page('title')">Image generator</h1>
        <p :class="page('subtitle')">Create Tiko-style images. Generated images stay in a draft pool until you promote them.</p>
      </div>
      <div :class="page('templates')">
        <Button variant="outline" size="small" @click="useTemplate('character')">Character</Button>
        <Button variant="outline" size="small" @click="useTemplate('scene')">Story scene</Button>
        <Button variant="outline" size="small" @click="useTemplate('object')">Object</Button>
      </div>
    </header>

    <div :class="page('layout')">
      <form :class="page('form')" @submit.prevent="onGenerate">
        <InputTextArea
          v-model="prompt"
          label="Prompt"
          :min-rows="6"
          :max-rows="12"
          :allow-resize="true"
          placeholder="Describe the image to generate…"
        />

        <details :class="page('style-info')" open>
          <summary :class="page('style-summary')">Tiko style suffix</summary>
          <p :class="page('style-body')">{{ tikoStylePrompt }}</p>
        </details>

        <InputText v-model="title" label="Title" placeholder="Optional media title" />

        <div :class="page('two-col')">
          <InputText v-model="category" label="Category" />
          <InputText v-model="tagsText" label="Tags" placeholder="comma, separated" />
        </div>

        <div :class="page('controls')">
          <label :class="page('label')">
            <span :class="page('label-text')">Size</span>
            <select :class="page('select')" v-model="size">
              <option value="1024x1024">Square</option>
              <option value="1024x1792">Portrait</option>
              <option value="1792x1024">Landscape</option>
            </select>
          </label>
          <label :class="page('label')">
            <span :class="page('label-text')">Quality</span>
            <select :class="page('select')" v-model="quality">
              <option value="standard">Standard</option>
              <option value="hd">HD</option>
            </select>
          </label>
          <label :class="page('label')">
            <span :class="page('label-text')">Style</span>
            <select :class="page('select')" v-model="style">
              <option value="vivid">Vivid</option>
              <option value="natural">Natural</option>
            </select>
          </label>
        </div>

        <p v-if="error" :class="page('error')">{{ error }}</p>

        <Button :loading="loading" :disabled="loading" type="submit" block>
          {{ loading ? 'Generating…' : 'Generate image' }}
        </Button>
      </form>

      <section :class="page('results')">
        <div v-if="results.length === 0" :class="page('empty')">
          Generated images will appear here.
        </div>
        <article v-for="result in results" :key="result.id" :class="card('')">
          <img :class="card('image')" :src="imageSrc(result)" :alt="result.prompt" />
          <div :class="card('body')">
            <strong :class="card('meta')">{{ result.size }} · {{ result.quality }} · {{ result.style }}</strong>
            <p :class="card('prompt')">{{ result.revisedPrompt || result.prompt }}</p>
            <div :class="card('actions')">
              <Button variant="outline" size="small" @click="download(result)">Download</Button>
              <Button variant="ghost" size="small" :href="imageSrc(result)" target="_blank" rel="noreferrer">Open</Button>
            </div>
          </div>
        </article>
      </section>
    </div>
  </section>
</template>

<style lang="scss">
.image-generator {
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
    grid-template-columns: minmax(0, 1fr) minmax(calc(var(--space) * 18), 0.8fr);
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

  &__style-info {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
  }

  &__style-summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--admin-text);
  }

  &__style-body {
    line-height: 1.45;
    padding-top: var(--space-xs);
  }

  &__two-col,
  &__controls {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-s);

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  &__controls {
    grid-template-columns: repeat(3, 1fr);
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

  &__error {
    color: var(--color-error);
    font-size: var(--font-size-s);
  }

  &__results {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__empty {
    min-height: calc(var(--space) * 16);
    display: grid;
    place-items: center;
    color: var(--admin-text-muted);
    text-align: center;
    background: var(--admin-surface);
    border: 1px dashed var(--admin-border-strong);
    border-radius: var(--border-radius-s);
    padding: var(--space-l);
    font-size: var(--font-size-s);
  }
}

.image-result {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--border-radius-s);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &__image {
    width: 100%;
    display: block;
    aspect-ratio: 1;
    object-fit: cover;
    background: color-mix(in srgb, var(--color-foreground), transparent 92%);
  }

  &__body {
    padding: var(--space-s);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__prompt {
    color: var(--admin-text);
    font-size: var(--font-size-s);
    line-height: 1.4;
    max-height: calc(var(--space) * 6);
    overflow: auto;
  }

  &__actions {
    display: flex;
    gap: var(--space-s);
    align-items: center;
  }
}
</style>
