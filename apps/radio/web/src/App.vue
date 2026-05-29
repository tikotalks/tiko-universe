<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { Button } from '@sil/ui'
import { IdentityClient, type SessionBundle } from '@tiko/identity'
import { TikoDataClient, TikoMediaClient, type RadioSettings, type RadioState } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  TikoColorMode
} from '@tiko/ui'
import { useAudioPlayer } from './composables/useAudioPlayer'
import { useTrackLibrary } from './composables/useTrackLibrary'
import type { RadioTrack } from '@tiko/data'
import './styles.scss'

const storageKey = 'tiko:radio'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'radio' as const
const apiBaseUrl = resolveApiBaseUrl()

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  volume?: number
  shuffleEnabled?: boolean
  repeatEnabled?: boolean
  currentTrackIndex?: number
}

interface StoredIdentity {
  userId?: string
  deviceId?: string
  deviceSecret?: string
  sessionToken?: string
  expiresAt?: string
}

function resolveApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_API_BASE_URL ?? 'https://api.tikoapi.org/v1').replace(/\/$/, '')
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function toLanguage(value: string | undefined): TikoLanguage {
  return tikoLanguages.includes(value as TikoLanguage) ? value as TikoLanguage : defaultLanguage
}

function toColorMode(value: string | undefined): TikoColorMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function resolveColorMode(mode: TikoColorMode) {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// ---- State initialization -------------------------------------------------
const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const volume = ref(stored.volume ?? 1)
const shuffleEnabled = ref(stored.shuffleEnabled ?? false)
const repeatEnabled = ref(stored.repeatEnabled ?? false)
const currentTrackIndex = ref(stored.currentTrackIndex ?? -1)
const settingsOpen = ref(false)
const addPanelOpen = ref(false)
const addingTrack = ref(false)
const youtubeUrl = ref('')
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const bootstrapped = ref(false)
const identityClient = new IdentityClient({ baseUrl: apiBaseUrl })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })
const mediaClient = new TikoMediaClient({ baseUrl: apiBaseUrl })

// ---- Composables ----------------------------------------------------------
const player = useAudioPlayer()
const library = useTrackLibrary('tiko:radio:tracks')

// ---- YouTube URL parsing --------------------------------------------------
function parseYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// ---- Labels ---------------------------------------------------------------
const labels = computed(() => {
  void language.value
  return {
    appName: i18n.t(tikoI18nKeys.radio.appName),
    play: i18n.t(tikoI18nKeys.radio.player.play),
    pause: i18n.t(tikoI18nKeys.radio.player.pause),
    next: i18n.t(tikoI18nKeys.radio.player.next),
    previous: i18n.t(tikoI18nKeys.radio.player.previous),
    shuffle: i18n.t(tikoI18nKeys.radio.player.shuffle),
    repeat: i18n.t(tikoI18nKeys.radio.player.repeat),
    noTracks: i18n.t(tikoI18nKeys.radio.player.noTracks),
    nowPlaying: i18n.t(tikoI18nKeys.radio.status.nowPlaying),
    addTrack: i18n.t(tikoI18nKeys.radio.library.addTrack),
    addFromYouTube: i18n.t(tikoI18nKeys.radio.library.addFromYouTube),
    addFromYouTubePlaceholder: i18n.t(tikoI18nKeys.radio.library.addFromYouTubePlaceholder),
    addFromYouTubeButton: i18n.t(tikoI18nKeys.radio.library.addFromYouTubeButton),
    adding: i18n.t(tikoI18nKeys.radio.library.adding),
    uploadFile: i18n.t(tikoI18nKeys.radio.library.uploadFile),
    removeTrack: i18n.t(tikoI18nKeys.radio.library.removeTrack),
    libraryTitle: i18n.t(tikoI18nKeys.radio.library.title),
    libraryEmpty: i18n.t(tikoI18nKeys.radio.library.empty),
    volume: 'Volume',
  }
})

const headerActions = computed(() => [
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value }
])

// ---- Computed helpers -----------------------------------------------------
const currentTrack = computed(() => {
  if (currentTrackIndex.value < 0 || !library.tracks.value.length) return null
  return library.tracks.value[currentTrackIndex.value] ?? null
})

