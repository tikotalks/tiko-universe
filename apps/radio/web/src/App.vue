<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick, inject, markRaw, h } from 'vue'
import { Icon as SilIcon, Popup } from '@sil/ui'
import type { PopupService } from '@sil/ui'
import { IdentityClient } from '@tiko/identity'
import { TikoDataClient, type RadioSettings, type RadioState } from '@tiko/data'
import type { RadioCategory, RadioServiceProvider, RadioTrack, TikoColorName } from '@tiko/data'
import { createI18n, createTikoIdentityLabels, createTikoShellLabels, normalizeTikoLanguage, tikoI18nKeys, tikoLanguageOptions, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoColorMode,
  normalizeTikoColorMode,
  readTikoLocalJson,
  resolveTikoAppApiBaseUrl,
  resolveTikoGenerationApiBaseUrl,
  resolveTikoIdentityBaseUrl,
  resolveTikoMediaApiBaseUrl,
  tikoColors,
  tikoImageUrl,
  useTikoAppDataRuntime,
  useTikoColorModeEffect,
  useTikoI18nRuntime,
  useIdentityRuntime,
  writeTikoLocalJson,
  type IdentityRuntimeState,
} from '@tiko/ui'
import { useAudioPlayer } from './composables/useAudioPlayer'
import { getPersistableRadioTracks, useTrackLibrary } from './composables/useTrackLibrary'
import { useCategories } from './composables/useCategories'
import { useYouTubeSearch } from './composables/useYouTubeSearch'
import { radioServiceFor, useSubscriptions } from './composables/useSubscriptions'
import {
  shareCodeFromLocation,
  toRadioTracks,
  useSharedCollections,
  type SharedCollection,
} from './composables/useSharedCollections'
import AddSongPopup, { type AddSongTrack } from './components/AddSongPopup.vue'
import ImportCollectionPopup from './components/ImportCollectionPopup.vue'
import ShareCollectionPopup from './components/ShareCollectionPopup.vue'
import CollectionFormPopup, { type CollectionFormValue } from './components/CollectionFormPopup.vue'
import ConfirmPopup from './components/ConfirmPopup.vue'
import ContextMenuPopup from './components/ContextMenuPopup.vue'
import ServicesPopup from './components/ServicesPopup.vue'
import SettingsPopup from './components/SettingsPopup.vue'
import {
  colorNamesForNewCollections,
  defaultRadioCollections,
  defaultSongsChannelId,
  defaultSongsCollectionId,
  defaultSongsCount,
  radioCollectionArtwork,
} from './radioCollections'
import { appConfig } from './appConfig'
import './styles.scss'

// ---- popupService (provided in main.ts) ------------------------------------
const popup = inject<PopupService>('popupService')!

// ---- Constants ------------------------------------------------------------
const storageKey = 'tiko:radio'
const seededSongsKey = 'tiko:radio:default-songs-seeded'
const appId = 'radio' as const
const apiBaseUrl = resolveTikoAppApiBaseUrl()
const identityBaseUrl = resolveTikoIdentityBaseUrl()
const generationApiBaseUrl = resolveTikoGenerationApiBaseUrl()
const mediaApiBaseUrl = resolveTikoMediaApiBaseUrl()
const longPressMs = 500

// ---- Interfaces -----------------------------------------------------------
interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  volume?: number
  shuffleEnabled?: boolean
  repeatEnabled?: boolean
  currentTrackIndex?: number
}

interface GeneratedStoryItem {
  id: string
  title: string
  description?: string | null
  audioUrl: string
  durationSeconds?: number | null
  fileSizeBytes?: number | null
  category?: string
  tags?: string[]
  createdAt: string
}

interface PublicAudioTrack {
  id: string
  title: string
  artist?: string | null
  audioUrl?: string | null
  durationSeconds?: number | null
  position?: number
}

interface PublicAudioAlbum {
  id: string
  title: string
  radioEnabled?: boolean
  tracks?: PublicAudioTrack[]
}

// ---- State initialization --------------------------------------------------
const stored = readTikoLocalJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: normalizeTikoLanguage(stored.language) })
const language = ref<TikoLanguage>(normalizeTikoLanguage(stored.language))
const colorMode = ref<TikoColorMode>(normalizeTikoColorMode(stored.colorMode))
const volume = ref(stored.volume ?? 1)
const shuffleEnabled = ref(stored.shuffleEnabled ?? false)
const repeatEnabled = ref(stored.repeatEnabled ?? false)
const currentTrackIndex = ref(stored.currentTrackIndex ?? -1)
const bootstrapped = ref(false)
const identityClient = new IdentityClient({ baseUrl: identityBaseUrl, credentials: 'include' })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })

