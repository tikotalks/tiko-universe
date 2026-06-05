<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import { useAppDefaults, type AppResource, type TikoManagedApp } from '../composables/useAppDefaults'
import CardsEditor from '../components/defaults/CardsEditor.vue'
import YesNoEditor from '../components/defaults/YesNoEditor.vue'
import SequenceEditor from '../components/defaults/SequenceEditor.vue'
import TypeEditor from '../components/defaults/TypeEditor.vue'
import TimerEditor from '../components/defaults/TimerEditor.vue'

const bemm = useBemm('app-defaults', { return: 'string', includeBaseClass: true })

const apps: Array<{ id: TikoManagedApp; label: string; hint: string }> = [
  { id: 'cards', label: 'Cards', hint: 'Tile collections and decks' },
  { id: 'yes-no', label: 'Yes-No', hint: 'Prompts and options' },
  { id: 'sequence', label: 'Sequence', hint: 'Ordered steps' },
  { id: 'type', label: 'Type', hint: 'Typing prompts' },
  { id: 'timer', label: 'Timer', hint: 'Duration presets' },
]

const editorByApp = {
  cards: CardsEditor,
  'yes-no': YesNoEditor,
  sequence: SequenceEditor,
  type: TypeEditor,
  timer: TimerEditor,
} as const

const { loading, saving, error, readDefaults, writeDefaults } = useAppDefaults()
const selectedApp = ref<TikoManagedApp>('cards')
const stateValue = ref<Record<string, unknown>>({})
const version = ref(0)
const updatedAt = ref<string | null>(null)
const savedMessage = ref<string | null>(null)
const dirty = ref(false)

const selectedMeta = computed(() => apps.find(app => app.id === selectedApp.value)!)
const currentEditor = computed(() => editorByApp[selectedApp.value])

async function loadCurrent() {
  savedMessage.value = null
  const payload = await readDefaults(selectedApp.value, 'state' satisfies AppResource)
  stateValue.value = (payload.state ?? {}) as Record<string, unknown>
  version.value = payload.version
  updatedAt.value = payload.updatedAt
  dirty.value = false
}

async function onSave() {
  savedMessage.value = null
  try {
    const payload = await writeDefaults(selectedApp.value, 'state', stateValue.value, version.value)
    version.value = payload.version
    updatedAt.value = payload.updatedAt
    savedMessage.value = `Saved ${selectedApp.value} defaults.`
    dirty.value = false
  } catch (e) {
    savedMessage.value = null
    alert(e instanceof Error ? e.message : 'Could not save.')
  }
}

function onValueUpdate(next: Record<string, unknown>) {
  stateValue.value = next
  dirty.value = true
}

watch(selectedApp, () => {
  void loadCurrent()
}, { immediate: true })
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div :class="bemm('intro')">
        <h1 :class="bemm('title')">App defaults</h1>
        <p :class="bemm('subtitle')">
          Choose an app and edit its starter content. Defaults are loaded on first install.
        </p>
      </div>
    </header>

    <nav :class="bemm('apps')" aria-label="Choose app">
      <button
        v-for="app in apps"
        :key="app.id"
        type="button"
        :class="bemm('app-tab', { active: selectedApp === app.id })"
        @click="selectedApp = app.id"
      >
        <strong :class="bemm('app-tab-label')">{{ app.label }}</strong>
        <span :class="bemm('app-tab-hint')">{{ app.hint }}</span>
      </button>
    </nav>

    <div :class="bemm('panel')">
      <header :class="bemm('panel-head')">
        <div :class="bemm('panel-intro')">
          <h2 :class="bemm('panel-title')">{{ selectedMeta.label }} defaults</h2>
          <p :class="bemm('panel-meta')">
            Version {{ version }} · Updated {{ updatedAt || 'never' }}
          </p>
        </div>
        <div :class="bemm('panel-actions')">
          <Button variant="outline" :loading="loading" :disabled="loading" @click="loadCurrent">
            {{ loading ? 'Loading…' : 'Reload' }}
          </Button>
          <Button :loading="saving" :disabled="saving || !dirty" @click="onSave">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </Button>
        </div>
      </header>

      <p v-if="error" :class="bemm('error')">{{ error }}</p>
      <p v-if="savedMessage" :class="bemm('success')">{{ savedMessage }}</p>

      <component
        :is="currentEditor"
        :model-value="stateValue"
        @update:model-value="onValueUpdate"
      />
    </div>
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

  &__apps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 10), 1fr));
    gap: var(--space-xs);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-xs);
  }

  &__app-tab {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-s);
    background: transparent;
    border: 0;
    border-radius: var(--border-radius-xs);
    color: var(--admin-text-muted);
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;

    &:hover {
      background: var(--admin-nav-hover);
      color: var(--admin-text);
    }

    &--active {
      background: var(--admin-nav-active);
      color: var(--admin-text);
    }
  }

  &__app-tab-label {
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__app-tab-hint {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
    line-height: 1.3;
  }

  &__panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  &__panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
    flex-wrap: wrap;
  }

  &__panel-intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__panel-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__panel-meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
  }

  &__panel-actions {
    display: flex;
    gap: var(--space-s);
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
}
</style>
