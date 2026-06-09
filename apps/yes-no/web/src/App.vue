<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon, Popup } from '@sil/ui'
import { IdentityClient } from '@tiko/identity'
import { TikoDataClient, type YesNoSettings, type YesNoState } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoChoiceGrid,
  TikoSettingsPanel,
  createTikoChoice,
  createTikoTtsClient,
  useIdentityRuntime,
  type IdentityRuntimeState,
  type TikoColorMode
} from '@tiko/ui'
import { appConfig } from './appConfig'
import './styles.scss'

const storageKey = 'tiko:yes-no'
const appId = 'yes-no' as const
const apiBaseUrl = resolveApiBaseUrl()
const identityBaseUrl = resolveIdentityBaseUrl()

type YesNoAnswer = 'yes' | 'no'
type SpeakStatus = 'idle' | 'speaking' | 'fallback' | 'error'

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  sentence?: string
  latestAnswer?: YesNoAnswer | string | null
  latestAnswerId?: YesNoAnswer | null
  answerHistory?: string[]
}

function resolveApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_API_BASE_URL ?? 'https://app.tikoapi.org/v1').replace(/\/$/, '')
}

function resolveIdentityBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_IDENTITY_API_URL ?? env?.VITE_TIKO_IDENTITY_BASE_URL ?? 'https://id.tikoapps.org/v1').replace(/\/$/, '')
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

function toAnswer(value: unknown): YesNoAnswer | '' {
  return value === 'yes' || value === 'no' ? value : ''
}

function toHistory(value: unknown): YesNoAnswer[] {
  return Array.isArray(value) ? value.map(toAnswer).filter((answer): answer is YesNoAnswer => answer !== '').slice(0, 6) : []
}

function answerLabel(answer: YesNoAnswer | '') {
  if (answer === 'yes') return i18n.t(tikoI18nKeys.yesNo.answers.yes)
  if (answer === 'no') return i18n.t(tikoI18nKeys.yesNo.answers.no)
  return ''
}

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const latestAnswerId = ref<YesNoAnswer | ''>(toAnswer(stored.latestAnswerId ?? stored.latestAnswer))
const answerHistory = ref<YesNoAnswer[]>(toHistory(stored.answerHistory))
const settingsOpen = ref(false)
const historyOpen = ref(false)
const sentence = ref(stored.sentence || i18n.t(tikoI18nKeys.yesNo.sentence.default))
const speakStatus = ref<SpeakStatus>('idle')
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const userId = ref<string>('')
const accountEmail = ref<string>('')
const accountEmailVerified = ref(false)
const displayName = ref('')
const parentMode = ref(true)
const childModeEnabled = ref(false)
const pinConfigured = ref(false)
const bootstrapped = ref(false)
const tts = createTikoTtsClient()
const identityClient = new IdentityClient({ baseUrl: identityBaseUrl, credentials: 'include' })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })

const runtimeState: IdentityRuntimeState = {
  sessionToken,
  userId,
  accountEmail,
  accountEmailVerified,
  displayName,
  parentMode,
  childModeEnabled,
  pinConfigured,
}
const runtime = useIdentityRuntime({ identityClient, state: runtimeState, deviceName: 'Yes No web' })

const defaultSentence = computed(() => i18n.t(tikoI18nKeys.yesNo.sentence.default))

const labels = computed(() => {
  void language.value
  return {
    appName: i18n.t(tikoI18nKeys.yesNo.appName),
    sentenceLabel: i18n.t(tikoI18nKeys.yesNo.sentence.label),
    reset: i18n.t(tikoI18nKeys.yesNo.sentence.reset),
    speak: i18n.t(tikoI18nKeys.yesNo.sentence.speak),
    yes: i18n.t(tikoI18nKeys.yesNo.answers.yes),
    no: i18n.t(tikoI18nKeys.yesNo.answers.no),
    latest: i18n.t(tikoI18nKeys.yesNo.latestAnswer),
    historyLabel: i18n.t(tikoI18nKeys.yesNo.history.label),
    historyTitle: i18n.t(tikoI18nKeys.yesNo.history.title),
    historyEmpty: i18n.t(tikoI18nKeys.yesNo.history.empty),
    fallback: i18n.t(tikoI18nKeys.yesNo.status.browserVoiceFallback),
    speechError: i18n.t(tikoI18nKeys.yesNo.status.speechError)
  }
})

const choices = computed(() => [
  createTikoChoice({ id: 'yes', label: labels.value.yes, tone: 'primary', speechText: labels.value.yes, icon: 'ui/check-fat' }),
  createTikoChoice({ id: 'no', label: labels.value.no, tone: 'secondary', speechText: labels.value.no, icon: 'wayfinding/cross' })
])

const headerActions = computed(() => parentMode.value ? [
  { id: 'history', label: labels.value.historyTitle, icon: 'ui/clock', active: historyOpen.value },
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value }
] : [])