// ---- Identity runtime (composable) ----------------------------------------
const runtimeState: IdentityRuntimeState = {
  sessionToken: ref(''),
  userId: ref(''),
  accountEmail: ref(''),
  accountEmailVerified: ref(false),
  displayName: ref(''),
  parentMode: ref(true),
  childModeEnabled: ref(false),
  pinConfigured: ref(false),
}
const runtime = useIdentityRuntime({
  identityClient,
  state: runtimeState,
  deviceName: 'Radio web',
  storageKey: 'tiko:identity:device-session',
  labels: () => createTikoIdentityLabels(i18n.t),
})
const dataRuntime = useTikoAppDataRuntime<typeof appId, RadioSettings, RadioState>({
  app: appId,
  sessionToken: runtimeState.sessionToken,
  bootstrapped,
  dataClient,
  readSettings: () => ({
    language: language.value,
    colorMode: colorMode.value,
    volume: volume.value,
  }),
  readState: () => ({
    currentTrackIndex: currentTrackIndex.value,
    tracks: getPersistableRadioTracks(library.tracks.value),
    categories: categories.categories.value,
    subscriptions: subscriptions.subscriptions.value,
    shuffleEnabled: shuffleEnabled.value,
    repeatEnabled: repeatEnabled.value,
  }),
  applySettings,
  applyState,
})

// ---- Kid / parent mode (aliases into runtimeState) -------------------------
const parentMode = runtimeState.parentMode
const selectedCategoryId = ref<string | null>(null)

// ---- Composables ----------------------------------------------------------
const player = useAudioPlayer()
const library = useTrackLibrary('tiko:radio:tracks')
const categories = useCategories('tiko:radio:categories')
const subscriptions = useSubscriptions('tiko:radio:subscriptions')
const youtubeSearch = useYouTubeSearch(mediaApiBaseUrl)
const sharedCollections = useSharedCollections(mediaApiBaseUrl)

// ---- Labels ---------------------------------------------------------------
const labels = computed(() => {
  return {
    appName: i18n.t(tikoI18nKeys.radio.appName),
    play: i18n.t(tikoI18nKeys.radio.player.play),
    pause: i18n.t(tikoI18nKeys.radio.player.pause),
    next: i18n.t(tikoI18nKeys.radio.player.next),
    previous: i18n.t(tikoI18nKeys.radio.player.previous),
    shuffle: i18n.t(tikoI18nKeys.radio.player.shuffle),
    repeat: i18n.t(tikoI18nKeys.radio.player.repeat),
    noTracks: i18n.t(tikoI18nKeys.radio.player.noTracks),
    volume: i18n.t(tikoI18nKeys.radio.volume),
    add: i18n.t(tikoI18nKeys.radio.add.menuTitle),
    addSong: i18n.t(tikoI18nKeys.radio.add.song),
    addCollection: i18n.t(tikoI18nKeys.radio.add.collection),
    removeTrack: i18n.t(tikoI18nKeys.radio.library.removeTrack),
    collectionSongs: i18n.t(tikoI18nKeys.radio.collections.songs),
    collectionEmpty: i18n.t(tikoI18nKeys.radio.collections.empty),
    collectionActions: i18n.t(tikoI18nKeys.radio.management.collectionActions),
    editCollection: i18n.t(tikoI18nKeys.radio.management.editCollection),
    deleteCollection: i18n.t(tikoI18nKeys.radio.management.deleteCollection),
    shareCollection: i18n.t(tikoI18nKeys.radio.share.shareCollection),
    importCollection: i18n.t(tikoI18nKeys.radio.import.title),
    services: i18n.t(tikoI18nKeys.radio.services.title),
    settings: i18n.t(tikoI18nKeys.common.settings),
    shell: createTikoShellLabels(i18n.t),
    settingsPanel: {
      settings: i18n.t(tikoI18nKeys.common.settings),
      language: i18n.t(tikoI18nKeys.common.language),
      appearance: i18n.t(tikoI18nKeys.common.appearance),
      appPreferences: i18n.t(tikoI18nKeys.common.appPreferences),
      colorMode: i18n.t(tikoI18nKeys.common.colorMode),
      light: i18n.t(tikoI18nKeys.common.colorModeOptions.light),
      dark: i18n.t(tikoI18nKeys.common.colorModeOptions.dark),
      system: i18n.t(tikoI18nKeys.common.colorModeOptions.system),
      // Linking a subscription is a parent job, so a child never sees the row.
      services: parentMode.value ? i18n.t(tikoI18nKeys.radio.services.title) : undefined,
    },
  }
})

