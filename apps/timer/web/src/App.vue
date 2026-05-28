<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Button } from '@sil/ui'
import { IdentityClient, type SessionBundle } from '@tiko/identity'
import { TikoDataClient, type TimerSettings, type TimerState } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  createTikoTtsClient,
  type TikoColorMode
} from '@tiko/ui'
import './styles.scss'

const storageKey = 'tiko:timer'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'timer' as const
const apiBaseUrl = resolveApiBaseUrl()

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  defaultMinutes?: number
  defaultSeconds?: number
  mode?: string
  targetTimestamp?: string | null
  totalSeconds?: number
  isRunning?: boolean
  lastStartedAt?: string | null
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
const settingsOpen = ref(false)
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const bootstrapped = ref(false)
const tts = createTikoTtsClient()
const identityClient = new IdentityClient({ baseUrl: apiBaseUrl })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })

// Timer state
const setMinutes = ref(stored.defaultMinutes ?? 5)
const setSeconds = ref(stored.defaultSeconds ?? 0)
const mode = ref<'countdown'>(stored.mode === 'countdown' ? 'countdown' : 'countdown')
const totalSeconds = ref(stored.totalSeconds ?? (stored.defaultMinutes ?? 5) * 60 + (stored.defaultSeconds ?? 0))
const isRunning = ref(false)
const targetTimestamp = ref<string | null>(stored.targetTimestamp ?? null)
const lastStartedAt = ref<string | null>(stored.lastStartedAt ?? null)
const displayTime = ref(formatRemaining(totalSeconds.value * 1000))
const statusLabel = ref(i18n.t(tikoI18nKeys.timer.status.idle))
const expired = ref(false)

let intervalId: ReturnType<typeof setInterval> | null = null

const labels = computed(() => {
  void language.value
  return {
    appName: i18n.t(tikoI18nKeys.timer.appName),
    setLabel: i18n.t(tikoI18nKeys.timer.set.label),
    minutesLabel: i18n.t(tikoI18nKeys.timer.set.minutes),
    secondsLabel: i18n.t(tikoI18nKeys.timer.set.seconds),
    startLabel: i18n.t(tikoI18nKeys.timer.set.start),
    pauseLabel: i18n.t(tikoI18nKeys.timer.controls.pause),
    resumeLabel: i18n.t(tikoI18nKeys.timer.controls.resume),
    resetLabel: i18n.t(tikoI18nKeys.timer.controls.reset),
    expiredLabel: i18n.t(tikoI18nKeys.timer.status.expired),
    runningLabel: i18n.t(tikoI18nKeys.timer.status.running),
    pausedLabel: i18n.t(tikoI18nKeys.timer.status.paused),
    idleLabel: i18n.t(tikoI18nKeys.timer.status.idle)
  }
})

const headerActions = computed(() => [
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value }
])

