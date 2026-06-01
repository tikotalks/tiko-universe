<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick, inject, markRaw, h } from 'vue'
import { Button, Popup } from '@sil/ui'
import type { PopupService } from '@sil/ui'
import { IdentityClient, type SessionBundle } from '@tiko/identity'
import { TikoDataClient, type RadioSettings, type RadioState } from '@tiko/data'
import type { RadioTrack, RadioCategory } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoColorMode,
} from '@tiko/ui'
import { useAudioPlayer } from './composables/useAudioPlayer'
import { useTrackLibrary } from './composables/useTrackLibrary'
import { useCategories } from './composables/useCategories'
import AddAudioPopup from './components/AddAudioPopup.vue'
import SettingsPopup from './components/SettingsPopup.vue'
import PinPopup from './components/PinPopup.vue'
import './styles.scss'

// ---- popupService (provided in main.ts) ------------------------------------
const popup = inject<PopupService>('popupService')!

// ---- Constants ------------------------------------------------------------
const storageKey = 'tiko:radio'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'radio' as const
const apiBaseUrl = resolveApiBaseUrl()
const generationApiBaseUrl = resolveGenerationApiBaseUrl()

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

// ---- Utility functions ----------------------------------------------------
function resolveApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_API_BASE_URL ?? 'https://api.tikotalks.com/v1').replace(/\/$/, '')
}

function resolveGenerationApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_GENERATION_API_URL ?? 'https://dev.api.tikotalks.com/v1/generation').replace(/\/$/, '')
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

// ---- State initialization --------------------------------------------------
const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const volume = ref(stored.volume ?? 1)
const shuffleEnabled = ref(stored.shuffleEnabled ?? false)
const repeatEnabled = ref(stored.repeatEnabled ?? false)
const currentTrackIndex = ref(stored.currentTrackIndex ?? -1)
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const bootstrapped = ref(false)
const identityClient = new IdentityClient({ baseUrl: apiBaseUrl })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })

// ---- Kid / parent mode ----------------------------------------------------
const parentMode = ref(true)
const pinHash = ref<string | undefined>()
const selectedCategoryId = ref<string | null>(null)
const newCategoryName = ref('')
const newCategoryOpen = ref(false)
const userId = ref<string>('')
const isRecoverable = ref(false)

// ---- Composables ----------------------------------------------------------
const player = useAudioPlayer()
const library = useTrackLibrary('tiko:radio:tracks')
const categories = useCategories('tiko:radio:categories')

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
    volume: i18n.t(tikoI18nKeys.radio.volume),
    addVideo: i18n.t(tikoI18nKeys.radio.management.addVideo),
    parentOnly: i18n.t(tikoI18nKeys.radio.management.parentOnly),
    noVideos: i18n.t(tikoI18nKeys.radio.management.noVideos),
    newCategory: i18n.t(tikoI18nKeys.radio.management.newCategory),
    categoryName: i18n.t(tikoI18nKeys.radio.management.categoryName),
    createCategory: i18n.t(tikoI18nKeys.radio.management.createCategory),
    removeTrack: i18n.t(tikoI18nKeys.radio.library.removeTrack),
    uploadFile: i18n.t(tikoI18nKeys.radio.library.uploadFile),
    login: 'Log in',
    magicLinkSent: 'Check your email!',
    magicLinkHint: 'We sent a magic link to',
    sendMagicLink: 'Send magic link',
    logout: 'Log out',
  }
})

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
      id: 'add-video',
      label: labels.value.addVideo,
      icon: 'ui/add-m',
    },
  ]

  // Child/parent mode toggle – only when logged in with a PIN set
  if (sessionToken.value && pinHash.value) {
    actions.push({
      id: 'toggle-mode',
      label: parentMode.value ? 'Child mode' : 'Parent mode',
      icon: 'ui/user-shield',
      active: !parentMode.value,
    })
  }

  actions.push(
    { id: 'settings', label: 'Settings', icon: 'ui/settings' },
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

const hasCategories = computed(() => categories.categories.value.length > 0)

const categoriesWithTracks = computed(() =>
  [...categories.categories.value]
    .sort((a, b) => a.order - b.order)
    .filter(cat => library.tracks.value.some(t => t.categoryId === cat.id)),
)

const hasAnyVideos = computed(() => library.tracks.value.length > 0)

const filteredTracks = computed(() => {
  if (!selectedCategoryId.value) return library.tracks.value
  return library.tracks.value.filter((t) => t.categoryId === selectedCategoryId.value)
})


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

// ---- Persistence -----------------------------------------------------------
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
  userId.value = bundle.user.id
  isRecoverable.value = bundle.user.kind === 'recoverable'
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
  if (typeof settings.pinHash === 'string' && settings.pinHash) {
    pinHash.value = settings.pinHash
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
        pinHash: pinHash.value,
      },
      { version: settingsVersion.value },
    )
    settingsVersion.value = response.version
  } catch {
    // Local fallback is already written
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
    // Local fallback is already written
  }
}

