<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Button, Icon, InputText } from '@sil/ui'
import { useBemm } from 'bemm'
import { useRouter } from 'vue-router'
import { tikoColors } from '@tiko/ui'
import { tikoLanguageOptions } from '@tiko/i18n'
import { useAdminAuth } from '../composables/useAdminAuth'
import { useAdminAppConfig, type TikoGeneralSettings } from '../composables/useAdminAppConfig'

const bemm = useBemm('settings-page', { return: 'string', includeBaseClass: true })
const router = useRouter()
const { config, logout } = useAdminAuth()
const settingsApi = useAdminAppConfig()

const defaultLanguageCodes = tikoLanguageOptions.map((language) => language.value)
const settingsDraft = reactive<TikoGeneralSettings>({ supportedLanguages: defaultLanguageCodes })
const settingsVersion = ref(0)
const settingsUpdatedAt = ref<string | null>(null)
const settingsDirty = ref(false)
const settingsSavedMessage = ref<string | null>(null)
const languageToAdd = ref('')
const customLocale = ref('')

const endpoints = computed(() => [
  { label: 'App API', value: config.value?.appApiUrl ?? 'Not loaded' },
  { label: 'Generation API', value: config.value?.generationApiUrl ?? 'Not loaded' },
  { label: 'Media API', value: config.value?.mediaApiUrl ?? 'Not loaded' },
  { label: 'Communication API', value: config.value?.communicationApiUrl ?? 'Not loaded' },
])

const selectedLanguages = computed(() => normalizeLanguages(settingsDraft.supportedLanguages, defaultLanguageCodes))
const languageOptions = computed(() => {
  const selected = new Set(selectedLanguages.value)
  return allLanguageOptions.value.filter((language) => !selected.has(language.value))
})
const allLanguageOptions = computed(() => {
  const supported = new Set([...defaultLanguageCodes, ...selectedLanguages.value, ...commonLocaleOptions])
  return Array.from(supported)
    .map((code) => languageOption(code))
    .sort((a, b) => a.label.localeCompare(b.label))
})
const supportedColors = computed(() => tikoColors.map((color) => ({ name: color.name, hex: color.hex })))
const constantsPreview = computed(() => ({
  supportedLanguages: selectedLanguages.value,
  supportedColors: supportedColors.value,
}))

const commonLocaleOptions = [
  'af', 'ar', 'bg', 'ca', 'cs', 'da', 'de-AT', 'de-CH', 'el', 'en-AU', 'en-CA', 'en-GB',
  'en-US', 'es-ES', 'es-MX', 'et', 'fi', 'fr-BE', 'fr-CA', 'fr-FR', 'he', 'hi', 'hr',
  'hu', 'id', 'is', 'lt', 'lv', 'nb', 'pl', 'pt-BR', 'pt-PT', 'ro', 'ru', 'sk', 'sl',
  'sr', 'sv', 'th', 'tr', 'uk', 'vi',
]

function normalizeLanguages(value: unknown, fallback: string[] = []): string[] {
  const source = Array.isArray(value) ? value : fallback
  return Array.from(new Set(source.map((item) => typeof item === 'string' ? normalizeLanguageTag(item) : '').filter(Boolean)))
}

function normalizeLanguageTag(value: string): string {
  const cleaned = value.trim().replace(/_/g, '-')
  if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(cleaned)) return ''
  return cleaned.split('-').map((part, index) => index === 0 ? part.toLowerCase() : part.length === 2 ? part.toUpperCase() : part).join('-')
}

function languageOption(code: string) {
  const normalized = normalizeLanguageTag(code)
  const preset = tikoLanguageOptions.find((language) => language.value === normalized)
  if (preset) return { value: normalized, label: preset.label, nativeLabel: preset.nativeLabel }
  const language = normalized.split('-')[0]
  const region = normalized.split('-')[1]
  const display = new Intl.DisplayNames(['en'], { type: 'language' }).of(language) ?? normalized
  const native = new Intl.DisplayNames([language], { type: 'language' }).of(language) ?? display
  const regionLabel = region ? new Intl.DisplayNames(['en'], { type: 'region' }).of(region) : null
  return {
    value: normalized,
    label: regionLabel ? `${display} (${regionLabel})` : display,
    nativeLabel: native,
  }
}

function languageLabel(code: string): string {
  const option = languageOption(code)
  return `${option.label} (${option.nativeLabel})`
}

function markSettingsDirty() {
  settingsDirty.value = true
  settingsSavedMessage.value = null
}

function addSelectedLanguage() {
  const code = normalizeLanguageTag(languageToAdd.value)
  if (!code) return
  settingsDraft.supportedLanguages = [...selectedLanguages.value, code]
  languageToAdd.value = ''
  markSettingsDirty()
}

