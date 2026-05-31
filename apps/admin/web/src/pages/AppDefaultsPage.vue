<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppDefaults, type AppResource, type TikoManagedApp } from '../composables/useAppDefaults'

const apps: Array<{ id: TikoManagedApp; label: string; hint: string }> = [
  { id: 'cards', label: 'Cards', hint: 'Default tile collections and card decks.' },
  { id: 'yes-no', label: 'Yes-No', hint: 'Default prompts/options for yes-no choices.' },
  { id: 'sequence', label: 'Sequence', hint: 'Default ordered steps and sequence sets.' },
  { id: 'type', label: 'Type', hint: 'Default typing prompts and keyboard setup.' },
  { id: 'timer', label: 'Timer', hint: 'Default timer durations and presets.' },
]

const { loading, saving, error, read, write } = useAppDefaults()
const selectedApp = ref<TikoManagedApp>('cards')
const resource = ref<AppResource>('state')
const jsonText = ref('{}')
const version = ref(0)
const updatedAt = ref<string | null>(null)
const savedMessage = ref<string | null>(null)

const selectedMeta = computed(() => apps.find(app => app.id === selectedApp.value)!)

const templates: Record<TikoManagedApp, Record<AppResource, Record<string, unknown>>> = {
  cards: {
    settings: { language: 'en', colorMode: 'system' },
    state: {
      collections: [
        {
          id: 'daily-routine',
          title: 'Daily routine',
          tiles: [
            { id: 'brush-teeth', label: 'Brush teeth', emoji: '🪥' },
            { id: 'get-dressed', label: 'Get dressed', emoji: '👕' },
            { id: 'breakfast', label: 'Breakfast', emoji: '🥣' },
          ],
        },
      ],
    },
  },
  'yes-no': {
    settings: { language: 'en', colorMode: 'system', spokenPrompt: 'Make a choice.' },
    state: { prompt: 'Yes or no?', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }] },
  },
  sequence: {
    settings: { language: 'en', colorMode: 'system' },
    state: { sequences: [{ id: 'morning', title: 'Morning', steps: ['Wake up', 'Get dressed', 'Eat breakfast'] }] },
  },
  type: {
    settings: { language: 'en', colorMode: 'system', keyboardLayout: 'qwerty' },
    state: { prompts: ['hello', 'thank you', 'I need help'], completedPrompts: [] },
  },
  timer: {
    settings: { language: 'en', colorMode: 'system' },
    state: { presets: [{ id: 'one-minute', label: '1 minute', seconds: 60 }, { id: 'five-minutes', label: '5 minutes', seconds: 300 }] },
  },
}

async function loadCurrent() {
  savedMessage.value = null
  const payload = await read(selectedApp.value, resource.value)
  const value = resource.value === 'settings' ? payload.settings : payload.state
  jsonText.value = JSON.stringify(value ?? {}, null, 2)
  version.value = payload.version
  updatedAt.value = payload.updatedAt
}

function applyTemplate() {
  jsonText.value = JSON.stringify(templates[selectedApp.value][resource.value], null, 2)
  savedMessage.value = null
}

