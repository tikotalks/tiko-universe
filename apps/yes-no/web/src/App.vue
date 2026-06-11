<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Icon, Popup } from '@sil/ui'
import { IdentityClient } from '@tiko/identity'
import { TikoDataClient, type YesNoSettings, type YesNoState } from '@tiko/data'
import { createI18n, createTikoIdentityLabels, createTikoTranslationLoader, defaultLanguage, tikoI18nKeys, tikoLanguageOptions, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  TikoSquareTile,
  createTikoTtsClient,
  injectAppMeta,
  tikoColors,
  useIdentityRuntime,
  type IdentityRuntimeState,
  type TikoAppConfig,
  type TikoColorMode
} from '@tiko/ui'
import { appConfig } from './appConfig'
import './styles.scss'

const storageKey = 'tiko:yes-no'
const appId = 'yes-no' as const
const apiBaseUrl = resolveApiBaseUrl()
const contentBaseUrl = resolveContentBaseUrl()
const identityBaseUrl = resolveIdentityBaseUrl()
const bemm = useBemm('yes-no-app', { return: 'string', includeBaseClass: true })

type SpeakStatus = 'idle' | 'speaking' | 'fallback' | 'error'

interface AnswerTile {
  id: string
  label: string
  speech: string
  labelTranslations?: Partial<Record<TikoLanguage, string>>
  speechTranslations?: Partial<Record<TikoLanguage, string>>
  color?: string
  imageURL?: string
  icon?: string
}

interface AnswerSet {
  id: string
  answers?: AnswerTile[]
}

interface DefaultsState {
  answers?: AnswerTile[]
  answerSets?: AnswerSet[]
  selectedSetId?: string
}

interface AppConfigResponse {
  config?: Partial<TikoAppConfig>
}

interface ContentResponse {
  data?: DefaultsState
}

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  sentence?: string
  latestAnswer?: string | null
  latestAnswerId?: string | null
  answerHistory?: string[]
  answers?: AnswerTile[]
}

function resolveApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_API_BASE_URL ?? 'https://app.tikoapi.org/v1').replace(/\/$/, '')
}

function resolveIdentityBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_IDENTITY_API_URL ?? env?.VITE_TIKO_IDENTITY_BASE_URL ?? 'https://id.tikoapps.org/v1').replace(/\/$/, '')
}

function resolveContentBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_CONTENT_BASE_URL ?? env?.VITE_CONTENT_API_URL ?? 'https://content.tikoapi.org/v1').replace(/\/$/, '')
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

function toAnswerId(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toHistory(value: unknown): string[] {
  return Array.isArray(value) ? value.map(toAnswerId).filter(Boolean).slice(0, 6) : []
}

function colorTokenToHex(color: string | undefined, fallback: string) {
  if (!color) return fallback
  if (color.startsWith('#')) return color
  return tikoColors.find(item => item.name === color)?.hex ?? fallback
}

function answerLabel(answer: string) {
  return choices.value.find(choice => choice.id === answer)?.label ?? ''
}

function localizeDefaultAnswer(answer: AnswerTile): AnswerTile {
  const semanticLabel = answer.id === 'yes'
    ? labels.value.yes
    : answer.id === 'no'
      ? labels.value.no
      : undefined
  const label = answer.labelTranslations?.[language.value] ?? semanticLabel ?? answer.label
  const speech = answer.speechTranslations?.[language.value] ?? semanticLabel ?? answer.speech ?? label
  return { ...answer, label, speech }
}

function defaultsAnswers(state: unknown): AnswerTile[] {
  const value = state as DefaultsState | undefined
  if (Array.isArray(value?.answerSets)) {
    const selected = typeof value?.selectedSetId === 'string'
      ? value.answerSets.find(set => set.id === value.selectedSetId)
      : undefined
    const activeSet = selected ?? value.answerSets[0]
    return Array.isArray(activeSet?.answers) ? activeSet.answers : []
  }
  return Array.isArray(value?.answers) ? value.answers : []
}

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const translationLoader = createTikoTranslationLoader()
const loadedTranslations = new Set<string>()
const translationsRevision = ref(0)
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const latestAnswerId = ref<string>(toAnswerId(stored.latestAnswerId ?? stored.latestAnswer))
const answerHistory = ref<string[]>(toHistory(stored.answerHistory))
const defaultAnswers = ref<AnswerTile[]>([])
const customAnswers = ref<AnswerTile[]>(Array.isArray(stored.answers) ? stored.answers : [])
const runtimeAppConfig = ref<TikoAppConfig>({ ...appConfig })
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
const runtime = useIdentityRuntime({ identityClient, state: runtimeState, deviceName: 'Yes No web', labels: () => createTikoIdentityLabels(i18n.t) })

const defaultSentence = computed(() => {
  void translationsRevision.value
  return i18n.t(tikoI18nKeys.yesNo.sentence.default)
})

const labels = computed(() => {
  void language.value
  void translationsRevision.value
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
    speechError: i18n.t(tikoI18nKeys.yesNo.status.speechError),
    settings: i18n.t(tikoI18nKeys.common.settings),
    settingsPanel: {
      settings: i18n.t(tikoI18nKeys.common.settings),
      language: i18n.t(tikoI18nKeys.common.language),
      colorMode: i18n.t(tikoI18nKeys.common.colorMode),
      light: i18n.t(tikoI18nKeys.common.colorModeOptions.light),
      dark: i18n.t(tikoI18nKeys.common.colorModeOptions.dark),
      system: i18n.t(tikoI18nKeys.common.colorModeOptions.system),
    }
  }
})

