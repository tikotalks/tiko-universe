<script setup lang="ts">
import { useBemm } from 'bemm'
import { SilIcon as Icon } from '@tiko/ui'
import type { WordTile } from '@tiko/talk-types'

const bemm = useBemm('sentence-bar', { return: 'string', includeBaseClass: true })

defineProps<{
  words: WordTile[]
  canSpeak: boolean
  speechStatus: 'idle' | 'speaking' | 'ready' | 'fallback' | 'error'
  wordIcon: (word: WordTile) => string
}>()

const emit = defineEmits<{
  removeWord: [index: number]
  removeLastWord: []
  speak: []
}>()
</script>

<template>
  <section :class="bemm('')" aria-label="Current sentence">
    <div :class="bemm('words')">
      <button
        v-for="(word, index) in words"
        :key="`${word.id}-${index}`"
        :class="bemm('word')"
        type="button"
        :aria-label="`Remove ${word.text}`"
        @click="emit('removeWord', index)"
      >
        <span>{{ word.text }}</span>
        <Icon v-if="wordIcon(word)" :name="wordIcon(word)" size="small" aria-hidden="true" />
      </button>
      <span v-if="!words.length" :class="bemm('placeholder')">Tap a word</span>
    </div>

    <button :class="bemm('delete')" type="button" aria-label="Delete last word" :disabled="!words.length" @click="emit('removeLastWord')">
      <Icon name="ui/talk-subtract" size="small" />
    </button>
    <button :class="bemm('speak')" type="button" :disabled="!canSpeak" aria-label="Speak sentence" @click="emit('speak')">
      <span v-if="speechStatus === 'speaking'" aria-hidden="true">…</span>
      <Icon v-else name="media/playback-play" size="medium" aria-hidden="true" />
    </button>
    <Icon :class="bemm('sound')" name="media/volume-iii" size="medium" aria-hidden="true" />
  </section>
</template>

<style lang="scss">
.sentence-bar {
  width: fit-content;
  justify-self: center;
  padding: var(--space-s) var(--space);
  display: flex;
  align-items: center;
  gap: var(--space);
  border-radius: 999px;
  background: var(--color-background);

  &__words {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-s);
    min-width: 0;
  }

  &__word {
    padding: var(--space-s) var(--space);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    border: 0;
    border-radius: var(--border-radius-xl);
    background: #bfe6ff;
    color: var(--talk-ink);
    font-size: clamp(1.2rem, 2.4vw, 2rem);
    font-weight: 1000;
    cursor: pointer;
    transition: transform 0.14s ease;

    &:nth-child(2n) { background: #9ee4dd; }
    &:nth-child(3n) { background: #ffe38b; }
    &:active { transform: translateY(0.12rem) scale(0.98); }
  }

  &__placeholder {
    color: var(--talk-muted);
    font-size: clamp(1.05rem, 2vw, 1.45rem);
    font-weight: 900;
  }

  &__delete {
    width: clamp(2.7rem, 4vw, 3.6rem);
    aspect-ratio: 1;
    border: 0;
    border-radius: 999px;
    background: rgba(32, 36, 49, 0.07);
    color: rgba(32, 36, 49, 0.6);
    font-size: clamp(1.2rem, 2vw, 1.65rem);
    font-weight: 1000;
    cursor: pointer;
    transition: transform 0.14s ease;

    &:active { transform: translateY(0.12rem) scale(0.98); }
    &:disabled { cursor: not-allowed; opacity: 0.45; }
  }

  &__speak {
    width: var(--space-xl);
    aspect-ratio: 1;
    border: 0;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: var(--talk-orange);
    color: white;
    font-size: var(--space-l);
    font-weight: 1000;
    cursor: pointer;
    transition: transform 0.14s ease;

    &:active { transform: translateY(0.12rem) scale(0.98); }
    &:disabled { cursor: not-allowed; opacity: 0.45; }
  }

  &__sound {
    color: rgba(32, 36, 49, 0.24);
    font-size: clamp(1rem, 2vw, 1.75rem);
    font-weight: 1000;
    letter-spacing: -0.12em;
  }
}

@media (max-width: 760px) {
  .sentence-bar {
    width: 100%;
    min-height: 4.8rem;
    border-radius: 1.55rem;

    &__sound { display: none; }

    &__words {
      flex: 1;
      min-width: 0;
      justify-content: flex-start;
      overflow-x: auto;
      padding-bottom: 0.15rem;
    }

    &__word {
      min-width: max-content;
      min-height: 3rem;
      font-size: 1.1rem;
    }
  }
}
</style>
