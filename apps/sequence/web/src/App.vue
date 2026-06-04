<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Button, InputTextArea } from '@sil/ui'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import { TikoDataClient, type SequenceSettings, type SequenceState } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  createTikoTtsClient,
  type TikoColorMode
} from '@tiko/ui'
import './styles.scss'

const storageKey = 'tiko:sequence'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'sequence' as const
const apiBaseUrl = resolveApiBaseUrl()

interface SequenceItem {
  id: string
  name: string
  steps: string[]
}

interface PersistedState {
  language?: string
  colorMode?: string
  items?: SequenceItem[]
  playingId?: string | null
  currentStep?: number
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
  return (env?.VITE_TIKO_API_BASE_URL ?? 'https://identity.tikoapi.org/v1').replace(/\/$/, '')
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

function generateId(): string {
  return `seq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const items = ref<SequenceItem[]>(stored.items ?? [])
const playingId = ref<string | null>(null)
const currentStep = ref(0)
const settingsOpen = ref(false)
const createOpen = ref(false)
const newName = ref('')
const newSteps = ref<string[]>([''])
const loadError = ref(false)
const sessionToken = ref('')
const bootstrapped = ref(false)
const tts = createTikoTtsClient()
const identityClient = new IdentityClient({ baseUrl: apiBaseUrl })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })

const labels = computed(() => {
  void language.value
  return {
    appName: i18n.t(tikoI18nKeys.sequence.appName),
    emptyTitle: i18n.t(tikoI18nKeys.sequence.empty.title),
    emptyDescription: i18n.t(tikoI18nKeys.sequence.empty.description),
    emptyCreate: i18n.t(tikoI18nKeys.sequence.empty.create),
    createTitle: i18n.t(tikoI18nKeys.sequence.create.title),
    createName: i18n.t(tikoI18nKeys.sequence.create.name),
    namePlaceholder: i18n.t(tikoI18nKeys.sequence.create.namePlaceholder),
    submit: i18n.t(tikoI18nKeys.sequence.create.submit),
    cancel: i18n.t(tikoI18nKeys.sequence.create.cancel),
    addStep: i18n.t(tikoI18nKeys.sequence.create.addStep),
    step: i18n.t(tikoI18nKeys.sequence.play.step),
    next: i18n.t(tikoI18nKeys.sequence.play.next),
    done: i18n.t(tikoI18nKeys.sequence.play.done),
    loadError: i18n.t(tikoI18nKeys.sequence.status.loadError),
    retry: i18n.t(tikoI18nKeys.sequence.status.retry),
  }
})

const headerActions = computed(() => [
  { id: 'add', label: labels.value.emptyCreate, icon: 'ui/plus' },
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value },
])

const playingItem = computed(() =>
  playingId.value ? items.value.find(item => item.id === playingId.value) : null
)

const isPlaying = computed(() => playingItem.value !== null)

function resolveColorMode(mode: TikoColorMode) {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function saveLocal() {
  writeJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    items: items.value,
  })
}

function saveIdentity(bundle: IdentityBundle) {
  if (!bundle.session?.token) throw new Error('Identity response did not include a session token.')
  sessionToken.value = bundle.session.token
  writeJson(identityStorageKey, {
    userId: bundle.subject.id,
    deviceId: bundle.device?.id,
    deviceSecret: bundle.device?.secret,
    sessionToken: bundle.session.token,
    expiresAt: bundle.session.expiresAt,
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
      name: 'Sequence web',
      platform: 'web',
    },
  })
  saveIdentity(bundle)
}

function applySettings(settings: SequenceSettings) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
}

function applyState(state: SequenceState) {
  if (state.items) items.value = state.items as unknown as SequenceItem[]
}

async function hydrateRemoteData() {
  if (!sessionToken.value) return
  const [settings, state] = await Promise.all([
    dataClient.getSettings(appId, sessionToken.value),
    dataClient.getState(appId, sessionToken.value),
  ])
  applySettings(settings.settings)
  applyState(state.state)
}

async function persistRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    await dataClient.putState(appId, sessionToken.value, {
      items: items.value,
    })
  } catch {
    // Local fallback already written
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

watch([language, colorMode, items], () => {
  saveLocal()
  void persistRemote()
}, { deep: true })

onMounted(async () => {
  try {
    await bootstrapIdentity()
  } catch {
    // Identity unavailable — app works locally
  }

  try {
    await hydrateRemoteData()
  } catch {
    // Remote sync failed — local state is still valid
    if (!sessionToken.value) loadError.value = true
  } finally {
    bootstrapped.value = true
    saveLocal()
  }
})

function headerAction(id: string) {
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
  if (id === 'add') openCreate()
}

function openCreate() {
  newName.value = ''
  newSteps.value = ['']
  createOpen.value = true
}

function closeCreate() {
  createOpen.value = false
}

function addStepField() {
  newSteps.value = [...newSteps.value, '']
}

function updateStep(index: number, value: string) {
  const updated = [...newSteps.value]
  updated[index] = value
  newSteps.value = updated
}

function submitCreate() {
  const name = newName.value.trim()
  const steps = newSteps.value.map(s => s.trim()).filter(Boolean)
  if (!name || steps.length === 0) return
  items.value = [...items.value, { id: generateId(), name, steps }]
  closeCreate()
}

function playSequence(id: string) {
  playingId.value = id
  currentStep.value = 0
}

function stopPlaying() {
  playingId.value = null
  currentStep.value = 0
}

function nextStep() {
  if (!playingItem.value) return
  if (currentStep.value < playingItem.value.steps.length - 1) {
    currentStep.value++
  } else {
    stopPlaying()
  }
}

async function speakStep(text: string) {
  try {
    await tts.speak({ text, language: language.value, provider: 'auto' })
  } catch {
    // Browser fallback handled by TTS client
  }
}

async function retry() {
  loadError.value = false
  try {
    await bootstrapIdentity()
  } catch {
    // Identity still unavailable
  }
  try {
    await hydrateRemoteData()
  } catch {
    if (!sessionToken.value) loadError.value = true
  }
}
</script>

<template>
  <TikoAppShell
    :app-name="labels.appName"
    app-icon="ui/list"
    app-color="sequence"
    :actions="headerActions"
    @header-action="headerAction"
  >
    <section class="sequence-app" :data-color-mode="colorMode">
      <!-- Error state with fallback to create -->
      <section v-if="loadError && items.length === 0 && !createOpen" class="sequence-app__error" role="alert">
        <p class="sequence-app__error-text">{{ labels.loadError }}</p>
        <Button variant="ghost" @click="retry">{{ labels.retry }}</Button>
        <p class="sequence-app__empty-description">{{ labels.emptyDescription }}</p>
        <Button variant="primary" @click="openCreate">{{ labels.emptyCreate }}</Button>
      </section>

      <!-- Playback mode -->
      <section v-else-if="isPlaying && playingItem" class="sequence-app__play">
        <h2 class="sequence-app__play-name">{{ playingItem.name }}</h2>
        <p class="sequence-app__play-step">
          {{ labels.step.replace('{current}', String(currentStep + 1)).replace('{total}', String(playingItem.steps.length)) }}
        </p>
        <p class="sequence-app__play-text">{{ playingItem.steps[currentStep] }}</p>
        <div class="sequence-app__play-actions">
          <Button variant="primary" icon="media/volume-iii" @click="speakStep(playingItem.steps[currentStep])">Speak</Button>
          <Button v-if="currentStep < playingItem.steps.length - 1" variant="primary" @click="nextStep">{{ labels.next }}</Button>
          <Button v-else variant="primary" @click="stopPlaying">{{ labels.done }}</Button>
          <Button variant="ghost" @click="stopPlaying">Stop</Button>
        </div>
      </section>

      <!-- Empty state -->
      <section v-else-if="items.length === 0 && !createOpen" class="sequence-app__empty">
        <h2 class="sequence-app__empty-title">{{ labels.emptyTitle }}</h2>
        <p class="sequence-app__empty-description">{{ labels.emptyDescription }}</p>
        <Button variant="primary" @click="openCreate">{{ labels.emptyCreate }}</Button>
      </section>

      <!-- Sequence list -->
      <section v-else class="sequence-app__list">
        <button
          v-for="item in items"
          :key="item.id"
          class="sequence-app__item"
          @click="playSequence(item.id)"
        >
          <span class="sequence-app__item-name">{{ item.name }}</span>
          <span class="sequence-app__item-steps">{{ item.steps.length }} steps</span>
        </button>
      </section>

      <!-- Create dialog -->
      <section v-if="createOpen" class="sequence-app__create" role="dialog" :aria-label="labels.createTitle">
        <h3>{{ labels.createTitle }}</h3>
        <label class="sequence-app__create-field">
          {{ labels.createName }}
          <InputTextArea
            v-model="newName"
            :rows="1"
            :maxlength="120"
            @keydown.enter.prevent
          />
        </label>
        <div v-for="(_, index) in newSteps" :key="index" class="sequence-app__create-field">
          <label>{{ labels.step }} {{ index + 1 }}</label>
          <InputTextArea
            :model-value="newSteps[index]"
            :rows="1"
            :maxlength="200"
            @update:model-value="(v: unknown) => updateStep(index, String(v))"
          />
        </div>
        <Button variant="ghost" @click="addStepField">{{ labels.addStep }}</Button>
        <div class="sequence-app__create-actions">
          <Button variant="ghost" @click="closeCreate">{{ labels.cancel }}</Button>
          <Button variant="primary" :disabled="!newName.trim() || newSteps.every(s => !s.trim())" @click="submitCreate">{{ labels.submit }}</Button>
        </div>
      </section>

      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
      />
    </section>
  </TikoAppShell>
</template>
