<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import { TikoAppShell, TikoSettingsPanel, type TikoColorMode } from '@tiko/ui'
import type { SavedPhrase, Template, WordTile } from '@tiko/talk-types'
import SentenceStrip from './components/SentenceStrip.vue'
import SpeakButton from './components/SpeakButton.vue'
import SuggestionBar from './components/SuggestionBar.vue'
import TemplatePicker from './components/TemplatePicker.vue'
import WordGrid from './components/WordGrid.vue'
import SavedPhrases from './components/SavedPhrases.vue'
import { useSentenceStrip } from './composables/useSentenceStrip'
import { useSentenceApi } from './composables/useSentenceApi'

const appName = 'Talk'
const storageKey = 'tiko:talk'
const identityStorageKey = 'tiko:identity:device-session'
const activeCategoryId = ref('')
const speechStatus = ref<'idle' | 'speaking' | 'ready' | 'fallback' | 'error'>('idle')
const speechError = ref<string | null>(null)
const phraseStatus = ref<'idle' | 'saving' | 'saved' | 'deleting' | 'error'>('idle')
const phraseError = ref<string | null>(null)
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
const sentenceApi = useSentenceApi({ language, sessionToken })
const strip = useSentenceStrip({ allWords: sentenceApi.words })

const canSpeak = computed(() => strip.canSpeak.value && speechStatus.value !== 'speaking' && !sentenceApi.loading.value)
const cached = computed(() => sentenceApi.lastCompletion.value?.audioCached === true)
const statusText = computed(() => {
  if (sentenceApi.loading.value) return 'Loading Talk words.'
  if (sentenceApi.isOffline.value) return 'Offline words active.'
  if (sentenceApi.error.value) return sentenceApi.error.value
  return null
})

function selectWord(word: WordTile) {
  strip.addWord(word)
  activeCategoryId.value = word.category
  speechStatus.value = 'idle'
  speechError.value = null
  void sentenceApi.next(strip.wordIds.value)
}

function selectTemplate(template: Template) {
  strip.applyTemplate(template)
  activeCategoryId.value = template.category
  speechStatus.value = 'idle'
  void sentenceApi.next(strip.wordIds.value)
}

function selectPhrase(phrase: SavedPhrase) {
  strip.setWords(sentenceApi.wordsForPhrase(phrase))
  speechStatus.value = 'idle'
  phraseStatus.value = 'idle'
  phraseError.value = null
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

watch(language, () => {
  strip.clear()
  void sentenceApi.start()
})

watch(sentenceApi.categories, (categories) => {
  if (!activeCategoryId.value && categories[0]) activeCategoryId.value = categories[0].id
}, { immediate: true })

onMounted(() => {
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

async function saveCurrentPhrase() {
  if (!strip.wordIds.value.length || sentenceApi.isOffline.value) return

  phraseStatus.value = 'saving'
  phraseError.value = null
  try {
    await sentenceApi.savePhrase(strip.wordIds.value, strip.display.value)
    phraseStatus.value = 'saved'
  } catch (error) {
    phraseStatus.value = 'error'
    phraseError.value = error instanceof Error ? error.message : 'phrase_save_failed'
  }
}

async function deleteSavedPhrase(phrase: SavedPhrase) {
  if (sentenceApi.isOffline.value) return

  phraseStatus.value = 'deleting'
  phraseError.value = null
  try {
    await sentenceApi.deletePhrase(phrase.id)
    phraseStatus.value = 'idle'
  } catch (error) {
    phraseStatus.value = 'error'
    phraseError.value = error instanceof Error ? error.message : 'phrase_delete_failed'
  }
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
        <button
          class="talk-app__save-phrase"
          type="button"
          :disabled="!strip.wordIds.value.length || sentenceApi.isOffline.value || phraseStatus === 'saving'"
          @click="saveCurrentPhrase"
        >
          {{ phraseStatus === 'saving' ? 'Saving phrase' : 'Save phrase' }}
        </button>
      </section>

      <SentenceStrip
        :words="strip.words.value"
        placeholder="Tap words to build a sentence"
        @remove="strip.removeWord"
        @clear="strip.clear"
      />

      <p v-if="statusText" class="talk-app__status" :class="{ 'talk-app__status--error': sentenceApi.mode.value === 'error' }">{{ statusText }}</p>
      <p v-if="speechStatus === 'fallback'" class="talk-app__status">Using the device voice while cached audio is unavailable.</p>
      <p v-else-if="speechError" class="talk-app__status talk-app__status--error">Speech could not start: {{ speechError }}</p>
      <p v-if="phraseStatus === 'saved'" class="talk-app__status">Phrase saved for this user.</p>
      <p v-else-if="phraseError" class="talk-app__status talk-app__status--error">Phrase could not update: {{ phraseError }}</p>

      <div class="talk-app__columns">
        <div class="talk-app__main-column">
          <SuggestionBar :suggestions="sentenceApi.suggestions.value" @select="selectWord" />
          <WordGrid
            :categories="sentenceApi.categories.value"
            :words="sentenceApi.words.value"
            :active-category-id="activeCategoryId"
            @category-change="activeCategoryId = $event; sentenceApi.loadVocabulary($event)"
            @select="selectWord"
          />
        </div>
        <aside class="talk-app__side-column" aria-label="Talk shortcuts">
          <TemplatePicker :templates="sentenceApi.templates.value" @select="selectTemplate" />
          <SavedPhrases
            :phrases="sentenceApi.savedPhrases.value"
            @select="selectPhrase"
            @delete="deleteSavedPhrase"
          />
        </aside>
      </div>
    </div>
  </TikoAppShell>
</template>
