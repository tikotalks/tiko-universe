<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Button, InputTextArea } from '@sil/ui'
import { IdentityClient, type SessionBundle } from '@tiko/identity'
import { TikoDataClient, type TodoSettings, type TodoState } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoSettingsPanel,
  createTikoTtsClient,
  type TikoColorMode
} from '@tiko/ui'
import './styles.scss'

const storageKey = 'tiko:todo'
const identityStorageKey = 'tiko:identity:device-session'
const appId = 'todo' as const
const apiBaseUrl = resolveApiBaseUrl()

interface TodoItem {
  id: string
  name: string
  done: boolean
  steps: Array<{ name: string; done: boolean }>
}

interface PersistedState {
  language?: string
  colorMode?: string
  items?: TodoItem[]
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
  return (env?.VITE_TIKO_API_BASE_URL ?? 'https://api.tikotalks.com/v1').replace(/\/$/, '')
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
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const items = ref<TodoItem[]>(stored.items ?? [])
const settingsOpen = ref(false)
const createOpen = ref(false)
const newName = ref('')
const newSteps = ref<string[]>([])
const loadError = ref(false)
const sessionToken = ref('')
const bootstrapped = ref(false)
const tts = createTikoTtsClient()
const identityClient = new IdentityClient({ baseUrl: apiBaseUrl })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })

const labels = computed(() => {
  void language.value
  return {
    appName: i18n.t(tikoI18nKeys.todo.appName),
    settings: i18n.t(tikoI18nKeys.common.settings),
    emptyTitle: i18n.t(tikoI18nKeys.todo.empty.title),
    emptyDescription: i18n.t(tikoI18nKeys.todo.empty.description),
    emptyCreate: i18n.t(tikoI18nKeys.todo.empty.create),
    createTitle: i18n.t(tikoI18nKeys.todo.create.title),
    createName: i18n.t(tikoI18nKeys.todo.create.name),
    namePlaceholder: i18n.t(tikoI18nKeys.todo.create.namePlaceholder),
    details: i18n.t(tikoI18nKeys.todo.create.details),
    submit: i18n.t(tikoI18nKeys.todo.create.submit),
    cancel: i18n.t(tikoI18nKeys.todo.create.cancel),
    selectImage: i18n.t(tikoI18nKeys.todo.create.selectImage),
    step: i18n.t(tikoI18nKeys.todo.create.step),
    speak: i18n.t(tikoI18nKeys.todo.create.speak),
    markComplete: i18n.t(tikoI18nKeys.todo.item.markComplete),
    markIncomplete: i18n.t(tikoI18nKeys.todo.item.markIncomplete),
    done: i18n.t(tikoI18nKeys.todo.item.done),
    pending: i18n.t(tikoI18nKeys.todo.item.pending),
    remaining: (count: number) => i18n.t(tikoI18nKeys.todo.item.remaining, { count }),
    loadError: i18n.t(tikoI18nKeys.todo.status.loadError),
    retry: i18n.t(tikoI18nKeys.todo.status.retry),
  }
})

const headerActions = computed(() => [
  { id: 'add', label: labels.value.emptyCreate, icon: 'ui/plus' },
  { id: 'settings', label: labels.value.settings, icon: 'ui/settings-dual', active: settingsOpen.value },
])

const pendingCount = computed(() => items.value.filter(item => !item.done).length)

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

function saveIdentity(bundle: SessionBundle) {
  sessionToken.value = bundle.session.token
  writeJson(identityStorageKey, {
    userId: bundle.user.id,
    deviceId: bundle.device.id,
    deviceSecret: bundle.device.secret,
    sessionToken: bundle.session.token,
    expiresAt: bundle.session.expiresAt,
  })
}

async function bootstrapIdentity() {
  const storedIdentity = readJson<StoredIdentity>(identityStorageKey, {})

  if (storedIdentity.sessionToken) {
    try {
      const bundle = await identityClient.getSession(storedIdentity.sessionToken)
      saveIdentity(bundle)
      return
    } catch {
      // Fall through
    }
  }

  const bundle = await identityClient.bootstrapDevice({
    device: {
      id: storedIdentity.deviceId,
      secret: storedIdentity.deviceSecret,
      name: 'Todo web',
      platform: 'web',
    },
  })
  saveIdentity(bundle)
}

function applySettings(settings: TodoSettings) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
}

