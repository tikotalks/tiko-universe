<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAdminAuth } from '../composables/useAdminAuth'
import { useImageGeneration } from '../composables/useImageGeneration'
import type { ImageGenerationResult } from '../types/admin'

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
  const base = config.value?.generationApiUrl ?? 'https://dev.api.tikoapi.org/v1/generation'
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
  <section class="image-generator">
    <header class="image-generator__header">
      <div>
        <h1>Image Generator</h1>
        <p>Create Tiko-style images and save them into generated media.</p>
      </div>
      <div class="image-generator__templates">
        <button @click="useTemplate('character')">Character</button>
        <button @click="useTemplate('scene')">Story scene</button>
        <button @click="useTemplate('object')">Object</button>
      </div>
    </header>

    <div class="image-generator__layout">
      <form class="image-generator__form" @submit.prevent="onGenerate">
        <label class="image-generator__field">
          <span>Prompt</span>
          <textarea
            v-model="prompt"
            rows="6"
            placeholder="Describe the image to generate…"
          />
        </label>

        <details class="image-generator__style" open>
          <summary>Tiko style suffix</summary>
          <p>{{ tikoStylePrompt }}</p>
        </details>

        <label class="image-generator__field">
          <span>Title</span>
          <input v-model="title" placeholder="Optional media title" />
        </label>

        <div class="image-generator__two-col">
          <label class="image-generator__field">
            <span>Category</span>
            <input v-model="category" />
          </label>
          <label class="image-generator__field">
            <span>Tags</span>
            <input v-model="tagsText" placeholder="comma, separated" />
          </label>
        </div>

        <div class="image-generator__controls">
          <label class="image-generator__field">
            <span>Size</span>
            <select v-model="size">
              <option value="1024x1024">Square</option>
              <option value="1024x1792">Portrait</option>
              <option value="1792x1024">Landscape</option>
            </select>
          </label>
          <label class="image-generator__field">
            <span>Quality</span>
            <select v-model="quality">
              <option value="standard">Standard</option>
              <option value="hd">HD</option>
            </select>
          </label>
          <label class="image-generator__field">
            <span>Style</span>
            <select v-model="style">
              <option value="vivid">Vivid</option>
              <option value="natural">Natural</option>
            </select>
          </label>
        </div>

        <p v-if="error" class="image-generator__error">{{ error }}</p>

        <button class="image-generator__submit" :disabled="loading" type="submit">
          {{ loading ? 'Generating…' : 'Generate image' }}
        </button>
      </form>

      <section class="image-generator__results">
        <div v-if="results.length === 0" class="image-generator__empty">
          Generated images will appear here.
        </div>
        <article v-for="result in results" :key="result.id" class="image-result">
          <img :src="imageSrc(result)" :alt="result.prompt" />
          <div class="image-result__body">
            <strong>{{ result.size }} · {{ result.quality }} · {{ result.style }}</strong>
            <p>{{ result.revisedPrompt || result.prompt }}</p>
            <div class="image-result__actions">
              <button @click="download(result)">↓ Download</button>
              <a :href="imageSrc(result)" target="_blank" rel="noreferrer">Open</a>
            </div>
          </div>
        </article>
      </section>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.image-generator {
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

    button {
      border: 1px solid var(--tiko-admin-border);
      border-radius: 999px;
      background: var(--color-background);
      color: var(--color-foreground);
      padding: 0.4rem 0.75rem;
      cursor: pointer;
    }
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.8fr);
    gap: 1rem;

    @media (max-width: 900px) { grid-template-columns: 1fr; }
  }

  &__form,
  &__results {
    border: 1px solid var(--tiko-admin-border);
    border-radius: 1rem;
    background: var(--tiko-admin-card);
    padding: 1rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  textarea,
  input,
  select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--tiko-admin-border);
    border-radius: 0.7rem;
    padding: 0.65rem 0.75rem;
    background: var(--color-background);
    color: var(--color-foreground);
    font: inherit;
  }

  textarea { resize: vertical; line-height: 1.45; }

  &__style {
    margin-bottom: 0.75rem;
    color: var(--tiko-admin-muted);
    font-size: 0.82rem;

    summary { cursor: pointer; font-weight: 700; color: var(--color-foreground); }
    p { margin: 0.4rem 0 0; line-height: 1.45; }
  }

  &__two-col,
  &__controls {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;

    @media (max-width: 640px) { grid-template-columns: 1fr; }
  }

  &__controls { grid-template-columns: repeat(3, 1fr); }

  &__error {
    color: var(--color-error);
    font-size: 0.85rem;
  }

  &__submit {
    width: 100%;
    border: none;
    border-radius: 999px;
    padding: 0.8rem 1rem;
    background: var(--tiko-app-primary);
    color: var(--tiko-app-primary-text);
    font-weight: 800;
    cursor: pointer;

    &:disabled { opacity: 0.6; cursor: wait; }
  }

  &__empty {
    min-height: 16rem;
    display: grid;
    place-items: center;
    color: var(--tiko-admin-muted);
    text-align: center;
  }
}

.image-result {
  overflow: hidden;
  border: 1px solid var(--tiko-admin-border);
  border-radius: 1rem;
  background: var(--color-background);
  margin-bottom: 1rem;

  img {
    width: 100%;
    display: block;
    aspect-ratio: 1;
    object-fit: cover;
    background: color-mix(in srgb, var(--color-foreground), transparent 92%);
  }

  &__body {
    padding: 0.75rem;

    p {
      color: var(--tiko-admin-muted);
      font-size: 0.8rem;
      line-height: 1.4;
      max-height: 5.5rem;
      overflow: auto;
    }
  }

  &__actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;

    button,
    a {
      border: 1px solid var(--tiko-admin-border);
      border-radius: 999px;
      padding: 0.4rem 0.75rem;
      background: transparent;
      color: var(--color-foreground);
      text-decoration: none;
      font-size: 0.82rem;
      cursor: pointer;
    }
  }
}
</style>
