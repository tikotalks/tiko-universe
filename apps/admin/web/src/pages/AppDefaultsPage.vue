<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputTextArea } from '@sil/ui'
import { useAppDefaults, type AppResource, type TikoManagedApp } from '../composables/useAppDefaults'

const bemm = useBemm('app-defaults', { return: 'string', includeBaseClass: true })

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
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div :class="bemm('intro')">
        <h1 :class="bemm('title')">App defaults</h1>
        <p :class="bemm('subtitle')">
          Manage default tiles, collections, prompts, sequences, and presets through existing app settings/state.
        </p>
      </div>
      <Button :loading="loading" :disabled="loading" @click="loadCurrent">Load current</Button>
    </header>

    <section :class="bemm('chooser')">
      <button
        v-for="app in apps"
        :key="app.id"
        type="button"
        :class="bemm('app-tile', { active: selectedApp === app.id })"
        @click="selectedApp = app.id"
      >
        <strong :class="bemm('app-tile-label')">{{ app.label }}</strong>
        <small :class="bemm('app-tile-hint')">{{ app.hint }}</small>
      </button>
    </section>

    <section :class="bemm('editor')">
      <aside :class="bemm('aside')">
        <header :class="bemm('aside-header')">
          <h2 :class="bemm('aside-title')">{{ selectedMeta.label }}</h2>
          <p :class="bemm('aside-hint')">{{ selectedMeta.hint }}</p>
        </header>

        <label :class="bemm('label')">
          <span :class="bemm('label-text')">Resource</span>
          <select :class="bemm('select')" v-model="resource">
            <option value="settings">Settings</option>
            <option value="state">State / content</option>
          </select>
        </label>

        <dl :class="bemm('meta')">
          <div :class="bemm('meta-row')">
            <dt :class="bemm('meta-term')">Version</dt>
            <dd :class="bemm('meta-value')">{{ version }}</dd>
          </div>
          <div :class="bemm('meta-row')">
            <dt :class="bemm('meta-term')">Updated</dt>
            <dd :class="bemm('meta-value')">{{ updatedAt || 'default / never saved' }}</dd>
          </div>
        </dl>

        <div :class="bemm('aside-actions')">
          <Button variant="outline" @click="applyTemplate">Apply starter template</Button>
          <Button variant="outline" :loading="loading" :disabled="loading" @click="loadCurrent">Reload current</Button>
          <Button :loading="saving" :disabled="saving" @click="onSave">{{ saving ? 'Saving…' : 'Save JSON' }}</Button>
        </div>
      </aside>

      <section :class="bemm('json-panel')">
        <InputTextArea
          v-model="jsonText"
          :class="bemm('json')"
          :min-rows="22"
          :max-rows="36"
          :allow-resize="true"
          :spellcheck="false"
        />
        <p v-if="error" :class="bemm('error')">{{ error }}</p>
        <p v-if="savedMessage" :class="bemm('success')">{{ savedMessage }}</p>
      </section>
    </section>
  </section>
</template>

<style lang="scss">
.app-defaults {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
  }

  &__intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--admin-text);
  }

  &__subtitle {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__chooser {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 11), 1fr));
    gap: var(--space-s);
  }

  &__app-tile {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-m);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    color: var(--admin-text);
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease;

    &:hover {
      background: var(--admin-surface-hover);
      border-color: var(--admin-border-strong);
    }

    &--active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 1px var(--color-primary);
    }
  }

  &__app-tile-label {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__app-tile-hint {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }

  &__editor {
    display: grid;
    grid-template-columns: calc(var(--space) * 17) minmax(0, 1fr);
    gap: var(--space-m);
  }

  &__aside {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
    align-self: start;
  }

  &__aside-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__aside-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__aside-hint {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }

  &__aside-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
  }

  &__select {
    width: 100%;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font: inherit;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__meta-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__meta-term {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__meta-value {
    font-size: var(--font-size-s);
    color: var(--admin-text);
    word-break: break-word;
  }

  &__json-panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__json {
    font: var(--font-size-s)/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__error {
    color: var(--color-error);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__success {
    color: var(--color-success);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  @media (max-width: 920px) {
    &__editor {
      grid-template-columns: 1fr;
    }
  }
}
</style>
