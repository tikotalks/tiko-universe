<script setup lang="ts">
import { useBemm } from 'bemm'
import { Icon } from '@sil/ui'
import type { VoiceSample } from '../../composables/useStoryNarration'

defineProps<{
  voices: VoiceSample[]
  selectedVoiceId: string
  selectedDescription: string
  playingVoiceId: string | null
}>()

const emit = defineEmits<{
  (event: 'select', voiceId: string): void
  (event: 'preview', voice: VoiceSample): void
}>()

const card = useBemm('story-voice-card', { return: 'string', includeBaseClass: true })

function voiceDescription(option: VoiceSample, selectedVoiceId: string, selectedDescription: string): string {
  if (option.id === selectedVoiceId) return selectedDescription
  return option.provider === 'elevenlabs' ? 'Expressive narration' : option.model
}
</script>

<template>
  <section :class="card('')">
    <header :class="card('head')">
      <Icon name="media/music-note-single" size="small" />
      <div>
        <h3 :class="card('title')">Voice</h3>
        <p :class="card('meta')">Choose the voice for your story.</p>
      </div>
    </header>

    <div :class="card('list')">
      <article v-for="option in voices" :key="option.id" :class="card('row', { active: selectedVoiceId === option.id })">
        <button type="button" :class="card('select')" @click="emit('select', option.id)">
          <span :class="card('radio')" aria-hidden="true">
            <Icon v-if="selectedVoiceId === option.id" name="ui/check-fat" size="small" />
          </span>
          <span :class="card('copy')">
            <strong>{{ option.label }}</strong>
            <span>{{ voiceDescription(option, selectedVoiceId, selectedDescription) }}</span>
          </span>
        </button>
        <button type="button" :class="card('play-button')" :aria-label="`Preview ${option.label}`" @click="emit('preview', option)">
          <Icon :name="playingVoiceId === option.id ? 'media/playback-pause' : 'media/playback-play'" size="small" />
        </button>
      </article>
    </div>

    <a :class="card('manage-link')" href="https://elevenlabs.io/app/voice-library" target="_blank" rel="noreferrer">Manage voices</a>
  </section>
</template>

<style lang="scss">
.story-voice-card {
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 5%);
  border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 88%);
  border-radius: var(--border-radius-m);
  box-shadow: 0 24px 80px color-mix(in srgb, var(--color-foreground), transparent 95%);
  padding: calc(var(--space) * 1.25);
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

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__row {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 90%);
    border-radius: var(--border-radius-s);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 2%);
    padding: var(--space-xs);

    &--active {
      border-color: color-mix(in srgb, var(--color-foreground), transparent 45%);
      background: color-mix(in srgb, var(--color-background), var(--color-foreground) 8%);
    }
  }

  &__select {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-s);
    text-align: left;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    padding: var(--space-xs);
  }

  &__radio {
    width: calc(var(--space) * 1.05);
    height: calc(var(--space) * 1.05);
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 65%);
    display: grid;
    place-items: center;
    color: var(--admin-text);

    > .icon {
      width: 0.65rem;
      height: 0.65rem;
      --icon-stroke-color: currentColor;
    }
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: 0;

    strong {
      color: var(--admin-text);
      font-size: var(--font-size-s);
    }

    span {
      color: var(--admin-text-muted);
      font-size: var(--font-size-xs);
    }
  }

  &__play-button {
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

  &__manage-link {
    color: var(--admin-text);
    font-size: var(--font-size-s);
    text-decoration: none;
  }
}
</style>
