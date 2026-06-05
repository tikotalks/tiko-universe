import { computed, ref, watch } from 'vue'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import type { TikoColorMode } from '@tiko/ui'
import { useSentenceApi } from './useSentenceApi'
import { useSentenceStrip } from './useSentenceStrip'
import { normalizeCategoryId, useTalkPresentation, wordIcon, type CategoryShortcut, type VisualWordNode } from './useTalkPresentation'

type SpeechStatus = 'idle' | 'speaking' | 'ready' | 'fallback' | 'error'

interface PersistedTalkState {
  language?: string
  colorMode?: TikoColorMode
}

interface StoredIdentity {
  deviceId?: string
  deviceSecret?: string
  sessionToken?: string
  expiresAt?: string
}

const storageKey = 'tiko:talk'
const identityStorageKey = 'tiko:identity:device-session'

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

function resolveIdentityBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_IDENTITY_API_URL ?? env?.VITE_TIKO_IDENTITY_BASE_URL ?? 'https://id.tikoapps.org/v1').replace(/\/$/, '')
}

function detectLanguage(value: string | undefined): string {
  const candidate = value ?? (typeof navigator === 'undefined' ? 'en' : navigator.language.split('-')[0])
  return candidate === 'nl' ? 'nl' : 'en'
}

function toColorMode(value: string | undefined): TikoColorMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function useTalkApp() {
  const stored = readJson<PersistedTalkState>(storageKey, {})
  const language = ref(detectLanguage(stored.language))
  const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
  const settingsOpen = ref(false)
  const activeCategoryId = ref<string | null>(null)
  const speechStatus = ref<SpeechStatus>('idle')
  const speechError = ref<string | null>(null)
  const identityStatus = ref<'offline' | 'bootstrapping' | 'ready' | 'error'>('offline')
  const identityError = ref<string | null>(null)
  const sessionToken = ref('')

  const identityClient = new IdentityClient({ baseUrl: resolveIdentityBaseUrl(), credentials: 'include' })
  const sentenceApi = useSentenceApi({ language, sessionToken })
  const strip = useSentenceStrip({ allWords: sentenceApi.words })
  const presentation = useTalkPresentation({
    words: sentenceApi.words,
    suggestions: sentenceApi.suggestions,
    categories: sentenceApi.categories,
    selectedWordIds: strip.wordIds,
  })

  const canSpeak = computed(() => strip.canSpeak.value && speechStatus.value !== 'speaking' && !sentenceApi.loading.value)
  const statusText = computed(() => {
    if (sentenceApi.loading.value) return 'Loading words…'
    if (sentenceApi.isOffline.value) return 'Offline words are ready.'
    if (sentenceApi.error.value) return sentenceApi.error.value
    return null
  })

  function applyTheme(mode: TikoColorMode) {
    if (typeof document === 'undefined') return
    const effective = mode === 'system'
      ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode
    document.documentElement.dataset.colorMode = effective
    document.documentElement.dataset.theme = effective
  }

  function persistIdentity(bundle: IdentityBundle) {
    if (bundle.session?.token) sessionToken.value = bundle.session.token
    writeJson(identityStorageKey, {
      deviceId: bundle.device?.id,
      deviceSecret: bundle.device?.secret,
      sessionToken: bundle.session?.token,
      expiresAt: bundle.session?.expiresAt,
    })
  }

  async function bootstrapIdentity() {
    identityStatus.value = 'bootstrapping'
    identityError.value = null
    const storedIdentity = readJson<StoredIdentity>(identityStorageKey, {})
    try {
      if (storedIdentity.sessionToken) {
        persistIdentity(await identityClient.getSession(storedIdentity.sessionToken))
      } else {
        persistIdentity(await identityClient.bootstrapDevice({
          device: {
            id: storedIdentity.deviceId,
            secret: storedIdentity.deviceSecret,
            platform: 'web',
            name: 'Talk web',
          },
        }))
      }
      identityStatus.value = 'ready'
    } catch (error) {
      identityStatus.value = 'error'
      identityError.value = error instanceof Error ? error.message : 'identity_bootstrap_failed'
    }
  }

  async function start() {
    strip.clear()
    await sentenceApi.start()
    activeCategoryId.value = presentation.shortcuts.value[0]?.id ?? null
    void sentenceApi.prefetchNext(sentenceApi.suggestions.value.slice(0, 8).map((w) => [w.id]))
  }

  function selectWordNode(node: VisualWordNode) {
    strip.addWord(node.word)
    activeCategoryId.value = normalizeCategoryId(node.word.category)
    speechStatus.value = 'idle'
    speechError.value = null
    const currentIds = [...strip.wordIds.value]
    sentenceApi.next(currentIds).then(() => {
      void sentenceApi.prefetchNext(
        sentenceApi.suggestions.value.slice(0, 6).map((w) => [...currentIds, w.id])
      )
    })
  }

  function selectCategory(category: CategoryShortcut) {
    activeCategoryId.value = category.id
    void sentenceApi.loadVocabulary(category.source.id)
  }

  function removeWord(index: number) {
    strip.removeWord(index)
    speechStatus.value = 'idle'
    void sentenceApi.next(strip.wordIds.value)
  }

  function removeLastWord() {
    if (!strip.words.value.length) return
    removeWord(strip.words.value.length - 1)
  }

  async function speakSentence() {
    if (!strip.wordIds.value.length) return
    speechStatus.value = 'speaking'
    speechError.value = null
    try {
      const result = await sentenceApi.complete(strip.wordIds.value)
      speechStatus.value = result.audioUrl ? 'ready' : 'fallback'
    } catch (error) {
      speechStatus.value = 'error'
      speechError.value = error instanceof Error ? error.message : 'speech_failed'
    }
  }

  watch([language, colorMode], () => {
    writeJson(storageKey, { language: language.value, colorMode: colorMode.value })
  }, { deep: true })

  watch(colorMode, applyTheme, { immediate: true })

  watch(language, () => {
    void start()
  })

  return {
    language,
    colorMode,
    settingsOpen,
    activeCategoryId,
    speechStatus,
    speechError,
    identityStatus,
    identityError,
    sentenceApi,
    strip,
    canSpeak,
    statusText,
    shortcuts: presentation.shortcuts,
    cloudWords: presentation.cloudWords,
    wordIcon,
    bootstrapIdentity,
    start,
    selectWordNode,
    selectCategory,
    removeWord,
    removeLastWord,
    speakSentence,
  }
}
