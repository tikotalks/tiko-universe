<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import { TikoAppShell, TikoSettingsPanel, createTikoTtsClient, type TikoColorMode } from '@tiko/ui'
import type { SavedPhrase, Template, WordTile } from '@tiko/talk-types'
import SentenceStrip from './components/SentenceStrip.vue'
import SpeakButton from './components/SpeakButton.vue'
import SuggestionBar from './components/SuggestionBar.vue'
import TemplatePicker from './components/TemplatePicker.vue'
import WordGrid from './components/WordGrid.vue'
import SavedPhrases from './components/SavedPhrases.vue'
import { mockCategories, mockSavedPhrases, mockTemplates, mockWords } from './fixtures/mockTalkData'
import { useSentenceStrip } from './composables/useSentenceStrip'

const appName = 'Talk'
const storageKey = 'tiko:talk'
const identityStorageKey = 'tiko:identity:device-session'
const activeCategoryId = ref(mockCategories[0]?.id ?? 'people')
const speechStatus = ref<'idle' | 'speaking' | 'ready' | 'fallback' | 'error'>('idle')
const speechError = ref<string | null>(null)
const settingsOpen = ref(false)
const identityStatus = ref<'offline' | 'bootstrapping' | 'ready' | 'error'>('offline')
const identityError = ref<string | null>(null)
const sessionToken = ref('')

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
const tts = createTikoTtsClient()

const strip = useSentenceStrip({ allWords: mockWords })

const suggestions = computed(() => {
  const used = new Set(strip.wordIds.value)
  const preferred = strip.words.value.at(-1)?.category ?? activeCategoryId.value
  return mockWords
    .filter((word) => word.category === preferred && !used.has(word.id))
    .slice(0, 5)
})

const canSpeak = computed(() => strip.canSpeak.value && speechStatus.value !== 'speaking')
const cached = computed(() => speechStatus.value === 'ready')

function selectWord(word: WordTile) {
  strip.addWord(word)
  activeCategoryId.value = word.category
  speechStatus.value = 'idle'
  speechError.value = null
}

function selectTemplate(template: Template) {
  strip.applyTemplate(template)
  activeCategoryId.value = template.category
  speechStatus.value = 'idle'
}

function selectPhrase(phrase: SavedPhrase) {
  strip.applyPhrase(phrase)
  speechStatus.value = 'idle'
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

onMounted(() => {
  void bootstrapIdentity()
})

async function speakSentence() {
  const text = strip.display.value.trim()
  if (!text) return

  speechStatus.value = 'speaking'
  speechError.value = null
  const result = await tts.speak({ text, language: language.value })
  if (result.error) {
    speechStatus.value = result.metadata?.fallbackUsed ? 'fallback' : 'error'
    speechError.value = result.error
    return
  }
  speechStatus.value = result.cached ? 'ready' : 'idle'
}
</script>

<template>
  <TikoAppShell
    :app-name="appName"
    app-icon="communication/message-circle"
    app-color="talk"
    avatar="T"
    class="talk-app"
    :actions="[{ id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen }]"
    :data-color-mode="colorMode"
    @header-action="settingsOpen = !settingsOpen"
  >
    <div class="talk-app__workspace">
      <section v-if="settingsOpen" class="talk-app__settings" aria-label="Talk settings">
        <TikoSettingsPanel
          :language="language"
          :color-mode="colorMode"
          @update:language="language = $event"
          @update:color-mode="colorMode = $event"
        />
        <p class="talk-app__identity-status">
          Identity: {{ identityStatus === 'ready' ? 'ready' : identityStatus }}
          <span v-if="identityError">({{ identityError }})</span>
        </p>
      </section>

      <section class="talk-app__hero" aria-labelledby="talk-title">
        <div>
          <p class="talk-app__eyebrow">Sentence builder</p>
          <h1 id="talk-title">Build what you want to say</h1>
          <p>Pick words, use starters, and speak the sentence when it feels right.</p>
        </div>
        <SpeakButton
          :disabled="!canSpeak"
          :loading="speechStatus === 'speaking'"
          :cached="cached"
          label="Speak sentence"
          loading-label="Speaking"
          @speak="speakSentence"
        />
      </section>

      <SentenceStrip
        :words="strip.words.value"
        placeholder="Tap words to build a sentence"
        @remove="strip.removeWord"
        @clear="strip.clear"
      />

      <p v-if="speechStatus === 'fallback'" class="talk-app__status">Using the device voice while cached audio is unavailable.</p>
      <p v-else-if="speechError" class="talk-app__status talk-app__status--error">Speech could not start: {{ speechError }}</p>

      <div class="talk-app__columns">
        <div class="talk-app__main-column">
          <SuggestionBar :suggestions="suggestions" @select="selectWord" />
          <WordGrid
            :categories="mockCategories"
            :words="mockWords"
            :active-category-id="activeCategoryId"
            @category-change="activeCategoryId = $event"
            @select="selectWord"
          />
        </div>
        <aside class="talk-app__side-column" aria-label="Talk shortcuts">
          <TemplatePicker :templates="mockTemplates" @select="selectTemplate" />
          <SavedPhrases :phrases="mockSavedPhrases" @select="selectPhrase" />
        </aside>
      </div>
    </div>
  </TikoAppShell>
</template>
