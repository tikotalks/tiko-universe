<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBemm } from 'bemm'
import { Button, Icon, InputText } from '@sil/ui'
import { TikoAppHeader, tikoAppConfigs, tikoAppColors, type TikoAppColor, type TikoAppConfig } from '@tiko/ui'
import { tikoLanguageOptions } from '@tiko/i18n'
import { useAdminAppConfig, type AdminManagedAppConfig, type TikoGeneralSettings } from '../composables/useAdminAppConfig'
import { useAppDefaults, type AppResource, type TikoManagedApp } from '../composables/useAppDefaults'
import MediaPicker from '../components/MediaPicker.vue'
import ColorSwatchPicker from '../components/ColorSwatchPicker.vue'
import CardsEditor from '../components/defaults/CardsEditor.vue'
import YesNoEditor from '../components/defaults/YesNoEditor.vue'
import SequenceEditor from '../components/defaults/SequenceEditor.vue'
import TypeEditor from '../components/defaults/TypeEditor.vue'
import TimerEditor from '../components/defaults/TimerEditor.vue'

const bemm = useBemm('apps-page', { return: 'string', includeBaseClass: true })
const route = useRoute()
const router = useRouter()

const appOrder: TikoAppColor[] = ['yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'talk', 'todo', 'media', 'admin', 'tiko']
const editableDefaultsApps = ['cards', 'yes-no', 'sequence', 'type', 'timer', 'radio', 'todo', 'talk'] as const

type DefaultsApp = typeof editableDefaultsApps[number]

const editorByApp: Partial<Record<DefaultsApp, Component>> = {
  cards: CardsEditor,
  'yes-no': YesNoEditor,
  sequence: SequenceEditor,
  type: TypeEditor,
  timer: TimerEditor,
}

const configApi = useAdminAppConfig()
const defaultsApi = useAppDefaults()
const configs = ref<Record<TikoAppColor, AdminManagedAppConfig>>({ ...tikoAppConfigs })
const configDraft = reactive<AdminManagedAppConfig>({ ...tikoAppConfigs.cards, supportedLanguagesMode: 'tiko-defaults', supportedLanguages: [] })
const configDirty = ref(false)
const configSavedMessage = ref<string | null>(null)
const appCustomLanguage = ref('')

const tikoSettingsDraft = reactive<TikoGeneralSettings>({ supportedLanguages: tikoLanguageOptions.map((language) => language.value) })
const tikoSettingsVersion = ref(0)
const tikoSettingsUpdatedAt = ref<string | null>(null)
const tikoSettingsDirty = ref(false)
const tikoSettingsSavedMessage = ref<string | null>(null)
const tikoCustomLanguage = ref('')

const stateValue = ref<Record<string, unknown>>({})
const defaultsVersion = ref(0)
const defaultsUpdatedAt = ref<string | null>(null)
const defaultsSavedMessage = ref<string | null>(null)
const defaultsDirty = ref(false)

const routeApp = computed<TikoAppColor | null>(() => {
  const param = Array.isArray(route.params.app) ? route.params.app[0] : route.params.app
  return appOrder.includes(param as TikoAppColor) ? param as TikoAppColor : null
})
const isOverview = computed(() => route.name === 'apps' || !routeApp.value)
const selectedApp = computed<TikoAppColor>(() => routeApp.value ?? 'cards')
const selectedConfig = computed(() => configs.value[selectedApp.value] ?? tikoAppConfigs[selectedApp.value])
const selectedColor = computed(() => tikoAppColors[selectedConfig.value.appColor] ?? tikoAppColors[selectedApp.value])
const previewAccent = computed(() => configDraft.themeColor || tikoAppConfigs[selectedApp.value]?.themeColor || selectedColor.value.primary)
const previewIcon = computed(() => configDraft.appIconImageUrl || configDraft.appIcon || selectedApp.value.charAt(0).toUpperCase())
const defaultsApp = computed<DefaultsApp | null>(() => editableDefaultsApps.includes(selectedApp.value as DefaultsApp) ? selectedApp.value as DefaultsApp : null)
const currentEditor = computed<Component | null>(() => defaultsApp.value ? editorByApp[defaultsApp.value] ?? null : null)
const canEditDefaults = computed(() => Boolean(defaultsApp.value))
const globalSupportedLanguages = computed(() => normalizeLanguages(tikoSettingsDraft.supportedLanguages))
const appSupportedLanguages = computed(() => normalizeLanguages(configDraft.supportedLanguages))
const effectiveSupportedLanguages = computed(() => configDraft.supportedLanguagesMode === 'custom' && appSupportedLanguages.value.length > 0 ? appSupportedLanguages.value : globalSupportedLanguages.value)

function isImageSource(value: string | undefined) {
  return Boolean(value && (/^(https?:|data:|blob:)/.test(value) || /\.(avif|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(value)))
}

function appConfig(app: TikoAppColor) {
  return configs.value[app] ?? tikoAppConfigs[app]
}

function appAccent(app: TikoAppColor) {
  const config = appConfig(app)
  return config.themeColor || tikoAppConfigs[app]?.themeColor || tikoAppColors[app]?.primary
}

function syncDraft(config: TikoAppConfig) {
  Object.assign(configDraft, {
    id: config.id,
    title: config.title,
    appColor: config.appColor,
    appIcon: config.appIcon,
    appIconMediaCategory: config.appIconMediaCategory ?? '',
    appIconImageUrl: config.appIconImageUrl ?? '',
    themeColor: config.themeColor ?? '',
    supportedLanguagesMode: config.supportedLanguagesMode === 'custom' ? 'custom' : 'tiko-defaults',
    supportedLanguages: normalizeLanguages(config.supportedLanguages),
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
    syncDraft(selectedConfig.value)
  } catch {
    // error is surfaced via configApi.error.value
  }
}

async function loadTikoSettings() {
  try {
    const payload = await configApi.readTikoSettings()
    Object.assign(tikoSettingsDraft, {
      ...payload.settings,
      supportedLanguages: normalizeLanguages(payload.settings.supportedLanguages, tikoLanguageOptions.map((language) => language.value)),
    })
    tikoSettingsVersion.value = payload.version
    tikoSettingsUpdatedAt.value = payload.updatedAt
    tikoSettingsDirty.value = false
  } catch {
    // error is surfaced via configApi.error.value
  }
}

async function saveTikoSettings() {
  tikoSettingsSavedMessage.value = null
  try {
    const payload = await configApi.writeTikoSettings(
      { ...tikoSettingsDraft, supportedLanguages: globalSupportedLanguages.value },
      tikoSettingsVersion.value,
    )
    Object.assign(tikoSettingsDraft, payload.settings)
    tikoSettingsVersion.value = payload.version
    tikoSettingsUpdatedAt.value = payload.updatedAt
    tikoSettingsDirty.value = false
    tikoSettingsSavedMessage.value = 'Saved Tiko language defaults.'
  } catch {
    // error is surfaced via configApi.error.value
  }
}

async function saveConfig() {
  configSavedMessage.value = null
  const normalized: AdminManagedAppConfig = {
    id: selectedApp.value,
    title: configDraft.title,
    appColor: configDraft.appColor,
    appIcon: configDraft.appIcon,
    ...(configDraft.appIconMediaCategory ? { appIconMediaCategory: configDraft.appIconMediaCategory } : {}),
    ...(configDraft.appIconImageUrl ? { appIconImageUrl: configDraft.appIconImageUrl } : {}),
    ...(configDraft.themeColor ? { themeColor: configDraft.themeColor } : {}),
    supportedLanguagesMode: configDraft.supportedLanguagesMode === 'custom' ? 'custom' : 'tiko-defaults',
    supportedLanguages: configDraft.supportedLanguagesMode === 'custom' ? appSupportedLanguages.value : [],
  }
  try {
    const saved = await configApi.writeConfig(selectedApp.value, normalized, configs.value[selectedApp.value]?.version ?? 0)
    const savedConfig = { ...saved.config, updatedAt: saved.updatedAt, version: saved.version }
    configs.value = { ...configs.value, [selectedApp.value]: savedConfig }
    syncDraft(configs.value[selectedApp.value])
    window.dispatchEvent(new CustomEvent('tiko-admin-app-config-updated', { detail: { app: selectedApp.value, config: savedConfig } }))
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
  if (!defaultsApp.value || isOverview.value) return

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

function normalizeLanguages(value: unknown, fallback: string[] = []): string[] {
  const source = Array.isArray(value) ? value : fallback
  return Array.from(new Set(source.map((item) => typeof item === 'string' ? normalizeLanguageTag(item) : '').filter(Boolean)))
}

function normalizeLanguageTag(value: string): string {
  const cleaned = value.trim().replace(/_/g, '-')
  if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(cleaned)) return ''
  return cleaned.split('-').map((part, index) => index === 0 ? part.toLowerCase() : part.length === 2 ? part.toUpperCase() : part).join('-')
}

function languageLabel(code: string): string {
  const preset = tikoLanguageOptions.find((language) => language.value === code)
  return preset ? `${preset.label} (${preset.nativeLabel})` : code
}

function isGlobalLanguageSelected(code: string): boolean {
  return globalSupportedLanguages.value.includes(code)
}

function isAppLanguageSelected(code: string): boolean {
  return appSupportedLanguages.value.includes(code)
}

function toggleGlobalLanguage(code: string, checked: boolean) {
  const next = new Set(globalSupportedLanguages.value)
  if (checked) next.add(code)
  else next.delete(code)
  tikoSettingsDraft.supportedLanguages = Array.from(next)
  tikoSettingsDirty.value = true
  tikoSettingsSavedMessage.value = null
}

function toggleAppLanguage(code: string, checked: boolean) {
  const next = new Set(appSupportedLanguages.value)
  if (checked) next.add(code)
  else next.delete(code)
  configDraft.supportedLanguages = Array.from(next)
  onConfigInput()
}

function removeGlobalLanguage(code: string) {
  toggleGlobalLanguage(code, false)
}

function removeAppLanguage(code: string) {
  toggleAppLanguage(code, false)
}

function addGlobalCustomLanguage() {
  const code = normalizeLanguageTag(tikoCustomLanguage.value)
  if (!code) return
  toggleGlobalLanguage(code, true)
  tikoCustomLanguage.value = ''
}

function addAppCustomLanguage() {
  const code = normalizeLanguageTag(appCustomLanguage.value)
  if (!code) return
  toggleAppLanguage(code, true)
  appCustomLanguage.value = ''
}

function setAppLanguageMode(mode: 'tiko-defaults' | 'custom') {
  configDraft.supportedLanguagesMode = mode
  if (mode === 'custom' && appSupportedLanguages.value.length === 0) {
    configDraft.supportedLanguages = [...globalSupportedLanguages.value]
  }
  onConfigInput()
}

watch(selectedApp, () => {
  syncDraft(selectedConfig.value)
  void loadDefaults()
})

watch(isOverview, () => {
  if (!isOverview.value) void loadDefaults()
})

onMounted(async () => {
  await Promise.all([loadConfigs(), loadTikoSettings()])
  if (!isOverview.value) await loadDefaults()
})

if (!isOverview.value && !routeApp.value) {
  void router.replace('/apps')
}
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div :class="bemm('intro')">
        <p :class="bemm('eyebrow')">Admin</p>
        <h1 :class="bemm('title')">{{ isOverview ? 'Apps' : selectedConfig.title }}</h1>
        <p :class="bemm('subtitle')">
          <template v-if="isOverview">
            Choose an app to manage its settings and starter defaults on a dedicated page.
          </template>
          <template v-else>
            Manage {{ selectedConfig.title }} app settings and starter defaults.
          </template>
        </p>
      </div>
      <Button v-if="!isOverview" variant="outline" @click="router.push('/apps')">
        Back to apps
      </Button>
    </header>

    <div v-if="isOverview" :class="bemm('overview-stack')">
      <section :class="bemm('panel')" aria-label="General Tiko settings">
        <header :class="bemm('panel-head')">
          <div :class="bemm('panel-intro')">
            <h2 :class="bemm('panel-title')">General Tiko settings</h2>
            <p :class="bemm('panel-meta')">
              Supported languages are stored in Tiko defaults and synced to Lezu when saved.
              Version {{ tikoSettingsVersion }} · Updated {{ tikoSettingsUpdatedAt || 'never' }}
            </p>
          </div>
          <div :class="bemm('panel-actions')">
            <Button variant="outline" :loading="configApi.loading.value" :disabled="configApi.loading.value" @click="loadTikoSettings">
              Reload
            </Button>
            <Button :loading="configApi.saving.value" :disabled="configApi.saving.value || !tikoSettingsDirty" @click="saveTikoSettings">
              Save Tiko settings
            </Button>
          </div>
        </header>
        <p v-if="configApi.error.value" :class="bemm('error')">{{ configApi.error.value }}</p>
        <p v-if="tikoSettingsSavedMessage" :class="bemm('success')">{{ tikoSettingsSavedMessage }}</p>

        <div :class="bemm('language-editor')">
          <label
            v-for="language in tikoLanguageOptions"
            :key="language.value"
            :class="bemm('language-option')"
          >
            <input
              type="checkbox"
              :checked="isGlobalLanguageSelected(language.value)"
              @change="(event: Event) => toggleGlobalLanguage(language.value, (event.target as HTMLInputElement).checked)"
            >
            <span>{{ language.label }}</span>
            <small>{{ language.nativeLabel }}</small>
          </label>
        </div>
        <div :class="bemm('custom-language-row')">
          <InputText
            v-model="tikoCustomLanguage"
            label="Add custom locale"
            placeholder="en-GB, pt-BR, fr-CA"
            @keyup.enter="addGlobalCustomLanguage"
          />
          <Button variant="outline" :disabled="!normalizeLanguageTag(tikoCustomLanguage)" @click="addGlobalCustomLanguage">
            Add locale
          </Button>
        </div>
        <div :class="bemm('language-chips')" aria-label="Active Tiko default languages">
          <button
            v-for="language in globalSupportedLanguages"
            :key="language"
            type="button"
            :class="bemm('language-chip')"
            @click="removeGlobalLanguage(language)"
          >
            <span>{{ languageLabel(language) }}</span>
            <Icon name="ui/multiply-s" size="small" />
          </button>
        </div>
        <p :class="bemm('language-summary')">
          Active Tiko defaults: {{ globalSupportedLanguages.map(languageLabel).join(', ') || 'none' }}
        </p>
      </section>

      <section :class="bemm('overview')" aria-label="Apps overview">
        <router-link
          v-for="app in appOrder"
          :key="app"
          :to="`/apps/${app}`"
          :class="bemm('overview-card')"
          :style="{ '--app-accent': appAccent(app) }"
        >
          <span :class="bemm('overview-icon')" :style="{ '--app-accent': appAccent(app) }">
            <img
              v-if="appConfig(app).appIconImageUrl || isImageSource(appConfig(app).appIcon)"
              :class="bemm('overview-icon-image')"
              :src="appConfig(app).appIconImageUrl || appConfig(app).appIcon"
              :alt="`${appConfig(app).title} icon`"
            >
            <Icon v-else-if="(appConfig(app).appIcon || '').includes('/')" :name="appConfig(app).appIcon" size="medium" />
            <span v-else>{{ appConfig(app).appIcon || app.charAt(0).toUpperCase() }}</span>
          </span>
          <span :class="bemm('overview-copy')">
            <strong :class="bemm('overview-title')">{{ appConfig(app).title }}</strong>
            <span :class="bemm('overview-meta')">{{ appConfig(app).appColor }} · {{ appConfig(app).appIconMediaCategory || 'no media category' }}</span>
          </span>
          <span :class="bemm('overview-footer')">
            <span :class="bemm('pill')">Settings</span>
            <span :class="bemm('pill', { muted: !editableDefaultsApps.includes(app as DefaultsApp) })">
              {{ editableDefaultsApps.includes(app as DefaultsApp) ? 'Defaults' : 'No defaults' }}
            </span>
          </span>
        </router-link>
      </section>
    </div>

    <div v-else :class="bemm('workspace')">
      <section :class="bemm('panel')" :style="{ '--app-accent': previewAccent }">
        <header :class="bemm('panel-head')">
          <div :class="bemm('panel-intro')">
            <h2 :class="bemm('panel-title')">App settings</h2>
            <p :class="bemm('panel-meta')">
              Saved in Admin. Build scripts can export this into each app’s `appConfig.ts`.
            </p>
          </div>
          <div :class="bemm('panel-actions')">
            <Button variant="outline" :loading="configApi.loading.value" :disabled="configApi.loading.value" @click="loadConfigs">
              Reload
            </Button>
            <Button :loading="configApi.saving.value" :disabled="configApi.saving.value || !configDirty" @click="saveConfig">
              Save app settings
            </Button>
          </div>
        </header>

        <p v-if="configApi.error.value" :class="bemm('error')">{{ configApi.error.value }}</p>
        <p v-if="configSavedMessage" :class="bemm('success')">{{ configSavedMessage }}</p>

        <div :class="bemm('config-layout')">
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
                <input type="color" :class="bemm('color-input')" :value="previewAccent" @input="(e: Event) => { configDraft.themeColor = (e.target as HTMLInputElement).value; onConfigInput() }" />
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
            <div :class="bemm('field', { wide: true })">
              <span :class="bemm('field-label')">Supported languages</span>
              <div :class="bemm('segmented')">
                <button
                  type="button"
                  :class="bemm('segmented-button', { active: configDraft.supportedLanguagesMode !== 'custom' })"
                  @click="setAppLanguageMode('tiko-defaults')"
                >
                  Use Tiko Defaults
                </button>
                <button
                  type="button"
                  :class="bemm('segmented-button', { active: configDraft.supportedLanguagesMode === 'custom' })"
                  @click="setAppLanguageMode('custom')"
                >
                  Custom
                </button>
              </div>
              <div v-if="configDraft.supportedLanguagesMode === 'custom'" :class="bemm('language-editor')">
                <label
                  v-for="language in tikoLanguageOptions"
                  :key="language.value"
                  :class="bemm('language-option')"
                >
                  <input
                    type="checkbox"
                    :checked="isAppLanguageSelected(language.value)"
                    @change="(event: Event) => toggleAppLanguage(language.value, (event.target as HTMLInputElement).checked)"
                  >
                  <span>{{ language.label }}</span>
                  <small>{{ language.nativeLabel }}</small>
                </label>
              </div>
              <div v-if="configDraft.supportedLanguagesMode === 'custom'" :class="bemm('custom-language-row')">
                <InputText
                  v-model="appCustomLanguage"
                  label="Add custom locale"
                  placeholder="en-GB, pt-BR, fr-CA"
                  @keyup.enter="addAppCustomLanguage"
                />
                <Button variant="outline" :disabled="!normalizeLanguageTag(appCustomLanguage)" @click="addAppCustomLanguage">
                  Add locale
                </Button>
              </div>
              <div v-if="configDraft.supportedLanguagesMode === 'custom'" :class="bemm('language-chips')" aria-label="Active app languages">
                <button
                  v-for="language in appSupportedLanguages"
                  :key="language"
                  type="button"
                  :class="bemm('language-chip')"
                  @click="removeAppLanguage(language)"
                >
                  <span>{{ languageLabel(language) }}</span>
                  <Icon name="ui/multiply-s" size="small" />
                </button>
              </div>
              <p :class="bemm('language-summary')">
                Effective languages: {{ effectiveSupportedLanguages.map(languageLabel).join(', ') || 'none' }}
              </p>
            </div>
          </div>

          <aside :class="bemm('preview')" :style="{ '--tiko-app-primary': previewAccent, '--app-accent': previewAccent }" aria-label="App icon preview">
            <span :class="bemm('field-label')">Preview</span>
            <TikoAppHeader
              :app-name="configDraft.title || selectedConfig.title"
              :app-icon="configDraft.appIcon || selectedConfig.appIcon"
              :app-icon-image-url="configDraft.appIconImageUrl || ''"
              :app-icon-media-category="configDraft.appIconMediaCategory || ''"
              :app-color="configDraft.appColor"
              :show-settings-button="false"
            />
            <div :class="bemm('preview-tile')">
              <span :class="bemm('preview-icon')">
                <img
                  v-if="isImageSource(previewIcon)"
                  :class="bemm('preview-icon-image')"
                  :src="previewIcon"
                  :alt="`${configDraft.title || selectedConfig.title} icon`"
                >
                <Icon v-else-if="previewIcon.includes('/')" :name="previewIcon" size="large" />
                <span v-else>{{ previewIcon }}</span>
              </span>
              <span :class="bemm('preview-name')">{{ configDraft.title || selectedConfig.title }}</span>
            </div>
            <p :class="bemm('preview-meta')">
              {{ configDraft.appIconImageUrl ? 'Custom image' : configDraft.appIconMediaCategory ? `Media category: ${configDraft.appIconMediaCategory}` : configDraft.appIcon || 'Text icon' }}
            </p>
            <p :class="bemm('preview-meta')">{{ previewAccent }}</p>
          </aside>
        </div>
      </section>

      <section :class="bemm('panel')">
        <header :class="bemm('panel-head')">
          <div :class="bemm('panel-intro')">
            <h2 :class="bemm('panel-title')">Starter defaults</h2>
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
          <p>App settings can be edited now. A custom defaults editor still needs to be added for this app.</p>
        </div>
      </section>
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
  &__overview-copy {
    display: flex;
    flex-direction: column;
  }

  &__header {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
  }

  &__intro { gap: var(--space-xs); }
  &__workspace { gap: var(--space-m); min-width: 0; }
  &__panel { gap: var(--space-m); }
  &__overview-copy { gap: 2px; min-width: 0; }
  &__overview-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

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
  &__overview-meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 17), 1fr));
    gap: var(--space-m);
  }

  &__overview-card {
    display: grid;
    grid-template-columns: calc(var(--space) * 3) minmax(0, 1fr);
    gap: var(--space-s);
    min-height: calc(var(--space) * 9);
    padding: var(--space-m);
    background: var(--admin-surface);
    border: 0;
    border-left: 4px solid var(--app-accent, var(--admin-border-strong));
    border-radius: var(--admin-card-radius);
    color: var(--admin-text);
    text-decoration: none;
    transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease;

    &:hover {
      background: var(--admin-surface-hover);
      border-color: var(--admin-border-strong);
      transform: translateY(-1px);
    }
  }

  &__overview-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--space) * 3);
    height: calc(var(--space) * 3);
    border-radius: var(--border-radius-s);
    background: var(--admin-surface-hover);
    color: var(--admin-text);
    font-weight: 700;
    overflow: hidden;
  }

  &__overview-icon-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__overview-title,
  &__panel-title {
    color: var(--admin-text);
    font-size: var(--font-size-m);
    font-weight: 700;
  }

  &__overview-footer {
    grid-column: 1 / -1;
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
    align-self: end;
  }

  &__pill {
    display: inline-flex;
    align-items: center;
    min-height: calc(var(--space) * 1.5);
    padding: 0 var(--space-xs);
    border-radius: 999px;
    background: var(--admin-nav-active);
    color: var(--admin-text);
    font-size: var(--font-size-xs);
    font-weight: 600;

    &--muted {
      background: var(--admin-surface-hover);
      color: var(--admin-text-muted);
    }
  }

  &__panel {
    background: var(--admin-surface);
    border: 0;
    border-radius: var(--admin-card-radius);
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
    flex-wrap: wrap;
  }

  &__config-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(calc(var(--space) * 18), calc(var(--space) * 24));
    gap: var(--space-m);
    align-items: start;
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

    &--wide {
      grid-column: 1 / -1;
    }
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

  &__segmented {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    padding: 3px;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    background: var(--admin-surface-hover);
    overflow: hidden;
  }

  &__segmented-button {
    min-height: calc(var(--space) * 2);
    padding: 0 var(--space-s);
    border: 0;
    border-radius: var(--border-radius-xs);
    background: transparent;
    color: var(--admin-text-muted);
    font: inherit;
    font-size: var(--font-size-s);
    font-weight: 700;
    cursor: pointer;

    &--active {
      background: var(--admin-surface);
      color: var(--admin-text);
      box-shadow: 0 1px 2px color-mix(in srgb, var(--color-foreground), transparent 88%);
    }
  }

  &__language-editor {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 11), 1fr));
    gap: var(--space-xs);
  }

  &__language-option {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 2px var(--space-xs);
    align-items: center;
    min-height: calc(var(--space) * 2.75);
    padding: var(--space-xs);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    background: color-mix(in srgb, var(--admin-surface), var(--admin-text) 3%);
    color: var(--admin-text);
    font-size: var(--font-size-s);

    input {
      grid-row: span 2;
      width: var(--space);
      height: var(--space);
      accent-color: var(--color-primary);
    }

    small {
      grid-column: 2;
      color: var(--admin-text-muted);
      font-size: var(--font-size-xs);
      font-weight: 600;
      overflow-wrap: anywhere;
    }
  }

  &__custom-language-row {
    display: grid;
    grid-template-columns: minmax(0, calc(var(--space) * 18)) auto;
    gap: var(--space-s);
    align-items: end;
  }

  &__language-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__language-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: calc(var(--space) * 1.75);
    max-width: 100%;
    padding: 0 var(--space-xs);
    border: 1px solid var(--admin-border);
    border-radius: 999px;
    background: var(--admin-surface-hover);
    color: var(--admin-text);
    font-size: var(--font-size-xs);
    font-weight: 700;
    cursor: pointer;

    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__language-summary {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  &__preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    min-width: 0;
    padding: var(--space-s);
    border: 1px solid var(--admin-border);
    border-radius: var(--admin-card-radius);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 5%);

    .tiko-app-header {
      position: static;
      padding: 0;
      min-width: 0;
    }

    .tiko-app-header__title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--admin-text);
      font-size: var(--font-size-m);
    }
  }

  &__preview-tile {
    display: grid;
    grid-template-columns: calc(var(--space) * 5) minmax(0, 1fr);
    gap: var(--space-s);
    align-items: center;
    min-height: calc(var(--space) * 6);
    padding: var(--space-s);
    border-radius: var(--border-radius-s);
    background: color-mix(in srgb, var(--app-accent), var(--color-background) 82%);
  }

  &__preview-icon {
    display: grid;
    place-items: center;
    width: calc(var(--space) * 5);
    height: calc(var(--space) * 5);
    overflow: hidden;
    border-radius: var(--border-radius-s);
    background: var(--app-accent);
    color: #fff;
    font-size: var(--font-size-xl);
    font-weight: 800;
  }

  &__preview-icon-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__preview-name {
    min-width: 0;
    overflow: hidden;
    color: var(--admin-text);
    font-size: var(--font-size-m);
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__preview-meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    line-height: 1.35;
    overflow-wrap: anywhere;
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
    border-radius: var(--admin-card-radius);
    color: var(--admin-text-muted);
  }

  @media (max-width: 720px) {
    &__header,
    &__panel-head,
    &__panel-actions,
    &__color-row,
    &__custom-language-row {
      flex-direction: column;
      align-items: stretch;
    }

    &__overview {
      grid-template-columns: 1fr;
    }

    &__config-layout,
    &__config-form,
    &__custom-language-row {
      grid-template-columns: 1fr;
    }
  }
}
</style>