const addSongLabels = computed(() => ({
  addSong: i18n.t(tikoI18nKeys.radio.add.song),
  youtube: 'YouTube',
  youtubeHint: i18n.t(tikoI18nKeys.radio.add.searchYouTube),
  upload: i18n.t(tikoI18nKeys.radio.library.uploadFile),
  uploadHint: i18n.t(tikoI18nKeys.radio.add.uploadHint),
  uploadTitle: i18n.t(tikoI18nKeys.radio.add.uploadTitle),
  chooseFile: i18n.t(tikoI18nKeys.radio.add.chooseFile),
  searchYouTube: i18n.t(tikoI18nKeys.radio.add.searchYouTube),
  searchPlaceholder: i18n.t(tikoI18nKeys.radio.add.searchPlaceholder),
  searchEmpty: i18n.t(tikoI18nKeys.radio.add.searchEmpty),
  searchUnavailable: i18n.t(tikoI18nKeys.radio.add.searchUnavailable),
  pasteLink: i18n.t(tikoI18nKeys.radio.add.pasteLink),
  pasteLinkPlaceholder: i18n.t(tikoI18nKeys.radio.add.pasteLinkPlaceholder),
  pasteServiceLink: i18n.t(tikoI18nKeys.radio.add.pasteServiceLink),
  pasteServiceLinkPlaceholder: i18n.t(tikoI18nKeys.radio.add.pasteServiceLinkPlaceholder),
  collection: i18n.t(tikoI18nKeys.radio.collections.title),
  toCollection: i18n.t(tikoI18nKeys.radio.add.toCollection),
  audioOnly: i18n.t(tikoI18nKeys.radio.add.audioOnly),
  linkNotRecognised: i18n.t(tikoI18nKeys.radio.add.linkNotRecognised),
  addFrom: i18n.t(tikoI18nKeys.radio.services.addFrom),
  back: i18n.t(tikoI18nKeys.common.back),
  close: i18n.t(tikoI18nKeys.common.identity.close),
  services: i18n.t(tikoI18nKeys.radio.services.title),
  servicesHint: i18n.t(tikoI18nKeys.radio.services.subtitle),
}))

const collectionFormLabels = computed(() => ({
  name: i18n.t(tikoI18nKeys.radio.collections.name),
  artwork: i18n.t(tikoI18nKeys.radio.collections.artwork),
  artworkSearch: i18n.t(tikoI18nKeys.radio.collections.artworkSearch),
  artworkEmpty: i18n.t(tikoI18nKeys.radio.collections.artworkEmpty),
  color: i18n.t(tikoI18nKeys.radio.collections.color),
  cancel: i18n.t(tikoI18nKeys.common.cancel),
}))

const colorValueByName = new Map(tikoColors.map(color => [color.name, color.hex]))

// ---- Volume icon ----------------------------------------------------------
const volumeIcon = computed(() => {
  if (volume.value === 0) return 'media/volume-mute'
  if (volume.value < 0.5) return 'media/volume-i'
  return 'media/volume-ii'
})

// ---- Header actions -------------------------------------------------------
const headerActions = computed(() => {
  const actions: Array<{ id: string; label: string; icon: string; active?: boolean; visible?: boolean }> = [
    {
      id: 'volume',
      label: labels.value.volume,
      icon: volumeIcon.value,
    },
    {
      id: 'add',
      label: labels.value.add,
      icon: 'ui/add-m',
    },
  ]

  // Child/parent mode toggle – only when logged in with a PIN set
  if (runtimeState.sessionToken.value && runtimeState.pinConfigured.value) {
    actions.push({
      id: 'toggle-mode',
      label: parentMode.value ? 'Child mode' : 'Parent mode',
      icon: 'ui/user-shield',
      active: !parentMode.value,
    })
  }

  actions.push(
    { id: 'settings', label: labels.value.settings, icon: 'ui/settings' },
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

const trackCountByCategory = computed(() => {
  const counts: Record<string, number> = {}
  for (const track of library.tracks.value) {
    if (track.categoryId) counts[track.categoryId] = (counts[track.categoryId] ?? 0) + 1
  }
  return counts
})

const sortedCategories = computed(() => [...categories.categories.value].sort((a, b) => a.order - b.order))

/**
 * A parent sees every collection, including the empty one they just made — it is
 * where the next song goes. A child only sees collections that have something to
 * play.
 */
const visibleCategories = computed(() => (
  parentMode.value
    ? sortedCategories.value
    : sortedCategories.value.filter(category => (trackCountByCategory.value[category.id] ?? 0) > 0)
))

const filteredTracks = computed(() => {
  if (!selectedCategoryId.value) return library.tracks.value
  return library.tracks.value.filter((t) => t.categoryId === selectedCategoryId.value)
})

const selectedCategory = computed(
  () => (selectedCategoryId.value ? categories.byId.value.get(selectedCategoryId.value) ?? null : null),
)

// ---- Formatting -----------------------------------------------------------
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function handleProgressClick(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  player.seek((event.clientX - rect.left) / rect.width)
}

function categorySubtitle(category: RadioCategory): string {
  const count = trackCountByCategory.value[category.id] ?? 0
  if (count === 0) return labels.value.collectionEmpty
  return labels.value.collectionSongs.replace('{count}', String(count))
}

function categoryColor(category: RadioCategory) {
  return colorValueByName.get(category.color) ?? colorValueByName.get('gray') ?? 'currentColor'
}

function categoryArtwork(category: RadioCategory): string {
  const url = radioCollectionArtwork(category)
  return url ? tikoImageUrl(url, 'medium') : ''
}

// ---- Persistence -----------------------------------------------------------
function saveLocalFallback() {
  writeTikoLocalJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    volume: volume.value,
    shuffleEnabled: shuffleEnabled.value,
    repeatEnabled: repeatEnabled.value,
    currentTrackIndex: currentTrackIndex.value,
  })
}

function applySettings(settings: RadioSettings) {
  language.value = normalizeTikoLanguage(settings.language)
  colorMode.value = normalizeTikoColorMode(settings.colorMode)
  if (typeof settings.volume === 'number' && settings.volume >= 0 && settings.volume <= 1) {
    volume.value = settings.volume
  }
}

function applyState(state: RadioState) {
  if (typeof state.currentTrackIndex === 'number' && state.currentTrackIndex >= 0) {
    currentTrackIndex.value = state.currentTrackIndex
  }
  if (Array.isArray(state.tracks) && state.tracks.length > 0) {
    library.tracks.value = state.tracks
  }
  if (Array.isArray(state.categories) && state.categories.length > 0) {
    categories.replaceCategories(state.categories)
  }
  if (Array.isArray(state.subscriptions)) {
    subscriptions.replaceSubscriptions(state.subscriptions)
  }
  if (typeof state.shuffleEnabled === 'boolean') {
    shuffleEnabled.value = state.shuffleEnabled
  }
  if (typeof state.repeatEnabled === 'boolean') {
    repeatEnabled.value = state.repeatEnabled
  }
}

// ---- Seeding ---------------------------------------------------------------
function seedDefaultCategories() {
  if (categories.isEmpty.value) {
    categories.replaceCategories(defaultRadioCollections)
  }
}

/**
 * First-run songs come from a curated kids' channel, fetched live, so the
 * library never carries a hardcoded video id that has since been taken down.
 */
async function seedDefaultSongs() {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem(seededSongsKey)) return
  if (library.tracks.value.length > 0) {
    window.localStorage.setItem(seededSongsKey, 'skipped')
    return
  }

  const videos = await youtubeSearch.search({ channelId: defaultSongsChannelId, limit: defaultSongsCount })
  if (videos.length === 0) return

  library.mergeTracks(videos.map(video => ({
    id: `youtube:${video.videoId}`,
    title: video.title,
    artist: video.channelTitle || undefined,
    source: 'youtube' as const,
    youtubeVideoId: video.videoId,
    thumbnailUrl: video.thumbnailUrl,
    duration: video.durationSeconds,
    categoryId: defaultSongsCollectionId,
    addedAt: new Date().toISOString(),
  })))
  window.localStorage.setItem(seededSongsKey, new Date().toISOString())
}

