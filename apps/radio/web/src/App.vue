<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { Button } from '@sil/ui'
import { IdentityClient, type SessionBundle } from '@tiko/identity'
import { TikoDataClient, TikoMediaClient, type RadioSettings, type RadioState } from '@tiko/data'
import type { RadioTrack, RadioCategory } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  TikoColorMode,
} from '@tiko/ui'
import { useAudioPlayer } from './composables/useAudioPlayer'
import { useTrackLibrary } from './composables/useTrackLibrary'
import { useCategories } from './composables/useCategories'
import { useYouTubeMeta } from './composables/useYouTubeMeta'
import './styles.scss'

// ---- Constants ------------------------------------------------------------
const storageKey = 'tiko:radio'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'radio' as const
const apiBaseUrl = resolveApiBaseUrl()

// ---- Interfaces -----------------------------------------------------------
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

// ---- Utility functions ----------------------------------------------------
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
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const bootstrapped = ref(false)
const identityClient = new IdentityClient({ baseUrl: apiBaseUrl })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })
const mediaClient = new TikoMediaClient({ baseUrl: apiBaseUrl })

// ---- New state: kid mode / parent mode ------------------------------------
const parentMode = ref(false)
const volumeOpen = ref(false)
const selectedCategoryId = ref<string | null>(null)
const manageCategoryId = ref<string | null>(null)
const youtubeUrl = ref('')
const displayName = ref('')
const addVideoCategoryId = ref('')
const videoPreview = ref<{ title: string; thumbnailUrl: string; duration: number } | null>(null)
const addingTrack = ref(false)
const newCategoryName = ref('')
const newCategoryOpen = ref(false)

// ---- Composables ----------------------------------------------------------
const player = useAudioPlayer()
const library = useTrackLibrary('tiko:radio:tracks')
const categories = useCategories('tiko:radio:categories')
const youtubeMeta = useYouTubeMeta()

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
    volume: i18n.t(tikoI18nKeys.radio.volume),
    pickSomething: i18n.t(tikoI18nKeys.radio.categories.title),
    allTracks: i18n.t(tikoI18nKeys.radio.categories.all),
    manageVideos: i18n.t(tikoI18nKeys.radio.management.title),
    manageSubtitle: i18n.t(tikoI18nKeys.radio.management.subtitle),
    videosIn: (cat: string) => i18n.t(tikoI18nKeys.radio.management.videosIn, { category: cat }),
    addVideo: i18n.t(tikoI18nKeys.radio.management.addVideo),
    youtubeLink: i18n.t(tikoI18nKeys.radio.management.youtubeLink),
    displayNameLabel: i18n.t(tikoI18nKeys.radio.management.displayName),
    displayNamePlaceholder: i18n.t(tikoI18nKeys.radio.management.displayName),
    preview: i18n.t(tikoI18nKeys.radio.management.preview),
    addToCategory: i18n.t(tikoI18nKeys.radio.management.addToCategory),
    addVideoButton: i18n.t(tikoI18nKeys.radio.management.addVideoButton),
    parentOnly: i18n.t(tikoI18nKeys.radio.management.parentOnly),
    noVideos: i18n.t(tikoI18nKeys.radio.management.noVideos),
    newCategory: i18n.t(tikoI18nKeys.radio.management.newCategory),
    categoryName: i18n.t(tikoI18nKeys.radio.management.categoryName),
    createCategory: i18n.t(tikoI18nKeys.radio.management.createCategory),
    parentModeEnter: i18n.t(tikoI18nKeys.radio.parentMode.enter),
    parentModeExit: i18n.t(tikoI18nKeys.radio.parentMode.exit),
    uploadFile: i18n.t(tikoI18nKeys.radio.library.uploadFile),
    removeTrack: i18n.t(tikoI18nKeys.radio.library.removeTrack),
    adding: i18n.t(tikoI18nKeys.radio.library.adding),
  }
})

// ---- Header actions -------------------------------------------------------
const headerActions = computed(() => {
  const actions: Array<{ id: string; label: string; icon: string; active?: boolean; visible?: boolean }> = [
    {
      id: 'volume',
      label: labels.value.volume,
      icon: volume.value === 0
        ? 'ui/speaker-x'
        : volume.value < 0.5
          ? 'ui/speaker-low'
          : 'ui/speaker',
      active: volumeOpen.value,
    },
  ]

  // Parent mode toggle – only when logged in
  if (sessionToken.value) {
    actions.push({
      id: 'parent-mode',
      label: parentMode.value ? labels.value.parentModeExit : labels.value.parentModeEnter,
      icon: 'ui/shield',
      active: parentMode.value,
    })
  }

  actions.push(
    { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value },
    {
      id: 'avatar',
      label: sessionToken.value ? 'Account' : 'Log in',
      icon: sessionToken.value ? 'ui/user' : 'characters/pig',
    },
  )

  return actions
})

