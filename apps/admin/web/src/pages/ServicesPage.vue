<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'
import { useAdminServices, type SpeechProvider, type SpeechServiceConfig } from '../composables/useAdminServices'

const bemm = useBemm('services-page', { return: 'string', includeBaseClass: true })
const { loading, saving, error, readSpeech, writeSpeech } = useAdminServices()

const providerOptions: Array<{ value: SpeechProvider; label: string }> = [
  { value: 'narakeet', label: 'Narakeet' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
]

const settings = ref<SpeechServiceConfig>({
  defaultProvider: 'narakeet',
  models: {},
  voices: { narakeet: {}, openai: {}, elevenlabs: {} },
})
const defaults = ref<Record<string, string>>({})
const version = ref(0)
const updatedAt = ref<string | null>(null)
const query = ref('')
const savedMessage = ref('')

const localeRows = computed(() => {
  const q = query.value.trim().toLowerCase()
  return Object.entries(defaults.value)
    .map(([locale, defaultVoice]) => ({
      locale,
      defaultVoice,
      voice: settings.value.voices.narakeet?.[locale] ?? defaultVoice,
    }))
    .filter(row => !q || row.locale.includes(q) || row.defaultVoice.toLowerCase().includes(q) || row.voice.toLowerCase().includes(q))
})

async function load() {
  const response = await readSpeech()
  settings.value = cloneSettings(response.settings)
  defaults.value = response.defaults.narakeetVoices
  version.value = response.version
  updatedAt.value = response.updatedAt
}

function cloneSettings(value: SpeechServiceConfig): SpeechServiceConfig {
  return {
    defaultProvider: value.defaultProvider,
    models: { ...value.models },
    voices: {
      openai: { ...value.voices.openai },
      elevenlabs: { ...value.voices.elevenlabs },
      narakeet: { ...value.voices.narakeet },
    },
  }
}

function updateProvider(value: string) {
  if (value === 'openai' || value === 'elevenlabs' || value === 'narakeet') {
    settings.value.defaultProvider = value
  }
}

function updateModel(provider: SpeechProvider, value: string) {
  settings.value.models = { ...settings.value.models, [provider]: value.trim() }
}

function updateNarakeetVoice(locale: string, voice: string) {
  settings.value.voices = {
    ...settings.value.voices,
    narakeet: { ...settings.value.voices.narakeet, [locale]: voice.trim() },
  }
}

function resetNarakeetVoice(locale: string) {
  const next = { ...settings.value.voices.narakeet }
  next[locale] = defaults.value[locale]
  settings.value.voices = { ...settings.value.voices, narakeet: next }
}

async function save() {
  savedMessage.value = ''
  const response = await writeSpeech(settings.value, version.value)
  version.value = response.version
  updatedAt.value = response.updatedAt
  savedMessage.value = 'Saved'
}

onMounted(() => { void load() })
</script>

<template>
  <main :class="bemm('')">
    <header :class="bemm('header')">
      <div>
        <h1 :class="bemm('title')">Services</h1>
        <p :class="bemm('subtitle')">Manage provider-backed platform services.</p>
      </div>
      <Button :loading="saving" :disabled="loading || saving" @click="save">Save</Button>
    </header>

    <p v-if="error" :class="bemm('error')">{{ error }}</p>
    <p v-if="savedMessage" :class="bemm('success')">{{ savedMessage }}</p>

    <section :class="bemm('section')">
      <header :class="bemm('section-header')">
        <div>
          <h2 :class="bemm('section-title')">Text to speech</h2>
          <p :class="bemm('section-meta')">Runtime defaults used by Atlas speech synthesis.</p>
        </div>
        <span v-if="updatedAt" :class="bemm('timestamp')">{{ updatedAt }}</span>
      </header>

      <div :class="bemm('grid')">
        <label :class="bemm('field')">
          <span>Provider</span>
          <select :value="settings.defaultProvider" :class="bemm('select')" @change="updateProvider(($event.target as HTMLSelectElement).value)">
            <option v-for="provider in providerOptions" :key="provider.value" :value="provider.value">
              {{ provider.label }}
            </option>
          </select>
        </label>

        <InputText
          label="OpenAI model"
          :model-value="settings.models.openai ?? ''"
          placeholder="tts-1"
          @update:model-value="(value: string) => updateModel('openai', value)"
        />
        <InputText
          label="ElevenLabs model"
          :model-value="settings.models.elevenlabs ?? ''"
          placeholder="eleven_multilingual_v2"
          @update:model-value="(value: string) => updateModel('elevenlabs', value)"
        />
        <InputText
          label="Narakeet model"
          :model-value="settings.models.narakeet ?? ''"
          placeholder="narakeet-mp3"
          @update:model-value="(value: string) => updateModel('narakeet', value)"
        />
      </div>
    </section>

    <section :class="bemm('section')">
      <header :class="bemm('section-header')">
        <div>
          <h2 :class="bemm('section-title')">Narakeet voices</h2>
          <p :class="bemm('section-meta')">{{ localeRows.length }} locales</p>
        </div>
        <InputText
          :class="bemm('search')"
          label="Filter"
          :model-value="query"
          placeholder="nl, mt, raymond"
          @update:model-value="(value: string) => { query = value }"
        />
      </header>

      <div :class="bemm('voice-list')">
        <div :class="[bemm('voice-row'), bemm('voice-row--header')]">
          <span>Locale</span>
          <span>Voice</span>
          <span>Default</span>
          <span></span>
        </div>
        <div v-for="row in localeRows" :key="row.locale" :class="bemm('voice-row')">
          <strong>{{ row.locale }}</strong>
          <InputText
            :model-value="row.voice"
            :label="`Voice ${row.locale}`"
            @update:model-value="(value: string) => updateNarakeetVoice(row.locale, value)"
          />
          <span :class="bemm('default-voice')">{{ row.defaultVoice }}</span>
          <Button variant="ghost" size="small" @click="resetNarakeetVoice(row.locale)">Reset</Button>
        </div>
      </div>
    </section>
  </main>
</template>

<style lang="scss">
.services-page {
  padding: 24px;
  display: grid;
  gap: 20px;

  &__header,
  &__section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  &__title,
  &__section-title {
    margin: 0;
  }

  &__subtitle,
  &__section-meta,
  &__timestamp,
  &__default-voice {
    margin: 4px 0 0;
    color: var(--color-foreground-secondary, #667085);
    font-size: 0.9rem;
  }

  &__section {
    display: grid;
    gap: 16px;
    padding: 18px;
    border: 1px solid var(--color-border, #d0d5dd);
    border-radius: 8px;
    background: var(--color-background, #fff);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }

  &__field {
    display: grid;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  &__select {
    min-height: 42px;
    border: 1px solid var(--color-border, #d0d5dd);
    border-radius: 8px;
    padding: 0 12px;
    background: var(--color-background, #fff);
  }

  &__search {
    width: min(320px, 100%);
  }

  &__voice-list {
    display: grid;
    gap: 1px;
    border: 1px solid var(--color-border, #d0d5dd);
    border-radius: 8px;
    overflow: hidden;
  }

  &__voice-row {
    display: grid;
    grid-template-columns: 96px minmax(180px, 1fr) minmax(120px, 180px) 88px;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--color-background, #fff);
  }

  &__voice-row--header {
    background: var(--color-background-subtle, #f8f9fb);
    color: var(--color-foreground-secondary, #667085);
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  &__error {
    color: #b42318;
  }

  &__success {
    color: #027a48;
  }
}

@media (max-width: 760px) {
  .services-page {
    padding: 16px;

    &__header,
    &__section-header {
      display: grid;
    }

    &__voice-row {
      grid-template-columns: 1fr;
    }

    &__voice-row--header {
      display: none;
    }
  }
}
</style>