function absoluteGenerationUrl(url: string) {
  if (url.startsWith('http')) return url
  return `${generationApiBaseUrl}${url.replace('/v1/generation', '')}`
}

function absoluteMediaUrl(url: string) {
  if (url.startsWith('http')) return url
  return `${mediaApiBaseUrl}${url.replace('/v1', '')}`
}

async function syncPublicAudioAlbums() {
  try {
    const response = await fetch(`${mediaApiBaseUrl}/audio/albums?radioEnabled=true`)
    if (!response.ok) return
    const body = await response.json() as { data?: PublicAudioAlbum[] }
    const albumTracks: RadioTrack[] = (body.data ?? [])
      .flatMap(album => (album.tracks ?? [])
        .filter(track => track.audioUrl)
        .map(track => ({
          id: `audio-library:${album.id}:${track.id}`,
          title: track.title,
          artist: track.artist ?? album.title,
          source: 'r2' as const,
          audioUrl: absoluteMediaUrl(track.audioUrl ?? ''),
          categoryId: 'stories',
          duration: typeof track.durationSeconds === 'number' ? track.durationSeconds : undefined,
          addedAt: new Date().toISOString(),
        })))
    if (albumTracks.length > 0) library.mergeTracks(albumTracks)
  } catch {
    // Public albums are additive; keep local/generated fallback when Media API is offline.
  }
}

async function syncGeneratedStories() {
  try {
    const response = await fetch(`${generationApiBaseUrl}/stories?limit=50`)
    if (!response.ok) return
    const body = await response.json() as { data?: GeneratedStoryItem[] }
    const storyTracks: RadioTrack[] = (body.data ?? [])
      .filter(story => story.audioUrl)
      .map(story => ({
        id: `generated-story:${story.id}`,
        title: story.title,
        artist: 'Tiko Story Narrator',
        source: 'r2',
        audioUrl: absoluteGenerationUrl(story.audioUrl),
        categoryId: 'stories',
        duration: typeof story.durationSeconds === 'number' ? story.durationSeconds : undefined,
        addedAt: story.createdAt,
      }))
    if (storyTracks.length > 0) library.mergeTracks(storyTracks)
  } catch {
    // Generated stories are additive; radio remains usable if the generation API is offline.
  }
}

// ---- Watchers --------------------------------------------------------------
useTikoI18nRuntime({ app: appId, language, i18n })

useTikoColorModeEffect(colorMode)

watch([language, colorMode, volume], () => {
  saveLocalFallback()
  void dataRuntime.persistSettingsRemote()
})

watch([currentTrackIndex, shuffleEnabled, repeatEnabled], () => {
  saveLocalFallback()
  void dataRuntime.persistStateRemote()
})

