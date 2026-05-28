<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Button, InputTextArea } from '@sil/ui'
import { IdentityClient, type SessionBundle } from '@tiko/identity'
import { TikoDataClient, type TypeSettings, type TypeState } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  createTikoTtsClient,
  type TikoColorMode
} from '@tiko/ui'
import './styles.scss'

const storageKey = 'tiko:type'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'type' as const
const apiBaseUrl = resolveApiBaseUrl()

type KeyboardLayout = 'qwerty' | 'azerty' | 'abc'
type SpeakStatus = 'idle' | 'speaking' | 'fallback' | 'error'

interface PersistedState {
  language?: string
  colorMode?: string
  keyboardLayout?: string
  text?: string
  completedPrompts?: string[]
}

interface StoredIdentity {
  userId?: string
  deviceId?: string
  deviceSecret?: string
  sessionToken?: string
  expiresAt?: string
}

function resolveApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_API_BASE_URL ?? 'https://api.tikoapi.org/v1').replace(/\/$/, '')
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

function toKeyboardLayout(value: string | undefined): KeyboardLayout {
  return value === 'qwerty' || value === 'azerty' || value === 'abc' ? value : 'qwerty'
}

function toCompletedPrompts(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, 50) : []
}

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const keyboardLayout = ref<KeyboardLayout>(toKeyboardLayout(stored.keyboardLayout))
const text = ref(stored.text ?? '')
const completedPrompts = ref<string[]>(toCompletedPrompts(stored.completedPrompts))
const settingsOpen = ref(false)
const phrasesOpen = ref(false)
const speakStatus = ref<SpeakStatus>('idle')
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const bootstrapped = ref(false)
const tts = createTikoTtsClient()
const identityClient = new IdentityClient({ baseUrl: apiBaseUrl })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })

const labels = computed(() => {
  void language.value
  return {
    appName: i18n.t(tikoI18nKeys.type.appName),
    composeLabel: i18n.t(tikoI18nKeys.type.compose.label),
    composePlaceholder: i18n.t(tikoI18nKeys.type.compose.placeholder),
    speak: i18n.t(tikoI18nKeys.type.compose.speak),
    clear: i18n.t(tikoI18nKeys.type.compose.clear),
    phrasesTitle: i18n.t(tikoI18nKeys.type.phrases.title),
    phrasesEmpty: i18n.t(tikoI18nKeys.type.phrases.empty),
    fallback: i18n.t(tikoI18nKeys.type.status.browserVoiceFallback),
    speechError: i18n.t(tikoI18nKeys.type.status.speechError)
  }
})

const headerActions = computed(() => [
  { id: 'phrases', label: labels.value.phrasesTitle, icon: 'ui/clock', active: phrasesOpen.value },
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value }
])

const canSpeak = computed(() => text.value.trim().length > 0)

function resolveColorMode(mode: TikoColorMode) {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function saveLocalFallback() {
  writeJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    keyboardLayout: keyboardLayout.value,
    text: text.value,
    completedPrompts: completedPrompts.value
  })
}

function saveIdentity(bundle: SessionBundle) {
  sessionToken.value = bundle.session.token
  writeJson(identityStorageKey, {
    userId: bundle.user.id,
    deviceId: bundle.device.id,
    deviceSecret: bundle.device.secret,
    sessionToken: bundle.session.token,
    expiresAt: bundle.session.expiresAt
  } satisfies StoredIdentity)
}

async function bootstrapIdentity() {
  const storedIdentity = readJson<StoredIdentity>(identityStorageKey, {})

  if (storedIdentity.sessionToken) {
    try {
      const bundle = await identityClient.getSession(storedIdentity.sessionToken)
      saveIdentity(bundle)
      return
    } catch {
      // Fall through to device bootstrap with the known device id/secret.
    }
  }

  const bundle = await identityClient.bootstrapDevice({
    device: {
      id: storedIdentity.deviceId,
      secret: storedIdentity.deviceSecret,
      name: 'Type web',
      platform: 'web'
    }
  })
  saveIdentity(bundle)
}

