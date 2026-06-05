import { computed, ref, type Ref } from 'vue'
import type {
  Category,
  DeleteSentencePhraseResponse,
  SavedPhrase,
  SaveSentencePhraseResponse,
  SentenceCompleteResponse,
  SentenceNextRequest,
  SentenceNextResponse,
  SentencePhrasesResponse,
  SentenceStartResponse,
  SentenceVocabularyResponse,
  StripState,
  Template,
  WordTile,
} from '@tiko/talk-types'
import fallbackPackEn from '../data/fallback-pack-en.json'

export interface SentenceApiOptions {
  language: Ref<string>
  sessionToken: Ref<string>
  fetcher?: typeof fetch
  audioFactory?: (src: string) => Pick<HTMLAudioElement, 'play'>
  baseUrl?: string
}

export type SentenceApiMode = 'loading' | 'online' | 'offline' | 'error'

interface FallbackPack {
  templates: Template[]
  categories: Category[]
  words: WordTile[]
  savedPhrases: SavedPhrase[]
}

const fallbackPack: FallbackPack = {
  templates: fallbackPackEn.templates as Template[],
  categories: fallbackPackEn.categories as Category[],
  words: fallbackPackEn.words as WordTile[],
  savedPhrases: fallbackPackEn.savedPhrases as SavedPhrase[],
}

function resolveSentenceBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  const configured = env?.VITE_SENTENCE_API_URL ?? env?.VITE_TIKO_SENTENCE_API_URL
  if (configured) return configured.replace(/\/$/, '')

  if (typeof window !== 'undefined' && window.location.hostname.startsWith('dev.')) {
    return 'https://dev.api.tikotalks.com'
  }

  return 'https://api.tikotalks.com'
}

function sentenceDisplay(words: WordTile[]) {
  return words.map((word) => word.text).join(' ')
}

function fallbackState(words: WordTile[]): StripState {
  return { display: sentenceDisplay(words), validNext: [], canComplete: words.length > 0 }
}

function wordsByCategory(words: WordTile[]): Record<string, WordTile[]> {
  return words.reduce<Record<string, WordTile[]>>((grouped, word) => {
    grouped[word.category] = [...(grouped[word.category] ?? []), word]
    return grouped
  }, {})
}

