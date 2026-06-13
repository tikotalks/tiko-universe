<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText, InputTextArea } from '@sil/ui'
import type { GenerateInput, TikoStyle } from './imageGenerationQueueTypes'

const emit = defineEmits<{
  (event: 'submit', input: GenerateInput): void
  (event: 'view-drafts'): void
}>()

const form = useBemm('image-create-form', { return: 'string', includeBaseClass: true })

const prompt = ref('')
const title = ref('')
const category = ref('generated')
const tagsText = ref('tiko, child-friendly')
const size = ref<'1024x1024' | '1024x1792' | '1792x1024'>('1024x1024')
const quality = ref<'standard' | 'hd'>('standard')
const tikoStyle = ref<TikoStyle>('tiko-v2')
const previewCount = ref(4)

const tikoStylePrompt = `
Use the Tiko visual style: warm, child-friendly, simple readable shapes, rounded forms, soft tactile surfaces, clear subject silhouette, cheerful but not chaotic, suitable for young children, no text, no logos, no scary details.
`.trim()

const fullPrompt = computed(() => {
  const base = prompt.value.trim()
  if (!base) return ''
  return `${base}\n\n${tikoStylePrompt}`
})

function parseTags(): string[] {
  return tagsText.value.split(',').map(t => t.trim()).filter(Boolean)
}

function submit() {
  if (!prompt.value.trim()) return
  emit('submit', {
    type: 'generate',
    prompt: fullPrompt.value,
    title: title.value.trim() || undefined,
    category: category.value.trim() || 'generated',
    tags: parseTags(),
    size: size.value,
    quality: quality.value,
    tikoStyle: tikoStyle.value,
    count: previewCount.value,
  })
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
  <form :class="form('')" @submit.prevent="submit">
    <header :class="form('head')">
      <h2 :class="form('title')">Create new image</h2>
      <div :class="form('templates')">
        <Button type="button" variant="outline" size="small" @click="useTemplate('character')">Character</Button>
        <Button type="button" variant="outline" size="small" @click="useTemplate('scene')">Scene</Button>
        <Button type="button" variant="outline" size="small" @click="useTemplate('object')">Object</Button>
      </div>
    </header>

    <InputTextArea
      v-model="prompt"
      label="Prompt"
      :min-rows="6"
      :max-rows="12"
      :allow-resize="true"
      placeholder="Describe the image to generate..."
    />

    <details :class="form('style-info')" open>
      <summary :class="form('style-summary')">Tiko style suffix</summary>
      <p :class="form('style-body')">{{ tikoStylePrompt }}</p>
    </details>

    <InputText v-model="title" label="Title" placeholder="Optional media title" />

    <div :class="form('two-col')">
      <InputText v-model="category" label="Category" />
      <InputText v-model="tagsText" label="Tags" placeholder="comma, separated" />
    </div>

    <div :class="form('controls')">
      <label :class="form('label')">
        <span :class="form('label-text')">Style</span>
        <select v-model="tikoStyle" :class="form('select')">
          <option value="tiko-original">Tiko Original</option>
          <option value="tiko-v2">Tiko V2</option>
          <option value="tiko-natural">Tiko Natural</option>
        </select>
      </label>
      <label :class="form('label')">
        <span :class="form('label-text')">Previews</span>
        <select v-model.number="previewCount" :class="form('select')">
          <option :value="1">1</option>
          <option :value="2">2</option>
          <option :value="3">3</option>
          <option :value="4">4</option>
          <option :value="6">6</option>
          <option :value="8">8</option>
        </select>
      </label>
      <label :class="form('label')">
        <span :class="form('label-text')">Size</span>
        <select v-model="size" :class="form('select')">
          <option value="1024x1024">Square</option>
          <option value="1024x1792">Portrait</option>
          <option value="1792x1024">Landscape</option>
        </select>
      </label>
    </div>

    <Button :disabled="!prompt.trim()" type="submit" block>Add to queue</Button>

    <p :class="form('hint')">
      Generates {{ previewCount }} preview{{ previewCount > 1 ? 's' : '' }} in
      <button type="button" :class="form('inline-link')" @click="emit('view-drafts')">Drafts</button>.
      Pick one and Upscale it to full quality.
    </p>
  </form>
</template>

<style lang="scss">
.image-create-form {
  background: var(--admin-surface);
  border: 0;
  border-radius: var(--admin-card-radius);
  padding: var(--space-m);
  display: flex;
  flex-direction: column;
  gap: var(--space-s);

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-s);
    flex-wrap: wrap;
  }

  &__title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__templates {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
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

  &__hint {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
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
}
</style>