const currentTrackName = computed((): string => player.currentTrack.value?.title ?? currentTrack.value?.title ?? labels.value.noTracks)
const currentTrackArtist = computed((): string => player.currentTrack.value?.artist ?? currentTrack.value?.artist ?? '')

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function handleProgressClick(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  player.seek((event.clientX - rect.left) / rect.width)
}

// ---- Persistence ----------------------------------------------------------
function saveLocalFallback() {
  writeJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    volume: volume.value,
    shuffleEnabled: shuffleEnabled.value,
    repeatEnabled: repeatEnabled.value,
    currentTrackIndex: currentTrackIndex.value
  })
}

function saveIdentity(bundle: SessionBundle) {
  sessionToken.value = bundle.session.token
  writeJson(identityStorageKey, {
    userId: bundle.user.id,
    deviceId: bundle.device.id,
    deviceSecret: bundle.device.secret,
    sessionToken: bundle.session.token,
    expiresAt: bundle.session.expiresAt
  } satisfies StoredIdentity)
}

async function bootstrapIdentity() {
  const storedIdentity = readJson<StoredIdentity>(identityStorageKey, {})

  if (storedIdentity.sessionToken) {
    try {
      const bundle = await identityClient.getSession(storedIdentity.sessionToken)
      saveIdentity(bundle)
      return
    } catch {
      // Fall through to device bootstrap with the known device id/secret.
    }
  }

  const bundle = await identityClient.bootstrapDevice({
    device: {
      id: storedIdentity.deviceId,
      secret: storedIdentity.deviceSecret,
      name: 'Radio web',
      platform: 'web'
    }
  })
  saveIdentity(bundle)
}

function applySettings(settings: RadioSettings, version?: number) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
  if (typeof settings.volume === 'number' && settings.volume >= 0 && settings.volume <= 1) {
    volume.value = settings.volume
  }
  settingsVersion.value = version
}

function applyState(state: RadioState, version?: number) {
  if (typeof state.currentTrackIndex === 'number' && state.currentTrackIndex >= 0) {
    currentTrackIndex.value = state.currentTrackIndex
  }
  if (Array.isArray(state.tracks) && state.tracks.length > 0) {
    // Remote tracks replace local library
    library.tracks.value = state.tracks
  }
  if (typeof state.shuffleEnabled === 'boolean') {
    shuffleEnabled.value = state.shuffleEnabled
  }
  if (typeof state.repeatEnabled === 'boolean') {
    repeatEnabled.value = state.repeatEnabled
  }
  stateVersion.value = version
}

async function hydrateRemoteData() {
  if (!sessionToken.value) return
  const [settings, state] = await Promise.all([
    dataClient.getSettings(appId, sessionToken.value),
    dataClient.getState(appId, sessionToken.value)
  ])
  applySettings(settings.settings, settings.version)
  applyState(state.state, state.version)
}

async function persistSettingsRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putSettings(appId, sessionToken.value, {
      language: language.value,
      colorMode: colorMode.value,
      volume: volume.value
    }, { version: settingsVersion.value })
    settingsVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next edit.
  }
}

async function persistStateRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putState(appId, sessionToken.value, {
      currentTrackIndex: currentTrackIndex.value,
      tracks: library.tracks.value,
      shuffleEnabled: shuffleEnabled.value,
      repeatEnabled: repeatEnabled.value
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next change.
  }
}

// ---- Watchers --------------------------------------------------------------
watch(language, (value) => {
  i18n.setLanguage(value)
}, { immediate: true })

watch(colorMode, (mode) => {
  const effective = resolveColorMode(mode)
  document.documentElement.dataset.colorMode = effective
  document.documentElement.dataset.theme = effective
}, { immediate: true })

watch([language, colorMode, volume], () => {
  saveLocalFallback()
  void persistSettingsRemote()
})

watch([currentTrackIndex, shuffleEnabled, repeatEnabled], () => {
  saveLocalFallback()
  void persistStateRemote()
})

watch(library.tracks, () => {
  saveLocalFallback()
  void persistStateRemote()
}, { deep: true })

// Volume sync to player
watch(volume, (v) => {
  player.setVolume(v)
}, { immediate: true })