function addCustomLocale() {
  const code = normalizeLanguageTag(customLocale.value)
  if (!code) return
  settingsDraft.supportedLanguages = [...selectedLanguages.value, code]
  customLocale.value = ''
  markSettingsDirty()
}

function removeLanguage(code: string) {
  settingsDraft.supportedLanguages = selectedLanguages.value.filter((language) => language !== code)
  markSettingsDirty()
}

async function loadSettings() {
  settingsSavedMessage.value = null
  try {
    const payload = await settingsApi.readTikoSettings()
    Object.assign(settingsDraft, {
      ...payload.settings,
      supportedLanguages: normalizeLanguages(payload.settings.supportedLanguages, defaultLanguageCodes),
    })
    settingsVersion.value = payload.version
    settingsUpdatedAt.value = payload.updatedAt
    settingsDirty.value = false
  } catch {
    // surfaced through settingsApi.error
  }
}

async function saveSettings() {
  settingsSavedMessage.value = null
  try {
    const payload = await settingsApi.writeTikoSettings(
      {
        ...settingsDraft,
        supportedLanguages: selectedLanguages.value,
        supportedColors: supportedColors.value,
      },
      settingsVersion.value,
    )
    Object.assign(settingsDraft, payload.settings)
    settingsVersion.value = payload.version
    settingsUpdatedAt.value = payload.updatedAt
    settingsDirty.value = false
    settingsSavedMessage.value = 'Saved global Tiko settings.'
  } catch {
    // surfaced through settingsApi.error
  }
}

function signOut() {
  logout()
  router.push('/')
}

onMounted(loadSettings)
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div>
        <h1 :class="bemm('title')">Settings</h1>
        <p :class="bemm('subtitle')">Global Tiko settings and constants.</p>
      </div>
      <div :class="bemm('header-actions')">
        <Button variant="outline" :loading="settingsApi.loading.value" :disabled="settingsApi.loading.value" @click="loadSettings">
          Reload
        </Button>
        <Button :loading="settingsApi.saving.value" :disabled="settingsApi.saving.value || !settingsDirty" @click="saveSettings">
          Save settings
        </Button>
      </div>
    </header>

    <p v-if="settingsApi.error.value" :class="bemm('error')">{{ settingsApi.error.value }}</p>
    <p v-if="settingsSavedMessage" :class="bemm('success')">{{ settingsSavedMessage }}</p>

    <div :class="bemm('layout')">
      <article :class="bemm('card')">
        <div :class="bemm('card-header')">
          <Icon name="ui/speech-balloon" size="small" />
          <div>
            <h2 :class="bemm('card-title')">Supported Languages</h2>
            <p :class="bemm('card-meta')">Version {{ settingsVersion }} · Updated {{ settingsUpdatedAt || 'never' }}</p>
          </div>
        </div>

        <div :class="bemm('language-list')">
          <div v-for="language in selectedLanguages" :key="language" :class="bemm('language-row')">
            <span :class="bemm('language-code')">{{ language }}</span>
            <span :class="bemm('language-name')">{{ languageLabel(language) }}</span>
            <button type="button" :class="bemm('icon-button')" :aria-label="`Remove ${language}`" @click="removeLanguage(language)">
              <Icon name="ui/multiply-s" size="small" />
            </button>
          </div>
        </div>

        <div :class="bemm('add-row')">
          <label :class="bemm('select-label')">
            <span>Add language</span>
            <select v-model="languageToAdd" :class="bemm('select')" @change="addSelectedLanguage">
              <option value="">Select language</option>
              <option v-for="language in languageOptions" :key="language.value" :value="language.value">
                {{ language.label }} · {{ language.nativeLabel }} · {{ language.value }}
              </option>
            </select>
          </label>
        </div>

        <div :class="bemm('add-row')">
          <InputText
            v-model="customLocale"
            label="Locale"
            placeholder="en-GB, pt-BR, fr-CA"
            @keyup.enter="addCustomLocale"
          />
          <Button variant="outline" :disabled="!normalizeLanguageTag(customLocale)" @click="addCustomLocale">
            Add
          </Button>
        </div>
      </article>

      <article :class="bemm('card')">
        <div :class="bemm('card-header')">
          <Icon name="ui/color-swatches" size="small" />
          <div>
            <h2 :class="bemm('card-title')">Supported Colors</h2>
            <p :class="bemm('card-meta')">From the shared `tikoColors` const.</p>
          </div>
        </div>
        <div :class="bemm('color-grid')">
          <div v-for="color in supportedColors" :key="color.name" :class="bemm('color-row-item')">
            <span :class="bemm('color-swatch')" :style="{ background: color.hex }"></span>
            <span :class="bemm('color-name')">{{ color.name }}</span>
            <code>{{ color.hex }}</code>
          </div>
        </div>
      </article>

      <article :class="bemm('card')">
        <div :class="bemm('card-header')">
          <Icon name="ui/code-brackets" size="small" />
          <div>
            <h2 :class="bemm('card-title')">Tiko Constants</h2>
            <p :class="bemm('card-meta')">Current global values saved for all apps.</p>
          </div>
        </div>
        <pre :class="bemm('constants')">{{ JSON.stringify(constantsPreview, null, 2) }}</pre>
      </article>

      <article :class="bemm('card')">
        <div :class="bemm('card-header')">
          <Icon name="ui/cog" size="small" />
          <h2 :class="bemm('card-title')">Connected Services</h2>
        </div>
        <dl :class="bemm('endpoints')">
          <div v-for="endpoint in endpoints" :key="endpoint.label" :class="bemm('endpoint')">
            <dt>{{ endpoint.label }}</dt>
            <dd>{{ endpoint.value }}</dd>
          </div>
        </dl>
      </article>

      <article :class="bemm('card')">
        <div :class="bemm('card-header')">
          <Icon name="ui/user" size="small" />
          <h2 :class="bemm('card-title')">Session</h2>
        </div>
        <p :class="bemm('copy')">Sign out clears the local admin session and identity bootstrap stored in this browser.</p>
        <div :class="bemm('actions')">
          <Button variant="outline" @click="router.push('/profile')">View profile</Button>
          <Button @click="signOut">Sign out</Button>
        </div>
      </article>
    </div>
  </section>
