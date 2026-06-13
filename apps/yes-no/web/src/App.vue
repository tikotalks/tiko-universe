<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Icon, Popup } from '@sil/ui'
import { IdentityClient } from '@tiko/identity'
import { TikoDataClient, type YesNoSettings, type YesNoState } from '@tiko/data'
import { createI18n, createTikoIdentityLabels, createTikoShellLabels, createTikoTranslationLoader, normalizeTikoLanguage, tikoI18nKeys, tikoLanguageOptions, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  TikoSquareTile,
  createTikoTtsClient,
  injectAppMeta,
  normalizeTikoColorMode,
  readTikoLocalJson,
  resolveTikoAppApiBaseUrl,
  resolveTikoContentApiBaseUrl,
  resolveTikoIdentityBaseUrl,
  tikoColors,
  useTikoColorModeEffect,
  useIdentityRuntime,
  writeTikoLocalJson,
  type IdentityRuntimeState,
  type TikoAppConfig,
  type TikoColorMode
} from '@tiko/ui'
import { appConfig } from './appConfig'
import './styles.scss'

const storageKey = 'tiko:yes-no'
const appId = 'yes-no' as const
const apiBaseUrl = resolveTikoAppApiBaseUrl()
const contentBaseUrl = resolveTikoContentApiBaseUrl()
const identityBaseUrl = resolveTikoIdentityBaseUrl()
const bemm = useBemm('yes-no-app', { return: 'string', includeBaseClass: true })

type SpeakStatus = 'idle' | 'speaking' | 'fallback' | 'error'
type SentenceSpeechState = 'idle' | 'generating' | 'playing'

interface AnswerTile {
  id: string
  label: string
  speech: string
  labelTranslations?: Partial<Record<TikoLanguage, string>>
  speechTranslations?: Partial<Record<TikoLanguage, string>>
  color?: string
  imageRef?: string
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

function imageRefURL(imageRef: string) {
  return `${contentBaseUrl}/content/images/${encodeURIComponent(imageRef)}`
}

function answerImageSrc(answer: AnswerTile): string {
  return answer.imageRef ? imageRefURL(answer.imageRef) : ''
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

const stored = readTikoLocalJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: normalizeTikoLanguage(stored.language) })
const translationLoader = createTikoTranslationLoader()
const loadedTranslations = new Set<string>()
const language = ref<TikoLanguage>(normalizeTikoLanguage(stored.language))
const colorMode = ref<TikoColorMode>(normalizeTikoColorMode(stored.colorMode))
const latestAnswerId = ref<string>(toAnswerId(stored.latestAnswerId ?? stored.latestAnswer))
const answerHistory = ref<string[]>(toHistory(stored.answerHistory))
const defaultAnswers = ref<AnswerTile[]>([])
const customAnswers = ref<AnswerTile[]>(Array.isArray(stored.answers) ? stored.answers : [])
const runtimeAppConfig = ref<TikoAppConfig>({ ...appConfig })
const settingsOpen = ref(false)
const historyOpen = ref(false)
const sentence = ref(stored.sentence || i18n.t(tikoI18nKeys.yesNo.sentence.default))
const speakStatus = ref<SpeakStatus>('idle')
const sentenceSpeechState = ref<SentenceSpeechState>('idle')
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
  return i18n.t(tikoI18nKeys.yesNo.sentence.default)
})

const labels = computed(() => {
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
    shell: createTikoShellLabels(i18n.t),
    settingsPanel: {
      settings: i18n.t(tikoI18nKeys.common.settings),
      appearance: i18n.t(tikoI18nKeys.common.appearance),
      appPreferences: i18n.t(tikoI18nKeys.common.appPreferences),
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
  return answerLabel(latestAnswerId.value)
})
const answerHistoryLabels = computed(() => {
  void language.value
  return answerHistory.value.map(answerLabel)
})

function saveLocalFallback() {
  writeTikoLocalJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    sentence: sentence.value,
    latestAnswerId: latestAnswerId.value || null,
    answerHistory: answerHistory.value,
    answers: customAnswers.value
  })
}

function applySettings(settings: YesNoSettings, version?: number) {
  language.value = normalizeTikoLanguage(settings.language)
  colorMode.value = normalizeTikoColorMode(settings.colorMode)
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

useTikoColorModeEffect(colorMode)

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

function waitForAudioEnd(audio: Pick<EventTarget, 'addEventListener'>): Promise<void> {
  return new Promise((resolve) => {
    const done = () => resolve()
    audio.addEventListener('ended', done, { once: true })
    audio.addEventListener('error', done, { once: true })
  })
}

async function speakSentence() {
  const trimmed = sentence.value.trim()
  if (sentenceSpeechState.value !== 'idle' || !trimmed) return
  sentenceSpeechState.value = 'generating'
  speakStatus.value = 'speaking'
  try {
    const result = await tts.getAudio({ text: trimmed, language: language.value, provider: 'narakeet' })
    if (result.audioUrl) {
      const audio = new Audio(result.audioUrl)
      sentenceSpeechState.value = 'playing'
      await audio.play()
      await waitForAudioEnd(audio)
      speakStatus.value = result.metadata?.fallbackUsed ? 'fallback' : 'idle'
      return
    }

    sentenceSpeechState.value = 'playing'
    await tts.speak({ text: trimmed, language: language.value, provider: 'narakeet' })
    speakStatus.value = result.metadata?.fallbackUsed ? 'fallback' : 'idle'
  } catch {
    speakStatus.value = 'error'
  } finally {
    sentenceSpeechState.value = 'idle'
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
    :labels="labels.shell"
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
            :disabled="!canSpeakSentence || sentenceSpeechState !== 'idle'"
            :aria-busy="sentenceSpeechState === 'generating'"
            :data-state="sentenceSpeechState"
            :aria-label="labels.speak"
            @click="speakSentence"
          >
            <span v-if="sentenceSpeechState === 'generating'" :class="bemm('spinner')" aria-hidden="true"></span>
            <Icon v-else-if="sentenceSpeechState === 'playing'" name="media/playback-pause" size="large" aria-hidden="true" />
            <Icon v-else name="media/volume-iii" size="large" aria-hidden="true" />
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
          :image-src="answerImageSrc(choice)"
          label-size="large"
          @press="answer(choice.id)"
        />
      </div>
      <p v-if="latestAnswerLabel" :class="bemm('latest')">{{ labels.latest }}: {{ latestAnswerLabel }}</p>
    </section>
  </TikoAppShell>
</template>