// ---- Computed helpers -----------------------------------------------------
const currentTrack = computed(() => {
  if (currentTrackIndex.value < 0 || !library.tracks.value.length) return null
  return library.tracks.value[currentTrackIndex.value] ?? null
})

const currentTrackName = computed(
  (): string => player.currentTrack.value?.title ?? currentTrack.value?.title ?? labels.value.noTracks,
)

const currentTrackArtist = computed(
  (): string => player.currentTrack.value?.artist ?? currentTrack.value?.artist ?? '',
)

const sortedCategories = computed(() =>
  [...categories.categories.value].sort((a, b) => a.order - b.order),
)

const filteredTracks = computed(() => {
  if (!selectedCategoryId.value) return library.tracks.value
  return library.tracks.value.filter((t) => t.categoryId === selectedCategoryId.value)
})

const manageTracks = computed(() => {
  if (!manageCategoryId.value) return library.tracks.value
  return library.tracks.value.filter((t) => t.categoryId === manageCategoryId.value)
})

const manageCategoryName = computed(() => {
  if (!manageCategoryId.value) return labels.value.allTracks
  const cat = categories.categories.value.find((c) => c.id === manageCategoryId.value)
  return cat?.name ?? labels.value.allTracks
})

const canAddVideo = computed(() => {
  const videoId = youtubeMeta.getVideoId(youtubeUrl.value)
  return !!videoId && !!addVideoCategoryId.value
})

// ---- Formatting ------------------------------------------------------------
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
    currentTrackIndex: currentTrackIndex.value,
  })
}

function saveIdentity(bundle: SessionBundle) {
  sessionToken.value = bundle.session.token
  writeJson(identityStorageKey, {
    userId: bundle.user.id,
    deviceId: bundle.device.id,
    deviceSecret: bundle.device.secret,
    sessionToken: bundle.session.token,
    expiresAt: bundle.session.expiresAt,
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
      platform: 'web',
    },
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
    library.tracks.value = state.tracks
  }
  // Hydrate categories from remote state (before local seed)
  if (Array.isArray(state.categories) && state.categories.length > 0) {
    for (const cat of state.categories) {
      if (!categories.categories.value.find((c) => c.id === cat.id)) {
        categories.addCategory(cat)
      }
    }
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
    dataClient.getState(appId, sessionToken.value),
  ])
  applySettings(settings.settings, settings.version)
  applyState(state.state, state.version)
}

async function persistSettingsRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putSettings(
      appId,
      sessionToken.value,
      {
        language: language.value,
        colorMode: colorMode.value,
        volume: volume.value,
      },
      { version: settingsVersion.value },
    )
    settingsVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next edit.
  }
}

async function persistStateRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putState(
      appId,
      sessionToken.value,
      {
        currentTrackIndex: currentTrackIndex.value,
        tracks: library.tracks.value,
        categories: categories.categories.value,
        shuffleEnabled: shuffleEnabled.value,
        repeatEnabled: repeatEnabled.value,
      },
      { version: stateVersion.value },
    )
    stateVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next change.
  }
}