function applyState(state: TodoState) {
  if (state.items) items.value = state.items as TodoItem[]
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
  newSteps.value = []
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
  if (!name) return
  const steps = newSteps.value.map(s => s.trim()).filter(Boolean).map(s => ({ name: s, done: false }))
  items.value = [...items.value, { id: generateId(), name, done: false, steps }]
  closeCreate()
}

function toggleDone(id: string) {
  items.value = items.value.map(item =>
    item.id === id ? { ...item, done: !item.done } : item
  )
}

function toggleStep(todoId: string, stepIndex: number) {
  items.value = items.value.map(item => {
    if (item.id !== todoId) return item
    const steps = item.steps.map((step, i) =>
      i === stepIndex ? { ...step, done: !step.done } : step
    )
    return { ...item, steps }
  })
}

async function speakName(name: string) {
  try {
    await tts.speak({ text: name, language: language.value, provider: 'auto' })
  } catch {
    // Browser fallback
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
    app-icon="ui/check-list"
    app-color="todo"
    :actions="headerActions"
    @header-action="headerAction"
  >
    <section class="todo-app" :data-color-mode="colorMode">
      <!-- Error state with fallback to create -->
      <section v-if="loadError && items.length === 0 && !createOpen" class="todo-app__error" role="alert">
        <p class="todo-app__error-text">{{ labels.loadError }}</p>
        <Button variant="ghost" @click="retry">{{ labels.retry }}</Button>
        <p class="todo-app__empty-description">{{ labels.emptyDescription }}</p>
        <Button variant="primary" @click="openCreate">{{ labels.emptyCreate }}</Button>
      </section>

      <!-- Empty state -->
      <section v-else-if="items.length === 0 && !createOpen" class="todo-app__empty">
        <h2 class="todo-app__empty-title">{{ labels.emptyTitle }}</h2>
        <p class="todo-app__empty-description">{{ labels.emptyDescription }}</p>
        <Button variant="primary" @click="openCreate">{{ labels.emptyCreate }}</Button>
      </section>

      <!-- Todo list -->
      <section v-else class="todo-app__list">
        <p v-if="pendingCount > 0" class="todo-app__pending">{{ labels.remaining(pendingCount) }}</p>
        <div
          v-for="item in items"
          :key="item.id"
          class="todo-app__item"
          :class="{ 'todo-app__item--done': item.done }"
        >
          <button class="todo-app__item-check" :aria-label="item.done ? labels.markIncomplete : labels.markComplete" @click="toggleDone(item.id)">
            <span :class="item.done ? 'todo-app__check--done' : 'todo-app__check--pending'">
              {{ item.done ? labels.done : labels.pending }}
            </span>
          </button>
          <span class="todo-app__item-name">{{ item.name }}</span>
          <Button variant="ghost" icon-only icon="media/volume-iii" :aria-label="labels.speak" @click="speakName(item.name)" />
          <div v-if="item.steps.length > 0" class="todo-app__item-steps">
            <label
              v-for="(step, si) in item.steps"
              :key="si"
              class="todo-app__step"
              :class="{ 'todo-app__step--done': step.done }"
            >
              <input type="checkbox" :checked="step.done" @change="toggleStep(item.id, si)" />
              {{ step.name }}
            </label>
          </div>
        </div>
      </section>

      <!-- Create dialog -->
      <section v-if="createOpen" class="todo-app__create" role="dialog" :aria-label="labels.createTitle">
        <h3>{{ labels.createTitle }}</h3>
        <label class="todo-app__create-field">
          {{ labels.createName }}
          <InputTextArea
            v-model="newName"
            :rows="1"
            :maxlength="120"
            :placeholder="labels.namePlaceholder"
            @keydown.enter.prevent="submitCreate"
          />
        </label>
        <div v-for="(_, index) in newSteps" :key="index" class="todo-app__create-field">
          <label>{{ labels.step }} {{ index + 1 }}</label>
          <InputTextArea
            :model-value="newSteps[index]"
            :rows="1"
            :maxlength="200"
            @update:model-value="(v: unknown) => updateStep(index, v as string)"
          />
        </div>
        <Button variant="ghost" @click="addStepField">+ {{ labels.step }}</Button>
        <div class="todo-app__create-actions">
          <Button variant="ghost" @click="closeCreate">{{ labels.cancel }}</Button>
          <Button variant="primary" :disabled="!newName.trim()" @click="submitCreate">{{ labels.submit }}</Button>
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
