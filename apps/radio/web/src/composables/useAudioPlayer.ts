import { ref, onUnmounted, onScopeDispose } from 'vue'
import type { RadioTrack } from '@tiko/data'

// -------------------------------------------------------------------
// YouTube IFrame API loader
// -------------------------------------------------------------------
function loadYouTubeIframeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      resolve()
      return
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    ;(window as any).onYouTubeIframeAPIReady = () => resolve()
  })
}

// -------------------------------------------------------------------
// Composable
// -------------------------------------------------------------------
export function useAudioPlayer() {
  // ---- reactive state ------------------------------------------------
  const currentTrack = ref<RadioTrack | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const progress = ref(0)
  const volume = ref(1)
  const source = ref<'youtube' | 'html5' | null>(null)

  // ---- internal refs -------------------------------------------------
  let ytPlayer: any = null
  let ytContainer: HTMLDivElement | null = null
  let ytPollInterval: ReturnType<typeof setInterval> | null = null

  let audio: HTMLAudioElement | null = null
  let rafId: number | null = null

  // ---- helpers -------------------------------------------------------
  function resetState() {
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    progress.value = 0
  }

  // ---- YouTube helpers -----------------------------------------------
  function destroyYouTube() {
    if (ytPollInterval !== null) {
      clearInterval(ytPollInterval)
      ytPollInterval = null
    }
    if (ytPlayer) {
      ytPlayer.destroy()
      ytPlayer = null
    }
    if (ytContainer) {
      ytContainer.remove()
      ytContainer = null
    }
  }

  function createYTContainer(): HTMLDivElement {
    const div = document.createElement('div')
    div.className = 'youtube-player-container'
    div.style.position = 'fixed'
    div.style.bottom = '-100px'
    div.style.width = '1px'
    div.style.height = '1px'
    div.style.opacity = '0'
    div.style.pointerEvents = 'none'
    document.body.appendChild(div)
    return div
  }

  function startYTPolling() {
    if (ytPollInterval) clearInterval(ytPollInterval)
    ytPollInterval = setInterval(() => {
      if (!ytPlayer) return
      try {
        currentTime.value = ytPlayer.getCurrentTime() ?? 0
        duration.value = ytPlayer.getDuration() ?? 0
        progress.value =
          duration.value > 0 ? currentTime.value / duration.value : 0
      } catch {
        // player may have been destroyed
      }
    }, 250)
  }

  // ---- HTML5 helpers --------------------------------------------------
  function destroyHTML5() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (audio) {
      audio.pause()
      audio.src = ''
      audio = null
    }
  }

  function syncProgressHTML5() {
    if (!audio) return
    currentTime.value = audio.currentTime
    duration.value = audio.duration || 0
    progress.value = duration.value > 0 ? audio.currentTime / duration.value : 0
    rafId = requestAnimationFrame(syncProgressHTML5)
  }

  // ---- public methods -------------------------------------------------

  function play(track: RadioTrack): void {
    stop()

    currentTrack.value = track

    // YouTube mode
    if (track.source === 'youtube' && track.youtubeVideoId) {
      source.value = 'youtube'

      loadYouTubeIframeAPI().then(() => {
        ytContainer = createYTContainer()

        ytPlayer = new (window as any).YT.Player(ytContainer, {
          videoId: track.youtubeVideoId,
          playerVars: { autoplay: 1 },
          events: {
            onReady: (_event: any) => {
              if (ytPlayer) {
                ytPlayer.setVolume(volume.value * 100)
                isPlaying.value = true
                startYTPolling()
              }
            },
            onStateChange: (event: any) => {
              // https://developers.google.com/youtube/iframe_api_reference#Playback_status
              const state = event.data as number
              if (state === (window as any).YT.PlayerState.PLAYING) {
                isPlaying.value = true
              } else if (
                state === (window as any).YT.PlayerState.PAUSED ||
                state === (window as any).YT.PlayerState.BUFFERING
              ) {
                // buffering: keep isPlaying true so UI still shows loading intent
                if (state === (window as any).YT.PlayerState.PAUSED) {
                  isPlaying.value = false
                }
              } else if (state === (window as any).YT.PlayerState.ENDED) {
                isPlaying.value = false
                if (ytPollInterval) {
                  clearInterval(ytPollInterval)
                  ytPollInterval = null
                }
              }
            },
          },
        })
      })

      return
    }

    // HTML5 mode (r2 or upload)
    if (track.audioUrl) {
      source.value = 'html5'

      audio = new Audio(track.audioUrl)
      audio.volume = volume.value

      audio.addEventListener('ended', () => {
        isPlaying.value = false
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      })

      audio.addEventListener('error', () => {
        isPlaying.value = false
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      })

      audio.play()
        .then(() => {
          isPlaying.value = true
          syncProgressHTML5()
        })
        .catch(() => {
          isPlaying.value = false
        })

      return
    }
  }

  function pause(): void {
    if (source.value === 'youtube' && ytPlayer) {
      ytPlayer.pauseVideo()
      isPlaying.value = false
      if (ytPollInterval) {
        clearInterval(ytPollInterval)
        ytPollInterval = null
      }
      return
    }
    if (source.value === 'html5' && audio) {
      audio.pause()
      isPlaying.value = false
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      // Capture final position
      currentTime.value = audio.currentTime
      duration.value = audio.duration || 0
      progress.value = duration.value > 0 ? audio.currentTime / duration.value : 0
    }
  }

  function resume(): void {
    if (source.value === 'youtube' && ytPlayer) {
      ytPlayer.playVideo()
      isPlaying.value = true
      startYTPolling()
      return
    }
    if (source.value === 'html5' && audio) {
      audio
        .play()
        .then(() => {
          isPlaying.value = true
          syncProgressHTML5()
        })
        .catch(() => {
          isPlaying.value = false
        })
    }
  }

  function stop(): void {
    destroyYouTube()
    destroyHTML5()
    currentTrack.value = null
    source.value = null
    resetState()
  }

  function seek(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction))
    if (source.value === 'youtube' && ytPlayer) {
      try {
        const dur = ytPlayer.getDuration() ?? 0
        if (dur > 0) {
          ytPlayer.seekTo(clamped * dur, true)
        }
      } catch {
        // ignore
      }
      return
    }
    if (source.value === 'html5' && audio && duration.value) {
      audio.currentTime = clamped * duration.value
      currentTime.value = audio.currentTime
      progress.value = clamped
    }
  }

  function setVolume(v: number): void {
    const clamped = Math.max(0, Math.min(1, v))
    volume.value = clamped
    if (source.value === 'youtube' && ytPlayer) {
      try {
        ytPlayer.setVolume(clamped * 100)
      } catch {
        // ignore
      }
    }
    if (source.value === 'html5' && audio) {
      audio.volume = clamped
    }
  }

  // ---- lifecycle cleanup ---------------------------------------------
  function cleanup() {
    stop()
  }

  onUnmounted(cleanup)
  onScopeDispose(cleanup)

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    source,
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
  }
}
