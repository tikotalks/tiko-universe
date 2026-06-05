<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import { SilIcon as Icon, TikoSettingsPanel, type TikoColorMode } from '@tiko/ui'
import type { Category, WordTile } from '@tiko/talk-types'
import { useSentenceStrip } from './composables/useSentenceStrip'
import { useSentenceApi } from './composables/useSentenceApi'

type SpeechStatus = 'idle' | 'speaking' | 'ready' | 'fallback' | 'error'
type CloudWeight = 'high' | 'medium' | 'low'

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

interface VisualWordNode {
  id: string
  label: string
  icon: string
  color: string
  category: string
  weight: CloudWeight
  word?: WordTile
}

interface CategoryShortcut {
  id: string
  label: string
  icon: string
  color: string
}

const storageKey = 'tiko:talk'
const identityStorageKey = 'tiko:identity:device-session'
const appName = 'Talk'

const settingsOpen = ref(false)
const activeCategoryId = ref('food')
const speechStatus = ref<SpeechStatus>('idle')
const speechError = ref<string | null>(null)
const identityStatus = ref<'offline' | 'bootstrapping' | 'ready' | 'error'>('offline')
const identityError = ref<string | null>(null)
const sessionToken = ref('')
const selectedPulseId = ref<string | null>(null)

const defaultSentenceWords: WordTile[] = [
  { id: 'i', text: 'I', pos: 'pronoun', category: 'people' },
  { id: 'want', text: 'want', pos: 'verb', category: 'actions' },
  { id: 'banana', text: 'banana', pos: 'noun', category: 'food', icon: 'banana' },
]

const fallbackCloudWords: VisualWordNode[] = [
  { id: 'eat', label: 'eat', icon: 'ui/add-fat', color: 'yellow', category: 'food', weight: 'high' },
  { id: 'drink', label: 'drink', icon: 'food-drinks/bottle', color: 'mint', category: 'food', weight: 'high' },
  { id: 'more', label: 'more', icon: 'ui/add-fat', color: 'yellow', category: 'actions', weight: 'high' },
  { id: 'play', label: 'play', icon: 'media/playback-play', color: 'lavender', category: 'activities', weight: 'high' },
  { id: 'help', label: 'help', icon: 'ui/talk-question-mark', color: 'peach', category: 'feelings', weight: 'high' },
  { id: 'stop', label: 'stop', icon: 'media/playback-stop', color: 'lavender', category: 'feelings', weight: 'medium' },
  { id: 'banana', label: 'banana', icon: 'food-drinks/bottle', color: 'green', category: 'food', weight: 'high' },
  { id: 'apple', label: 'apple', icon: 'product/cart', color: 'peach', category: 'food', weight: 'high' },
  { id: 'water', label: 'water', icon: 'food-drinks/bottle', color: 'blue', category: 'food', weight: 'high' },
  { id: 'go', label: 'go', icon: '', color: 'mint', category: 'places', weight: 'low' },
  { id: 'like', label: 'like', icon: '', color: 'yellow', category: 'feelings', weight: 'low' },
  { id: 'not', label: 'not', icon: '', color: 'pink', category: 'actions', weight: 'low' },
  { id: 'where', label: 'where', icon: '', color: 'yellow', category: 'places', weight: 'low' },
  { id: 'what', label: 'what', icon: '', color: 'lavender', category: 'things', weight: 'low' },
  { id: 'here', label: 'here', icon: '', color: 'mint', category: 'places', weight: 'low' },
  { id: 'there', label: 'there', icon: '', color: 'pink', category: 'places', weight: 'low' },
]

const categoryShortcuts: CategoryShortcut[] = [
  { id: 'food', label: 'Food', icon: 'food-drinks/bottle', color: 'yellow' },
  { id: 'home', label: 'Home', icon: 'ui/building-house-2', color: 'green' },
  { id: 'feelings', label: 'Feelings', icon: 'ui/talk-heart', color: 'lavender' },
  { id: 'activities', label: 'Activities', icon: 'ui/color-pallette', color: 'blue' },
  { id: 'places', label: 'Places', icon: 'wayfinding/map3', color: 'mint' },
  { id: 'animals', label: 'Animals', icon: 'animals/cat-head', color: 'lavender' },
  { id: 'things', label: 'Things', icon: 'wayfinding/car', color: 'blue' },
]

const categoryAliases: Record<string, string> = {
  emotion: 'feelings',
  emotions: 'feelings',
  social: 'feelings',
  action: 'actions',
  actions: 'activities',
  activity: 'activities',
  object: 'things',
  objects: 'things',
  transport: 'things',
  people: 'home',
}