// Track ended auto-advance
watch(player.isPlaying, (playing, wasPlaying) => {
  if (wasPlaying && !playing && player.currentTrack.value) {
    if (repeatEnabled.value) {
      player.play(player.currentTrack.value)
      return
    }
    // Advance to next track (wrapping)
    const len = library.tracks.value.length
    if (len === 0) return
    const nextIndex = shuffleEnabled.value
      ? Math.floor(Math.random() * len)
      : (currentTrackIndex.value + 1) % len
    const nextTrack = library.tracks.value[nextIndex]
    if (nextTrack) {
      currentTrackIndex.value = nextIndex
      player.play(nextTrack)
    }
  }
})

// ---- Lifecycle -------------------------------------------------------------
onMounted(async () => {
  try {
    await bootstrapIdentity()
    await hydrateRemoteData()
  } catch {
    // Keep the child-facing local flow available when API bootstrap is offline.
  } finally {
    bootstrapped.value = true
    saveLocalFallback()
  }
})

// ---- Event handlers --------------------------------------------------------
function handlePlay(track: RadioTrack) {
  player.play(track)
}

function handlePause() {
  player.pause()
}

function handleResume() {
  player.resume()
}

function handleNext() {
  const len = library.tracks.value.length
  if (len === 0) return
  if (shuffleEnabled.value) {
    currentTrackIndex.value = Math.floor(Math.random() * len)
  } else {
    currentTrackIndex.value = (currentTrackIndex.value + 1) % len
  }
  const track = library.tracks.value[currentTrackIndex.value]
  if (track) player.play(track)
}

function handlePrevious() {
  const len = library.tracks.value.length
  if (len === 0) return
  if (shuffleEnabled.value) {
    currentTrackIndex.value = Math.floor(Math.random() * len)
  } else {
    currentTrackIndex.value = (currentTrackIndex.value - 1 + len) % len
  }
  const track = library.tracks.value[currentTrackIndex.value]
  if (track) player.play(track)
}

function toggleShuffle() {
  shuffleEnabled.value = !shuffleEnabled.value
}

function toggleRepeat() {
  repeatEnabled.value = !repeatEnabled.value
}

function selectTrack(index: number) {
  currentTrackIndex.value = index
  const track = library.tracks.value[index]
  if (track) player.play(track)
}

function removeTrack(index: number) {
  // If removing currently playing track, stop playback
  if (index === currentTrackIndex.value) {
    player.stop()
  }
  library.removeTrackByIndex(index)
  // Adjust currentTrackIndex
  const len = library.tracks.value.length
  if (currentTrackIndex.value >= len) {
    currentTrackIndex.value = len - 1
  }
  if (currentTrackIndex.value < 0) {
    currentTrackIndex.value = -1
  }
}

async function handleAddFromYouTube() {
  const url = youtubeUrl.value.trim()
  if (!url) return
  const videoId = parseYouTubeVideoId(url)
  if (!videoId) return

  addingTrack.value = true
  try {
    const track = library.addTrack({
      title: `YouTube: ${videoId}`,
      source: 'youtube',
      youtubeVideoId: videoId
    })
    youtubeUrl.value = ''
    // Auto-play if nothing is playing
    if (!player.isPlaying.value) {
      currentTrackIndex.value = library.tracks.value.length - 1
      await nextTick()
      player.play(track)
    }
  } finally {
    addingTrack.value = false
  }
}

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const audioUrl = URL.createObjectURL(file)
  const name = file.name.replace(/\.[^.]+$/, '')
  const track = library.addTrack({
    title: name,
    source: 'upload',
    audioUrl
  })

  // Auto-play if nothing is playing
  if (!player.isPlaying.value) {
    currentTrackIndex.value = library.tracks.value.length - 1
    nextTick(() => player.play(track))
  }

  // Reset file input so the same file can be re-added
  input.value = ''
}

function headerAction(id: string) {
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
}
</script>