watch(library.tracks, () => {
  saveLocalFallback()
  void dataRuntime.persistStateRemote()
}, { deep: true })

watch([categories.categories, subscriptions.subscriptions], () => {
  void dataRuntime.persistStateRemote()
}, { deep: true })

// Volume sync to player
watch(volume, (v) => {
  player.setVolume(v)
}, { immediate: true })

// Track ended auto-advance
watch(player.endedCount, () => {
  if (!player.currentTrack.value) return
  if (repeatEnabled.value) {
    player.play(player.currentTrack.value)
    return
  }
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
})

// ---- Lifecycle -------------------------------------------------------------
onMounted(async () => {
  try {
    await runtime.bootstrapIdentity()
    await dataRuntime.hydrateRemoteData()
    void runtime.loadProfile()
  } catch {
    // Keep the child-facing local flow available when API bootstrap is offline.
  } finally {
    bootstrapped.value = true
    saveLocalFallback()
    seedDefaultCategories()
    void syncPublicAudioAlbums()
    void syncGeneratedStories()
    void seedDefaultSongs()
    void handleSharedCollectionLink()
  }
})

// ---- Popup helpers --------------------------------------------------------
function openVolumePopup() {
  popup.showPopup({
    component: markRaw({
      props: { volume: { type: Number, default: 1 } },
      emits: ['update:volume'],
      setup(props: any, { emit }: any) {
        const vol = ref(props.volume)
        return () => h('div', { class: 'radio-app__volume-popup', onClick: (e: Event) => e.stopPropagation() }, [
          h('div', { class: 'radio-app__volume-popup__inner' }, [
            h('input', {
              type: 'range',
              min: '0',
              max: '1',
              step: '0.05',
              onInput: (event: Event) => {
                vol.value = parseFloat((event.target as HTMLInputElement).value)
                emit('update:volume', vol.value)
              },
              value: vol.value,
            }),
            h('span', { class: 'radio-app__volume-popup__value' }, `${Math.round(vol.value * 100)}%`),
          ]),
        ])
      },
    }),
    title: '',
    props: { volume: volume.value },
    config: { position: 'center', canClose: true, background: true, width: '16rem' },
    on: {
      'update:volume': (v: unknown) => {
        volume.value = v as number
      },
    },
    onClose: () => {},
  })
}

function openSettingsPopup() {
  popup.showPopup({
    component: markRaw(SettingsPopup),
    title: '',
    props: { language: language.value, languages: tikoLanguageOptions, colorMode: colorMode.value, labels: labels.value.settingsPanel },
    config: { position: 'center', canClose: true, background: true, width: '24rem' },
    on: {
      'update:language': (...args: unknown[]) => { language.value = args[0] as TikoLanguage },
      'update:colorMode': (...args: unknown[]) => { colorMode.value = args[0] as TikoColorMode },
      'open-services': () => openServicesPopup(),
    },
  })
}

/** The + button asks what to add rather than assuming a song. */
function openAddMenu() {
  popup.showPopup({
    component: markRaw(ContextMenuPopup),
    title: '',
    props: {
      title: labels.value.add,
      items: [
        { id: 'song', label: labels.value.addSong, icon: 'media/music-note' },
        { id: 'collection', label: labels.value.addCollection, icon: 'ui/folder' },
        { id: 'scan', label: labels.value.importCollection, icon: 'ui/rounded-square-grid' },
      ],
    },
    config: { position: 'center', canClose: true, background: true, width: '18rem' },
    on: {
      select: (...args: unknown[]) => {
        if (args[0] === 'song') openAddSongPopup(selectedCategoryId.value ?? undefined)
        if (args[0] === 'collection') openCollectionForm()
        if (args[0] === 'scan') openImportPopup()
      },
    },
  })
}

/** Scan a Tiko code, type one, or take a ready-made set. */
function openImportPopup(collection: SharedCollection | null = null) {
  popup.showPopup({
    component: markRaw(ImportCollectionPopup),
    title: '',
    props: {
      collection,
      labels: {
        title: i18n.t(tikoI18nKeys.radio.import.title),
        subtitle: i18n.t(tikoI18nKeys.radio.import.subtitle),
        scan: i18n.t(tikoI18nKeys.radio.import.scan),
        scanHint: i18n.t(tikoI18nKeys.radio.import.scanHint),
        scanUnsupported: i18n.t(tikoI18nKeys.radio.import.scanUnsupported),
        cameraBlocked: i18n.t(tikoI18nKeys.radio.import.cameraBlocked),
        codeLabel: i18n.t(tikoI18nKeys.radio.import.codeLabel),
        codePlaceholder: i18n.t(tikoI18nKeys.radio.import.codePlaceholder),
        find: i18n.t(tikoI18nKeys.radio.import.find),
        notFound: i18n.t(tikoI18nKeys.radio.import.notFound),
        featured: i18n.t(tikoI18nKeys.radio.import.featured),
        songs: i18n.t(tikoI18nKeys.radio.collections.songs),
        import: i18n.t(tikoI18nKeys.radio.import.addCollection),
        close: i18n.t(tikoI18nKeys.common.identity.close),
      },
    },
    config: { position: 'center', canClose: true, background: true, width: '26rem' },
    on: {
      import: (...args: unknown[]) => importSharedCollection(args[0] as SharedCollection),
    },
  })
}

