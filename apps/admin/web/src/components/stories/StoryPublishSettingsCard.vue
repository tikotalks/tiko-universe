<script setup lang="ts">
import { useBemm } from 'bemm'
import { Icon, InputRange, InputText } from '@sil/ui'
import type { AudioLibraryAlbum } from '../../composables/useAdminMediaLibrary'

defineProps<{
  targetAlbumId: string
  audioAlbums: AudioLibraryAlbum[]
  language: string
  speed: number
  category: string
  tagsText: string
}>()

const emit = defineEmits<{
  (event: 'update:targetAlbumId', value: string): void
  (event: 'update:language', value: string): void
  (event: 'update:speed', value: number): void
  (event: 'update:category', value: string): void
  (event: 'update:tagsText', value: string): void
}>()

const card = useBemm('story-publish-settings', { return: 'string', includeBaseClass: true })

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value
}
</script>

<template>
  <section :class="card('')">
    <header :class="card('head')">
      <Icon name="ui/on-target" size="small" />
      <div>
        <h3 :class="card('title')">Publish settings</h3>
        <p :class="card('meta')">Choose where and how to publish.</p>
      </div>
    </header>
    <label :class="card('label')">
      <span :class="card('label-text')">Target Radio album</span>
      <select :class="card('select')" :value="targetAlbumId" @change="emit('update:targetAlbumId', inputValue($event))">
        <option value="">No album assigned</option>
        <option v-for="album in audioAlbums" :key="album.id" :value="album.id">{{ album.title }}</option>
      </select>
    </label>
    <div :class="card('two-col')">
      <label :class="card('label')">
        <span :class="card('label-text')">Language</span>
        <input :value="language" :class="card('input')" type="text" placeholder="en" @input="emit('update:language', inputValue($event))" />
      </label>
      <label :class="card('label')">
        <span :class="card('label-text')">Speed {{ speed.toFixed(2) }}x</span>
        <InputRange :model-value="speed" :min="0.5" :max="1.5" :step="0.05" @update:model-value="emit('update:speed', Number($event))" />
      </label>
    </div>
    <div :class="card('two-col')">
      <InputText :model-value="category" label="Category" @update:model-value="emit('update:category', String($event))" />
      <InputText :model-value="tagsText" label="Tags" placeholder="comma, separated" @update:model-value="emit('update:tagsText', String($event))" />
    </div>
    <p :class="card('status-row')"><span>Draft</span> Only you can see this.</p>
  </section>
</template>

<style lang="scss">
.story-publish-settings {
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 3%);
  border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 90%);
  border-radius: calc(var(--border-radius-m) + 4px);
  padding: var(--space-m);
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__head {
    display: flex;
    align-items: flex-start;
    gap: var(--space-s);

    > .icon {
      width: calc(var(--space) * 1.8);
      height: calc(var(--space) * 1.8);
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      color: color-mix(in srgb, var(--color-foreground), transparent 12%);
      --icon-stroke-color: currentColor;
    }
  }

  &__title {
    font-size: var(--font-size-m);
    line-height: 1.1;
    color: var(--admin-text);
  }

  &__meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__label-text {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
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

  &__two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-s);

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  &__status-row {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    display: flex;
    align-items: center;
    gap: var(--space-s);

    span {
      border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 80%);
      border-radius: var(--border-radius-s);
      padding: var(--space-xs) var(--space-s);
      color: var(--admin-text);
      background: color-mix(in srgb, var(--color-background), var(--color-foreground) 6%);
    }
  }
}
</style>