const canSpeakSentence = computed(() => sentence.value.trim().length > 0)
const latestAnswerLabel = computed(() => answerLabel(latestAnswerId.value))
const answerHistoryLabels = computed(() => answerHistory.value.map(answerLabel))

function resolveColorMode(mode: TikoColorMode) {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function saveLocalFallback() {
  writeJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    sentence: sentence.value,
    latestAnswerId: latestAnswerId.value || null,
    answerHistory: answerHistory.value
  })
}

function applySettings(settings: YesNoSettings, version?: number) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
  sentence.value = typeof settings.spokenPrompt === 'string' && settings.spokenPrompt.trim() ? settings.spokenPrompt : defaultSentence.value
  settingsVersion.value = version
}

function applyState(state: YesNoState, version?: number) {
  latestAnswerId.value = toAnswer(state.lastAnswer)
  answerHistory.value = toHistory(state.answerHistory)
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
      spokenPrompt: sentence.value
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
      prompt: sentence.value,
      lastAnswer: latestAnswerId.value || null,
      answerHistory: answerHistory.value
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next answer.
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

watch([language, colorMode, sentence], () => {
  saveLocalFallback()
  void persistSettingsRemote()
})

watch([latestAnswerId, answerHistory], () => {
  saveLocalFallback()
  void persistStateRemote()
}, { deep: true })

onMounted(async () => {
  try {
    await runtime.bootstrapIdentity()
    await runtime.loadProfile()
    await hydrateRemoteData()
  } catch {
    // Keep the child-facing local flow available when API bootstrap is offline.
  } finally {
    bootstrapped.value = true
    saveLocalFallback()
  }
})

async function speak(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  speakStatus.value = 'speaking'
  try {
    const result = await tts.speak({ text: trimmed, language: language.value, provider: 'auto' })
    speakStatus.value = result.metadata?.fallbackUsed ? 'fallback' : 'idle'
  } catch {
    speakStatus.value = 'error'
  }
}

async function answer(id: string) {
  const answerId = toAnswer(id)
  const choice = choices.value.find((item) => item.id === answerId)
  if (!answerId || !choice) return
  latestAnswerId.value = answerId
  answerHistory.value = [answerId, ...answerHistory.value].slice(0, 6)
  await speak(choice.speechText ?? choice.label)
}

function headerAction(id: string) {
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
  if (id === 'history') historyOpen.value = !historyOpen.value
}

function resetSentence() {
  sentence.value = defaultSentence.value
}
</script>

<template>
  <TikoAppShell
    :app-name="labels.appName"
    :app-icon="appConfig.appIcon"
    :app-icon-media-category="appConfig.appIconMediaCategory"
    :app-color="appConfig.appColor"
    avatar="ui/avatar"
    :actions="headerActions"
    :show-settings-button="parentMode"
    @header-action="headerAction"
    @avatar-click="runtime.handleAvatarClick"
  >
    <section class="yes-no-app" :data-color-mode="colorMode">
      <Popup />
      <section class="yes-no-app__sentence" :aria-label="labels.sentenceLabel">
        <textarea
          id="yes-no-sentence"
          v-model="sentence"
          class="yes-no-app__sentence-input"
          :rows="2"
          :maxlength="160"
          :aria-label="labels.sentenceLabel"
        />
        <div class="yes-no-app__sentence-actions">
          <button
            class="yes-no-app__round-control yes-no-app__speak"
            type="button"
            :disabled="!canSpeakSentence"
            :aria-label="labels.speak"
            @click="speak(sentence)"
          >
            <Icon name="media/volume-iii" size="large" aria-hidden="true" />
          </button>
          <button
            class="yes-no-app__round-control yes-no-app__reset"
            type="button"
            :aria-label="labels.reset"
            @click="resetSentence"
          >
            <Icon name="wayfinding/cross" size="medium" aria-hidden="true" />
          </button>
        </div>
      </section>

      <p v-if="speakStatus === 'fallback'" class="yes-no-app__status" role="status">{{ labels.fallback }}</p>
      <p v-if="speakStatus === 'error'" class="yes-no-app__status yes-no-app__status--error" role="alert">{{ labels.speechError }}</p>

      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
      />

      <aside v-if="historyOpen" class="yes-no-app__history" :aria-label="labels.historyLabel">
        <strong>{{ labels.historyTitle }}</strong>
        <p v-if="answerHistory.length === 0">{{ labels.historyEmpty }}</p>
        <ol v-else>
          <li v-for="(item, index) in answerHistoryLabels" :key="`${item}-${index}`">{{ item }}</li>
        </ol>
      </aside>

      <TikoChoiceGrid :choices="choices" @answer="answer" />
      <p v-if="latestAnswerLabel" class="yes-no-app__latest">{{ labels.latest }}: {{ latestAnswerLabel }}</p>
    </section>
  </TikoAppShell>
</template>