/** Hand a collection to another family: a QR to scan, or a code to read out. */
function openSharePopup(category: RadioCategory) {
  popup.showPopup({
    component: markRaw(ShareCollectionPopup),
    title: '',
    props: {
      collection: { ...category, imageUrl: radioCollectionArtwork(category) },
      tracks: library.tracksInCategory(category.id),
      sessionToken: runtimeState.sessionToken.value,
      labels: {
        title: i18n.t(tikoI18nKeys.radio.share.title),
        subtitle: i18n.t(tikoI18nKeys.radio.share.subtitle),
        publishing: i18n.t(tikoI18nKeys.radio.share.publishing),
        codeLabel: i18n.t(tikoI18nKeys.radio.share.codeLabel),
        copyLink: i18n.t(tikoI18nKeys.radio.share.copyLink),
        copied: i18n.t(tikoI18nKeys.radio.share.copied),
        skipped: i18n.t(tikoI18nKeys.radio.share.skipped),
        failed: i18n.t(tikoI18nKeys.radio.share.failed),
        close: i18n.t(tikoI18nKeys.common.identity.close),
      },
    },
    config: { position: 'center', canClose: true, background: true, width: '24rem' },
  })
}

function openAddSongPopup(collectionId?: string) {
  popup.showPopup({
    component: markRaw(AddSongPopup),
    title: '',
    props: {
      collections: sortedCategories.value,
      collectionId: collectionId ?? '',
      linkedProviders: subscriptions.linkedProviders.value,
      labels: addSongLabels.value,
    },
    config: { position: 'center', canClose: true, background: true, width: '28rem' },
    on: {
      add: (...args: unknown[]) => addSong(args[0] as AddSongTrack),
      upload: (...args: unknown[]) => uploadSong(args[0] as { title: string; file: File; categoryId: string }),
      'open-services': () => openServicesPopup(),
    },
    onClose: () => {},
  })
}

function openCollectionForm(category?: RadioCategory) {
  popup.showPopup({
    component: markRaw(CollectionFormPopup),
    title: '',
    props: {
      title: category ? labels.value.editCollection : labels.value.addCollection,
      submitLabel: category ? i18n.t(tikoI18nKeys.common.save) : i18n.t(tikoI18nKeys.common.create),
      name: category?.name ?? '',
      color: category?.color ?? nextCollectionColor(),
      imageUrl: category ? radioCollectionArtwork(category) : '',
      labels: collectionFormLabels.value,
    },
    config: { position: 'center', canClose: true, background: true, width: '26rem' },
    on: {
      submit: (...args: unknown[]) => {
        const value = args[0] as CollectionFormValue
        if (category) {
          categories.updateCategory(category.id, { name: value.name, color: value.color, imageUrl: value.imageUrl })
          return
        }
        const created = categories.addCategory({
          name: value.name,
          icon: 'media/music-note',
          color: value.color,
          imageUrl: value.imageUrl,
        })
        selectedCategoryId.value = created.id
      },
    },
  })
}

/** Long press (or right click) on a collection: edit or delete. */
function openCollectionMenu(category: RadioCategory) {
  if (!parentMode.value) return
  popup.showPopup({
    component: markRaw(ContextMenuPopup),
    title: '',
    props: {
      title: category.name,
      subtitle: labels.value.collectionActions,
      items: [
        { id: 'edit', label: labels.value.editCollection, icon: 'ui/edit-m' },
        { id: 'share', label: labels.value.shareCollection, icon: 'arrows/arrow-share' },
        { id: 'delete', label: labels.value.deleteCollection, icon: 'ui/trash', destructive: true },
      ],
    },
    config: { position: 'center', canClose: true, background: true, width: '18rem' },
    on: {
      select: (...args: unknown[]) => {
        if (args[0] === 'edit') openCollectionForm(category)
        if (args[0] === 'share') openSharePopup(category)
        if (args[0] === 'delete') confirmDeleteCollection(category)
      },
    },
  })
}

/** Deleting a collection deletes its songs, so the warning says so by name. */
function confirmDeleteCollection(category: RadioCategory) {
  const count = library.tracksInCategory(category.id).length
  const message = count > 0
    ? i18n.t(tikoI18nKeys.radio.management.deleteCollectionWarning, { collection: category.name, count })
    : i18n.t(tikoI18nKeys.radio.management.deleteCollectionWarningEmpty, { collection: category.name })

  popup.showPopup({
    component: markRaw(ConfirmPopup),
    title: '',
    props: {
      title: labels.value.deleteCollection,
      message,
      confirmLabel: i18n.t(tikoI18nKeys.common.delete),
      cancelLabel: i18n.t(tikoI18nKeys.common.cancel),
      destructive: true,
    },
    config: { position: 'center', canClose: true, background: true, width: '22rem' },
    on: {
      confirm: () => deleteCollection(category.id),
    },
  })
}

