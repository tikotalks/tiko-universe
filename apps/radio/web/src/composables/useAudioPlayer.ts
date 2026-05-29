import { ref, onUnmounted } from 'vue'

export function useAudioPlayer() {
  const currentUrl = ref<string>('')
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const progress = ref(0)

  let audio: HTMLAudioElement | null = null
  let rafId: number | null = null

  function syncProgress() {
    if (!audio) return
    currentTime.value = audio.currentTime
    duration.value = audio.duration || 0
    progress.value = duration.value > 0 ? audio.currentTime / duration.value : 0
    rafId = requestAnimationFrame(syncProgress)
  }

  function stopSync() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function play(url: string) {
    stop()
    audio = new Audio(url)
    currentUrl.value = url

    audio.addEventListener('ended', () => {
      isPlaying.value = false
      stopSync()
    })

    audio.addEventListener('error', () => {
      isPlaying.value = false
      stopSync()
    })

    audio.play().then(() => {
      isPlaying.value = true
      syncProgress()
    }).catch(() => {
      isPlaying.value = false
    })
  }

  function pause() {
    if (!audio) return
    audio.pause()
    isPlaying.value = false
    stopSync()
    // Capture final position
    currentTime.value = audio.currentTime
    duration.value = audio.duration || 0
    progress.value = duration.value > 0 ? audio.currentTime / duration.value : 0
  }

  function resume() {
    if (!audio) return
    audio.play().then(() => {
      isPlaying.value = true
      syncProgress()
    }).catch(() => {
      isPlaying.value = false
    })
  }

  function stop() {
    stopSync()
    if (audio) {
      audio.pause()
      audio.src = ''
      audio = null
    }
    currentUrl.value = ''
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    progress.value = 0
  }

  function seek(fraction: number) {
    if (!audio || !duration.value) return
    const clamped = Math.max(0, Math.min(1, fraction))
    audio.currentTime = clamped * duration.value
    currentTime.value = audio.currentTime
    progress.value = clamped
  }

  onUnmounted(() => {
    stop()
  })

  return {
    currentUrl,
    isPlaying,
    currentTime,
    duration,
    progress,
    play,
    pause,
    resume,
    stop,
    seek
  }
}