async function saveCurrent() {
  savedMessage.value = null
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText.value)
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : 'parse failed'}`)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('JSON must be an object.')
  }
  const payload = await write(selectedApp.value, resource.value, parsed as Record<string, unknown>, version.value)
  version.value = payload.version
  updatedAt.value = payload.updatedAt
  savedMessage.value = `Saved ${selectedApp.value} ${resource.value}.`
}

async function onSave() {
  try {
    await saveCurrent()
  } catch (e) {
    savedMessage.value = null
    alert(e instanceof Error ? e.message : 'Could not save JSON.')
  }
}
</script>

<template>
  <section class="app-defaults">
    <header class="app-defaults__header">
      <div>
        <h1>App Defaults</h1>
        <p>Manage default tiles, collections, prompts, sequences, and presets through existing app settings/state.</p>
      </div>
      <button :disabled="loading" @click="loadCurrent">Load current</button>
    </header>

    <section class="app-defaults__chooser">
      <button
        v-for="app in apps"
        :key="app.id"
        :class="{ 'app-defaults__app--active': selectedApp === app.id }"
        @click="selectedApp = app.id"
      >
        <strong>{{ app.label }}</strong>
        <small>{{ app.hint }}</small>
      </button>
    </section>

    <section class="app-defaults__editor">
      <aside>
        <h2>{{ selectedMeta.label }}</h2>
        <p>{{ selectedMeta.hint }}</p>

        <label>
          <span>Resource</span>
          <select v-model="resource">
            <option value="settings">Settings</option>
            <option value="state">State / content</option>
          </select>
        </label>

        <dl>
          <div><dt>Version</dt><dd>{{ version }}</dd></div>
          <div><dt>Updated</dt><dd>{{ updatedAt || 'default / never saved' }}</dd></div>
        </dl>

        <button @click="applyTemplate">Apply starter template</button>
        <button :disabled="loading" @click="loadCurrent">Reload current</button>
        <button class="app-defaults__save" :disabled="saving" @click="onSave">{{ saving ? 'Saving…' : 'Save JSON' }}</button>
      </aside>

      <main>
        <textarea v-model="jsonText" spellcheck="false" />
        <p v-if="error" class="app-defaults__error">{{ error }}</p>
        <p v-if="savedMessage" class="app-defaults__success">{{ savedMessage }}</p>
      </main>
    </section>
  </section>
</template>

<style lang="scss" scoped>
.app-defaults {
  &__header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
  h1 { margin: 0; font-size: 1.4rem; }
  h2 { margin: 0 0 0.25rem; }
  p { margin: 0.25rem 0 0; color: var(--tiko-admin-muted); }

  button { border: 1px solid var(--tiko-admin-border); border-radius: 0.8rem; background: var(--color-background); color: var(--color-foreground); padding: 0.65rem 0.85rem; cursor: pointer; text-align: left; }
  button:disabled { opacity: 0.55; cursor: wait; }

  &__chooser { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.6rem; margin-bottom: 1rem; }
  &__chooser button { display: flex; flex-direction: column; gap: 0.25rem; min-height: 5rem; }
  &__chooser small { color: var(--tiko-admin-muted); line-height: 1.25; }
  &__app--active { border-color: var(--tiko-app-primary) !important; box-shadow: 0 0 0 2px color-mix(in srgb, var(--tiko-app-primary), transparent 80%); }

  &__editor { display: grid; grid-template-columns: 17rem minmax(0, 1fr); gap: 1rem; }
  aside,
  main { border: 1px solid var(--tiko-admin-border); border-radius: 1rem; background: var(--tiko-admin-card); padding: 1rem; }
  aside { display: flex; flex-direction: column; gap: 0.75rem; align-self: start; }

  label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; font-weight: 700; }
  select { width: 100%; border: 1px solid var(--tiko-admin-border); border-radius: 0.7rem; padding: 0.65rem 0.75rem; background: var(--color-background); color: var(--color-foreground); }
  textarea { width: 100%; min-height: 33rem; box-sizing: border-box; border: 1px solid var(--tiko-admin-border); border-radius: 0.85rem; padding: 1rem; background: var(--color-background); color: var(--color-foreground); font: 0.9rem/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; resize: vertical; }

  dl { margin: 0; display: grid; gap: 0.4rem; }
  dl div { display: grid; gap: 0.15rem; }
  dt { color: var(--tiko-admin-muted); font-size: 0.75rem; text-transform: uppercase; }
  dd { margin: 0; font-size: 0.85rem; word-break: break-word; }
  &__save { background: var(--tiko-app-primary) !important; color: var(--tiko-app-primary-text) !important; font-weight: 800; text-align: center !important; }
  &__error { color: var(--color-error) !important; }
  &__success { color: var(--color-success) !important; }

  @media (max-width: 920px) {
    &__chooser { grid-template-columns: 1fr 1fr; }
    &__editor { grid-template-columns: 1fr; }
  }
}
</style>