const iconByText: Record<string, string> = {
  apple: 'product/cart', banana: 'food-drinks/bottle', water: 'food-drinks/bottle', drink: 'food-drinks/bottle', eat: 'ui/add-fat', play: 'media/playback-play', help: 'ui/talk-question-mark', stop: 'media/playback-stop', more: 'ui/add-fat', home: 'ui/building-house-2', go: 'wayfinding/map3', car: 'wayfinding/car', rabbit: 'animals/cat-head', happy: 'ui/talk-heart', sad: 'ui/talk-heart-broken', want: '', like: '', not: '', here: '', there: '', what: '', where: '',
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

const stored = readJson<PersistedTalkState>(storageKey, {})
const language = ref(detectLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const identityClient = new IdentityClient({ baseUrl: resolveIdentityBaseUrl(), credentials: 'include' })
const sentenceApi = useSentenceApi({ language, sessionToken })
const strip = useSentenceStrip({ allWords: sentenceApi.words })

const canSpeak = computed(() => strip.canSpeak.value && speechStatus.value !== 'speaking' && !sentenceApi.loading.value)
const statusText = computed(() => {
  if (sentenceApi.loading.value) return 'Loading words…'
  if (sentenceApi.isOffline.value) return 'Offline words are ready.'
  if (sentenceApi.error.value) return sentenceApi.error.value
  return null
})

const visibleCategories = computed(() => {
  const apiCategories = sentenceApi.categories.value.map(toShortcut).filter(Boolean) as CategoryShortcut[]
  const merged = new Map(categoryShortcuts.map((category) => [category.id, category]))
  apiCategories.forEach((category) => merged.set(category.id, category))
  return Array.from(merged.values()).slice(0, 7)
})

const cloudWords = computed<VisualWordNode[]>(() => {
  const source = sentenceApi.suggestions.value.length
    ? sentenceApi.suggestions.value
    : sentenceApi.words.value.length
      ? sentenceApi.words.value.slice(0, 16)
      : []

  if (!source.length) return fallbackCloudWords

  const nodes = source
    .filter((word) => !strip.wordIds.value.includes(word.id))
    .slice(0, 16)
    .map((word, index) => wordToNode(word, index))

  return nodes.length ? nodes : fallbackCloudWords
})

function normalizeCategoryId(category: string) {
  const normalized = category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return categoryAliases[normalized] ?? normalized
}

function categoryColor(category: string, index = 0) {
  const palette = ['yellow', 'mint', 'lavender', 'peach', 'blue', 'green', 'pink']
  const shortcut = categoryShortcuts.find((item) => item.id === normalizeCategoryId(category))
  return shortcut?.color ?? palette[index % palette.length]
}

function categoryIcon(category: string) {
  const shortcut = categoryShortcuts.find((item) => item.id === normalizeCategoryId(category))
  return shortcut?.icon ?? 'ui/talk'
}

function wordIcon(word: WordTile) {
  const key = word.text.toLowerCase()
  if (iconByText[key] !== undefined) return iconByText[key]
  return word.icon?.includes('/') ? word.icon : ''
}

function wordToNode(word: WordTile, index: number): VisualWordNode {
  return {
    id: word.id,
    label: word.text,
    icon: wordIcon(word),
    color: categoryColor(word.category, index),
    category: normalizeCategoryId(word.category),
    weight: index < 5 ? 'high' : index < 10 ? 'medium' : 'low',
    word,
  }
}

function toShortcut(category: Category): CategoryShortcut | null {
  const id = normalizeCategoryId(category.id)
  if (!category.label && !id) return null
  return {
    id,
    label: category.label || id,
    icon: category.icon?.includes('/') ? category.icon : categoryIcon(id),
    color: categoryColor(id),
  }
}

function findOrCreateWord(node: VisualWordNode): WordTile {
  if (node.word) return node.word
  const existing = sentenceApi.words.value.find((word) => word.id === node.id || word.text.toLowerCase() === node.label.toLowerCase())
  return existing ?? { id: node.id, text: node.label, pos: 'word', category: node.category, icon: node.icon }
}

function selectWordNode(node: VisualWordNode) {
  const word = findOrCreateWord(node)
  strip.addWord(word)
  activeCategoryId.value = normalizeCategoryId(word.category)
  speechStatus.value = 'idle'
  speechError.value = null
  selectedPulseId.value = `${node.id}-${Date.now()}`
  void sentenceApi.next(strip.wordIds.value)
}

function selectCategory(category: CategoryShortcut) {
  activeCategoryId.value = category.id
  void sentenceApi.loadVocabulary(category.id)
}

function removeLastWord() {
  strip.removeWord(strip.words.value.length - 1)
  speechStatus.value = 'idle'
  void sentenceApi.next(strip.wordIds.value)
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
      const bundle = await identityClient.getSession(storedIdentity.sessionToken)
      persistIdentity(bundle)
    } else {
      const bundle = await identityClient.bootstrapDevice({
        device: {
          id: storedIdentity.deviceId,
          secret: storedIdentity.deviceSecret,
          platform: 'web',
          name: 'Talk web',
        },
      })
      persistIdentity(bundle)
    }
    identityStatus.value = 'ready'
  } catch (error) {
    identityStatus.value = 'error'
    identityError.value = error instanceof Error ? error.message : 'identity_bootstrap_failed'
  }
}

