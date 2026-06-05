import { ref } from 'vue'

export interface AudioLike {
  play: () => Promise<void> | void
}

export interface UseAudioPlayerOptions {
  audioFactory?: (url: string) => AudioLike
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const isPlaying = ref(false)
  const error = ref<string | null>(null)

  async function playUrl(url: string) {
    isPlaying.value = true
    error.value = null
    try {
      const audio = options.audioFactory ? options.audioFactory(url) : new Audio(url)
      await audio.play()
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'audio_play_failed'
    } finally {
      isPlaying.value = false
    }
  }

  return { isPlaying, error, playUrl }
}
