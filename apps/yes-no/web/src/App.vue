<script setup lang="ts">
import { computed, h, inject, markRaw, onMounted, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Icon, Popup, type PopupService } from '@sil/ui'
import { IdentityClient } from '@tiko/identity'
import { TikoDataClient, type YesNoSettings, type YesNoState } from '@tiko/data'
import { createI18n, createTikoIdentityLabels, createTikoShellLabels, normalizeTikoLanguage, tikoI18nKeys, tikoLanguageOptions, type TikoLanguage } from '@tiko/i18n'
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
  tikoContentImageRefUrl,
  tikoColors,
  useTikoAppDataRuntime,
  useTikoColorModeEffect,
  useTikoI18nRuntime,
  useIdentityRuntime,
  writeTikoLocalJson,
  type IdentityRuntimeState,
  type TikoAppConfig,
  type TikoColorMode
} from '@tiko/ui'
import { appConfig } from './appConfig'
import type { AnswerSet, AnswerTile, PersistedYesNo } from './types'
import { useYesNoStore } from './composables/useYesNoStore'
import YesNoAnswerTilesSheet from './components/YesNoAnswerTilesSheet.vue'
import './styles.scss'

const storageKey = 'tiko:yes-no'
const appId = 'yes-no' as const
const apiBaseUrl = resolveTikoAppApiBaseUrl()
const contentBaseUrl = resolveTikoContentApiBaseUrl()
const identityBaseUrl = resolveTikoIdentityBaseUrl()
const bemm = useBemm('yes-no-app', { return: 'string', includeBaseClass: true })

type SpeakStatus = 'idle' | 'speaking' | 'fallback' | 'error'
type SentenceSpeechState = 'idle' | 'generating' | 'playing'

