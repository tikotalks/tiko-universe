<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Button } from '@sil/ui'
import { IdentityClient, type SessionBundle } from '@tiko/identity'
import { TikoDataClient, type RadioSettings, type RadioState } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  TikoColorMode
} from '@tiko/ui'
import { useAudioPlayer } from './composables/useAudioPlayer'
import './styles.scss'

const storageKey = 'tiko:radio'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'radio' as const
const apiBaseUrl = resolveApiBaseUrl()

const DEFAULT_PLAYLIST = ['Sample Track 1', 'Sample Track 2', 'Sample Track 3']

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  autoPlay?: boolean
  volume?: number
  currentTrackIndex?: number
  playlist?: string[]
  shuffleEnabled?: boolean
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

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const autoPlay = ref(stored.autoPlay ?? false)
const volume = ref(stored.volume ?? 1)
const currentTrackIndex = ref(stored.currentTrackIndex ?? 0)
const playlist = ref<string[]>(stored.playlist?.length ? stored.playlist : [...DEFAULT_PLAYLIST])
const shuffleEnabled = ref(stored.shuffleEnabled ?? false)
const settingsOpen = ref(false)
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const bootstrapped = ref(false)
const identityClient = new IdentityClient({ baseUrl: apiBaseUrl })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })

const player = useAudioPlayer()

const labels = computed(() => {
  void language.value
  return {
    appName: i18n.t(tikoI18nKeys.radio.appName),
    play: i18n.t(tikoI18nKeys.radio.player.play),
    pause: i18n.t(tikoI18nKeys.radio.player.pause),
    next: i18n.t(tikoI18nKeys.radio.player.next),
    previous: i18n.t(tikoI18nKeys.radio.player.previous),
    shuffle: i18n.t(tikoI18nKeys.radio.player.shuffle),
    noTracks: i18n.t(tikoI18nKeys.radio.player.noTracks),
    playlistTitle: i18n.t(tikoI18nKeys.radio.playlist.title),
    playlistEmpty: i18n.t(tikoI18nKeys.radio.playlist.empty),
    nowPlaying: i18n.t(tikoI18nKeys.radio.status.nowPlaying)
  }
})

const headerActions = computed(() => [
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value }
])

const currentTrackName = computed(() => {
  if (playlist.value.length === 0) return labels.value.noTracks
  return playlist.value[currentTrackIndex.value] ?? labels.value.noTracks
})

const hasPlaylist = computed(() => playlist.value.length > 0)

function resolveColorMode(mode: TikoColorMode) {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function saveLocalFallback() {
  writeJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    autoPlay: autoPlay.value,
    volume: volume.value,
    currentTrackIndex: currentTrackIndex.value,
    playlist: playlist.value,
    shuffleEnabled: shuffleEnabled.value
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
  if (typeof settings.autoPlay === 'boolean') {
    autoPlay.value = settings.autoPlay
  }
  if (typeof settings.volume === 'number' && settings.volume >= 0 && settings.volume <= 1) {
    volume.value = settings.volume
  }
  settingsVersion.value = version
}

function applyState(state: RadioState, version?: number) {
  if (typeof state.currentTrackIndex === 'number' && state.currentTrackIndex >= 0) {
    currentTrackIndex.value = state.currentTrackIndex
  }
  if (Array.isArray(state.playlist) && state.playlist.length > 0) {
    playlist.value = state.playlist
  }
  if (typeof state.shuffleEnabled === 'boolean') {
    shuffleEnabled.value = state.shuffleEnabled
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
      autoPlay: autoPlay.value,
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
      playlist: playlist.value,
      shuffleEnabled: shuffleEnabled.value
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next change.
  }
}

watch(language, (value) => {
  i18n.setLanguage(value)
}, { immediate: true })

watch(colorMode, (mode) => {
  const effective = resolveColorMode(mode)
  document.documentElement.dataset.colorMode = effective
  document.documentElement.dataset.theme = effective
}, { immediate: true })

watch([language, colorMode, autoPlay, volume], () => {
  saveLocalFallback()
  void persistSettingsRemote()
})

watch([currentTrackIndex, playlist, shuffleEnabled], () => {
  saveLocalFallback()
  void persistStateRemote()
}, { deep: true })

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

function handlePlay() {
  // No actual audio — just toggle UI state
  if (player.isPlaying.value) {
    player.pause()
  } else {
    player.resume()
  }
}

function handleNext() {
  if (!hasPlaylist.value) return
  if (shuffleEnabled.value) {
    const next = Math.floor(Math.random() * playlist.value.length)
    currentTrackIndex.value = next
  } else {
    currentTrackIndex.value = (currentTrackIndex.value + 1) % playlist.value.length
  }
}

function handlePrevious() {
  if (!hasPlaylist.value) return
  if (shuffleEnabled.value) {
    const prev = Math.floor(Math.random() * playlist.value.length)
    currentTrackIndex.value = prev
  } else {
    currentTrackIndex.value = (currentTrackIndex.value - 1 + playlist.value.length) % playlist.value.length
  }
}

function toggleShuffle() {
  shuffleEnabled.value = !shuffleEnabled.value
}

function selectTrack(index: number) {
  currentTrackIndex.value = index
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

        <!-- Progress bar -->
        <div
          class="radio-app__progress-wrap"
          role="progressbar"
          :aria-valuenow="Math.round(player.progress.value * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
          @click="player.seek(($event as MouseEvent).offsetX / ($event.currentTarget as HTMLElement).offsetWidth)"
        >
          <div class="radio-app__progress-fill" :style="{ width: (player.progress.value * 100) + '%' }" />
        </div>
      </div>

      <!-- Transport controls -->
      <div class="radio-app__controls">
        <Button
          class="radio-app__control-btn"
          variant="secondary"
          icon="media/skip-back"
          :disabled="!hasPlaylist"
          @click="handlePrevious"
        >
          {{ labels.previous }}
        </Button>

        <Button
          class="radio-app__control-btn radio-app__control-btn--play"
          variant="primary"
          :icon="player.isPlaying ? 'media/pause' : 'media/play'"
          :disabled="!hasPlaylist"
          @click="handlePlay"
        >
          {{ player.isPlaying ? labels.pause : labels.play }}
        </Button>

        <Button
          class="radio-app__control-btn"
          variant="secondary"
          icon="media/skip-forward"
          :disabled="!hasPlaylist"
          @click="handleNext"
        >
          {{ labels.next }}
        </Button>

        <Button
          class="radio-app__shuffle-btn"
          :class="{ 'radio-app__shuffle-btn--active': shuffleEnabled }"
          :variant="shuffleEnabled ? 'primary' : 'secondary'"
          icon="media/shuffle"
          @click="toggleShuffle"
        >
          {{ labels.shuffle }}
        </Button>
      </div>

      <!-- Playlist -->
      <div class="radio-app__playlist">
        <h2 class="radio-app__playlist-title">{{ labels.playlistTitle }}</h2>
        <p v-if="!hasPlaylist" class="radio-app__playlist-empty">{{ labels.playlistEmpty }}</p>
        <ul v-else class="radio-app__playlist-list">
          <li
            v-for="(track, index) in playlist"
            :key="index"
            class="radio-app__playlist-item"
            :class="{ 'radio-app__playlist-item--active': index === currentTrackIndex }"
            @click="selectTrack(index)"
          >
            {{ track }}
          </li>
        </ul>
      </div>

      <!-- Settings panel -->
      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
      />
    </section>
  </TikoAppShell>
</template>
