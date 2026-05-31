<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Button } from '@sil/ui'
import { IdentityClient, type SessionBundle } from '@tiko/identity'
import { TikoDataClient, type TypeSettings, type TypeState } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  TikoColorMode
} from '@tiko/ui'
import './styles.scss'

const storageKey = 'tiko:type'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'type' as const
const apiBaseUrl = resolveApiBaseUrl()

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  keyboardLayout?: 'qwerty' | 'azerty' | 'abc'
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

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const keyboardLayout = ref<'qwerty' | 'azerty' | 'abc'>(stored.keyboardLayout ?? 'abc')
const text = ref(stored.text ?? '')
const completedPrompts = ref<string[]>(stored.completedPrompts ?? [])
const settingsOpen = ref(false)
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const bootstrapped = ref(false)
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
    browserVoiceFallback: i18n.t(tikoI18nKeys.type.status.browserVoiceFallback),
    speechError: i18n.t(tikoI18nKeys.type.status.speechError)
  }
})

const headerActions = computed(() => [
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value }
])

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
  if (settings.keyboardLayout === 'qwerty' || settings.keyboardLayout === 'azerty' || settings.keyboardLayout === 'abc') {
    keyboardLayout.value = settings.keyboardLayout
  }
  settingsVersion.value = version
}

function applyState(state: TypeState, version?: number) {
  if (typeof state.text === 'string') {
    text.value = state.text
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
      completedPrompts: completedPrompts.value
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next change.
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

function handleSpeak() {
  if (!text.value.trim()) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text.value)
  utterance.onerror = () => {
    // Speech synthesis error — silently handled
  }
  window.speechSynthesis.speak(utterance)
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
}

function removePhrase(phrase: string) {
  completedPrompts.value = completedPrompts.value.filter(p => p !== phrase)
}

function headerAction(id: string) {
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
}
</script>

<template>
  <TikoAppShell
    :app-name="labels.appName"
    app-icon="ui/type"
    app-color="type"
    :actions="headerActions"
    @header-action="headerAction"
  >
    <section class="type-app" :data-color-mode="colorMode">
      <!-- Compose area -->
      <div class="type-app__compose">
        <label for="type-textarea">{{ labels.composeLabel }}</label>
        <textarea
          id="type-textarea"
          v-model="text"
          class="type-app__textarea"
          :placeholder="labels.composePlaceholder"
        />

        <!-- Action buttons -->
        <div class="type-app__actions">
          <Button
            class="type-app__action-btn"
            variant="primary"
            icon="media/volume-up"
            :disabled="!text.trim()"
            @click="handleSpeak"
          >
            {{ labels.speak }}
          </Button>
          <Button
            class="type-app__action-btn"
            variant="secondary"
            icon="ui/clear"
            :disabled="!text"
            @click="handleClear"
          >
            {{ labels.clear }}
          </Button>
          <Button
            class="type-app__action-btn"
            variant="secondary"
            icon="ui/save"
            :disabled="!text.trim()"
            @click="savePhrase"
          >
            Save
          </Button>
        </div>
      </div>

      <!-- Virtual keyboard -->
      <div class="type-app__keyboard-toggle">
        <button @click="toggleKeyboardLayout">
          {{ keyboardToggleLabel }}
        </button>
      </div>
      <div class="type-app__keyboard">
        <template v-for="(row, rowIndex) in keyboardRows" :key="rowIndex">
          <button
            v-for="key in row"
            :key="key"
            class="type-app__key"
            @click="handleKeyInput(key)"
          >
            {{ key.toUpperCase() }}
          </button>
          <!-- Add space and backspace on last row -->
          <template v-if="rowIndex === keyboardRows.length - 1">
            <button class="type-app__key type-app__key--space" @click="handleSpace">
              Space
            </button>
            <button class="type-app__key type-app__key--wide" @click="handleBackspace">
              &larr;
            </button>
          </template>
        </template>
      </div>

      <!-- Saved phrases -->
      <div class="type-app__phrases">
        <div class="type-app__phrases-title">{{ labels.phrasesTitle }}</div>
        <ul v-if="completedPrompts.length" class="type-app__phrases-list">
          <li
            v-for="phrase in completedPrompts"
            :key="phrase"
            class="type-app__phrase-item"
            @click="loadPhrase(phrase)"
          >
            {{ phrase }}
          </li>
        </ul>
        <p v-else>{{ labels.phrasesEmpty }}</p>
      </div>

      <!-- Settings panel -->
      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
      />
    </section>
  </TikoAppShell>
</template>