function openServicesPopup() {
  popup.showPopup({
    component: markRaw(ServicesPopup),
    title: '',
    props: {
      subscriptions: subscriptions.subscriptions.value,
      labels: {
        title: i18n.t(tikoI18nKeys.radio.services.title),
        subtitle: i18n.t(tikoI18nKeys.radio.services.subtitle),
        link: i18n.t(tikoI18nKeys.radio.services.link),
        unlink: i18n.t(tikoI18nKeys.radio.services.unlink),
        linked: i18n.t(tikoI18nKeys.radio.services.linked),
        spotifyHint: i18n.t(tikoI18nKeys.radio.services.spotifyHint),
        appleMusicHint: i18n.t(tikoI18nKeys.radio.services.appleMusicHint),
      },
    },
    config: { position: 'center', canClose: true, background: true, width: '26rem' },
    on: {
      link: (...args: unknown[]) => { subscriptions.link(args[0] as RadioServiceProvider) },
      unlink: (...args: unknown[]) => { subscriptions.unlink(args[0] as RadioServiceProvider) },
    },
  })
}

// ---- Library mutations -----------------------------------------------------
function nextCollectionColor(): TikoColorName {
  const index = categories.categories.value.length % colorNamesForNewCollections.length
  return colorNamesForNewCollections[index] as TikoColorName
}

function addSong(track: AddSongTrack) {
  const newTrack = library.addTrack(track)
  if (!player.isPlaying.value) {
    currentTrackIndex.value = library.tracks.value.length - 1
    nextTick(() => player.play(newTrack))
  }
}

function uploadSong(data: { title: string; file: File; categoryId: string }) {
  const audioUrl = URL.createObjectURL(data.file)
  const newTrack = library.addTrack({
    title: data.title,
    source: 'upload',
    audioUrl,
    categoryId: data.categoryId,
  })
  if (!player.isPlaying.value) {
    currentTrackIndex.value = library.tracks.value.length - 1
    nextTick(() => player.play(newTrack))
  }
}

/** A scanned collection becomes a real collection, with its songs, right away. */
function importSharedCollection(collection: SharedCollection) {
  const created = categories.addCategory({
    id: uniqueCollectionId(collection.name),
    name: collection.name,
    icon: 'media/music-note',
    color: (collection.color || 'red') as TikoColorName,
    imageUrl: collection.imageUrl,
  })
  library.mergeTracks(toRadioTracks(collection, created.id))
  selectedCategoryId.value = created.id
}

/** Importing the same set twice makes a second shelf, never overwrites the first. */
function uniqueCollectionId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'collection'
  const taken = categories.byId.value
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

/**
 * A QR scanned with the phone's own camera opens Radio on the collection, so
 * the app answers `?collection=CODE` by offering the import straight away.
 */
async function handleSharedCollectionLink() {
  if (typeof window === 'undefined') return
  const code = shareCodeFromLocation(window.location.href)
  if (!code) return

  // Take the code out of the URL so a refresh does not ask again.
  const url = new URL(window.location.href)
  url.searchParams.delete('collection')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)

  const collection = await sharedCollections.fetchByCode(code)
  openImportPopup(collection)
}

function deleteCollection(categoryId: string) {
  if (player.currentTrack.value?.categoryId === categoryId) player.stop()
  library.removeTracksInCategory(categoryId)
  categories.removeCategory(categoryId)
  if (selectedCategoryId.value === categoryId) selectedCategoryId.value = null
  clampTrackIndex()
}

function clampTrackIndex() {
  const len = library.tracks.value.length
  if (currentTrackIndex.value >= len) currentTrackIndex.value = len - 1
  if (currentTrackIndex.value < 0) currentTrackIndex.value = -1
}

