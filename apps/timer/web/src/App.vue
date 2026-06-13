<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Button, Popup } from '@sil/ui'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import { TikoDataClient, type TimerSettings, type TimerState } from '@tiko/data'
import { createI18n, createTikoIdentityLabels, createTikoShellLabels, createTikoTranslationLoader, defaultLanguage, tikoI18nKeys, tikoLanguageOptions, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  TikoColorMode,
  useIdentityRuntime,
  type IdentityRuntimeState
} from '@tiko/ui'
import { useTimer, type TimerMode } from './composables/useTimer'
import { appConfig } from './appConfig'
import './styles.scss'

const storageKey = 'tiko:timer'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'timer' as const
const apiBaseUrl = resolveApiBaseUrl()
const identityBaseUrl = resolveIdentityBaseUrl()

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  customMinutes?: number
  customSeconds?: number
  timerMode?: TimerMode
  targetMs?: number
  remainingMs?: number
  totalDurationMs?: number
  startedAt?: number | null
  presets?: TimerPreset[]
}

interface TimerPreset {
  id: string
  label: string
  seconds: number
}

const defaultPresets: TimerPreset[] = [
  { id: '1m', label: '1 min', seconds: 60 },
  { id: '3m', label: '3 min', seconds: 180 },
  { id: '5m', label: '5 min', seconds: 300 },
  { id: '10m', label: '10 min', seconds: 600 },
]

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

function normalizePreset(value: unknown, index: number): TimerPreset | null {
  if (!value || typeof value !== 'object') return null
  const preset = value as Partial<TimerPreset>
  const seconds = Number(preset.seconds)
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  const label = typeof preset.label === 'string' && preset.label.trim() ? preset.label.trim() : `${Math.round(seconds)} sec`
  return {
    id: typeof preset.id === 'string' && preset.id.trim() ? preset.id.trim() : `preset-${index + 1}`,
    label,
    seconds: Math.round(seconds),
  }
}

function normalizePresets(value: unknown): TimerPreset[] {
  if (!Array.isArray(value)) return defaultPresets
  const presets = value.map(normalizePreset).filter((preset): preset is TimerPreset => preset !== null)
  return presets.length > 0 ? presets : defaultPresets
}

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const translationLoader = createTikoTranslationLoader()
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const customMinutes = ref(stored.customMinutes ?? 5)
const customSeconds = ref(stored.customSeconds ?? 0)
const presets = ref<TimerPreset[]>(normalizePresets(stored.presets))
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
const identityClient = new IdentityClient({ baseUrl: identityBaseUrl, credentials: 'include' })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })

const runtimeState: IdentityRuntimeState = {
  sessionToken, userId, accountEmail, accountEmailVerified, displayName,
  parentMode, childModeEnabled, pinConfigured,
}
const runtime = useIdentityRuntime({ identityClient, state: runtimeState, deviceName: 'Timer web', labels: () => createTikoIdentityLabels(i18n.t) })

const timer = useTimer()

// If we have a persisted running/paused timer, restore it
if (stored.timerMode && stored.timerMode !== 'idle') {
  timer.restoreFromState({
    mode: stored.timerMode,
    targetMs: stored.targetMs ?? 0,
    remainingMs: stored.remainingMs ?? 0,
    totalDurationMs: stored.totalDurationMs ?? 0,
    startedAt: stored.startedAt ?? null
  })
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 80

const labels = computed(() => {
  return {
    appName: i18n.t(tikoI18nKeys.timer.appName),
    expired: i18n.t(tikoI18nKeys.timer.display.expired),
    start: i18n.t(tikoI18nKeys.timer.controls.start),
    pause: i18n.t(tikoI18nKeys.timer.controls.pause),
    resume: i18n.t(tikoI18nKeys.timer.controls.resume),
    reset: i18n.t(tikoI18nKeys.timer.controls.reset),
    presetsLabel: i18n.t(tikoI18nKeys.timer.presets.label),
    custom: i18n.t(tikoI18nKeys.timer.presets.custom),
    minutes: i18n.t(tikoI18nKeys.timer.settings.minutes),
    seconds: i18n.t(tikoI18nKeys.timer.settings.seconds),
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

const isIdle = computed(() => timer.mode.value === 'idle')
const isRunning = computed(() => timer.mode.value === 'running')
const isPaused = computed(() => timer.mode.value === 'paused')
const isExpired = computed(() => timer.mode.value === 'expired')
const isActive = computed(() => isRunning.value || isPaused.value)

const ringDashoffset = computed(() => {
  const p = timer.progress.value
  return RING_CIRCUMFERENCE * (1 - p)
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
    customMinutes: customMinutes.value,
    customSeconds: customSeconds.value,
    presets: presets.value,
    ...timer.getState()
  })
}

function saveIdentity(bundle: IdentityBundle) {
  runtime.saveIdentity(bundle)
}

async function bootstrapIdentity() {
  return runtime.bootstrapIdentity()
}

function applySettings(settings: TimerSettings, version?: number) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
  if (typeof settings.defaultMinutes === 'number' && settings.defaultMinutes >= 0) {
    customMinutes.value = settings.defaultMinutes
  }
  if (typeof settings.defaultSeconds === 'number' && settings.defaultSeconds >= 0) {
    customSeconds.value = settings.defaultSeconds
  }
  settingsVersion.value = version
}

function applyState(state: TimerState, version?: number) {
  if (Array.isArray(state.presets)) {
    presets.value = normalizePresets(state.presets)
  }
  if (state.mode && state.mode !== 'idle') {
    timer.restoreFromState({
      mode: state.mode,
      targetMs: state.targetMs ?? 0,
      remainingMs: state.remainingMs ?? 0,
      totalDurationMs: state.totalDurationMs ?? 0,
      startedAt: state.startedAt ?? null
    })
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
      defaultMinutes: customMinutes.value,
      defaultSeconds: customSeconds.value
    }, { version: settingsVersion.value })
    settingsVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next edit.
  }
}