interface AppConfigResponse {
  config?: Partial<TikoAppConfig>
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

function answerImageSrc(answer: AnswerTile): string {
  return answer.imageRef ? tikoContentImageRefUrl(answer.imageRef, contentBaseUrl) : ''
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

const stored = readTikoLocalJson<PersistedYesNo>(storageKey, {})
const i18n = createI18n({ app: appId, language: normalizeTikoLanguage(stored.language) })
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
const popup = inject<PopupService>('popupService')!

const store = useYesNoStore({
  storageKey,
  sessionToken,
  readStored: () => readTikoLocalJson<PersistedYesNo>(storageKey, {}),
  writeStored: (state) => writeTikoLocalJson(storageKey, state),
})

const dataRuntime = useTikoAppDataRuntime<typeof appId, YesNoSettings, YesNoState>({
  app: appId,
  sessionToken,
  bootstrapped,
  dataClient,
  readSettings: () => ({
    language: language.value,
    colorMode: colorMode.value,
    spokenPrompt: sentence.value,
  }),
  readState: () => ({
    prompt: sentence.value,
    lastAnswer: latestAnswerId.value || null,
    answerHistory: answerHistory.value,
    answers: customAnswers.value,
    answerSets: store.answerSets.value,
    selectedSetId: store.selectedSetId.value ?? null,
  }),
  applySettings,
  applyState,
})

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
    answerTiles: i18n.t(tikoI18nKeys.yesNo.settings.answerTiles),
    answerTilesDefault: i18n.t(tikoI18nKeys.yesNo.settings.answerTilesDefault),
    settingsPanel: {
      settings: i18n.t(tikoI18nKeys.common.settings),
      appearance: i18n.t(tikoI18nKeys.common.appearance),
      appPreferences: i18n.t(tikoI18nKeys.common.appPreferences),
      language: i18n.t(tikoI18nKeys.common.language),
      colorMode: i18n.t(tikoI18nKeys.common.colorMode),
      light: i18n.t(tikoI18nKeys.common.colorModeOptions.light),
      dark: i18n.t(tikoI18nKeys.common.colorModeOptions.dark),
      system: i18n.t(tikoI18nKeys.common.colorModeOptions.system),
    },
    sheet: {
      title: i18n.t(tikoI18nKeys.yesNo.tileEditor.title),
      subtitle: i18n.t(tikoI18nKeys.yesNo.tileEditor.subtitle),
      empty: i18n.t(tikoI18nKeys.yesNo.tileEditor.empty),
      save: i18n.t(tikoI18nKeys.yesNo.tileEditor.save),
      addSet: i18n.t(tikoI18nKeys.yesNo.sheet.addSet),
      newSet: i18n.t(tikoI18nKeys.yesNo.sheet.newSet),
      editSet: i18n.t(tikoI18nKeys.yesNo.sheet.editSet),
      setName: i18n.t(tikoI18nKeys.yesNo.sheet.setName),
      setNamePlaceholder: i18n.t(tikoI18nKeys.yesNo.sheet.setNamePlaceholder),
      description: i18n.t(tikoI18nKeys.yesNo.sheet.description),
      descriptionPlaceholder: i18n.t(tikoI18nKeys.yesNo.sheet.descriptionPlaceholder),
      color: i18n.t(tikoI18nKeys.yesNo.sheet.color),
      image: i18n.t(tikoI18nKeys.yesNo.sheet.image),
      changeImage: i18n.t(tikoI18nKeys.yesNo.sheet.changeImage),
      addImage: i18n.t(tikoI18nKeys.yesNo.sheet.addImage),
      pickImage: i18n.t(tikoI18nKeys.yesNo.sheet.pickImage),
      search: i18n.t(tikoI18nKeys.yesNo.sheet.search),
      searching: i18n.t(tikoI18nKeys.yesNo.sheet.searching),
      searchImages: i18n.t(tikoI18nKeys.yesNo.sheet.searchImages),
      typeToSearch: i18n.t(tikoI18nKeys.yesNo.sheet.typeToSearch),
      cancel: i18n.t(tikoI18nKeys.yesNo.sheet.cancel),
      tiles: i18n.t(tikoI18nKeys.yesNo.sheet.tiles),
      tilesEmpty: i18n.t(tikoI18nKeys.yesNo.sheet.tilesEmpty),
      tileCount: i18n.t(tikoI18nKeys.yesNo.sheet.tileCount),
      select: i18n.t(tikoI18nKeys.yesNo.sheet.select),
      delete: i18n.t(tikoI18nKeys.yesNo.sheet.delete),
      readonlySet: i18n.t(tikoI18nKeys.yesNo.sheet.readonlySet),
      newTile: i18n.t(tikoI18nKeys.yesNo.sheet.newTile),
      editTile: i18n.t(tikoI18nKeys.yesNo.sheet.editTile),
      name: i18n.t(tikoI18nKeys.yesNo.sheet.name),
      namePlaceholder: i18n.t(tikoI18nKeys.yesNo.sheet.namePlaceholder),
      spokenText: i18n.t(tikoI18nKeys.yesNo.sheet.spokenText),
      whatShouldBeSpoken: i18n.t(tikoI18nKeys.yesNo.sheet.whatShouldBeSpoken),
      addTile: i18n.t(tikoI18nKeys.yesNo.tileEditor.addTile),
    },
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

const selectedSetAnswers = computed<AnswerTile[]>(() => {
  void language.value
  const set = store.selectedSet.value
  if (!set?.answers?.length) return []
  return set.answers.map(localizeDefaultAnswer)
})

const choices = computed<AnswerTile[]>(() => {
  if (selectedSetAnswers.value.length) return selectedSetAnswers.value
  if (customAnswers.value.length) return customAnswers.value
  return defaultChoices.value
})

const selectedSetName = computed(() => store.selectedSet.value?.title ?? labels.value.answerTilesDefault)

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
    answers: customAnswers.value,
    answerSets: store.answerSets.value,
    selectedSetId: store.selectedSetId.value,
  })
}