// ---- Event handlers --------------------------------------------------------
function headerAction(id: string) {
  if (id === 'settings') {
    openSettingsPopup()
  }
  if (id === 'volume') {
    openVolumePopup()
  }
  if (id === 'toggle-mode') {
    runtime.openParentCodePopup()
  }
  if (id === 'add') {
    if (!parentMode.value) return // Can't add in child mode
    openAddMenu()
  }
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

function removeTrackById(id: string) {
  const index = library.tracks.value.findIndex((t) => t.id === id)
  if (index !== -1) {
    if (index === currentTrackIndex.value) {
      player.stop()
    }
    library.removeTrackByIndex(index)
    clampTrackIndex()
  }
}

// ---- Long press ------------------------------------------------------------
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let longPressFired = false

function startLongPress(category: RadioCategory) {
  cancelLongPress()
  longPressFired = false
  longPressTimer = setTimeout(() => {
    longPressFired = true
    openCollectionMenu(category)
  }, longPressMs)
}

function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

/** A press that became a long press opens the menu and does not also select. */
function handleCategoryClick(category: RadioCategory) {
  cancelLongPress()
  if (longPressFired) {
    longPressFired = false
    return
  }
  selectCategory(category.id)
}

function trackIsExternal(track: RadioTrack): boolean {
  return track.source === 'spotify' || track.source === 'apple-music'
}

function trackServiceName(track: RadioTrack): string {
  return track.source === 'spotify' ? radioServiceFor('spotify').name : radioServiceFor('apple-music').name
}
</script>

<template>
  <TikoAppShell
    :app-name="labels.appName"
    :app-icon="appConfig.appIcon"
    :app-icon-image-url="appConfig.appIconImageUrl"
    :app-icon-media-category="appConfig.appIconMediaCategory"
    :app-color="appConfig.appColor"
    :theme-color="appConfig.themeColor"
    avatar="ui/circle-user"
    :actions="headerActions"
    :labels="labels.shell"
    @header-action="headerAction"
    @avatar-click="runtime.handleAvatarClick"
  >
    <section class="radio-app" :data-color-mode="colorMode">

      <!-- Popup host (renders popupService.popups) -->
      <Popup />

      <!-- ==================== CONTENT (shared by both modes) ==================== -->
      <div class="radio-app__content">

        <!-- Collection cards -->
        <div v-if="visibleCategories.length" class="radio-app__categories">
          <button
            v-for="cat in visibleCategories"
            :key="cat.id"
            class="radio-app__category-card"
            :class="{ 'radio-app__category-card--active': selectedCategoryId === cat.id }"
            :style="{ '--cat-color': categoryColor(cat) }"
            :data-test="`radio-collection-${cat.id}`"
            @click="handleCategoryClick(cat)"
            @pointerdown="startLongPress(cat)"
            @pointerup="cancelLongPress"
            @pointerleave="cancelLongPress"
            @pointercancel="cancelLongPress"
            @contextmenu.prevent="openCollectionMenu(cat)"
          >
            <span class="radio-app__category-card__art">
              <img
                v-if="categoryArtwork(cat)"
                :src="categoryArtwork(cat)"
                :alt="cat.name"
                class="radio-app__category-card__image"
                loading="lazy"
              />
              <SilIcon v-else :name="cat.icon" size="large" />
            </span>
            <span class="radio-app__category-card__label">{{ cat.name }}</span>
            <span class="radio-app__category-card__count">{{ categorySubtitle(cat) }}</span>
          </button>
        </div>

        <!-- Track grid -->
        <div v-if="filteredTracks.length" class="radio-app__track-grid">
          <div
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
              <span v-if="trackIsExternal(track)" class="radio-app__track-card__service">
                {{ trackServiceName(track) }}
              </span>
            </div>
            <!-- Parent mode: delete button on track card -->
            <button
              v-if="parentMode"
              class="radio-app__track-card__remove"
              :aria-label="labels.removeTrack"
              @click.stop="removeTrackById(track.id)"
            >
              ×
            </button>
          </div>
        </div>
        <p v-else class="radio-app__empty">
          {{ selectedCategory ? labels.collectionEmpty : labels.noTracks }}
        </p>
      </div>

      <!-- ==================== FLOATING PLAYER ==================== -->
      <div v-if="player.currentTrack.value" class="radio-app__player">
        <!-- Progress bar on top -->
        <div
          class="radio-app__player__progress"
          role="progressbar"
          :aria-valuenow="Math.round(player.progress.value * 100)"
          @click="handleProgressClick($event)"
        >
          <div
            class="radio-app__player__progress-fill"
            :style="{ width: (player.progress.value * 100) + '%' }"
          />
        </div>

        <!-- Main player content -->
        <div class="radio-app__player__body">
          <!-- Thumbnail -->
          <img
            v-if="player.currentTrack.value.thumbnailUrl"
            :src="player.currentTrack.value.thumbnailUrl"
            class="radio-app__player__thumb"
            :alt="currentTrackName"
          />
          <div v-else class="radio-app__player__thumb-placeholder">
            <span>🎵</span>
          </div>

          <!-- Info -->
          <div class="radio-app__player__info">
            <span class="radio-app__player__title">{{ currentTrackName }}</span>
            <span v-if="currentTrackArtist" class="radio-app__player__artist">
              {{ currentTrackArtist }}
            </span>
            <span class="radio-app__player__elapsed">{{ formatTime(player.currentTime.value) }}</span>
          </div>

          <!-- Transport -->
          <div class="radio-app__player__transport">
            <button
              class="radio-app__player__transport-btn radio-app__player__transport-btn--small"
              :disabled="library.isEmpty.value"
              @click="handlePrevious"
              :aria-label="labels.previous"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/></svg>
            </button>

            <button
              class="radio-app__player__transport-btn radio-app__player__transport-btn--play"
              @click="player.isPlaying.value ? handlePause() : handleResume()"
              :aria-label="player.isPlaying.value ? labels.pause : labels.play"
            >
              <svg v-if="player.isPlaying.value" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
              <svg v-else viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
            </button>

            <button
              class="radio-app__player__transport-btn radio-app__player__transport-btn--small"
              :disabled="library.isEmpty.value"
              @click="handleNext"
              :aria-label="labels.next"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  </TikoAppShell>
</template>