async function persistStateRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const timerState = timer.getState()
    const response = await dataClient.putState(appId, sessionToken.value, {
      mode: timerState.mode,
      targetMs: timerState.targetMs,
      remainingMs: timerState.remainingMs,
      totalDurationMs: timerState.totalDurationMs,
      startedAt: timerState.startedAt,
      presets: presets.value
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

watch(colorMode, (mode) => {
  const effective = resolveColorMode(mode)
  document.documentElement.dataset.colorMode = effective
  document.documentElement.dataset.theme = effective
}, { immediate: true })

watch([language, colorMode, customMinutes, customSeconds], () => {
  saveLocalFallback()
  void persistSettingsRemote()
})

watch(timer.mode, () => {
  saveLocalFallback()
  void persistStateRemote()
})

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

function selectPreset(preset: TimerPreset) {
  timer.reset()
  timer.start(preset.seconds * 1000)
}

function startCustom() {
  const ms = (customMinutes.value * 60 + customSeconds.value) * 1000
  if (ms <= 0) return
  timer.reset()
  timer.start(ms)
}

function handleStart() {
  if (isIdle.value || isExpired.value) {
    startCustom()
  }
}

function handlePause() {
  timer.pause()
}

function handleResume() {
  timer.resume()
}

function handleReset() {
  timer.reset()
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
    <section class="timer-app" :data-color-mode="colorMode">
      <Popup />
      <!-- Countdown ring -->
      <div class="timer-app__ring-wrap">
        <svg class="timer-app__ring-svg" viewBox="0 0 180 180">
          <circle class="timer-app__ring-bg" cx="90" cy="90" r="80" />
          <circle
            class="timer-app__ring-progress"
            cx="90"
            cy="90"
            r="80"
            :stroke-dasharray="RING_CIRCUMFERENCE"
            :stroke-dashoffset="ringDashoffset"
          />
        </svg>
        <div class="timer-app__ring-text">
          <span class="timer-app__time">{{ timer.displayTime.value }}</span>
          <span v-if="isExpired" class="timer-app__expired-label">{{ labels.expired }}</span>
        </div>
      </div>

      <!-- Preset buttons -->
      <div v-if="isIdle" class="timer-app__presets" :aria-label="labels.presetsLabel">
        <Button
          v-for="preset in presets"
          :key="preset.id"
          class="timer-app__preset-btn"
          variant="primary"
          @click="selectPreset(preset)"
        >
          {{ preset.label }}
        </Button>
      </div>

      <!-- Custom time input -->
      <div v-if="isIdle" class="timer-app__custom">
        <label for="timer-custom-min">{{ labels.minutes }}</label>
        <input
          id="timer-custom-min"
          v-model.number="customMinutes"
          type="number"
          min="0"
          max="99"
          aria-label="Minutes"
        />
        <label for="timer-custom-sec">{{ labels.seconds }}</label>
        <input
          id="timer-custom-sec"
          v-model.number="customSeconds"
          type="number"
          min="0"
          max="59"
          aria-label="Seconds"
        />
      </div>

      <!-- Controls -->
      <div class="timer-app__controls">
        <Button
          v-if="isIdle || isExpired"
          class="timer-app__control-btn timer-app__control-btn--start"
          variant="primary"
          icon="media/play"
          @click="handleStart"
        >
          {{ labels.start }}
        </Button>
        <Button
          v-if="isRunning"
          class="timer-app__control-btn"
          variant="primary"
          icon="media/pause"
          @click="handlePause"
        >
          {{ labels.pause }}
        </Button>
        <Button
          v-if="isPaused"
          class="timer-app__control-btn timer-app__control-btn--start"
          variant="primary"
          icon="media/play"
          @click="handleResume"
        >
          {{ labels.resume }}
        </Button>
        <Button
          v-if="isActive || isExpired"
          class="timer-app__control-btn"
          variant="secondary"
          icon="ui/reset"
          @click="handleReset"
        >
          {{ labels.reset }}
        </Button>
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
