import { ref, onUnmounted, onScopeDispose } from 'vue'
import type { RadioTrack } from '@tiko/data'

// -------------------------------------------------------------------
// YouTube IFrame API loader
// -------------------------------------------------------------------
let youtubeIframeApiPromise: Promise<void> | null = null

function loadYouTubeIframeAPI(): Promise<void> {
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise

  youtubeIframeApiPromise = new Promise((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      resolve()
      return
    }
    const previousReady = (window as any).onYouTubeIframeAPIReady
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    ;(window as any).onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady()
      resolve()
    }
  })

  return youtubeIframeApiPromise
}

// -------------------------------------------------------------------
// Spotify IFrame API loader
// -------------------------------------------------------------------
let spotifyIframeApiPromise: Promise<any> | null = null

function loadSpotifyIframeAPI(): Promise<any> {
  if (spotifyIframeApiPromise) return spotifyIframeApiPromise

  spotifyIframeApiPromise = new Promise((resolve) => {
    if ((window as any).SpotifyIframeApi) {
      resolve((window as any).SpotifyIframeApi)
      return
    }
    const previousReady = (window as any).onSpotifyIframeApiReady
    const tag = document.createElement('script')
    tag.src = 'https://open.spotify.com/embed/iframe-api/v1'
    document.head.appendChild(tag)
    ;(window as any).onSpotifyIframeApiReady = (api: any) => {
      if (typeof previousReady === 'function') previousReady(api)
      ;(window as any).SpotifyIframeApi = api
      resolve(api)
    }
  })

  return spotifyIframeApiPromise
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
  const source = ref<'youtube' | 'html5' | 'spotify' | 'external' | null>(null)
  const endedCount = ref(0)

  // ---- internal refs -------------------------------------------------
  let ytPlayer: any = null
  let ytContainer: HTMLDivElement | null = null
  let ytPollInterval: ReturnType<typeof setInterval> | null = null
  let playGeneration = 0

  let audio: HTMLAudioElement | null = null
  let rafId: number | null = null

  let spotifyController: any = null
  let spotifyContainer: HTMLDivElement | null = null

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

  /**
   * Radio is a listening app: the video element exists only because the
   * embeds need one, so it is parked off-screen and only the audio reaches
   * the child.
   */
  function createHiddenEmbedContainer(className: string): HTMLDivElement {
    const div = document.createElement('div')
    div.className = className
    div.style.position = 'fixed'
    div.style.bottom = '-100px'
    div.style.width = '1px'
    div.style.height = '1px'
    div.style.opacity = '0'
    div.style.pointerEvents = 'none'
    document.body.appendChild(div)
    return div
  }

  function createYTContainer(): HTMLDivElement {
    return createHiddenEmbedContainer('youtube-player-container')
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

  // ---- Spotify helpers ------------------------------------------------
  function destroySpotify() {
    if (spotifyController) {
      try { spotifyController.destroy() } catch { /* controller already gone */ }
      spotifyController = null
    }
    if (spotifyContainer) {
      spotifyContainer.remove()
      spotifyContainer = null
    }
  }

  /**
   * Spotify's embed plays a preview for a signed-out browser and the full song
   * once the family is signed in to Spotify there. Either way it stays audio:
   * the iframe is off-screen and only the controller talks to us.
   */
  function playSpotify(track: RadioTrack, generation: number) {
    source.value = 'spotify'
    const trackId = track.externalId
    if (!trackId) return

    void loadSpotifyIframeAPI().then((api) => {
      if (generation !== playGeneration || currentTrack.value?.id !== track.id) return

      spotifyContainer = createHiddenEmbedContainer('spotify-player-container')
      let reachedEnd = false
      api.createController(
        spotifyContainer,
        { uri: `spotify:track:${trackId}`, width: '1', height: '1' },
        (controller: any) => {
          if (generation !== playGeneration) {
            try { controller.destroy() } catch { /* already torn down */ }
            return
          }
          spotifyController = controller
          controller.addListener('playback_update', (event: any) => {
            const data = event?.data
            if (!data || generation !== playGeneration) return
            currentTime.value = (data.position ?? 0) / 1000
            duration.value = (data.duration ?? 0) / 1000
            progress.value = duration.value > 0 ? currentTime.value / duration.value : 0
            isPlaying.value = data.isPaused === false
            // The embed keeps reporting the final position, so the song only
            // counts as ended once.
            if (!reachedEnd && data.duration > 0 && data.position >= data.duration) {
              reachedEnd = true
              isPlaying.value = false
              endedCount.value += 1
            }
          })
          controller.play()
          isPlaying.value = true
        },
      )
    })
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

    const generation = ++playGeneration
    currentTrack.value = track

    // YouTube mode
    if (track.source === 'youtube' && track.youtubeVideoId) {
      source.value = 'youtube'

      loadYouTubeIframeAPI().then(() => {
        if (generation !== playGeneration || currentTrack.value?.id !== track.id) return

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
                endedCount.value += 1
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

    // Spotify mode — plays inside Radio through Spotify's own embed
    if (track.source === 'spotify') {
      playSpotify(track, generation)
      return
    }

    // Apple Music is licensed to its own player: Radio hands the song over
    // instead of pretending to play it.
    if (track.source === 'apple-music') {
      source.value = 'external'
      isPlaying.value = false
      if (track.externalUrl) window.open(track.externalUrl, '_blank', 'noopener')
      return
    }

    // HTML5 mode (r2 or upload)
    if (track.audioUrl) {
      source.value = 'html5'

      audio = new Audio(track.audioUrl)
      audio.volume = volume.value

      audio.addEventListener('ended', () => {
        isPlaying.value = false
        endedCount.value += 1
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
          if (generation !== playGeneration || currentTrack.value?.id !== track.id) return
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
    if (source.value === 'spotify' && spotifyController) {
      spotifyController.pause()
      isPlaying.value = false
      return
    }
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
    if (source.value === 'spotify' && spotifyController) {
      spotifyController.resume()
      isPlaying.value = true
      return
    }
    if (source.value === 'external') {
      // Nothing plays here; the song lives in the service's own app.
      if (currentTrack.value?.externalUrl) {
        window.open(currentTrack.value.externalUrl, '_blank', 'noopener')
      }
      return
    }
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
    playGeneration += 1
    destroyYouTube()
    destroySpotify()
    destroyHTML5()
    currentTrack.value = null
    source.value = null
    resetState()
  }

  function seek(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction))
    if (source.value === 'spotify' && spotifyController && duration.value > 0) {
      spotifyController.seek(clamped * duration.value)
      progress.value = clamped
      return
    }
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
    // Spotify's embed controller exposes no volume control; its own player
    // keeps the level the family set in Spotify.
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
    endedCount,
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
  }
}
