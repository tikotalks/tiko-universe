<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useBemm } from 'bemm'
import { Button, Icon, InputText } from '@sil/ui'
import { tikoAppConfigs, tikoAppColors, type TikoAppColor, type TikoAppConfig } from '@tiko/ui'
import { useAdminAppConfig, type AdminManagedAppConfig } from '../composables/useAdminAppConfig'
import { useAppDefaults, type AppResource, type TikoManagedApp } from '../composables/useAppDefaults'
import MediaPicker from '../components/MediaPicker.vue'
import ColorSwatchPicker from '../components/ColorSwatchPicker.vue'
import CardsEditor from '../components/defaults/CardsEditor.vue'
import YesNoEditor from '../components/defaults/YesNoEditor.vue'
import SequenceEditor from '../components/defaults/SequenceEditor.vue'
import TypeEditor from '../components/defaults/TypeEditor.vue'
import TimerEditor from '../components/defaults/TimerEditor.vue'

const bemm = useBemm('apps-page', { return: 'string', includeBaseClass: true })

const appOrder: TikoAppColor[] = ['yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'talk', 'todo', 'media', 'admin', 'tiko']
const editableDefaultsApps = ['cards', 'yes-no', 'sequence', 'type', 'timer', 'radio', 'todo', 'talk'] as const

type DefaultsApp = typeof editableDefaultsApps[number]

const editorByApp: Partial<Record<DefaultsApp, unknown>> = {
  cards: CardsEditor,
  'yes-no': YesNoEditor,
  sequence: SequenceEditor,
  type: TypeEditor,
  timer: TimerEditor,
}

const configApi = useAdminAppConfig()
const defaultsApi = useAppDefaults()
const selectedApp = ref<TikoAppColor>('cards')
const configs = ref<Record<TikoAppColor, AdminManagedAppConfig>>({ ...tikoAppConfigs })
const configDraft = reactive<TikoAppConfig>({ ...tikoAppConfigs.cards })
const configDirty = ref(false)
const configSavedMessage = ref<string | null>(null)

const stateValue = ref<Record<string, unknown>>({})
const defaultsVersion = ref(0)
const defaultsUpdatedAt = ref<string | null>(null)
const defaultsSavedMessage = ref<string | null>(null)
const defaultsDirty = ref(false)

const selectedConfig = computed(() => configs.value[selectedApp.value] ?? tikoAppConfigs[selectedApp.value])
const selectedColor = computed(() => tikoAppColors[selectedConfig.value.appColor] ?? tikoAppColors[selectedApp.value])
const defaultsApp = computed<DefaultsApp | null>(() => editableDefaultsApps.includes(selectedApp.value as DefaultsApp) ? selectedApp.value as DefaultsApp : null)
const currentEditor = computed(() => defaultsApp.value ? editorByApp[defaultsApp.value] ?? null : null)
const canEditDefaults = computed(() => Boolean(defaultsApp.value))

function syncDraft(config: TikoAppConfig) {
  Object.assign(configDraft, {
    id: config.id,
    title: config.title,
    appColor: config.appColor,
    appIcon: config.appIcon,
    appIconMediaCategory: config.appIconMediaCategory ?? '',
    appIconImageUrl: config.appIconImageUrl ?? '',
    themeColor: config.themeColor ?? '',
  })
  configDirty.value = false
}

function onConfigInput() {
  configDirty.value = true
  configSavedMessage.value = null
}

async function loadConfigs() {
  try {
    const next = await configApi.readConfigs()
    configs.value = { ...tikoAppConfigs, ...next }
    syncDraft(configs.value[selectedApp.value])
  } catch {
    // error is surfaced via configApi.error.value
  }
}

async function saveConfig() {
  configSavedMessage.value = null
  const normalized: TikoAppConfig = {
    id: selectedApp.value,
    title: configDraft.title,
    appColor: configDraft.appColor,
    appIcon: configDraft.appIcon,
    ...(configDraft.appIconMediaCategory ? { appIconMediaCategory: configDraft.appIconMediaCategory } : {}),
    ...(configDraft.appIconImageUrl ? { appIconImageUrl: configDraft.appIconImageUrl } : {}),
    ...(configDraft.themeColor ? { themeColor: configDraft.themeColor } : {}),
  }
  try {
    const saved = await configApi.writeConfig(selectedApp.value, normalized, configs.value[selectedApp.value]?.version ?? 0)
    configs.value = { ...configs.value, [selectedApp.value]: { ...saved.config, updatedAt: saved.updatedAt, version: saved.version } }
    syncDraft(configs.value[selectedApp.value])
    configSavedMessage.value = `Saved ${saved.config.title} app config.`
  } catch {
    // error is surfaced via configApi.error.value
  }
}

async function loadDefaults() {
  defaultsSavedMessage.value = null
  stateValue.value = {}
  defaultsVersion.value = 0
  defaultsUpdatedAt.value = null
  defaultsDirty.value = false
  if (!defaultsApp.value) return

  try {
    const payload = await defaultsApi.readDefaults(defaultsApp.value as TikoManagedApp, 'state' satisfies AppResource)
    stateValue.value = (payload.state ?? {}) as Record<string, unknown>
    defaultsVersion.value = payload.version
    defaultsUpdatedAt.value = payload.updatedAt
  } catch {
    // error is already surfaced via defaultsApi.error.value
  }
}

async function saveDefaults() {
  if (!defaultsApp.value) return
  defaultsSavedMessage.value = null
  try {
    const payload = await defaultsApi.writeDefaults(defaultsApp.value as TikoManagedApp, 'state', stateValue.value, defaultsVersion.value)
    defaultsVersion.value = payload.version
    defaultsUpdatedAt.value = payload.updatedAt
    defaultsSavedMessage.value = `Saved ${selectedConfig.value.title} defaults.`
    defaultsDirty.value = false
  } catch {
    // error is already surfaced via defaultsApi.error.value
  }
}

function onDefaultsUpdate(next: Record<string, unknown>) {
  stateValue.value = next
  defaultsDirty.value = true
}

function selectApp(app: TikoAppColor) {
  selectedApp.value = app
}

watch(selectedApp, () => {
  syncDraft(selectedConfig.value)
  void loadDefaults()
})

onMounted(async () => {
  await loadConfigs()
  await loadDefaults()
})
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div :class="bemm('intro')">
        <p :class="bemm('eyebrow')">Admin</p>
        <h1 :class="bemm('title')">Apps</h1>
        <p :class="bemm('subtitle')">
          Manage each app’s title, color, icon, media icon category, and starter defaults.
        </p>
      </div>
    </header>

    <div :class="bemm('layout')">
      <nav :class="bemm('app-list')" aria-label="Apps">
        <button
          v-for="app in appOrder"
          :key="app"
          type="button"
          :class="bemm('app-card', { active: selectedApp === app })"
          :style="{ '--app-accent': (configs[app]?.themeColor || tikoAppColors[app]?.primary) }"
          @click="selectApp(app)"
        >
          <span :class="bemm('app-icon')">
            <Icon v-if="(configs[app]?.appIcon || '').includes('/')" :name="configs[app]?.appIcon" size="medium" />
            <span v-else>{{ configs[app]?.appIcon || app.charAt(0).toUpperCase() }}</span>
          </span>
          <span :class="bemm('app-copy')">
            <strong :class="bemm('app-title')">{{ configs[app]?.title || app }}</strong>
            <span :class="bemm('app-meta')">{{ configs[app]?.appColor || app }}</span>
          </span>
        </button>
      </nav>

      <div :class="bemm('workspace')">
        <section :class="bemm('panel')" :style="{ '--app-accent': configDraft.themeColor || selectedColor.primary }">
          <header :class="bemm('panel-head')">
            <div :class="bemm('panel-intro')">
              <h2 :class="bemm('panel-title')">App config</h2>
              <p :class="bemm('panel-meta')">
                Saved in Admin. Build scripts can export this into each app’s `appConfig.ts`.
              </p>
            </div>
            <div :class="bemm('panel-actions')">
              <Button variant="outline" :loading="configApi.loading.value" :disabled="configApi.loading.value" @click="loadConfigs">
                Reload
              </Button>
              <Button :loading="configApi.saving.value" :disabled="configApi.saving.value || !configDirty" @click="saveConfig">
                Save app config
              </Button>
            </div>
          </header>

          <p v-if="configApi.error.value" :class="bemm('error')">{{ configApi.error.value }}</p>
          <p v-if="configSavedMessage" :class="bemm('success')">{{ configSavedMessage }}</p>

          <div :class="bemm('config-form')">
            <InputText v-model="configDraft.title" label="Title" @update:model-value="onConfigInput" />
            <InputText v-model="configDraft.appIcon" label="Icon" placeholder="ui/check-fat" @update:model-value="onConfigInput" />
            <InputText v-model="configDraft.appIconMediaCategory" label="Media icon category" placeholder="animals" @update:model-value="onConfigInput" />
            <div :class="bemm('field')">
              <span :class="bemm('field-label')">Icon image</span>
              <MediaPicker v-model="configDraft.appIconImageUrl!" @update:model-value="onConfigInput" />
            </div>
            <div :class="bemm('field')">
              <span :class="bemm('field-label')">Theme color</span>
              <div :class="bemm('color-row')">
                <input type="color" :class="bemm('color-input')" :value="configDraft.themeColor || tikoAppConfigs[selectedApp]?.themeColor || '#2488ff'" @input="(e: Event) => { configDraft.themeColor = (e.target as HTMLInputElement).value; onConfigInput() }" />
                <InputText :model-value="configDraft.themeColor || ''" placeholder="#2488ff" @update:model-value="(v: string) => { configDraft.themeColor = v; onConfigInput() }" />
              </div>
            </div>
            <div :class="bemm('field')">
              <span :class="bemm('field-label')">App colors</span>
              <ColorSwatchPicker
                :model-value="configDraft.themeColor || tikoAppConfigs[selectedApp]?.themeColor || ''"
                @update:model-value="(v: string) => { configDraft.themeColor = v; onConfigInput() }"
              />
            </div>
          </div>
        </section>

        <section :class="bemm('panel')">
          <header :class="bemm('panel-head')">
            <div :class="bemm('panel-intro')">
              <h2 :class="bemm('panel-title')">{{ selectedConfig.title }} defaults</h2>
              <p :class="bemm('panel-meta')">
                <template v-if="canEditDefaults">
                  Version {{ defaultsVersion }} · Updated {{ defaultsUpdatedAt || 'never' }}
                </template>
                <template v-else>
                  Defaults are not enabled for this app yet.
                </template>
              </p>
            </div>
            <div v-if="canEditDefaults" :class="bemm('panel-actions')">
              <Button variant="outline" :loading="defaultsApi.loading.value" :disabled="defaultsApi.loading.value" @click="loadDefaults">
                Reload
              </Button>
              <Button :loading="defaultsApi.saving.value" :disabled="defaultsApi.saving.value || !defaultsDirty || !currentEditor" @click="saveDefaults">
                Save defaults
              </Button>
            </div>
          </header>

          <p v-if="defaultsApi.error.value" :class="bemm('error')">{{ defaultsApi.error.value }}</p>
          <p v-if="defaultsSavedMessage" :class="bemm('success')">{{ defaultsSavedMessage }}</p>

          <component
            v-if="currentEditor"
            :is="currentEditor"
            :model-value="stateValue"
            @update:model-value="onDefaultsUpdate"
          />
          <div v-else :class="bemm('empty')">
            <Icon name="ui/info" size="large" />
            <p>App config can be edited now. A custom defaults editor still needs to be added for this app.</p>
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

  &__header,
  &__intro,
  &__workspace,
  &__panel,
  &__panel-intro,
  &__app-copy {
    display: flex;
    flex-direction: column;
  }

  &__intro { gap: var(--space-xs); }
  &__workspace { gap: var(--space-m); min-width: 0; }
  &__panel { gap: var(--space-m); }
  &__app-copy { gap: 2px; min-width: 0; }

  &__eyebrow {
    color: var(--color-primary);
    font-size: var(--font-size-xs);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__title {
    color: var(--admin-text);
    font-size: var(--font-size-xl);
    font-weight: 700;
  }

  &__subtitle,
  &__panel-meta,
  &__app-meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
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
    grid-template-columns: calc(var(--space) * 2.5) minmax(0, 1fr);
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

    &:hover {
      background: var(--admin-surface-hover);
      border-color: var(--admin-border-strong);
    }

    &--active {
      border-color: var(--app-accent);
      background: color-mix(in srgb, var(--app-accent), transparent 90%);
    }
  }

  &__app-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--space) * 2.5);
    height: calc(var(--space) * 2.5);
    border-radius: var(--border-radius-xs);
    background: color-mix(in srgb, var(--app-accent), transparent 86%);
    color: var(--app-accent);
    font-weight: 700;
  }

  &__app-title,
  &__panel-title {
    color: var(--admin-text);
    font-size: var(--font-size-m);
    font-weight: 700;
  }

  &__panel {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
  }

  &__panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
    flex-wrap: wrap;
  }

  &__panel-actions {
    display: flex;
    gap: var(--space-s);
  }

  &__config-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-s);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  &__field-label {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  &__color-row {
    display: flex;
    gap: var(--space-xs);
    align-items: center;
  }

  &__color-input {
    width: calc(var(--space) * 3);
    height: calc(var(--space) * 3);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-xs);
    padding: 2px;
    cursor: pointer;
    background: transparent;
  }

  &__select {
    min-height: calc(var(--space) * 2.75);
    padding: 0 var(--space-s);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-xs);
    background: var(--admin-surface);
    color: var(--admin-text);
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
    align-items: center;
    padding: var(--space-m);
    border: 1px dashed var(--admin-border);
    border-radius: var(--border-radius-s);
    color: var(--admin-text-muted);
  }

  @media (max-width: 960px) {
    &__layout { grid-template-columns: 1fr; }
    &__app-list {
      position: static;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 12), 1fr));
    }
  }

  @media (max-width: 720px) {
    &__config-form { grid-template-columns: 1fr; }
  }
}
</style>