function normalizeSentence(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`
}

export function useSentenceApi(options: SentenceApiOptions) {
  const fetcher = options.fetcher ?? fetch
  const baseUrl = options.baseUrl ?? resolveSentenceBaseUrl()
  const audioFactory = options.audioFactory ?? ((src: string) => new Audio(src))

  const mode = ref<SentenceApiMode>('loading')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const templates = ref<Template[]>([])
  const categories = ref<Category[]>([])
  const words = ref<WordTile[]>([])
  const suggestions = ref<WordTile[]>([])
  const savedPhrases = ref<SavedPhrase[]>([])
  const stripState = ref<StripState>({ display: '', validNext: [], canComplete: false })
  const lastCompletion = ref<SentenceCompleteResponse | null>(null)

  const wordsById = computed(() => new Map(words.value.map((word) => [word.id, word])))
  const activeWordsByCategory = computed(() => wordsByCategory(words.value))
  const isOffline = computed(() => mode.value === 'offline')

  async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    if (options.sessionToken.value) headers.set('Authorization', `Bearer ${options.sessionToken.value}`)
    const response = await fetcher(`${baseUrl}${path}`, { ...init, headers, credentials: 'include' })
    const body = await response.json().catch(() => ({})) as { error?: { message?: string, code?: string } }
    if (!response.ok) throw new Error(body.error?.message ?? body.error?.code ?? `sentence_api_${response.status}`)
    return body as T
  }

  function activateFallback(currentError?: unknown) {
    mode.value = 'offline'
    error.value = currentError instanceof Error ? currentError.message : null
    templates.value = fallbackPack.templates
    categories.value = fallbackPack.categories
    words.value = fallbackPack.words
    suggestions.value = fallbackPack.words.slice(0, 5)
    savedPhrases.value = fallbackPack.savedPhrases
    stripState.value = { display: '', validNext: [], canComplete: false }
  }

  async function start() {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ locale: options.language.value })
      const data = await requestJson<SentenceStartResponse>(`/v1/sentence/start?${params.toString()}`)
      templates.value = data.templates
      categories.value = data.initialCategories
      words.value = data.initialWords
      suggestions.value = data.initialWords.slice(0, 5)
      savedPhrases.value = data.savedPhrases
      stripState.value = { display: '', validNext: data.stripState.validNext, canComplete: data.stripState.canComplete }
      mode.value = 'online'
      await loadVocabulary()
    } catch (currentError) {
      activateFallback(currentError)
    } finally {
      loading.value = false
    }
  }

  async function next(currentWords: string[]) {
    if (isOffline.value) {
      const used = new Set(currentWords)
      suggestions.value = fallbackPack.words.filter((word) => !used.has(word.id)).slice(0, 5)
      stripState.value = fallbackState(currentWords.map((id) => wordsById.value.get(id)).filter((word): word is WordTile => Boolean(word)))
      return
    }

    try {
      const body: SentenceNextRequest = { locale: options.language.value, currentWords }
      const data = await requestJson<SentenceNextResponse>('/v1/sentence/next', { method: 'POST', body: JSON.stringify(body) })
      suggestions.value = data.suggestions
      categories.value = data.categories.length ? data.categories : categories.value
      const merged = new Map(words.value.map((word) => [word.id, word]))
      Object.values(data.words).flat().forEach((word) => merged.set(word.id, word))
      words.value = Array.from(merged.values())
      stripState.value = data.stripState
    } catch (currentError) {
      error.value = currentError instanceof Error ? currentError.message : 'sentence_next_failed'
    }
  }

  async function loadVocabulary(category?: string) {
    if (isOffline.value) return
    try {
      const params = new URLSearchParams({ locale: options.language.value })
      if (category) params.set('category', category)
      const data = await requestJson<SentenceVocabularyResponse>(`/v1/sentence/vocabulary?${params.toString()}`)
      words.value = data.words
      categories.value = data.categories
    } catch (currentError) {
      error.value = currentError instanceof Error ? currentError.message : 'sentence_vocabulary_failed'
    }
  }

  async function loadPhrases() {
    if (isOffline.value) return
    try {
      const params = new URLSearchParams({ locale: options.language.value })
      const data = await requestJson<SentencePhrasesResponse>(`/v1/sentence/phrases?${params.toString()}`)
      savedPhrases.value = data.phrases
    } catch (currentError) {
      error.value = currentError instanceof Error ? currentError.message : 'sentence_phrases_failed'
    }
  }

  async function complete(currentWords: string[]) {
    error.value = null
    if (isOffline.value) {
      const sentence = normalizeSentence(currentWords.map((id) => wordsById.value.get(id)?.text ?? '').join(' '))
      const utterance = typeof SpeechSynthesisUtterance === 'undefined' ? null : new SpeechSynthesisUtterance(sentence)
      if (utterance && typeof speechSynthesis !== 'undefined') speechSynthesis.speak(utterance)
      lastCompletion.value = { sentence, audioUrl: '', audioCached: false }
      return lastCompletion.value
    }

    const data = await requestJson<SentenceCompleteResponse>('/v1/sentence/complete', {
      method: 'POST',
      body: JSON.stringify({ locale: options.language.value, wordIds: currentWords, autoSave: true }),
    })
    lastCompletion.value = data
    if (data.audioUrl) await audioFactory(data.audioUrl).play()
    if (data.savedPhraseId) await loadPhrases()
    return data
  }

  async function savePhrase(wordIds: string[], label?: string) {
    const data = await requestJson<SaveSentencePhraseResponse>('/v1/sentence/phrases', {
      method: 'POST',
      body: JSON.stringify({ locale: options.language.value, wordIds, label }),
    })
    await loadPhrases()
    return data.phrase
  }

  async function deletePhrase(phraseId: string) {
    const params = new URLSearchParams({ locale: options.language.value })
    const data = await requestJson<DeleteSentencePhraseResponse>(`/v1/sentence/phrases/${encodeURIComponent(phraseId)}?${params.toString()}`, {
      method: 'DELETE',
    })
    await loadPhrases()
    return data
  }

  function wordsForPhrase(phrase: SavedPhrase) {
    return phrase.wordIds.map((id) => wordsById.value.get(id)).filter((word): word is WordTile => Boolean(word))
  }

  return {
    mode,
    loading,
    error,
    templates,
    categories,
    words,
    suggestions,
    savedPhrases,
    stripState,
    lastCompletion,
    activeWordsByCategory,
    isOffline,
    start,
    next,
    loadVocabulary,
    loadPhrases,
    complete,
    savePhrase,
    deletePhrase,
    wordsForPhrase,
  }
}
