<script setup lang="ts">
import { useBemm } from 'bemm'
import { Button, InputTextArea } from '@sil/ui'
import type { StorySegmentInput } from '../../types/admin'

const props = defineProps<{
  segments: StorySegmentInput[]
  selectedSegmentId: string
  selectedText: string
}>()

const emit = defineEmits<{
  (event: 'update:selectedSegmentId', id: string): void
  (event: 'update:selectedText', text: string): void
  (event: 'add'): void
  (event: 'duplicate', segment: StorySegmentInput): void
  (event: 'remove', id: string): void
}>()

const bemm = useBemm('story-segments-editor', { return: 'string', includeBaseClass: true })
const segment = useBemm('story-segment-card', { return: 'string', includeBaseClass: true })

function updateSelectedText(value: unknown) {
  emit('update:selectedText', typeof value === 'string' || typeof value === 'number' ? String(value) : '')
}

function selectSegment(id: string) {
  emit('update:selectedSegmentId', id)
}
</script>

<template>
  <section :class="bemm('editor')" aria-label="Story text editor">
    <InputTextArea
      :model-value="selectedText"
      label="Story text"
      :min-rows="10"
      :max-rows="18"
      :allow-resize="true"
      placeholder="Once upon a time..."
      @update:model-value="updateSelectedText"
    />
  </section>

  <Button type="button" variant="outline" :class="bemm('add-paragraph')" @click="emit('add')">
    Add paragraph
  </Button>

  <section :class="bemm('segments')" aria-label="Story paragraphs">
    <article
      v-for="(item, index) in props.segments"
      :key="item.id"
      :class="segment('', { active: selectedSegmentId === item.id })"
      @click="selectSegment(item.id)"
    >
      <div :class="segment('header')">
        <strong :class="segment('label')">Paragraph {{ index + 1 }}</strong>
        <div :class="segment('actions')">
          <button type="button" :class="bemm('text-action')" @click.stop="emit('duplicate', item)">Copy</button>
          <button
            type="button"
            :class="bemm('text-action')"
            :disabled="props.segments.length === 1"
            @click.stop="emit('remove', item.id)"
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  </section>
</template>

<style lang="scss">
.story-segments-editor {
  &__editor {
    display: flex;
    flex-direction: column;
  }

  &__add-paragraph {
    align-self: flex-start;
  }

  &__segments {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__text-action {
    border: 0;
    background: transparent;
    color: var(--color-primary);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    padding: 0;

    &:disabled {
      cursor: not-allowed;
      color: var(--admin-text-muted);
      opacity: 0.55;
    }
  }
}

.story-segment-card {
  padding: var(--space-s) 0;
  background: transparent;
  border: 1px solid transparent;
  border-top-color: color-mix(in srgb, var(--color-foreground), transparent 92%);
  border-radius: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-s);
  transition: border-color 0.12s ease;

  &:hover,
  &--active {
    border-color: color-mix(in srgb, var(--color-foreground), transparent 86%);
    box-shadow: none;
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