function resolveColorMode(m: TikoColorMode) {
  if (m !== 'system') return m
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function computeRemainingMs(): number {
  if (!targetTimestamp.value) return totalSeconds.value * 1000
  return new Date(targetTimestamp.value).getTime() - Date.now()
}

function tick() {
  const remaining = computeRemainingMs()
  if (remaining <= 0) {
    displayTime.value = '00:00'
    stopInterval()
    isRunning.value = false
    expired.value = true
    statusLabel.value = labels.value.expiredLabel
    saveLocalFallback()
    void announceExpired()
    void persistStateRemote()
  } else {
    displayTime.value = formatRemaining(remaining)
    statusLabel.value = labels.value.runningLabel
  }
}

function startInterval() {
  stopInterval()
  intervalId = setInterval(tick, 1000)
}

function stopInterval() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function startTimer() {
  const totalMs = (setMinutes.value * 60 + setSeconds.value) * 1000
  if (totalMs <= 0) return
  totalSeconds.value = setMinutes.value * 60 + setSeconds.value
  const target = new Date(Date.now() + totalMs)
  targetTimestamp.value = target.toISOString()
  lastStartedAt.value = new Date().toISOString()
  isRunning.value = true
  expired.value = false
  mode.value = 'countdown'
  displayTime.value = formatRemaining(totalMs)
  statusLabel.value = labels.value.runningLabel
  startInterval()
  saveLocalFallback()
  void persistStateRemote()
}

function pauseTimer() {
  stopInterval()
  isRunning.value = false
  const remaining = computeRemainingMs()
  totalSeconds.value = Math.max(0, Math.ceil(remaining / 1000))
  targetTimestamp.value = null
  statusLabel.value = labels.value.pausedLabel
  saveLocalFallback()
  void persistStateRemote()
}

function resumeTimer() {
  if (totalSeconds.value <= 0) return
  const totalMs = totalSeconds.value * 1000
  const target = new Date(Date.now() + totalMs)
  targetTimestamp.value = target.toISOString()
  lastStartedAt.value = new Date().toISOString()
  isRunning.value = true
  statusLabel.value = labels.value.runningLabel
  startInterval()
  saveLocalFallback()
  void persistStateRemote()
}

function resetTimer() {
  stopInterval()
  isRunning.value = false
  expired.value = false
  targetTimestamp.value = null
  lastStartedAt.value = null
  totalSeconds.value = setMinutes.value * 60 + setSeconds.value
  displayTime.value = formatRemaining(totalSeconds.value * 1000)
  statusLabel.value = labels.value.idleLabel
  saveLocalFallback()
  void persistStateRemote()
}

async function announceExpired() {
  try {
    await tts.speak({ text: labels.value.expiredLabel, language: language.value, provider: 'auto' })
  } catch {
    // TTS failure is non-critical
  }
}

function saveLocalFallback() {
  writeJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    defaultMinutes: setMinutes.value,
    defaultSeconds: setSeconds.value,
    mode: mode.value,
    targetTimestamp: targetTimestamp.value,
    totalSeconds: totalSeconds.value,
    isRunning: isRunning.value,
    lastStartedAt: lastStartedAt.value
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
      // Fall through to device bootstrap
    }
  }

  const bundle = await identityClient.bootstrapDevice({
    device: {
      id: storedIdentity.deviceId,
      secret: storedIdentity.deviceSecret,
      name: 'Timer web',
      platform: 'web'
    }
  })
  saveIdentity(bundle)
}

function applySettings(settings: TimerSettings, version?: number) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
  if (typeof settings.defaultMinutes === 'number' && settings.defaultMinutes >= 0) {
    setMinutes.value = settings.defaultMinutes
  }
  if (typeof settings.defaultSeconds === 'number' && settings.defaultSeconds >= 0) {
    setSeconds.value = settings.defaultSeconds
  }
  // Align totalSeconds if not currently running
  if (!isRunning.value && !targetTimestamp.value) {
    totalSeconds.value = setMinutes.value * 60 + setSeconds.value
    displayTime.value = formatRemaining(totalSeconds.value * 1000)
  }
  settingsVersion.value = version
}

function applyState(state: TimerState, version?: number) {
  if (state.targetTimestamp) {
    const target = new Date(state.targetTimestamp).getTime()
    const now = Date.now()
    if (target > now) {
      // Timer is still active — resume it
      targetTimestamp.value = state.targetTimestamp
      totalSeconds.value = state.totalSeconds ?? totalSeconds.value
      lastStartedAt.value = state.lastStartedAt ?? null
      isRunning.value = true
      expired.value = false
      displayTime.value = formatRemaining(target - now)
      statusLabel.value = labels.value.runningLabel
      startInterval()
    } else {
      // Timer expired while away
      targetTimestamp.value = null
      totalSeconds.value = state.totalSeconds ?? totalSeconds.value
      isRunning.value = false
      expired.value = true
      displayTime.value = '00:00'
      statusLabel.value = labels.value.expiredLabel
    }
  } else if (state.isRunning && typeof state.totalSeconds === 'number') {
    // Paused state with remaining seconds
    targetTimestamp.value = null
    totalSeconds.value = state.totalSeconds
    isRunning.value = false
    expired.value = false
    displayTime.value = formatRemaining(totalSeconds.value * 1000)
    statusLabel.value = labels.value.pausedLabel
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
      defaultMinutes: setMinutes.value,
      defaultSeconds: setSeconds.value
    }, { version: settingsVersion.value })
    settingsVersion.value = response.version
  } catch {
    // Local fallback is already written
  }
}