// ---- Seed default categories -----------------------------------------------
function seedDefaultCategories() {
  if (categories.isEmpty.value) {
    const defaults: RadioCategory[] = [
      { id: 'animals', name: 'Animals', icon: '🐾', color: '#FFD93D', order: 0 },
      { id: 'stories', name: 'Stories', icon: '📖', color: '#C3AED6', order: 1 },
      { id: 'bedtime', name: 'Bedtime', icon: '🌙', color: '#A8D8EA', order: 2 },
      { id: 'songs', name: 'Songs', icon: '🎵', color: '#FFB3C1', order: 3 },
    ]
    for (const cat of defaults) {
      categories.addCategory(cat)
    }
  }
}

function absoluteGenerationUrl(url: string) {
  if (url.startsWith('http')) return url
  return `${generationApiBaseUrl}${url.replace('/v1/generation', '')}`
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
    seedDefaultCategories()
    void syncGeneratedStories()
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
              'onUpdate:modelValue': (v: string) => {
                vol.value = parseFloat(v)
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
    props: { language: language.value, colorMode: colorMode.value },
    config: { position: 'center', canClose: true, background: true, width: '24rem' },
    on: {
      'update:language': (...args: unknown[]) => { language.value = args[0] as TikoLanguage },
      'update:colorMode': (...args: unknown[]) => { colorMode.value = args[0] as TikoColorMode },
    },
  })
}

function openPinPopup() {
  popup.showPopup({
    component: markRaw(PinPopup),
    title: '',
    props: { existingHash: pinHash.value },
    config: { position: 'center', canClose: true, background: true, width: '22rem' },
    on: {
      set: (...args: unknown[]) => {
        const hash = args[0] as string
        if (!pinHash.value) {
          // First time: save PIN hash, switch to child mode
          pinHash.value = hash
          parentMode.value = false
          persistSettingsRemote()
        } else {
          // Verification passed: toggle mode
          parentMode.value = !parentMode.value
        }
      },
      cancel: () => {},
    },
  })
}

function openAddAudioPopup() {
  popup.showPopup({
    component: markRaw(AddAudioPopup),
    title: '',
    props: { hasEmail: isRecoverable.value },
    config: { position: 'center', canClose: true, background: true, width: '28rem' },
    on: {
      add: (track: unknown) => {
        const t = track as Parameters<typeof library.addTrack>[0] & { categoryId?: string }
        const newTrack = library.addTrack(t)
        // Auto-play if nothing is playing
        if (!player.isPlaying.value) {
          currentTrackIndex.value = library.tracks.value.length - 1
          nextTick(() => player.play(newTrack))
        }
      },
      upload: (data: unknown) => {
        const d = data as { title: string; source: 'upload'; file: File; categoryId?: string }
        const audioUrl = URL.createObjectURL(d.file)
        const newTrack = library.addTrack({
          title: d.title,
          source: 'upload',
          audioUrl,
        } as Parameters<typeof library.addTrack>[0] & { categoryId?: string })
        if (!player.isPlaying.value) {
          currentTrackIndex.value = library.tracks.value.length - 1
          nextTick(() => player.play(newTrack))
        }
      },
      close: () => {},
    },
    onClose: () => {},
  })
}

