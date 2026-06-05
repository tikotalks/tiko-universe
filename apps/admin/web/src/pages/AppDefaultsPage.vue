<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, Icon } from '@sil/ui'
import { tikoAppConfigs, tikoAppColors, type TikoAppColor, type TikoAppConfig } from '@tiko/ui'
import { useAppDefaults, type AppResource, type TikoManagedApp } from '../composables/useAppDefaults'
import CardsEditor from '../components/defaults/CardsEditor.vue'
import YesNoEditor from '../components/defaults/YesNoEditor.vue'
import SequenceEditor from '../components/defaults/SequenceEditor.vue'
import TypeEditor from '../components/defaults/TypeEditor.vue'
import TimerEditor from '../components/defaults/TimerEditor.vue'

const bemm = useBemm('apps-page', { return: 'string', includeBaseClass: true })

const appOrder: TikoAppColor[] = ['yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'talk', 'todo', 'media']
const editableDefaultsApps = ['cards', 'yes-no', 'sequence', 'type', 'timer'] as const satisfies readonly TikoManagedApp[]

const apps = appOrder.map((id) => tikoAppConfigs[id]).filter(Boolean)

const editorByApp: Record<TikoManagedApp, unknown> = {
  cards: CardsEditor,
  'yes-no': YesNoEditor,
  sequence: SequenceEditor,
  type: TypeEditor,
  timer: TimerEditor,
}

const { loading, saving, error, readDefaults, writeDefaults } = useAppDefaults()
const selectedApp = ref<TikoAppColor>('cards')
const stateValue = ref<Record<string, unknown>>({})
const version = ref(0)
const updatedAt = ref<string | null>(null)
const savedMessage = ref<string | null>(null)
const dirty = ref(false)

const selectedConfig = computed(() => tikoAppConfigs[selectedApp.value])
const selectedColor = computed(() => tikoAppColors[selectedConfig.value.appColor])
const editableDefaultsApp = computed<TikoManagedApp | null>(() => {
  return (editableDefaultsApps as readonly string[]).includes(selectedApp.value) ? selectedApp.value as TikoManagedApp : null
})
const currentEditor = computed(() => editableDefaultsApp.value ? editorByApp[editableDefaultsApp.value] : null)

function iconName(config: TikoAppConfig): string {
  return config.appIcon.includes('/') ? config.appIcon : 'ui/shape-square'
}

function fallbackIconLabel(config: TikoAppConfig): string {
  return config.appIcon.includes('/') ? '' : config.appIcon
}

async function loadCurrent() {
  savedMessage.value = null
  stateValue.value = {}
  version.value = 0
  updatedAt.value = null
  dirty.value = false

  const defaultsApp = editableDefaultsApp.value
  if (!defaultsApp) return

  const payload = await readDefaults(defaultsApp, 'state' satisfies AppResource)
  stateValue.value = (payload.state ?? {}) as Record<string, unknown>
  version.value = payload.version
  updatedAt.value = payload.updatedAt
}

async function onSave() {
  const defaultsApp = editableDefaultsApp.value
  if (!defaultsApp) return

  savedMessage.value = null
  try {
    const payload = await writeDefaults(defaultsApp, 'state', stateValue.value, version.value)
    version.value = payload.version
    updatedAt.value = payload.updatedAt
    savedMessage.value = `Saved ${selectedConfig.value.title} defaults.`
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
        <p :class="bemm('eyebrow')">Admin</p>
        <h1 :class="bemm('title')">Apps</h1>
        <p :class="bemm('subtitle')">
          Pick an app, review its build-time identity, and configure the defaults that new users start with.
        </p>
      </div>
    </header>

    <div :class="bemm('layout')">
      <nav :class="bemm('app-list')" aria-label="Apps">
        <button
          v-for="app in apps"
          :key="app.id"
          type="button"
          :class="bemm('app-card', { active: selectedApp === app.id, disabled: !editableDefaultsApps.includes(app.id as TikoManagedApp) })"
          :style="{ '--app-accent': app.themeColor ?? tikoAppColors[app.appColor].primary }"
          @click="selectedApp = app.id"
        >
          <span :class="bemm('app-icon')">
            <Icon v-if="app.appIcon.includes('/')" :name="iconName(app)" size="medium" />
            <span v-else>{{ fallbackIconLabel(app) }}</span>
          </span>
          <span :class="bemm('app-copy')">
            <strong :class="bemm('app-title')">{{ app.title }}</strong>
            <span :class="bemm('app-meta')">{{ app.appColor }}</span>
          </span>
          <span v-if="!editableDefaultsApps.includes(app.id as TikoManagedApp)" :class="bemm('app-status')">config only</span>
        </button>
      </nav>

      <div :class="bemm('workspace')">
        <section :class="bemm('config-panel')" :style="{ '--app-accent': selectedConfig.themeColor ?? selectedColor.primary }">
          <header :class="bemm('config-head')">
            <span :class="bemm('config-icon')">
              <Icon v-if="selectedConfig.appIcon.includes('/')" :name="iconName(selectedConfig)" size="large" />
              <span v-else>{{ fallbackIconLabel(selectedConfig) }}</span>
            </span>
            <div :class="bemm('config-title-wrap')">
              <h2 :class="bemm('config-title')">{{ selectedConfig.title }}</h2>
              <p :class="bemm('config-subtitle')">Build-time app identity from <code>@tiko/ui</code>.</p>
            </div>
          </header>

          <dl :class="bemm('config-grid')">
            <div :class="bemm('config-row')">
              <dt>Title</dt>
              <dd>{{ selectedConfig.title }}</dd>
            </div>
            <div :class="bemm('config-row')">
              <dt>Color token</dt>
              <dd>{{ selectedConfig.appColor }}</dd>
            </div>
            <div :class="bemm('config-row')">
              <dt>Theme color</dt>
              <dd>{{ selectedConfig.themeColor || selectedColor.primary }}</dd>
            </div>
            <div :class="bemm('config-row')">
              <dt>Icon</dt>
              <dd>{{ selectedConfig.appIcon }}</dd>
            </div>
            <div :class="bemm('config-row')">
              <dt>Media icon category</dt>
              <dd>{{ selectedConfig.appIconMediaCategory || 'none' }}</dd>
            </div>
          </dl>
        </section>

        <section :class="bemm('panel')">
          <header :class="bemm('panel-head')">
            <div :class="bemm('panel-intro')">
              <h2 :class="bemm('panel-title')">{{ selectedConfig.title }} defaults</h2>
              <p v-if="editableDefaultsApp" :class="bemm('panel-meta')">
                Version {{ version }} · Updated {{ updatedAt || 'never' }}
              </p>
              <p v-else :class="bemm('panel-meta')">
                This app is registered in shared app config, but app-api defaults are not enabled for it yet.
              </p>
            </div>
            <div v-if="editableDefaultsApp" :class="bemm('panel-actions')">
              <Button variant="outline" :loading="loading" :disabled="loading" @click="loadCurrent">
                {{ loading ? 'Loading…' : 'Reload' }}
              </Button>
              <Button :loading="saving" :disabled="saving || !dirty" @click="onSave">
                {{ saving ? 'Saving…' : 'Save defaults' }}
              </Button>
            </div>
          </header>

          <p v-if="error" :class="bemm('error')">{{ error }}</p>
          <p v-if="savedMessage" :class="bemm('success')">{{ savedMessage }}</p>

          <component
            v-if="currentEditor"
            :is="currentEditor"
            :model-value="stateValue"
            @update:model-value="onValueUpdate"
          />
          <div v-else :class="bemm('empty')">
            <Icon name="ui/info" size="large" />
            <div>
              <h3>Defaults editor not connected yet</h3>
              <p>
                {{ selectedConfig.title }} needs to be added to app-api defaults before its starter state can be edited here.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<style lang="scss">
.apps-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-l);

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
    max-width: calc(var(--space) * 36);
  }

  &__eyebrow {
    color: var(--color-primary);
    font-size: var(--font-size-xs);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--admin-text);
  }

  &__subtitle {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
    line-height: 1.5;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(calc(var(--space) * 16), calc(var(--space) * 20)) minmax(0, 1fr);
    gap: var(--space-l);
    align-items: start;
  }

  &__app-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    position: sticky;
    top: var(--space-m);
  }

  &__app-card {
    display: grid;
    grid-template-columns: calc(var(--space) * 2.5) minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-s);
    width: 100%;
    padding: var(--space-s);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    color: var(--admin-text);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.12s ease, background 0.12s ease, transform 0.12s ease;

    &:hover {
      background: var(--admin-surface-hover);
      border-color: var(--admin-border-strong);
    }

    &--active {
      border-color: var(--app-accent);
      background: color-mix(in srgb, var(--app-accent), transparent 90%);
    }

    &--disabled:not(&--active) {
      opacity: 0.72;
    }
  }

  &__app-icon,
  &__config-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-xs);
    background: color-mix(in srgb, var(--app-accent), transparent 86%);
    color: var(--app-accent);
  }

  &__app-icon {
    width: calc(var(--space) * 2.5);
    height: calc(var(--space) * 2.5);
    font-weight: 700;
  }

  &__app-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }

  &__app-title {
    color: var(--admin-text);
    font-size: var(--font-size-s);
  }

  &__app-meta,
  &__app-status {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
  }

  &__app-status {
    white-space: nowrap;
  }

  &__workspace {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
    min-width: 0;
  }

  &__config-panel,
  &__panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
  }

  &__config-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  &__config-head {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  &__config-icon {
    width: calc(var(--space) * 3);
    height: calc(var(--space) * 3);
    flex: 0 0 auto;
  }

  &__config-title-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-xxs);
  }

  &__config-title,
  &__panel-title {
    color: var(--admin-text);
    font-size: var(--font-size-m);
    font-weight: 700;
  }

  &__config-subtitle,
  &__panel-meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);

    code {
      color: var(--admin-text);
      background: var(--admin-nav-hover);
      border-radius: var(--border-radius-xs);
      padding: 1px 5px;
    }
  }

  &__config-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    overflow: hidden;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-xs);
    background: var(--admin-border);
  }

  &__config-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-xxs);
    padding: var(--space-s);
    background: var(--admin-surface-raised, var(--admin-surface));

    dt {
      color: var(--admin-text-muted);
      font-size: var(--font-size-xs);
      font-weight: 600;
    }

    dd {
      color: var(--admin-text);
      font-size: var(--font-size-s);
      word-break: break-word;
    }
  }

  &__panel {
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

  &__empty {
    display: flex;
    gap: var(--space-s);
    align-items: flex-start;
    padding: var(--space-m);
    border: 1px dashed var(--admin-border);
    border-radius: var(--border-radius-s);
    color: var(--admin-text-muted);

    h3 {
      color: var(--admin-text);
      font-size: var(--font-size-s);
      margin-bottom: var(--space-xxs);
    }

    p {
      font-size: var(--font-size-s);
      line-height: 1.5;
    }
  }

  @media (max-width: 960px) {
    &__layout {
      grid-template-columns: 1fr;
    }

    &__app-list {
      position: static;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 14), 1fr));
    }
  }

  @media (max-width: 720px) {
    &__config-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
