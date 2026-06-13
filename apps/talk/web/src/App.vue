<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBemm } from 'bemm'
import { Popup } from '@sil/ui'
import { TikoAppShell, TikoSettingsPanel } from '@tiko/ui'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguageOptions, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import TalkSentenceBar from './components/TalkSentenceBar.vue'
import TalkWordCloud from './components/TalkWordCloud.vue'
import { useTalkApp } from './composables/useTalkApp'
import { appConfig } from './appConfig'

const bemm = useBemm('talk-screen', { return: 'string', includeBaseClass: true })

const talk = useTalkApp()
const i18n = createI18n({ app: 'talk', language: defaultLanguage })

function toLanguage(value: string): TikoLanguage {
  return tikoLanguages.includes(value as TikoLanguage) ? value as TikoLanguage : defaultLanguage
}

const labels = computed(() => {
  i18n.setLanguage(toLanguage(talk.language.value))
  return {
    settings: i18n.t(tikoI18nKeys.common.settings),
    // TODO(i18n): promote search/add labels into the shared i18n key registry.
    search: 'Search words',
    add: 'Add',
    settingsPanel: {
      settings: i18n.t(tikoI18nKeys.common.settings),
      language: i18n.t(tikoI18nKeys.common.language),
      colorMode: i18n.t(tikoI18nKeys.common.colorMode),
      light: i18n.t(tikoI18nKeys.common.colorModeOptions.light),
      dark: i18n.t(tikoI18nKeys.common.colorModeOptions.dark),
      system: i18n.t(tikoI18nKeys.common.colorModeOptions.system),
    },
  }
})

const trimmedFilter = computed(() => talk.boardFilter.value.trim())

function onSearch(value: string) {
  talk.applyBoardFilter(value)
}

async function onAddWord() {
  const text = trimmedFilter.value
  if (!text) return
  await talk.addCustomWord(text)
  talk.clearBoardFilter()
}

const headerActions = computed(() => talk.parentMode.value ? [
  { id: 'settings', label: labels.value.settings, icon: 'ui/settings-dual', active: talk.settingsOpen.value }
] : [])

function openAccount() {
  talk.settingsOpen.value = true
  void talk.bootstrapIdentity()
}

onMounted(() => {
  void talk.bootstrapIdentity()
  void talk.start()
})
</script>

<template>
  <TikoAppShell
    :app-name="appConfig.title"
    :app-icon="appConfig.appIcon"
    :app-icon-image-url="appConfig.appIconImageUrl"
    :app-icon-media-category="appConfig.appIconMediaCategory"
    :app-color="appConfig.appColor"
    :theme-color="appConfig.themeColor"
    avatar="ui/avatar"
    :actions="headerActions"
    @header-action="(id) => { if (id === 'settings') talk.settingsOpen.value = !talk.settingsOpen.value }"
    @avatar-click="talk.runtime.handleAvatarClick"
  >
    <div :class="bemm('')" :data-color-mode="talk.colorMode.value">
      <Popup />
      <section v-if="talk.settingsOpen.value" :class="bemm('settings')" aria-label="Talk settings">
        <TikoSettingsPanel
          :language="talk.language.value"
          :languages="tikoLanguageOptions"
          :color-mode="talk.colorMode.value"
          :labels="labels.settingsPanel"
          @update:language="talk.language.value = $event"
          @update:color-mode="talk.colorMode.value = $event"
        />
        <p :class="bemm('settings-status')">
          Identity: {{ talk.identityStatus.value === 'ready' ? 'ready' : talk.identityStatus.value }}
          <span v-if="talk.identityError.value">({{ talk.identityError.value }})</span>
        </p>
      </section>

      <section :class="bemm('toolbar')" aria-label="Find or add words">
        <input
          :class="bemm('search')"
          type="search"
          inputmode="search"
          :value="talk.boardFilter.value"
          :placeholder="labels.search"
          :aria-label="labels.search"
          @input="onSearch(($event.target as HTMLInputElement).value)"
        >
        <button
          v-if="trimmedFilter"
          :class="bemm('add-word')"
          type="button"
          @click="onAddWord"
        >
          {{ labels.add }} “{{ trimmedFilter }}”
        </button>
      </section>

      <section :class="bemm('stage')" aria-label="Choose words">
        <TalkWordCloud :words="talk.cloudWords.value" @select-word="talk.selectWordNode" />
      </section>

      <div :class="bemm('sentence')">
        <TalkSentenceBar
          :words="talk.strip.words.value"
          :can-speak="talk.canSpeak.value"
          :speech-status="talk.speechStatus.value"
          :word-icon="talk.wordIcon"
          @remove-word="talk.removeWord"
          @remove-last-word="talk.removeLastWord"
          @speak="talk.speakSentence"
        />
      </div>
    </div>
  </TikoAppShell>
</template>

<style lang="scss">
.tiko-app-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;

  &__main {
    flex: 1;
    min-height: 0;
    max-width: none !important;
    padding-inline: 0 !important;
    padding-block: 0 !important;
    overflow: hidden;
  }
}

.talk-screen {
  --color-background: #fbf7ef;
  --color-foreground: #202431;
  --talk-ink: var(--color-foreground);
  --talk-muted: color-mix(in srgb, var(--color-foreground) 55%, transparent);
  --talk-bg: #17131c;
  --talk-orange: #ff7f18;
  --talk-orange-dark: color-mix(in srgb, var(--talk-orange) 82%, var(--color-foreground));
  --talk-shadow: color-mix(in srgb, var(--color-foreground) 14%, transparent);
  --talk-shadow-soft: color-mix(in srgb, var(--color-foreground) 9%, transparent);

  position: relative;
  flex: 1 1 auto;
  display: flex;
  height: 100%;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  color: var(--talk-ink);
  background: var(--talk-bg);

  &__stage {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: flex;
    min-height: 0;
    width: 100%;
    height: 100%;
  }

  &__toolbar {
    position: absolute;
    z-index: 15;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
    align-items: center;
    width: min(32rem, calc(100vw - 2rem));
  }

  &__search {
    flex: 1;
    min-height: 2.75rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 1.5rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--talk-ink);
    background: rgba(255, 252, 245, 0.96);
    box-shadow: 0 0.6rem 1.8rem var(--talk-shadow);

    &:focus-visible {
      outline: 3px solid var(--talk-orange);
      outline-offset: 2px;
    }
  }

  &__add-word {
    min-height: 2.75rem;
    padding: 0.5rem 1.1rem;
    border: none;
    border-radius: 1.5rem;
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-background, #fff);
    background: var(--talk-orange);
    box-shadow: 0 0.6rem 1.8rem var(--talk-shadow);
    cursor: pointer;
    white-space: nowrap;

    &:focus-visible {
      outline: 3px solid var(--talk-ink);
      outline-offset: 2px;
    }
  }

  &__sentence {
    position: absolute;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    white-space: nowrap;
  }

  &__settings {
    position: absolute;
    z-index: 20;
    top: 1rem;
    right: 1rem;
    max-width: min(26rem, calc(100vw - 2rem));
    padding: 1rem;
    border-radius: 1.5rem;
    background: rgba(255, 252, 245, 0.96);
    box-shadow: 0 1.2rem 3rem var(--talk-shadow);
  }

  &__settings-status {
    margin: 0;
    color: var(--talk-muted);
    font-weight: 800;
  }
}

@media (max-width: 760px) {
  .talk-screen {
    &__sentence {
      bottom: 0.75rem;
      left: 1rem;
      right: 1rem;
      transform: none;
      white-space: normal;
    }
  }
}
</style>
