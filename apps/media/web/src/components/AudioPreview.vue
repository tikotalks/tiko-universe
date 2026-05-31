<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const props = defineProps<{
  src: string
  title: string
  durationSeconds?: number
}>()

const emit = defineEmits<{
  download: []
}>()

const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const audioDuration = ref(props.durationSeconds ?? 0)

function togglePlay() {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play()
  }
}

function onPlay() { isPlaying.value = true }
function onPause() { isPlaying.value = false }
function onTimeUpdate() {
  if (audioRef.value) currentTime.value = audioRef.value.currentTime
}
function onLoadedMetadata() {
  if (audioRef.value) audioDuration.value = audioRef.value.duration
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const progress = ref(0)
function onProgressInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  progress.value = val
  if (audioRef.value && audioDuration.value) {
    audioRef.value.currentTime = (val / 100) * audioDuration.value
  }
}

onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value = null
  }
})
</script>

<template>
  <div class="audio-preview">
    <audio
      ref="audioRef"
      :src="src"
      preload="metadata"
      @play="onPlay"
      @pause="onPause"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
    />

    <div class="audio-preview__card">
      <div class="audio-preview__info">
        <span class="audio-preview__icon">{{ isPlaying ? '⏸' : '▶' }}</span>
        <div class="audio-preview__text">
          <span class="audio-preview__title">{{ title }}</span>
          <span class="audio-preview__time">
            {{ formatTime(currentTime) }} / {{ formatTime(audioDuration) }}
          </span>
        </div>
      </div>

      <div class="audio-preview__controls">
        <button class="audio-preview__play-btn" @click="togglePlay">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>

        <input
          type="range"
          class="audio-preview__progress"
          min="0"
          max="100"
          :value="audioDuration ? (currentTime / audioDuration) * 100 : 0"
          @input="onProgressInput"
        />

        <button class="audio-preview__dl-btn" @click="emit('download')">
          ↓
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.audio-preview {
  &__card {
    padding: 1rem;
    background: var(--tiko-surface-raised);
    border: 1px solid var(--tiko-border);
    border-radius: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__icon {
    font-size: 1.5rem;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--tiko-app-primary);
    color: var(--tiko-app-primary-text);
    border-radius: 0.75rem;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  &__title {
    font-weight: 600;
    font-size: 0.95rem;
  }

  &__time {
    font-size: 0.8rem;
    color: color-mix(in srgb, var(--color-foreground) 50%, transparent);
    font-variant-numeric: tabular-nums;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__play-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: var(--tiko-app-primary);
    color: var(--tiko-app-primary-text);
    font-size: 0.8rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  &__progress {
    flex: 1;
    height: 0.35rem;
    appearance: none;
    background: color-mix(in srgb, var(--color-foreground) 15%, transparent);
    border-radius: 999px;
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 0.85rem;
      height: 0.85rem;
      border-radius: 50%;
      background: var(--tiko-app-primary);
      cursor: pointer;
    }

    &::-moz-range-thumb {
      width: 0.85rem;
      height: 0.85rem;
      border: none;
      border-radius: 50%;
      background: var(--tiko-app-primary);
      cursor: pointer;
    }
  }

  &__dl-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--tiko-border);
    border-radius: 50%;
    background: var(--tiko-surface);
    color: var(--color-foreground);
    font-size: 1rem;
    cursor: pointer;
    flex-shrink: 0;

    &:hover { background: var(--tiko-surface-raised); }
  }
}
</style>