async function persistStateRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putState(appId, sessionToken.value, {
      mode: mode.value,
      targetTimestamp: targetTimestamp.value,
      totalSeconds: totalSeconds.value,
      isRunning: isRunning.value,
      lastStartedAt: lastStartedAt.value
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Local fallback is already written
  }
}

watch(language, (value) => {
  i18n.setLanguage(value)
}, { immediate: true })

watch(colorMode, (m) => {
  const effective = resolveColorMode(m)
  document.documentElement.dataset.colorMode = effective
  document.documentElement.dataset.theme = effective
}, { immediate: true })

watch([language, colorMode, setMinutes, setSeconds], () => {
  saveLocalFallback()
  void persistSettingsRemote()
})

// Initialize display from loaded state
function initDisplay() {
  if (targetTimestamp.value) {
    const target = new Date(targetTimestamp.value).getTime()
    const now = Date.now()
    if (target > now && stored.isRunning) {
      isRunning.value = true
      displayTime.value = formatRemaining(target - now)
      statusLabel.value = labels.value.runningLabel
      startInterval()
      return
    } else if (target <= now) {
      expired.value = true
      displayTime.value = '00:00'
      statusLabel.value = labels.value.expiredLabel
      targetTimestamp.value = null
      return
    }
  }
  if (stored.isRunning && stored.totalSeconds) {
    // Was running but no target timestamp — treat as paused
    totalSeconds.value = stored.totalSeconds
    displayTime.value = formatRemaining(totalSeconds.value * 1000)
    statusLabel.value = labels.value.pausedLabel
  } else {
    totalSeconds.value = setMinutes.value * 60 + setSeconds.value
    displayTime.value = formatRemaining(totalSeconds.value * 1000)
    statusLabel.value = labels.value.idleLabel
  }
}

onMounted(async () => {
  initDisplay()
  try {
    await bootstrapIdentity()
    await hydrateRemoteData()
  } catch {
    // Keep the local flow available when API is offline
  } finally {
    bootstrapped.value = true
    saveLocalFallback()
  }
})

onBeforeUnmount(() => {
  stopInterval()
})

function headerAction(id: string) {
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
}
</script>

<template>
  <TikoAppShell
    :app-name="labels.appName"
    app-icon="media/timer"
    app-color="timer"
    :actions="headerActions"
    @header-action="headerAction"
  >
    <section class="timer-app" :data-color-mode="colorMode">
      <section class="timer-app__display" :aria-label="statusLabel">
        <output class="timer-app__time" :class="{ 'timer-app__time--expired': expired }">{{ displayTime }}</output>
        <p class="timer-app__status">{{ statusLabel }}</p>
      </section>

      <section class="timer-app__set" :aria-label="labels.setLabel">
        <label class="timer-app__field">
          <span class="timer-app__field-label">{{ labels.minutesLabel }}</span>
          <input
            v-model.number="setMinutes"
            class="timer-app__field-input"
            type="number"
            min="0"
            max="99"
            :disabled="isRunning"
          />
        </label>
        <label class="timer-app__field">
          <span class="timer-app__field-label">{{ labels.secondsLabel }}</span>
          <input
            v-model.number="setSeconds"
            class="timer-app__field-input"
            type="number"
            min="0"
            max="59"
            :disabled="isRunning"
          />
        </label>
      </section>

      <section class="timer-app__controls">
        <Button
          v-if="!isRunning && !expired && totalSeconds > 0 && !targetTimestamp"
          variant="primary"
          class="timer-app__btn"
          @click="startTimer"
        >
          {{ labels.startLabel }}
        </Button>
        <Button
          v-if="isRunning"
          variant="primary"
          class="timer-app__btn"
          @click="pauseTimer"
        >
          {{ labels.pauseLabel }}
        </Button>
        <Button
          v-if="!isRunning && (targetTimestamp || expired || totalSeconds !== setMinutes * 60 + setSeconds)"
          variant="primary"
          class="timer-app__btn"
          @click="resumeTimer"
        >
          {{ labels.resumeLabel }}
        </Button>
        <Button
          v-if="isRunning || expired || targetTimestamp || totalSeconds !== setMinutes * 60 + setSeconds"
          variant="secondary"
          class="timer-app__btn timer-app__btn--reset"
          @click="resetTimer"
        >
          {{ labels.resetLabel }}
        </Button>
      </section>

      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
      />
    </section>
  </TikoAppShell>
</template>