</template>

<style lang="scss">
.settings-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-m);
  }

  &__header-actions,
  &__actions,
  &__add-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-s);
  }

  &__title {
    color: var(--admin-text);
    font-size: var(--font-size-xl);
    font-weight: 700;
  }

  &__subtitle,
  &__copy,
  &__card-meta {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 22), 1fr));
    gap: var(--space-s);
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
    background: var(--admin-surface);
    border: 0;
    border-radius: var(--admin-card-radius);
    padding: var(--space-m);
  }

  &__card-header {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    color: var(--admin-text);
  }

  &__card-title {
    font-size: var(--font-size-m);
    font-weight: 700;
  }

  &__language-list,
  &__color-grid,
  &__endpoints {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin: 0;
  }

  &__language-row,
  &__color-row-item,
  &__endpoint {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-s);
    border-radius: var(--border-radius-xs);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 6%);
  }

  &__language-code,
  &__color-name {
    color: var(--admin-text);
    font-weight: 700;
  }

  &__language-code,
  &__color-row-item code,
  &__constants,
  &__endpoint dd {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  &__language-name {
    min-width: 0;
    color: var(--admin-text-muted);
    overflow-wrap: anywhere;
  }

  &__icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: var(--border-radius-xs);
    background: transparent;
    color: var(--admin-text-muted);
    cursor: pointer;
  }

  &__select-label {
    display: flex;
    flex: 1 1 16rem;
    flex-direction: column;
    gap: calc(var(--space-xs) / 2);
    color: var(--admin-text);
    font-size: var(--font-size-s);
    font-weight: 700;
  }

  &__select {
    width: 100%;
    min-height: 2.75rem;
    border: 1px solid color-mix(in srgb, var(--admin-text), transparent 82%);
    border-radius: var(--border-radius-xs);
    background: var(--admin-surface);
    color: var(--admin-text);
    padding: 0 var(--space-s);
  }

  &__color-swatch {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--admin-text), transparent 78%);
  }

  &__constants {
    max-height: 24rem;
    overflow: auto;
    margin: 0;
    border-radius: var(--border-radius-xs);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 6%);
    color: var(--admin-text);
    padding: var(--space-s);
    font-size: var(--font-size-xs);
  }

  &__endpoint {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    dt {
      color: var(--admin-text-muted);
      font-size: var(--font-size-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    dd {
      margin: 0;
      color: var(--admin-text);
      font-size: var(--font-size-s);
      overflow-wrap: anywhere;
    }
  }

  &__error,
  &__success {
    border-radius: var(--border-radius-xs);
    padding: var(--space-s);
    font-size: var(--font-size-s);
  }

  &__error {
    background: color-mix(in srgb, #e03131, transparent 85%);
    color: #e03131;
  }

  &__success {
    background: color-mix(in srgb, #2f9e44, transparent 85%);
    color: #2f9e44;
  }
}
</style>
