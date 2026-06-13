<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Button, InputTextArea, Popup } from '@sil/ui'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import { TikoDataClient, type SequenceSettings, type SequenceState } from '@tiko/data'
import { createI18n, createTikoIdentityLabels, createTikoShellLabels, createTikoTranslationLoader, defaultLanguage, tikoI18nKeys, tikoLanguageOptions, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  TikoSquareTile,
  createTikoTtsClient,
  readTikoLocalJson,
  resolveTikoAppApiBaseUrl,
  resolveTikoColorMode,
  resolveTikoContentApiBaseUrl,
  resolveTikoIdentityBaseUrl,
  useIdentityRuntime,
  writeTikoLocalJson,
  type IdentityRuntimeState,
  type TikoColorMode
} from '@tiko/ui'
import { appConfig } from './appConfig'
import './styles.scss'

const storageKey = 'tiko:sequence'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'sequence' as const
const apiBaseUrl = resolveTikoAppApiBaseUrl()
const identityBaseUrl = resolveTikoIdentityBaseUrl()
const contentBaseUrl = resolveTikoContentApiBaseUrl()

interface SequenceStep {
  id: string
  label: string
  text: string
  imageRef?: string
  imageRefs?: string[]
}

interface SequenceItem {
  id: string
  name: string
  title?: string
  category?: string
  color?: string
  imageRef?: string
  order?: number
  steps: SequenceStep[]
  source?: 'default' | 'user'
}

interface PersistedState {
  language?: string
  colorMode?: string
  items?: SequenceItem[]
  playingId?: string | null
  currentStep?: number
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

function normalizeStep(step: unknown, index: number): SequenceStep {
  if (typeof step === 'string') return { id: `step-${index}`, label: step, text: step }
  const value = step && typeof step === 'object' ? step as Partial<SequenceStep> : {}
  const label = typeof value.label === 'string' && value.label.trim() ? value.label : `Step ${index + 1}`
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : `step-${index}`,
    label,
    text: typeof value.text === 'string' && value.text.trim() ? value.text : label,
    ...(typeof value.imageRef === 'string' && value.imageRef.trim() ? { imageRef: value.imageRef } : {}),
    ...(Array.isArray(value.imageRefs) ? { imageRefs: value.imageRefs.filter((ref): ref is string => typeof ref === 'string' && ref.trim().length > 0) } : {}),
  }
}

function normalizeSequenceItem(item: unknown, source: SequenceItem['source']): SequenceItem {
  const value = item && typeof item === 'object' ? item as Partial<SequenceItem> : {}
  const name = typeof value.name === 'string' && value.name.trim()
    ? value.name
    : typeof value.title === 'string' && value.title.trim()
      ? value.title
      : 'Sequence'
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : generateId(),
    name,
    title: name,
    source,
    ...(typeof value.category === 'string' && value.category.trim() ? { category: value.category } : {}),
    ...(typeof value.color === 'string' && value.color.trim() ? { color: value.color } : {}),
    ...(typeof value.imageRef === 'string' && value.imageRef.trim() ? { imageRef: value.imageRef } : {}),
    order: typeof value.order === 'number' ? value.order : source === 'default' ? 0 : 1000,
    steps: Array.isArray(value.steps) ? value.steps.map(normalizeStep) : [],
  }
}

const stored = readTikoLocalJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const translationLoader = createTikoTranslationLoader()
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const defaultItems = ref<SequenceItem[]>([])
const customItems = ref<SequenceItem[]>((stored.items ?? []).map(item => normalizeSequenceItem(item, 'user')))
const playingId = ref<string | null>(null)
const currentStep = ref(0)
const settingsOpen = ref(false)
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const createOpen = ref(false)
const newName = ref('')
const newSteps = ref<string[]>([''])
const loadError = ref(false)
const sessionToken = ref('')
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
const runtime = useIdentityRuntime({ identityClient, state: runtimeState, deviceName: 'Sequence web', labels: () => createTikoIdentityLabels(i18n.t) })

const labels = computed(() => {
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
  { id: 'add', label: labels.value.emptyCreate, icon: 'ui/plus' },
  { id: 'settings', label: labels.value.settings, icon: 'ui/settings-dual', active: settingsOpen.value },
] : [])

const items = computed(() => {
  const merged = new Map<string, SequenceItem>()
  for (const item of defaultItems.value) merged.set(item.id, item)
  for (const item of customItems.value) merged.set(item.id, item)
  return Array.from(merged.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
})

const playingItem = computed(() =>
  playingId.value ? items.value.find(item => item.id === playingId.value) : null
)

const isPlaying = computed(() => playingItem.value !== null)
const currentPlayingStep = computed(() => playingItem.value?.steps[currentStep.value] ?? null)

function saveLocal() {
  writeTikoLocalJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    items: customItems.value,
  })
}

function saveIdentity(bundle: IdentityBundle) {
  runtime.saveIdentity(bundle)
}

async function bootstrapIdentity() {
  return runtime.bootstrapIdentity()
}

function applySettings(settings: SequenceSettings, version?: number) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
  settingsVersion.value = version
}

function applyState(state: SequenceState, version?: number) {
  if (state.items) customItems.value = (state.items as unknown[]).map(item => normalizeSequenceItem(item, 'user'))
  stateVersion.value = version
}