// ---- Seed default categories -----------------------------------------------
function seedDefaultCategories() {
  if (categories.isEmpty.value) {
    const defaults: RadioCategory[] = [
      { id: 'animals', name: 'Animals', icon: '🐾', color: '#FFD93D', order: 0 },
      { id: 'farm', name: 'Farm', icon: '🚜', color: '#6BCB77', order: 1 },
      { id: 'bedtime', name: 'Bedtime', icon: '🌙', color: '#4D96FF', order: 2 },
      { id: 'songs', name: 'Songs', icon: '🎵', color: '#FF6B6B', order: 3 },
      { id: 'favorites', name: 'Favorites', icon: '⭐', color: '#FF922B', order: 4 },
    ]
    for (const cat of defaults) {
      categories.addCategory(cat)
    }
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

watch(categories.categories, () => {
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

// Auto-set addVideoCategoryId when manage tab changes
watch(manageCategoryId, (catId) => {
  if (catId && !addVideoCategoryId.value) {
    addVideoCategoryId.value = catId
  }
})

// Auto-fetch YouTube metadata when URL changes
watch(youtubeUrl, async (url) => {
  const videoId = youtubeMeta.getVideoId(url)
  if (videoId) {
    const meta = await youtubeMeta.fetchMeta(videoId)
    if (meta) {
      videoPreview.value = {
        title: meta.title,
        thumbnailUrl: meta.thumbnailUrl,
        duration: meta.duration,
      }
      if (!displayName.value) displayName.value = meta.title
    }
  } else {
    videoPreview.value = null
  }
})

// Set default manageCategoryId when entering parent mode
watch(parentMode, (isParent) => {
  if (isParent && !manageCategoryId.value && sortedCategories.value.length > 0) {
    manageCategoryId.value = sortedCategories.value[0].id
  }
  if (!isParent) {
    volumeOpen.value = false
    settingsOpen.value = false
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
    seedDefaultCategories()
  }
})

// ---- Event handlers --------------------------------------------------------
function headerAction(id: string) {
  if (id === 'settings') {
    settingsOpen.value = !settingsOpen.value
    volumeOpen.value = false
  }
  if (id === 'volume') {
    volumeOpen.value = !volumeOpen.value
    settingsOpen.value = false
  }
  if (id === 'parent-mode') {
    parentMode.value = !parentMode.value
  }
  if (id === 'avatar') {
    // When not logged in, open settings as entry point to identity flow
    if (!sessionToken.value) {
      settingsOpen.value = true
    }
  }
}

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

function playTrack(track: RadioTrack) {
  const index = library.tracks.value.findIndex((t) => t.id === track.id)
  if (index !== -1) selectTrack(index)
}

function getGlobalIndex(track: RadioTrack): number {
  return library.tracks.value.findIndex((t) => t.id === track.id)
}

function selectCategory(catId: string) {
  selectedCategoryId.value = selectedCategoryId.value === catId ? null : catId
}

function removeTrackByIndex(index: number) {
  if (index === currentTrackIndex.value) {
    player.stop()
  }
  library.removeTrackByIndex(index)
  const len = library.tracks.value.length
  if (currentTrackIndex.value >= len) {
    currentTrackIndex.value = len - 1
  }
  if (currentTrackIndex.value < 0) {
    currentTrackIndex.value = -1
  }
}

function removeTrackById(id: string) {
  const index = library.tracks.value.findIndex((t) => t.id === id)
  if (index !== -1) removeTrackByIndex(index)
}

async function handleAddVideo() {
  const url = youtubeUrl.value.trim()
  if (!url || !addVideoCategoryId.value) return

  const videoId = youtubeMeta.getVideoId(url)
  if (!videoId) return

  addingTrack.value = true
  try {
    // categoryId is supported by RadioTrack but not yet in useTrackLibrary's NewTrackInput
    // Type workaround: spread extra field which the composable passes through via ...track
    const track = library.addTrack({
      title: displayName.value || videoPreview.value?.title || `YouTube: ${videoId}`,
      source: 'youtube',
      youtubeVideoId: videoId,
      thumbnailUrl: videoPreview.value?.thumbnailUrl,
      duration: videoPreview.value?.duration,
      categoryId: addVideoCategoryId.value,
    } as Parameters<typeof library.addTrack>[0] & { categoryId: string })

    youtubeUrl.value = ''
    displayName.value = ''
    videoPreview.value = null

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
    audioUrl,
    categoryId: addVideoCategoryId.value || manageCategoryId.value || undefined,
  } as Parameters<typeof library.addTrack>[0] & { categoryId?: string })

  // Auto-play if nothing is playing
  if (!player.isPlaying.value) {
    currentTrackIndex.value = library.tracks.value.length - 1
    nextTick(() => player.play(track))
  }

  // Reset file input so the same file can be re-added
  input.value = ''
}

function handleCreateCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  const id = name.toLowerCase().replace(/\s+/g, '-')
  categories.addCategory({
    id,
    name,
    icon: '📁',
    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
    order: categories.categories.value.length,
  })
  newCategoryName.value = ''
  newCategoryOpen.value = false
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

      <!-- ==================== VOLUME POPOVER ==================== -->
      <div v-if="volumeOpen" class="radio-app__volume-popover">
        <div class="radio-app__volume-popover__inner">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            v-model.number="volume"
            aria-label="Volume"
          />
          <span class="radio-app__volume-popover__value">{{ Math.round(volume * 100) }}%</span>
        </div>
      </div>

      <!-- ==================== SETTINGS PANEL ==================== -->
      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
      />

      <!-- ==================== KID MODE (default) ==================== -->
      <div v-if="!parentMode" class="radio-app__kid">

        <!-- "Pick something to listen to" subtitle -->
        <p class="radio-app__pick-text">{{ labels.pickSomething }}</p>

        <!-- Horizontal scrollable category cards -->
        <div class="radio-app__categories">
          <button
            v-for="cat in sortedCategories"
            :key="cat.id"
            class="radio-app__category-card"
            :class="{ 'radio-app__category-card--active': selectedCategoryId === cat.id }"
            :style="{ '--cat-color': cat.color }"
            @click="selectCategory(cat.id)"
          >
            <span class="radio-app__category-card__icon">{{ cat.icon }}</span>
            <span class="radio-app__category-card__label">{{ cat.name }}</span>
          </button>
        </div>

        <!-- Track grid for selected category (or all) -->
        <div v-if="filteredTracks.length" class="radio-app__track-grid">
          <button
            v-for="track in filteredTracks"
            :key="track.id"
            class="radio-app__track-card"
            :class="{ 'radio-app__track-card--active': getGlobalIndex(track) === currentTrackIndex }"
            @click="playTrack(track)"
          >
            <img
              v-if="track.thumbnailUrl"
              :src="track.thumbnailUrl"
              class="radio-app__track-card__thumb"
              :alt="track.title"
              loading="lazy"
            />
            <div v-else class="radio-app__track-card__placeholder">🎵</div>
            <div class="radio-app__track-card__info">
              <span class="radio-app__track-card__title">{{ track.title }}</span>
              <span v-if="track.artist" class="radio-app__track-card__artist">{{ track.artist }}</span>
            </div>
          </button>
        </div>
        <p v-else class="radio-app__empty">{{ selectedCategoryId ? labels.noTracks : labels.pickSomething }}</p>

        <!-- Subtle shuffle / repeat toggles -->
        <div class="radio-app__extra-controls">
          <Button
            :variant="shuffleEnabled ? 'primary' : 'ghost'"
            icon="media/shuffle"
            icon-only
            @click="toggleShuffle"
            :aria-label="labels.shuffle"
          />
          <Button
            :variant="repeatEnabled ? 'primary' : 'ghost'"
            icon="media/repeat"
            icon-only
            @click="toggleRepeat"
            :aria-label="labels.repeat"
          />
        </div>
      </div>

      <!-- ==================== PARENT MODE ==================== -->
      <div v-else class="radio-app__manage">

        <!-- Header -->
        <div class="radio-app__manage__header">
          <h2 class="radio-app__manage__title">{{ labels.manageVideos }}</h2>
          <p class="radio-app__manage__subtitle">{{ labels.manageSubtitle }}</p>
          <p class="radio-app__manage__notice">🔒 {{ labels.parentOnly }}</p>
        </div>

        <!-- Category tabs -->
        <div class="radio-app__manage__tabs">
          <button
            v-for="cat in sortedCategories"
            :key="cat.id"
            class="radio-app__manage__tab"
            :class="{ 'radio-app__manage__tab--active': manageCategoryId === cat.id }"
            @click="manageCategoryId = cat.id"
          >
            {{ cat.icon }} {{ cat.name }}
          </button>
          <button
            class="radio-app__manage__tab radio-app__manage__tab--add"
            @click="newCategoryOpen = !newCategoryOpen"
          >
            + {{ labels.newCategory }}
          </button>
        </div>

        <!-- New category inline form -->
        <div v-if="newCategoryOpen" class="radio-app__manage__new-cat">
          <input
            v-model="newCategoryName"
            :placeholder="labels.categoryName"
            @keyup.enter="handleCreateCategory"
          />
          <Button
            variant="primary"
            :disabled="!newCategoryName.trim()"
            @click="handleCreateCategory"
          >
            {{ labels.createCategory }}
          </Button>
        </div>

        <!-- Two-column content: video list + add form -->
        <div class="radio-app__manage__content">

          <!-- Left: video list for selected category -->
          <div class="radio-app__manage__list">
            <h3>{{ labels.videosIn(manageCategoryName) }}</h3>
            <p v-if="manageTracks.length === 0" class="radio-app__manage__empty">{{ labels.noVideos }}</p>
            <div v-else class="radio-app__manage__video-list">
              <div
                v-for="track in manageTracks"
                :key="track.id"
                class="radio-app__manage__video-row"
              >
                <img
                  v-if="track.thumbnailUrl"
                  :src="track.thumbnailUrl"
                  class="radio-app__manage__video-thumb"
                  :alt="track.title"
                  loading="lazy"
                />
                <div v-else class="radio-app__manage__video-thumb-placeholder">🎵</div>
                <div class="radio-app__manage__video-info">
                  <span class="radio-app__manage__video-title">{{ track.title }}</span>
                  <span v-if="track.duration" class="radio-app__manage__video-duration">
                    {{ formatTime(track.duration) }}
                  </span>
                </div>
                <button
                  class="radio-app__manage__video-remove"
                  :aria-label="labels.removeTrack"
                  @click="removeTrackById(track.id)"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <!-- Right: add video form -->
          <div class="radio-app__manage__add">
            <h3>{{ labels.addVideo }}</h3>
            <div class="radio-app__manage__form">
              <label>{{ labels.youtubeLink }}</label>
              <input
                type="url"
                v-model="youtubeUrl"
                :placeholder="labels.youtubeLink"
                @keyup.enter="handleAddVideo"
              />

              <label>{{ labels.displayNameLabel }}</label>
              <input
                type="text"
                v-model="displayName"
                :placeholder="labels.displayNamePlaceholder"
              />

              <label>{{ labels.addToCategory }}</label>
              <select v-model="addVideoCategoryId">
                <option value="" disabled>Select category…</option>
                <option v-for="cat in sortedCategories" :key="cat.id" :value="cat.id">
                  {{ cat.icon }} {{ cat.name }}
                </option>
              </select>

              <!-- YouTube preview card -->
              <div v-if="videoPreview" class="radio-app__manage__preview">
                <span class="radio-app__manage__preview-label">{{ labels.preview }}</span>
                <div class="radio-app__manage__preview-card">
                  <img :src="videoPreview.thumbnailUrl" :alt="videoPreview.title" />
                  <div>
                    <span class="radio-app__manage__preview-title">{{ videoPreview.title }}</span>
                    <span v-if="videoPreview.duration" class="radio-app__manage__preview-duration">
                      {{ formatTime(videoPreview.duration) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- File upload alternative -->
              <label class="radio-app__manage__upload">
                {{ labels.uploadFile }}
                <input type="file" accept="audio/*" hidden @change="handleFileUpload" />
              </label>

              <Button
                variant="primary"
                :disabled="!canAddVideo || addingTrack"
                @click="handleAddVideo"
              >
                {{ addingTrack ? labels.adding : labels.addVideoButton }}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== NOW-PLAYING BAR ==================== -->
      <div v-if="player.currentTrack.value" class="radio-app__now-playing">
        <img
          v-if="player.currentTrack.value.thumbnailUrl"
          :src="player.currentTrack.value.thumbnailUrl"
          class="radio-app__now-playing__thumb"
          :alt="currentTrackName"
        />
        <div v-else class="radio-app__now-playing__thumb-placeholder">🎵</div>

        <div class="radio-app__now-playing__info">
          <span class="radio-app__now-playing__title">{{ currentTrackName }}</span>
          <span v-if="currentTrackArtist" class="radio-app__now-playing__artist">
            {{ currentTrackArtist }}
          </span>
        </div>

        <div
          class="radio-app__now-playing__progress"
          role="progressbar"
          :aria-valuenow="Math.round(player.progress.value * 100)"
          @click="handleProgressClick($event)"
        >
          <div
            class="radio-app__now-playing__progress-fill"
            :style="{ width: (player.progress.value * 100) + '%' }"
          />
        </div>

        <span class="radio-app__now-playing__time">
          {{ formatTime(player.currentTime.value) }} / {{ formatTime(player.duration.value) }}
        </span>

        <div class="radio-app__now-playing__transport">
          <Button
            variant="ghost"
            icon="media/skip-back"
            icon-only
            :disabled="library.isEmpty.value"
            @click="handlePrevious"
            :aria-label="labels.previous"
          />
          <Button
            variant="primary"
            :icon="player.isPlaying.value ? 'media/pause' : 'media/play'"
            icon-only
            @click="player.isPlaying.value ? handlePause() : handleResume()"
            :aria-label="player.isPlaying.value ? labels.pause : labels.play"
          />
          <Button
            variant="ghost"
            icon="media/skip-forward"
            icon-only
            :disabled="library.isEmpty.value"
            @click="handleNext"
            :aria-label="labels.next"
          />
        </div>
      </div>
    </section>
  </TikoAppShell>
</template>
