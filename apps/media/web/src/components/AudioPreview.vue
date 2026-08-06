<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useBemm } from 'bemm'
import { SilIcon } from '@tiko/ui'

const props = defineProps<{
  src: string
  title: string
  durationSeconds?: number
}>()

const bemm = useBemm('audio-preview', { return: 'string', includeBaseClass: true })

const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const audioDuration = ref(props.durationSeconds ?? 0)

const progress = computed(() => (audioDuration.value ? (currentTime.value / audioDuration.value) * 100 : 0))

function togglePlay() {
  const audio = audioRef.value
  if (!audio) return
  if (isPlaying.value) audio.pause()
  else void audio.play()
}

function onPlay() { isPlaying.value = true }
function onPause() { isPlaying.value = false }

function onTimeUpdate() {
  if (audioRef.value) currentTime.value = audioRef.value.currentTime
}

function onLoadedMetadata() {
  if (audioRef.value) audioDuration.value = audioRef.value.duration
}

function onSeek(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  const audio = audioRef.value
  if (!audio || !audioDuration.value) return
  audio.currentTime = (value / 100) * audioDuration.value
  currentTime.value = audio.currentTime
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

onUnmounted(() => {
  audioRef.value?.pause()
})
</script>

<template>
  <div :class="bemm('')">
    <audio
      ref="audioRef"
      :src="src"
      preload="metadata"
      @play="onPlay"
      @pause="onPause"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
    />

    <button
      :class="bemm('play')"
      :aria-label="isPlaying ? `Pause ${title}` : `Play ${title}`"
      @click="togglePlay"
    >
      <SilIcon :name="isPlaying ? 'media/playback-pause' : 'media/playback-play'" />
    </button>

    <div :class="bemm('track')">
      <p :class="bemm('title')">{{ title }}</p>
      <input
        type="range"
        :class="bemm('scrubber')"
        min="0"
        max="100"
        step="0.1"
        :value="progress"
        aria-label="Seek"
        @input="onSeek"
      >
      <p :class="bemm('time')">
        {{ formatTime(currentTime) }} / {{ formatTime(audioDuration) }}
      </p>
    </div>
  </div>
</template>

<style lang="scss">
.audio-preview {
  display: flex;
  align-items: center;
  gap: var(--space);
  padding: clamp(var(--space), 3vw, calc(var(--space) * 2));
  border-radius: 24px;
  background: var(--surface-subtle);

  &__play {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 3.5rem;
    height: 3.5rem;
    border: none;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-primary-text);
    font-size: 1.15rem;
    cursor: pointer;
    transition: transform 0.15s var(--ease-out);

    &:hover { transform: translateY(-1px); }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 3px;
    }
  }

  &__track {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__scrubber {
    width: 100%;
    height: 0.35rem;
    appearance: none;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-foreground), transparent 85%);
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 0.9rem;
      height: 0.9rem;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
    }

    &::-moz-range-thumb {
      width: 0.9rem;
      height: 0.9rem;
      border: none;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
    }
  }

  &__time {
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }
}
</style>