function openLoginPopup() {
  popup.showPopup({
    component: markRaw({
      setup() {
        const email = ref('')
        const code = ref('')
        const sent = ref(false)
        const loading = ref(false)
        const verifyError = ref('')

        async function sendCode() {
          if (!email.value.trim()) return
          loading.value = true
          verifyError.value = ''
          try {
            await identityClient.requestRecoveryEmail({ email: email.value.trim() })
            sent.value = true
          } catch {
            verifyError.value = 'Could not send the code. Please try again.'
          } finally {
            loading.value = false
          }
        }

        async function verifyCode() {
          const digits = code.value.replace(/\s/g, '')
          if (digits.length !== 6) return
          loading.value = true
          verifyError.value = ''
          try {
            const bundle = await identityClient.verifyOtp(digits)
            saveIdentity(bundle)
            popup.closeAllPopups()
          } catch {
            verifyError.value = 'Invalid or expired code. Try again or resend.'
          } finally {
            loading.value = false
          }
        }

        return () => h('div', { class: 'radio-app__login-popup' }, [
          h('h3', { class: 'radio-app__login-popup__title' }, 'Log in'),
          sent.value
            ? [
                h('p', { class: 'radio-app__login-popup__sent-text' }, `Code sent to ${email.value}`),
                h('label', { class: 'radio-app__login-popup__label' }, [
                  'Sign-in code',
                  h('input', {
                    type: 'text',
                    inputmode: 'numeric',
                    autocomplete: 'one-time-code',
                    value: code.value,
                    maxlength: 7,
                    placeholder: '123 456',
                    class: 'radio-app__login-popup__otp',
                    onInput: (e: Event) => { code.value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6) },
                    onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') verifyCode() },
                  }),
                ]),
                verifyError.value ? h('p', { class: 'radio-app__login-popup__error' }, verifyError.value) : null,
                h('button', {
                  class: 'radio-app__login-popup__submit',
                  disabled: code.value.replace(/\s/g, '').length !== 6 || loading.value,
                  onClick: verifyCode,
                }, loading.value ? 'Checking…' : 'Verify code'),
                h('button', {
                  class: 'radio-app__login-popup__back',
                  onClick: () => { sent.value = false; code.value = ''; verifyError.value = '' },
                }, 'Use a different email'),
              ]
            : [
                h('label', { class: 'radio-app__login-popup__label' }, [
                  'Email',
                  h('input', {
                    type: 'email',
                    value: email.value,
                    onInput: (e: Event) => { email.value = (e.target as HTMLInputElement).value },
                    placeholder: 'you@example.com',
                    onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') sendCode() },
                  }),
                ]),
                verifyError.value ? h('p', { class: 'radio-app__login-popup__error' }, verifyError.value) : null,
                h('button', {
                  class: 'radio-app__login-popup__submit',
                  disabled: !email.value.trim() || loading.value,
                  onClick: sendCode,
                }, loading.value ? 'Sending…' : 'Send sign-in code'),
              ],
        ])
      },
    }),
    title: '',
    config: { position: 'center', canClose: true, background: true, width: '22rem' },
    onClose: () => {},
  })
}

// ---- Avatar click (login / account) ----------------------------------------
function handleAvatarClick() {
  if (!sessionToken.value) {
    openLoginPopup()
  } else {
    openAccountPopup()
  }
}

function openAccountPopup() {
  popup.showPopup({
    component: markRaw({
      emits: ['logout'],
      setup(_: any, { emit }: any) {
        return () => h('div', { class: 'radio-app__account-popup' }, [
          h('p', { class: 'radio-app__account-popup__info' }, `Logged in as ${userId.value}`),
          h('button', {
            class: 'radio-app__account-popup__logout',
            onClick: () => {
              emit('logout')
            },
          }, 'Log out'),
        ])
      },
    }),
    title: '',
    config: { position: 'center', canClose: true, background: true, width: '16rem' },
    on: {
      logout: () => {
        sessionToken.value = ''
        userId.value = ''
        parentMode.value = false
        localStorage.removeItem(identityStorageKey)
      },
    },
    onClose: () => {},
  })
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
    openPinPopup()
  }
  if (id === 'add-video') {
    if (!parentMode.value) return // Can't add in child mode
    openAddAudioPopup()
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

function removeTrackById(id: string) {
  const index = library.tracks.value.findIndex((t) => t.id === id)
  if (index !== -1) {
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
}

function handleCreateCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  categories.addCategory({
    name,
    icon: '📁',
    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
  })
  newCategoryName.value = ''
  newCategoryOpen.value = false
}
</script>

<template>
  <TikoAppShell
    :app-name="labels.appName"
    app-icon="media/headphones"
    app-color="radio"
    avatar="ui/circle-user"
    :actions="headerActions"
    @header-action="headerAction"
    @avatar-click="handleAvatarClick"
  >
    <section class="radio-app" :data-color-mode="colorMode">

      <!-- Popup host (renders popupService.popups) -->
      <Popup />

      <!-- ==================== CONTENT (shared by both modes) ==================== -->
      <div class="radio-app__content">

        <!-- Category tiles: only show categories that have videos -->
        <div v-if="categoriesWithTracks.length" class="radio-app__categories">
          <button
            v-for="cat in categoriesWithTracks"
            :key="cat.id"
            class="radio-app__category-card"
            :class="{ 'radio-app__category-card--active': selectedCategoryId === cat.id }"
            :style="{ '--cat-color': cat.color }"
            @click="selectCategory(cat.id)"
          >
            <span class="radio-app__category-card__icon">{{ cat.icon }}</span>
            <span class="radio-app__category-card__label">{{ cat.name }}</span>
          </button>
          <!-- Parent mode: add category button -->
          <button
            v-if="parentMode"
            class="radio-app__category-card radio-app__category-card--add"
            @click="newCategoryOpen = !newCategoryOpen"
          >
            <span class="radio-app__category-card__icon">+</span>
            <span class="radio-app__category-card__label">{{ labels.newCategory }}</span>
          </button>
        </div>

        <!-- New category inline form (parent mode) -->
        <div v-if="parentMode && newCategoryOpen" class="radio-app__new-cat-form">
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
        <p v-else class="radio-app__empty">{{ labels.noTracks }}</p>
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