watch([language, colorMode], () => {
  writeJson(storageKey, { language: language.value, colorMode: colorMode.value })
}, { deep: true })

watch(colorMode, (mode) => {
  const effective = mode === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode
  document.documentElement.dataset.colorMode = effective
  document.documentElement.dataset.theme = effective
}, { immediate: true })

watch(language, () => {
  strip.clear()
  void sentenceApi.start()
})

onMounted(() => {
  strip.setWords(defaultSentenceWords)
  void bootstrapIdentity()
  void sentenceApi.start()
})

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
</script>

<template>
  <main class="talk-screen" :data-color-mode="colorMode">
    <header class="talk-header" aria-label="Talk">
      <div class="talk-header__brand">
        <div class="talk-header__icon" aria-hidden="true"><Icon name="ui/talk" size="large" /></div>
        <h1>{{ appName }}</h1>
      </div>
      <div class="talk-header__actions">
        <button class="talk-header__button" type="button" aria-label="Settings" @click="settingsOpen = !settingsOpen"><Icon name="ui/settings" size="medium" /></button>
        <button class="talk-header__avatar" type="button" aria-label="Profile"><Icon name="food-drinks/bottle" size="large" /></button>
      </div>
    </header>

    <section v-if="settingsOpen" class="talk-settings" aria-label="Talk settings">
      <TikoSettingsPanel
        :language="language"
        :color-mode="colorMode"
        @update:language="language = $event"
        @update:color-mode="colorMode = $event"
      />
      <p class="talk-settings__status">
        Identity: {{ identityStatus === 'ready' ? 'ready' : identityStatus }}
        <span v-if="identityError">({{ identityError }})</span>
      </p>
    </section>

    <section class="sentence-bar" aria-label="Current sentence">
      <div class="sentence-bar__words">
        <button
          v-for="(word, index) in strip.words.value"
          :key="`${word.id}-${index}`"
          class="sentence-word-pill"
          type="button"
          :aria-label="`Remove ${word.text}`"
          @click="strip.removeWord(index)"
        >
          <span>{{ word.text }}</span>
          <Icon v-if="wordIcon(word)" :name="wordIcon(word)" size="small" aria-hidden="true" />
        </button>
        <span v-if="!strip.words.value.length" class="sentence-bar__placeholder">Tap a word</span>
      </div>

      <button class="sentence-bar__backspace" type="button" aria-label="Delete last word" :disabled="!strip.words.value.length" @click="removeLastWord"><Icon name="ui/talk-subtract" size="small" /></button>
      <button class="speak-orb" type="button" :disabled="!canSpeak" aria-label="Speak sentence" @click="speakSentence">
        <span v-if="speechStatus === 'speaking'" aria-hidden="true">…</span>
        <Icon v-else name="media/playback-play" size="medium" aria-hidden="true" />
      </button>
      <Icon class="sentence-bar__sound" name="media/volume-iii" size="medium" aria-hidden="true" />
    </section>

    <p v-if="statusText || speechError || speechStatus === 'fallback'" class="talk-screen__status" :class="{ 'talk-screen__status--error': Boolean(speechError) || sentenceApi.mode.value === 'error' }">
      {{ speechError ? `Speech could not start: ${speechError}` : speechStatus === 'fallback' ? 'Using the device voice while cached audio is unavailable.' : statusText }}
    </p>

    <section class="talk-stage" aria-label="Choose words">
      <nav class="category-dock category-dock--left" aria-label="Category shortcuts left">
        <button
          v-for="category in visibleCategories.slice(0, 4)"
          :key="category.id"
          class="category-card"
          :class="[`category-card--${category.color}`, { 'category-card--active': activeCategoryId === category.id }]"
          type="button"
          @click="selectCategory(category)"
        >
          <Icon class="category-card__icon" :name="category.icon" size="large" aria-hidden="true" />
          <span>{{ category.label }}</span>
        </button>
      </nav>

      <div class="word-cloud" :data-pulse="selectedPulseId">
        <button
          v-for="(node, index) in cloudWords"
          :key="node.id"
          class="word-bubble"
          :class="[`word-bubble--${node.weight}`, `word-bubble--${node.color}`, `word-bubble--slot-${index + 1}`]"
          type="button"
          @click="selectWordNode(node)"
        >
          <Icon v-if="node.icon" class="word-bubble__icon" :name="node.icon" size="large" aria-hidden="true" />
          <span class="word-bubble__label">{{ node.label }}</span>
        </button>
      </div>

      <nav class="category-dock category-dock--right" aria-label="Category shortcuts right">
        <button
          v-for="category in visibleCategories.slice(4)"
          :key="category.id"
          class="category-card"
          :class="[`category-card--${category.color}`, { 'category-card--active': activeCategoryId === category.id }]"
          type="button"
          @click="selectCategory(category)"
        >
          <Icon class="category-card__icon" :name="category.icon" size="large" aria-hidden="true" />
          <span>{{ category.label }}</span>
        </button>
      </nav>
    </section>
  </main>
</template>