const shellAppName = computed(() => runtimeAppConfig.value.title || labels.value.appName)

const hardcodedAnswers = computed<AnswerTile[]>(() => [
  { id: 'yes', label: labels.value.yes, speech: labels.value.yes, color: 'green', icon: 'ui/check-fat' },
  { id: 'no', label: labels.value.no, speech: labels.value.no, color: 'red', icon: 'wayfinding/cross' }
])

const defaultChoices = computed<AnswerTile[]>(() => {
  void language.value
  void translationsRevision.value
  if (!defaultAnswers.value.length) return hardcodedAnswers.value
  return defaultAnswers.value.map(localizeDefaultAnswer)
})

const choices = computed<AnswerTile[]>(() => {
  if (customAnswers.value.length) return customAnswers.value
  return defaultChoices.value
})

const headerActions = computed(() => parentMode.value ? [
  { id: 'history', label: labels.value.historyTitle, icon: 'ui/clock', active: historyOpen.value },
  { id: 'settings', label: labels.value.settings, icon: 'ui/settings-dual', active: settingsOpen.value }
] : [])

const canSpeakSentence = computed(() => sentence.value.trim().length > 0)
const latestAnswerLabel = computed(() => {
  void language.value
  void translationsRevision.value
  return answerLabel(latestAnswerId.value)
})
const answerHistoryLabels = computed(() => {
  void language.value
  void translationsRevision.value
  return answerHistory.value.map(answerLabel)
})

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
    answerHistory: answerHistory.value,
    answers: customAnswers.value
  })
}

function applySettings(settings: YesNoSettings, version?: number) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
  sentence.value = typeof settings.spokenPrompt === 'string' && settings.spokenPrompt.trim() ? settings.spokenPrompt : defaultSentence.value
  settingsVersion.value = version
}

function applyState(state: YesNoState, version?: number) {
  latestAnswerId.value = toAnswerId(state.lastAnswer)
  answerHistory.value = toHistory(state.answerHistory)
  customAnswers.value = Array.isArray(state.answers) ? state.answers as AnswerTile[] : []
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
  await loadDefaultContent()
}

async function loadDefaultContent() {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (sessionToken.value) headers.Authorization = `Bearer ${sessionToken.value}`
  try {
    const response = await fetch(`${contentBaseUrl}/yes-no/content?language=${encodeURIComponent(language.value)}`, { headers })
    if (!response.ok) return
    const body = await response.json() as ContentResponse
    defaultAnswers.value = defaultsAnswers(body.data)
  } catch {
    // Keep built-in fallbacks active when content-api is unavailable.
  }
}

async function loadAppConfig() {
  try {
    const response = await fetch(`${apiBaseUrl}/apps/config/${appId}`)
    if (!response.ok) return
    const body = await response.json() as AppConfigResponse
    if (!body.config || typeof body.config !== 'object') return
    runtimeAppConfig.value = { ...appConfig, ...body.config, id: appId }
    injectAppMeta(runtimeAppConfig.value)
  } catch {
    // Keep generated appConfig active when the config endpoint is unavailable.
  }
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
      answerHistory: answerHistory.value,
      answers: customAnswers.value
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next answer.
  }
}

