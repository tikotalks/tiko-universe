import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import type { RadioTrack } from '@tiko/data'

type AudioListener = () => void

class MockAudio {
  static lastInstance: MockAudio | null = null

  src: string
  volume = 1
  currentTime = 0
  duration = 10
  listeners = new Map<string, AudioListener>()
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()

  constructor(src: string) {
    this.src = src
    MockAudio.lastInstance = this
  }

  addEventListener(type: string, listener: AudioListener) {
    this.listeners.set(type, listener)
  }

  emit(type: string) {
    this.listeners.get(type)?.()
  }
}

async function createPlayer() {
  vi.resetModules()
  const scope = effectScope()
  const module = await import('./useAudioPlayer')
  const player = scope.run(() => module.useAudioPlayer())
  if (!player) throw new Error('Failed to create player')
  return { player, scope }
}

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.stubGlobal('Audio', MockAudio)
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    MockAudio.lastInstance = null
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    ;(window as any).YT = undefined
    ;(window as any).onYouTubeIframeAPIReady = undefined
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('increments endedCount only for explicit HTML5 ended events', async () => {
    const { player, scope } = await createPlayer()
    const track: RadioTrack = {
      id: 'track-1',
      title: 'Song',
      source: 'upload',
      audioUrl: 'https://media.tikoapi.org/song.mp3',
    }

    player.play(track)
    await nextTick()

    expect(player.endedCount.value).toBe(0)
    player.pause()
    expect(player.isPlaying.value).toBe(false)
    expect(player.endedCount.value).toBe(0)

    MockAudio.lastInstance?.emit('error')
    expect(player.endedCount.value).toBe(0)

    MockAudio.lastInstance?.emit('ended')
    expect(player.endedCount.value).toBe(1)

    scope.stop()
  })

  it('ignores stale YouTube players when a second track starts before the API is ready', async () => {
    const { player, scope } = await createPlayer()
    const createdPlayers: Array<{ destroy: () => void }> = []
    const playerConstructor = vi.fn(function Player(this: {
      destroy: () => void
      setVolume: () => void
      getCurrentTime: () => number
      getDuration: () => number
      pauseVideo: () => void
      playVideo: () => void
      seekTo: () => void
      options: { videoId: string }
    }, _container: HTMLElement, options: { videoId: string }) {
      this.destroy = vi.fn()
      this.setVolume = vi.fn()
      this.getCurrentTime = vi.fn(() => 0)
      this.getDuration = vi.fn(() => 100)
      this.pauseVideo = vi.fn()
      this.playVideo = vi.fn()
      this.seekTo = vi.fn()
      this.options = options
      createdPlayers.push(this)
    })

    player.play({ id: 'track-1', title: 'First', source: 'youtube', youtubeVideoId: 'first-video' })
    player.play({ id: 'track-2', title: 'Second', source: 'youtube', youtubeVideoId: 'second-video' })

    ;(window as any).YT = {
      Player: playerConstructor,
      PlayerState: { PLAYING: 1, PAUSED: 2, BUFFERING: 3, ENDED: 0 },
    }
    ;(window as any).onYouTubeIframeAPIReady()
    await Promise.resolve()
    await nextTick()

    expect(playerConstructor).toHaveBeenCalledTimes(1)
    expect(playerConstructor.mock.calls[0][1].videoId).toBe('second-video')
    expect(createdPlayers).toHaveLength(1)

    scope.stop()
  })

  it('plays a Spotify song through a hidden embed and reports its progress once it ends', async () => {
    const { player, scope } = await createPlayer()
    const controller = {
      addListener: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      seek: vi.fn(),
      destroy: vi.fn(),
    }
    const createController = vi.fn((element: HTMLElement, _options: unknown, callback: (c: unknown) => void) => {
      // The embed must stay off-screen: Radio is a listening app.
      expect(element.style.opacity).toBe('0')
      callback(controller)
    })

    player.play({
      id: 'spotify-1',
      title: 'Lullaby',
      source: 'spotify',
      externalId: '4uLU6hMCjMI75M1A2tKUQC',
      externalUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    })
    ;(window as any).onSpotifyIframeApiReady({ createController })
    await Promise.resolve()
    await nextTick()

    expect(createController).toHaveBeenCalledTimes(1)
    expect(createController.mock.calls[0][1]).toMatchObject({ uri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC' })
    expect(controller.play).toHaveBeenCalled()
    expect(player.isPlaying.value).toBe(true)

    const onPlaybackUpdate = controller.addListener.mock.calls[0][1] as (event: unknown) => void
    onPlaybackUpdate({ data: { position: 30_000, duration: 120_000, isPaused: false } })
    expect(player.progress.value).toBeCloseTo(0.25)

    // The embed keeps reporting the final position; the song ends only once.
    onPlaybackUpdate({ data: { position: 120_000, duration: 120_000, isPaused: true } })
    onPlaybackUpdate({ data: { position: 120_000, duration: 120_000, isPaused: true } })
    expect(player.endedCount.value).toBe(1)

    player.stop()
    expect(controller.destroy).toHaveBeenCalled()
    expect(document.querySelector('.spotify-player-container')).toBeNull()

    scope.stop()
  })

  it('hands an Apple Music song to Apple Music instead of pretending to play it', async () => {
    const { player, scope } = await createPlayer()
    const open = vi.fn()
    vi.stubGlobal('open', open)

    player.play({
      id: 'apple-1',
      title: 'Lullaby',
      source: 'apple-music',
      externalId: '1440857781',
      externalUrl: 'https://music.apple.com/us/album/lullaby/1440857775?i=1440857781',
    })

    expect(open).toHaveBeenCalledWith('https://music.apple.com/us/album/lullaby/1440857775?i=1440857781', '_blank', 'noopener')
    expect(player.isPlaying.value).toBe(false)
    expect(player.source.value).toBe('external')

    scope.stop()
  })
})