function applySettings(settings: TypeSettings, version?: number) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
  keyboardLayout.value = toKeyboardLayout(settings.keyboardLayout)
  settingsVersion.value = version
}

function applyState(state: TypeState, version?: number) {
  if (typeof state.text === 'string') text.value = state.text
  completedPrompts.value = toCompletedPrompts(state.completedPrompts)
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
      completedPrompts: completedPrompts.value
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on next change.
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
    await bootstrapIdentity()
    await hydrateRemoteData()
  } catch {
    // Keep the child-facing local flow available when API bootstrap is offline.
  } finally {
    bootstrapped.value = true
    saveLocalFallback()
  }
})

async function speakText() {
  const trimmed = text.value.trim()
  if (!trimmed) return
  speakStatus.value = 'speaking'
  try {
    const result = await tts.speak({ text: trimmed, language: language.value, provider: 'auto' })
    speakStatus.value = result.metadata?.fallbackUsed ? 'fallback' : 'idle'
  } catch {
    speakStatus.value = 'error'
  }
  savePromptToHistory(trimmed)
}

function savePromptToHistory(prompt: string) {
  if (completedPrompts.value[0] === prompt) return
  completedPrompts.value = [prompt, ...completedPrompts.value].slice(0, 50)
}

function clearText() {
  text.value = ''
}

function reSpeakPhrase(phrase: string) {
  text.value = phrase
  void speakText()
}

function headerAction(id: string) {
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
  if (id === 'phrases') phrasesOpen.value = !phrasesOpen.value
}
</script>

<template>
  <TikoAppShell
    :app-name="labels.appName"
    app-icon="ui/keyboard"
    app-color="type"
    :actions="headerActions"
    @header-action="headerAction"
  >
    <section class="type-app" :data-color-mode="colorMode">
      <section class="type-app__compose" :aria-label="labels.composeLabel">
        <InputTextArea
          id="type-compose"
          v-model="text"
          class="type-app__compose-input"
          :rows="3"
          :maxlength="500"
          :aria-label="labels.composeLabel"
          :placeholder="labels.composePlaceholder"
        />
        <div class="type-app__compose-actions">
          <Button class="type-app__speak" variant="primary" icon="media/volume-iii" icon-only :disabled="!canSpeak" :aria-label="labels.speak" @click="speakText" />
          <Button class="type-app__clear" variant="secondary" @click="clearText">{{ labels.clear }}</Button>
        </div>
      </section>

      <p v-if="speakStatus === 'fallback'" class="type-app__status" role="status">{{ labels.fallback }}</p>
      <p v-if="speakStatus === 'error'" class="type-app__status type-app__status--error" role="alert">{{ labels.speechError }}</p>

      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
      />

      <section v-if="settingsOpen" class="type-app__keyboard-setting" data-test="type-settings-keyboard">
        <label>
          Keyboard layout
          <select
            class="tiko-settings-panel__select"
            :value="keyboardLayout"
            data-test="tiko-settings-keyboard-layout"
            @change="keyboardLayout = ($event.target as HTMLSelectElement).value as KeyboardLayout"
          >
            <option value="qwerty">QWERTY</option>
            <option value="azerty">AZERTY</option>
            <option value="abc">ABC</option>
          </select>
        </label>
      </section>

      <aside v-if="phrasesOpen" class="type-app__phrases" :aria-label="labels.phrasesTitle">
        <strong>{{ labels.phrasesTitle }}</strong>
        <p v-if="completedPrompts.length === 0">{{ labels.phrasesEmpty }}</p>
        <ul v-else class="type-app__phrases-list">
          <li v-for="(phrase, index) in completedPrompts" :key="`${phrase}-${index}`">
            <button class="type-app__phrase-button" @click="reSpeakPhrase(phrase)">{{ phrase }}</button>
          </li>
        </ul>
      </aside>
    </section>
  </TikoAppShell>
</template>