async function loadTranslations(value: TikoLanguage) {
  if (loadedTranslations.has(value)) return
  try {
    const bundle = await translationLoader({ app: appId, language: value })
    if (Object.keys(bundle.translations).length > 0) {
      i18n.addBundle(bundle)
      translationsRevision.value += 1
    }
    loadedTranslations.add(value)
  } catch {
    // Keep local fallbacks active and allow a later language switch to retry.
  }
}

watch(language, (value) => {
  i18n.setLanguage(value)
  void loadTranslations(value)
  void loadDefaultContent()
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
  void loadAppConfig()
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
    const result = await tts.speak({ text: trimmed, language: language.value, provider: 'narakeet' })
    speakStatus.value = result.metadata?.fallbackUsed ? 'fallback' : 'idle'
  } catch {
    speakStatus.value = 'error'
  }
}

async function answer(id: string) {
  const choice = choices.value.find((item) => item.id === id)
  if (!choice) return
  latestAnswerId.value = choice.id
  answerHistory.value = [choice.id, ...answerHistory.value].slice(0, 6)
  await speak(choice.speech || choice.label)
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
    :app-name="shellAppName"
    :app-icon="runtimeAppConfig.appIcon"
    :app-icon-image-url="runtimeAppConfig.appIconImageUrl"
    :app-icon-media-category="runtimeAppConfig.appIconMediaCategory"
    :app-color="runtimeAppConfig.appColor"
    :theme-color="runtimeAppConfig.themeColor"
    avatar="ui/avatar"
    :actions="headerActions"
    :show-settings-button="parentMode"
    @header-action="headerAction"
    @avatar-click="runtime.handleAvatarClick"
  >
    <section :class="bemm('')" :data-color-mode="colorMode">
      <Popup />
      <section :class="bemm('sentence')" :aria-label="labels.sentenceLabel">
        <textarea
          id="yes-no-sentence"
          v-model="sentence"
          :class="bemm('sentence-input')"
          :rows="2"
          :maxlength="160"
          :aria-label="labels.sentenceLabel"
        />
        <div :class="bemm('sentence-actions')">
          <button
            :class="[bemm('round-control'), bemm('speak')]"
            type="button"
            :disabled="!canSpeakSentence"
            :aria-label="labels.speak"
            @click="speak(sentence)"
          >
            <Icon name="media/volume-iii" size="large" aria-hidden="true" />
          </button>
          <button
            :class="[bemm('round-control'), bemm('reset')]"
            type="button"
            :aria-label="labels.reset"
            @click="resetSentence"
          >
            <Icon name="wayfinding/cross" size="medium" aria-hidden="true" />
          </button>
        </div>
      </section>

      <p v-if="speakStatus === 'fallback'" :class="bemm('status')" role="status">{{ labels.fallback }}</p>
      <p v-if="speakStatus === 'error'" :class="bemm('status', { error: true })" role="alert">{{ labels.speechError }}</p>

      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
        :languages="tikoLanguageOptions"
        :labels="labels.settingsPanel"
      />

      <aside v-if="historyOpen" :class="bemm('history')" :aria-label="labels.historyLabel">
        <strong>{{ labels.historyTitle }}</strong>
        <p v-if="answerHistory.length === 0">{{ labels.historyEmpty }}</p>
        <ol v-else>
          <li v-for="(item, index) in answerHistoryLabels" :key="`${item}-${index}`">{{ item }}</li>
        </ol>
      </aside>

      <div :class="bemm('answers')" role="list" :aria-label="labels.latest">
        <TikoSquareTile
          v-for="choice in choices"
          :key="choice.id"
          role="listitem"
          data-test="tiko-answer-button"
          :title="choice.label"
          :background="colorTokenToHex(choice.color, choice.id === 'no' ? '#E03131' : '#2F9E44')"
          :image-src="choice.imageURL"
          label-size="large"
          @press="answer(choice.id)"
        />
      </div>
      <p v-if="latestAnswerLabel" :class="bemm('latest')">{{ labels.latest }}: {{ latestAnswerLabel }}</p>
    </section>
  </TikoAppShell>
</template>
