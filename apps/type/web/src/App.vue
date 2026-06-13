<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon, Popup } from '@sil/ui'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import { TikoDataClient, type TypeSettings, type TypeState } from '@tiko/data'
import { createI18n, createTikoIdentityLabels, createTikoShellLabels, createTikoTranslationLoader, normalizeTikoLanguage, tikoI18nKeys, tikoLanguageOptions, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  TikoColorMode,
  createTikoTtsClient,
  normalizeTikoColorMode,
  readTikoLocalJson,
  resolveTikoAppApiBaseUrl,
  resolveTikoIdentityBaseUrl,
  useTikoColorModeEffect,
  useIdentityRuntime,
  writeTikoLocalJson,
  type IdentityRuntimeState
} from '@tiko/ui'
import { appConfig } from './appConfig'
import './styles.scss'

const storageKey = 'tiko:type'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'type' as const
const apiBaseUrl = resolveTikoAppApiBaseUrl()
const identityBaseUrl = resolveTikoIdentityBaseUrl()

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  keyboardLayout?: 'qwerty' | 'azerty' | 'abc'
  text?: string
  prompts?: string[]
  completedPrompts?: string[]
}



function normalizePrompts(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((prompt): prompt is string => typeof prompt === 'string')
    .map(prompt => prompt.trim())
    .filter(Boolean)
}

const stored = readTikoLocalJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: normalizeTikoLanguage(stored.language) })
const translationLoader = createTikoTranslationLoader()
const language = ref<TikoLanguage>(normalizeTikoLanguage(stored.language))
const colorMode = ref<TikoColorMode>(normalizeTikoColorMode(stored.colorMode))
const keyboardLayout = ref<'qwerty' | 'azerty' | 'abc'>(stored.keyboardLayout ?? 'abc')
const text = ref(stored.text ?? '')
const prompts = ref<string[]>(normalizePrompts(stored.prompts))
const completedPrompts = ref<string[]>(stored.completedPrompts ?? [])
const phrasesOpen = ref(false)
const settingsOpen = ref(false)
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const userId = ref('')
const accountEmail = ref('')
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
  sessionToken, userId, accountEmail, accountEmailVerified, displayName,
  parentMode, childModeEnabled, pinConfigured,
}
const runtime = useIdentityRuntime({ identityClient, state: runtimeState, deviceName: 'Type web', labels: () => createTikoIdentityLabels(i18n.t) })

const labels = computed(() => {
  return {
    appName: i18n.t(tikoI18nKeys.type.appName),
    composeLabel: i18n.t(tikoI18nKeys.type.compose.label),
    composePlaceholder: i18n.t(tikoI18nKeys.type.compose.placeholder),
    speak: i18n.t(tikoI18nKeys.type.compose.speak),
    clear: i18n.t(tikoI18nKeys.type.compose.clear),
    phrasesTitle: i18n.t(tikoI18nKeys.type.phrases.title),
    phrasesEmpty: i18n.t(tikoI18nKeys.type.phrases.empty),
    browserVoiceFallback: i18n.t(tikoI18nKeys.type.status.browserVoiceFallback),
    speechError: i18n.t(tikoI18nKeys.type.status.speechError),
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

const headerActions = computed(() => parentMode.value ? [
  { id: 'settings', label: labels.value.settings, icon: 'ui/settings-dual', active: settingsOpen.value }
] : [])

const QWERTY_ROWS = [
  'qwertyuiop'.split(''),
  'asdfghjkl'.split(''),
  'zxcvbnm'.split('')
]

const AZERTY_ROWS = [
  'azertyuiop'.split(''),
  'qsdfghjklm'.split(''),
  'wxcvbn'.split('')
]

const ABC_ROWS = [
  'abcdefghij'.split(''),
  'klmnopqrst'.split(''),
  'uvwxyz'.split('')
]

const keyboardRows = computed(() => {
  if (keyboardLayout.value === 'qwerty') return QWERTY_ROWS
  if (keyboardLayout.value === 'azerty') return AZERTY_ROWS
  return ABC_ROWS
})

const keyboardToggleLabel = computed(() => {
  if (keyboardLayout.value === 'qwerty') return 'ABC'
  if (keyboardLayout.value === 'azerty') return 'ABC'
  return 'QWERTY'
})

function saveLocalFallback() {
  writeTikoLocalJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    keyboardLayout: keyboardLayout.value,
    text: text.value,
    prompts: prompts.value,
    completedPrompts: completedPrompts.value
  })
}

function saveIdentity(bundle: IdentityBundle) {
  runtime.saveIdentity(bundle)
}

async function bootstrapIdentity() {
  return runtime.bootstrapIdentity()
}

function applySettings(settings: TypeSettings, version?: number) {
  language.value = normalizeTikoLanguage(settings.language)
  colorMode.value = normalizeTikoColorMode(settings.colorMode)
  if (settings.keyboardLayout === 'qwerty' || settings.keyboardLayout === 'azerty' || settings.keyboardLayout === 'abc') {
    keyboardLayout.value = settings.keyboardLayout
  }
  settingsVersion.value = version
}

function applyState(state: TypeState, version?: number) {
  if (typeof state.text === 'string') {
    text.value = state.text
  }
  if (Array.isArray(state.prompts)) {
    prompts.value = normalizePrompts(state.prompts)
  }
  if (Array.isArray(state.completedPrompts)) {
    completedPrompts.value = state.completedPrompts
  }
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
      keyboardLayout: keyboardLayout.value
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
      text: text.value,
      prompts: prompts.value,
      completedPrompts: completedPrompts.value
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next change.
  }
}