async function hydrateRemoteData() {
  if (!sessionToken.value) return
  const [settings, state] = await Promise.all([
    dataClient.getSettings(appId, sessionToken.value),
    dataClient.getState(appId, sessionToken.value),
  ])
  applySettings(settings.settings, settings.version)
  applyState(state.state, state.version)
}

async function hydrateDefaultContent() {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (sessionToken.value) headers.Authorization = `Bearer ${sessionToken.value}`
    const response = await fetch(`${contentBaseUrl}/sequence/content?language=${encodeURIComponent(language.value)}`, { headers })
    if (!response.ok) throw new Error(`Sequence content failed: ${response.status}`)
    const body = await response.json() as { data?: { sequences?: unknown[] } }
    defaultItems.value = (body.data?.sequences ?? []).map(item => normalizeSequenceItem(item, 'default'))
  } catch {
    defaultItems.value = []
  }
}

async function persistSettingsRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putSettings(appId, sessionToken.value, {
      language: language.value,
      colorMode: colorMode.value,
    }, { version: settingsVersion.value })
    settingsVersion.value = response.version
  } catch {
    // Local fallback already written; remote will be retried on the next settings edit.
  }
}

async function persistStateRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putState(appId, sessionToken.value, {
      items: customItems.value,
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Local fallback already written; remote will be retried on the next content edit.
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
  void hydrateDefaultContent()
}, { immediate: true })

watch(colorMode, (mode) => {
  const effective = resolveTikoColorMode(mode)
  document.documentElement.dataset.colorMode = effective
  document.documentElement.dataset.theme = effective
}, { immediate: true })

watch([language, colorMode], () => {
  saveLocal()
  void persistSettingsRemote()
})

watch(customItems, () => {
  saveLocal()
  void persistStateRemote()
}, { deep: true })

onMounted(async () => {
  try {
    await runtime.bootstrapIdentity()
    await runtime.loadProfile()
  } catch {
    // Identity unavailable — app works locally
  }

  try {
    await hydrateRemoteData()
    await hydrateDefaultContent()
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
  const steps = newSteps.value
    .map((step, index) => {
      const label = step.trim()
      return label ? { id: `step-${index}`, label, text: label } : null
    })
    .filter((step): step is SequenceStep => Boolean(step))
  if (!name || steps.length === 0) return
  customItems.value = [...customItems.value, { id: generateId(), name, title: name, steps, source: 'user', order: 1000 + customItems.value.length }]
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

function stepText(step: SequenceStep | null | undefined): string {
  return step?.text || step?.label || ''
}

function stepImages(step: SequenceStep | null | undefined): string[] {
  if (!step) return []
  if (Array.isArray(step.imageRefs) && step.imageRefs.length > 0) return step.imageRefs.map(imageRefURL)
  return step.imageRef ? [imageRefURL(step.imageRef)] : []
}

function itemImages(item: SequenceItem): string[] {
  const firstStep = item.steps.find(step => stepImages(step).length > 0)
  if (firstStep) return stepImages(firstStep)
  return item.imageRef ? [imageRefURL(item.imageRef)] : []
}

function imageRefURL(imageRef: string) {
  return `${contentBaseUrl}/content/images/${encodeURIComponent(imageRef)}`
}

function itemBackground(item: SequenceItem): string {
  const colors: Record<string, string> = {
    learning: '#5b8def',
    concepts: '#20b486',
    'daily-life': '#f59e0b',
    nature: '#60a64a',
    people: '#ef6f8f',
    play: '#8b5cf6',
    world: '#14b8a6',
    colors: '#f97316',
    school: '#64748b',
    movement: '#06b6d4',
    vehicles: '#e11d48',
  }
  return colors[item.color ?? item.category ?? ''] ?? appConfig.themeColor ?? '#4f46e5'
}

async function retry() {
  loadError.value = false
  try {
    await runtime.bootstrapIdentity()
  } catch {
    // Identity still unavailable
  }
  try {
    await hydrateRemoteData()
    await hydrateDefaultContent()
  } catch {
    if (!sessionToken.value) loadError.value = true
  }
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
    <section class="sequence-app" :data-color-mode="colorMode">
      <Popup />
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
        <div class="sequence-app__play-tile">
          <TikoSquareTile
            :title="stepText(currentPlayingStep)"
            :background="itemBackground(playingItem)"
            :image-srcs="stepImages(currentPlayingStep)"
            label-size="large"
          />
        </div>
        <div class="sequence-app__play-actions">
          <Button variant="primary" icon="media/volume-iii" @click="speakStep(stepText(currentPlayingStep))">Speak</Button>
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
        <div
          v-for="item in items"
          :key="item.id"
          class="sequence-app__item"
        >
          <TikoSquareTile
            :title="item.name"
            :background="itemBackground(item)"
            :image-srcs="itemImages(item)"
            @press="playSequence(item.id)"
          />
          <span class="sequence-app__item-steps">{{ item.steps.length }} steps</span>
        </div>
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
        :languages="tikoLanguageOptions"
        :labels="labels.settingsPanel"
      />
    </section>
  </TikoAppShell>
</template>