<template>
  <TikoAppShell
    :app-name="labels.appName"
    app-icon="media/radio"
    app-color="radio"
    :actions="headerActions"
    @header-action="headerAction"
  >
    <section class="radio-app" :data-color-mode="colorMode">
      <!-- Now-playing card -->
      <div class="radio-app__now-playing">
        <span class="radio-app__now-playing-label">{{ labels.nowPlaying }}</span>
        <span class="radio-app__track-name">{{ currentTrackName }}</span>
        <span v-if="currentTrackArtist" class="radio-app__track-artist">{{ currentTrackArtist }}</span>
        <div class="radio-app__progress-wrap"
             role="progressbar"
             :aria-valuenow="Math.round(player.progress.value * 100)"
             @click="handleProgressClick($event)">
          <div class="radio-app__progress-fill" :style="{ width: (player.progress.value * 100) + '%' }" />
        </div>
        <span class="radio-app__time-display">{{ formatTime(player.currentTime.value) }} / {{ formatTime(player.duration.value) }}</span>
      </div>

      <!-- Transport controls -->
      <div class="radio-app__controls">
        <Button variant="secondary" icon="media/skip-back" :disabled="library.isEmpty.value" @click="handlePrevious">
          {{ labels.previous }}
        </Button>
        <Button variant="primary" :icon="player.isPlaying.value ? 'media/pause' : 'media/play'"
                :disabled="library.isEmpty.value"
                @click="player.isPlaying.value ? handlePause() : handleResume()">
          {{ player.isPlaying.value ? labels.pause : labels.play }}
        </Button>
        <Button variant="secondary" icon="media/skip-forward" :disabled="library.isEmpty.value" @click="handleNext">
          {{ labels.next }}
        </Button>
        <Button :variant="shuffleEnabled ? 'primary' : 'secondary'" icon="media/shuffle" @click="toggleShuffle">
          {{ labels.shuffle }}
        </Button>
        <Button :variant="repeatEnabled ? 'primary' : 'secondary'" icon="media/repeat" @click="toggleRepeat">
          {{ labels.repeat }}
        </Button>
      </div>

      <!-- Volume slider -->
      <div class="radio-app__volume">
        <label for="radio-volume">{{ labels.volume }}</label>
        <input id="radio-volume" type="range" min="0" max="1" step="0.05" v-model.number="volume" />
      </div>

      <!-- Add track panel -->
      <div class="radio-app__add-panel">
        <Button variant="secondary" icon="ui/plus" @click="addPanelOpen = !addPanelOpen">
          {{ labels.addTrack }}
        </Button>
        <div v-if="addPanelOpen" class="radio-app__add-panel__content">
          <!-- YouTube add -->
          <div class="radio-app__add-panel__youtube">
            <span>{{ labels.addFromYouTube }}</span>
            <div class="radio-app__add-panel__youtube-input">
              <input type="url" :placeholder="labels.addFromYouTubePlaceholder" v-model="youtubeUrl" @keyup.enter="handleAddFromYouTube" />
              <Button variant="primary" :disabled="!youtubeUrl.trim() || addingTrack" @click="handleAddFromYouTube">
                {{ addingTrack ? labels.adding : labels.addFromYouTubeButton }}
              </Button>
            </div>
          </div>
          <!-- File upload -->
          <div class="radio-app__add-panel__upload">
            <label class="radio-app__add-panel__upload-label">
              {{ labels.uploadFile }}
              <input type="file" accept="audio/*" hidden @change="handleFileUpload" />
            </label>
          </div>
        </div>
      </div>

      <!-- Library -->
      <div class="radio-app__library">
        <h2 class="radio-app__library-title">{{ labels.libraryTitle }}</h2>
        <p v-if="library.isEmpty.value" class="radio-app__library-empty">{{ labels.libraryEmpty }}</p>
        <ul v-else class="radio-app__library-list">
          <li v-for="(track, index) in library.tracks.value" :key="track.id"
              class="radio-app__library-item"
              :class="{ 'radio-app__library-item--active': index === currentTrackIndex }"
              @click="selectTrack(index)">
            <div class="radio-app__library-item-info">
              <span class="radio-app__library-item-title">{{ track.title }}</span>
              <span v-if="track.artist" class="radio-app__library-item-artist">{{ track.artist }}</span>
            </div>
            <button class="radio-app__library-item-remove" @click.stop="removeTrack(index)" :aria-label="labels.removeTrack">&times;</button>
          </li>
        </ul>
      </div>

      <!-- Settings panel -->
      <TikoSettingsPanel v-if="settingsOpen" v-model:language="language" v-model:color-mode="colorMode" />
    </section>
  </TikoAppShell>
</template>