async function loadTranslations(value: TikoLanguage) {
  try {
    i18n.addBundle(await translationLoader({ app: appId, language: value }))
  } catch {
    // Local fallbacks remain active; a later language switch can retry.
  }
}

watch(language, (value) => {
  i18n.setLanguage(value)
  void loadTranslations(value)
}, { immediate: true })

useTikoColorModeEffect(colorMode)

watch([language, colorMode, keyboardLayout], () => {
  saveLocalFallback()
  void persistSettingsRemote()
})

watch([text, completedPrompts], () => {
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

async function handleSpeak() {
  if (!text.value.trim()) return
  try {
    await tts.speak({ text: text.value, language: language.value, provider: 'auto' })
  } catch {
    // Browser fallback is handled inside the shared TTS client.
  }
}

function handleClear() {
  text.value = ''
}

function handleKeyInput(char: string) {
  text.value += char
}

function handleBackspace() {
  text.value = text.value.slice(0, -1)
}

function handleSpace() {
  text.value += ' '
}

function toggleKeyboardLayout() {
  if (keyboardLayout.value === 'abc') {
    keyboardLayout.value = 'qwerty'
  } else if (keyboardLayout.value === 'qwerty') {
    keyboardLayout.value = 'azerty'
  } else {
    keyboardLayout.value = 'abc'
  }
}

function savePhrase() {
  const trimmed = text.value.trim()
  if (!trimmed) return
  if (!completedPrompts.value.includes(trimmed)) {
    completedPrompts.value = [...completedPrompts.value, trimmed]
  }
}

function loadPhrase(phrase: string) {
  text.value = phrase
  phrasesOpen.value = false
}

const savedPhrases = computed(() => completedPrompts.value.filter(phrase => !prompts.value.includes(phrase)))

function removePhrase(phrase: string) {
  completedPrompts.value = completedPrompts.value.filter(p => p !== phrase)
}

function preventNativeKeyboard(event: FocusEvent) {
  ;(event.target as HTMLTextAreaElement).blur()
}

function headerAction(id: string) {
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
}
</script>

<template>
  <TikoAppShell
    :app-name="labels.appName"
    :app-icon="appConfig.appIcon"
    :app-icon-image-url="appConfig.appIconImageUrl"
    :app-icon-media-category="appConfig.appIconMediaCategory"
    :app-color="appConfig.appColor"
    :theme-color="appConfig.themeColor"
    avatar="ui/avatar"
    :actions="headerActions"
    :labels="labels.shell"
    @header-action="headerAction"
    @avatar-click="runtime.handleAvatarClick"
  >
    <section class="type-app" :data-color-mode="colorMode">
      <Popup />
      <!-- Compose area -->
      <div class="type-app__compose">
        <div class="type-app__compose-header">
          <label for="type-textarea">{{ labels.composeLabel }}</label>
          <div class="type-app__actions" aria-label="Compose actions">
            <button
              class="type-app__icon-btn type-app__icon-btn--primary"
              type="button"
              :aria-label="labels.speak"
              :title="labels.speak"
              :disabled="!text.trim()"
              @click="handleSpeak"
            >
              <Icon name="media/volume-up" size="small" aria-hidden="true" />
            </button>
            <button
              class="type-app__icon-btn"
              type="button"
              :aria-label="labels.clear"
              :title="labels.clear"
              :disabled="!text"
              @click="handleClear"
            >
              <Icon name="ui/clear" size="small" aria-hidden="true" />
            </button>
            <button
              class="type-app__icon-btn"
              type="button"
              aria-label="Save phrase"
              title="Save phrase"
              :disabled="!text.trim()"
              @click="savePhrase"
            >
              <Icon name="ui/save" size="small" aria-hidden="true" />
            </button>
            <button
              class="type-app__icon-btn"
              type="button"
              :aria-label="labels.phrasesTitle"
              :title="labels.phrasesTitle"
              @click="phrasesOpen = true"
            >
              <Icon name="ui/list" size="small" aria-hidden="true" />
            </button>
          </div>
        </div>
        <textarea
          id="type-textarea"
          v-model="text"
          class="type-app__textarea"
          :placeholder="labels.composePlaceholder"
          inputmode="none"
          readonly
          @focus="preventNativeKeyboard"
        />
      </div>

      <!-- Saved phrases popup -->
      <div v-if="phrasesOpen" class="type-app__phrases-backdrop" @click.self="phrasesOpen = false">
        <section class="type-app__phrases-popup" role="dialog" aria-modal="true" :aria-label="labels.phrasesTitle">
          <div class="type-app__phrases-header">
            <h2>{{ labels.phrasesTitle }}</h2>
            <button class="type-app__icon-btn" type="button" aria-label="Close" @click="phrasesOpen = false">×</button>
          </div>
          <div v-if="prompts.length" class="type-app__phrase-section">
            <ul class="type-app__phrases-list">
              <li v-for="phrase in prompts" :key="phrase" class="type-app__phrase-row">
                <button class="type-app__phrase-item" type="button" @click="loadPhrase(phrase)">{{ phrase }}</button>
              </li>
            </ul>
          </div>
          <div v-if="savedPhrases.length" class="type-app__phrase-section">
            <ul class="type-app__phrases-list">
              <li v-for="phrase in savedPhrases" :key="phrase" class="type-app__phrase-row">
                <button class="type-app__phrase-item" type="button" @click="loadPhrase(phrase)">{{ phrase }}</button>
                <button class="type-app__phrase-remove" type="button" aria-label="Remove phrase" @click="removePhrase(phrase)">×</button>
              </li>
            </ul>
          </div>
          <p v-if="!prompts.length && !savedPhrases.length" class="type-app__phrases-empty">{{ labels.phrasesEmpty }}</p>
        </section>
      </div>

      <!-- Virtual keyboard -->
      <div class="type-app__keyboard-panel">
        <div class="type-app__keyboard-toggle">
          <button type="button" @click="toggleKeyboardLayout">
            {{ keyboardLayout.toUpperCase() }} → {{ keyboardToggleLabel }}
          </button>
        </div>
        <div class="type-app__keyboard" :data-layout="keyboardLayout">
          <div v-for="(row, rowIndex) in keyboardRows" :key="rowIndex" class="type-app__keyboard-row">
            <button
              v-for="key in row"
              :key="key"
              type="button"
              class="type-app__key"
              @click="handleKeyInput(key)"
            >
              {{ key.toUpperCase() }}
            </button>
          </div>
          <div class="type-app__keyboard-row type-app__keyboard-row--controls">
            <button class="type-app__key type-app__key--wide" type="button" @click="toggleKeyboardLayout">
              {{ keyboardToggleLabel }}
            </button>
            <button class="type-app__key type-app__key--space" type="button" @click="handleSpace">
              Space
            </button>
            <button class="type-app__key type-app__key--wide" type="button" aria-label="Backspace" @click="handleBackspace">
              ←
            </button>
          </div>
        </div>
      </div>

      <!-- Settings panel -->
      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
        :languages="tikoLanguageOptions"
        :labels="labels.settingsPanel"
      />
    </section>
  </TikoAppShell>
</template>