function applySettings(settings: YesNoSettings) {
  language.value = normalizeTikoLanguage(settings.language)
  colorMode.value = normalizeTikoColorMode(settings.colorMode)
  sentence.value = typeof settings.spokenPrompt === 'string' && settings.spokenPrompt.trim() ? settings.spokenPrompt : defaultSentence.value
}

function applyState(state: YesNoState) {
  latestAnswerId.value = toAnswerId(state.lastAnswer)
  answerHistory.value = toHistory(state.answerHistory)
  customAnswers.value = Array.isArray(state.answers) ? state.answers as AnswerTile[] : []
  if (Array.isArray(state.answerSets) && state.answerSets.length) {
    store.answerSets.value = state.answerSets as unknown as AnswerSet[]
    if (typeof state.selectedSetId === 'string' && state.selectedSetId) {
      store.selectedSetId.value = state.selectedSetId
    }
  }
}

async function loadDefaultContent() {
  try {
    await store.loadContent(language.value)
    defaultAnswers.value = store.selectedSet.value?.answers ?? []
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

useTikoI18nRuntime({ app: appId, language, i18n, onLanguageChange: loadDefaultContent })

useTikoColorModeEffect(colorMode)

watch([language, colorMode, sentence], () => {
  saveLocalFallback()
  void dataRuntime.persistSettingsRemote()
})

watch([latestAnswerId, answerHistory], () => {
  saveLocalFallback()
  void dataRuntime.persistStateRemote()
}, { deep: true })

watch([() => store.answerSets.value, () => store.selectedSetId.value], () => {
  saveLocalFallback()
  void dataRuntime.persistStateRemote()
}, { deep: true })

function openAnswerTilesSheet() {
  popup.showPopup({
    id: 'yes-no-answer-tiles',
    closePopups: true,
    title: '',
    component: markRaw({
      setup() {
        return () => h(YesNoAnswerTilesSheet, {
          answerSets: store.answerSets.value,
          selectedSetId: store.selectedSetId.value,
          contentBaseUrl: store.contentBaseUrl,
          labels: labels.value.sheet,
          onClose: popup.closeAllPopups,
          onSelect: (id: string) => store.selectSet(id),
          onCreateSet: async (value) => {
            await store.createSet(value)
          },
          onUpdateSet: async (id: string, value) => {
            await store.updateSet(id, value)
          },
          onDeleteSet: async (id: string) => {
            await store.deleteSet(id)
          },
        })
      },
    }),
    config: {
      position: 'center',
      canClose: true,
      background: true,
      width: '30rem',
    },
  })
}

onMounted(async () => {
  void loadAppConfig()
  try {
    await runtime.bootstrapIdentity()
    await runtime.loadProfile()
    await dataRuntime.hydrateRemoteData()
    await loadDefaultContent()
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
    const result = await tts.speak({ text: trimmed, language: language.value })
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
    const result = await tts.getAudio({ text: trimmed, language: language.value })
    if (result.audioUrl) {
      const audio = new Audio(result.audioUrl)
      sentenceSpeechState.value = 'playing'
      await audio.play()
      await waitForAudioEnd(audio)
      speakStatus.value = result.metadata?.fallbackUsed ? 'fallback' : 'idle'
      return
    }

    sentenceSpeechState.value = 'playing'
    await tts.speak({ text: trimmed, language: language.value })
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
      >
        <button
          type="button"
          class="yes-no-app__settings-action"
          data-test="tiko-settings-answer-tiles"
          @click="openAnswerTilesSheet"
        >
          <span class="yes-no-app__settings-action-label">{{ labels.answerTiles }}</span>
          <span class="yes-no-app__settings-action-value">{{ selectedSetName }}</span>
          <Icon name="ui/edit-fat" size="small" aria-hidden="true" />
        </button>
      </TikoSettingsPanel>

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
