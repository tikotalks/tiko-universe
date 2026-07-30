<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText, InputTextArea } from '@sil/ui'
import type { MediaDetails } from './mediaTypes'

const props = withDefaults(defineProps<{
  /** What is being described, used for the modal subtitle. */
  name: string
  previewSrc?: string
  details: MediaDetails
  /** Known categories, offered as suggestions rather than a closed list. */
  categorySuggestions?: string[]
  tagSuggestions?: string[]
  saving?: boolean
}>(), {
  previewSrc: '',
  categorySuggestions: () => [],
  tagSuggestions: () => [],
  saving: false,
})

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'save', details: MediaDetails): void
}>()

const bemm = useBemm('media-details', { return: 'string', includeBaseClass: true })

const title = ref('')
const description = ref('')
const category = ref('')
const tags = ref<string[]>([])
const tagDraft = ref('')

watch(() => props.details, (details) => {
  title.value = details.title
  description.value = details.description
  category.value = details.category
  tags.value = [...details.tags]
  tagDraft.value = ''
}, { immediate: true, deep: true })

const suggestedTags = computed(() =>
  props.tagSuggestions.filter(tag => !tags.value.includes(tag)).slice(0, 12))

function addTag(value: string) {
  const trimmed = value.trim().replace(/,$/, '')
  if (!trimmed || tags.value.includes(trimmed)) return
  tags.value = [...tags.value, trimmed]
}

function commitTagDraft() {
  // A comma is the natural separator when pasting a list, so split on it too.
  for (const part of tagDraft.value.split(',')) addTag(part)
  tagDraft.value = ''
}

function removeTag(tag: string) {
  tags.value = tags.value.filter(existing => existing !== tag)
}

function onTagKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    commitTagDraft()
    return
  }
  // Backspace on an empty draft removes the last chip, as chip inputs usually do.
  if (event.key === 'Backspace' && !tagDraft.value) {
    tags.value = tags.value.slice(0, -1)
  }
}

function save() {
  // Don't silently drop a tag the user typed but never confirmed.
  commitTagDraft()
  emit('save', {
    title: title.value.trim(),
    description: description.value.trim(),
    category: category.value.trim(),
    tags: tags.value,
  })
}
</script>

<template>
  <div :class="bemm('')" @click.self="emit('close')">
    <div :class="bemm('panel')">
      <header :class="bemm('header')">
        <div :class="bemm('heading')">
          <h3 :class="bemm('title')">Edit details</h3>
          <p :class="bemm('subtitle')">{{ name }}</p>
        </div>
        <button type="button" :class="bemm('close')" aria-label="Close" @click="emit('close')">Close</button>
      </header>

      <div :class="bemm('body')">
        <img v-if="previewSrc" :class="bemm('preview')" :src="previewSrc" :alt="name" />

        <div :class="bemm('fields')">
          <InputText v-model="title" label="Title" placeholder="A short, descriptive name" />

          <InputTextArea
            v-model="description"
            label="Description"
            placeholder="What is in this image, in plain language"
            :min-rows="4"
          />

          <InputText v-model="category" label="Category" placeholder="e.g. animals" />
          <div v-if="categorySuggestions.length" :class="bemm('suggestions')">
            <button
              v-for="suggestion in categorySuggestions.slice(0, 10)"
              :key="suggestion"
              type="button"
              :class="bemm('suggestion', { active: suggestion === category })"
              @click="category = suggestion"
            >{{ suggestion }}</button>
          </div>

          <div :class="bemm('field')">
            <span :class="bemm('field-label')">Tags</span>
            <div :class="bemm('tags')">
              <span v-for="tag in tags" :key="tag" :class="bemm('tag')">
                {{ tag }}
                <button type="button" :class="bemm('tag-remove')" :aria-label="`Remove ${tag}`" @click="removeTag(tag)">×</button>
              </span>
              <input
                v-model="tagDraft"
                :class="bemm('tag-input')"
                placeholder="Add a tag…"
                @keydown="onTagKeydown"
                @blur="commitTagDraft"
              />
            </div>
            <div v-if="suggestedTags.length" :class="bemm('suggestions')">
              <button
                v-for="suggestion in suggestedTags"
                :key="suggestion"
                type="button"
                :class="bemm('suggestion')"
                @click="addTag(suggestion)"
              >+ {{ suggestion }}</button>
            </div>
          </div>
        </div>
      </div>

      <footer :class="bemm('footer')">
        <Button variant="outline" :disabled="saving" @click="emit('close')">Cancel</Button>
        <Button :loading="saving" :disabled="saving" @click="save">Save details</Button>
      </footer>
    </div>
  </div>
</template>

<style lang="scss">
@use '../../styles/mixins' as *;

.media-details {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  padding: var(--space-m);

  &__panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-m);
    width: 100%;
    max-width: 640px;
    max-height: 92vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-m);
    padding: var(--space-m);
    border-bottom: 1px solid var(--admin-border);
  }

  &__title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__subtitle {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 40ch;
  }

  &__close {
    border: 0;
    background: transparent;
    color: var(--admin-text-muted);
    font: inherit;
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--border-radius-xs);

    &:hover { background: var(--admin-nav-hover); color: var(--admin-text); }
  }

  &__body {
    display: flex;
    gap: var(--space-m);
    padding: var(--space-m);
  }

  &__preview {
    width: calc(var(--space) * 10);
    height: calc(var(--space) * 10);
    flex-shrink: 0;
    object-fit: cover;
    border-radius: var(--border-radius-m);
    @include checkeredBackground;
  }

  &__fields {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__field-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    align-items: center;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-m);
    padding: var(--space-xs) var(--space-s);
    background: var(--admin-page-bg);
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: color-mix(in srgb, var(--color-foreground), transparent 90%);
    border-radius: var(--border-radius-s);
    padding: 2px var(--space-xs) 2px var(--space-s);
    font-size: var(--font-size-xs);
    color: var(--admin-text);
  }

  &__tag-remove {
    border: 0;
    background: transparent;
    color: var(--admin-text-muted);
    cursor: pointer;
    font-size: var(--font-size-s);
    line-height: 1;
    padding: 0 2px;

    &:hover { color: var(--color-error); }
  }

  &__tag-input {
    flex: 1;
    min-width: 100px;
    border: 0;
    background: transparent;
    color: var(--admin-text);
    font: inherit;
    padding: var(--space-xs) 0;

    &:focus { outline: none; }
  }

  &__suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__suggestion {
    border: 1px solid var(--admin-border);
    background: transparent;
    color: var(--admin-text-muted);
    border-radius: var(--border-radius-s);
    padding: 1px var(--space-s);
    font-size: var(--font-size-xs);
    cursor: pointer;

    &:hover { background: var(--admin-surface-hover); color: var(--admin-text); }

    &--active {
      border-color: var(--color-primary);
      color: var(--admin-text);
    }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-s);
    padding: var(--space-m);
    border-top: 1px solid var(--admin-border);
  }

  @media (max-width: 640px) {
    &__body { flex-direction: column; }
    &__preview { width: 100%; height: auto; aspect-ratio: 1; }
  }
}
</style>
