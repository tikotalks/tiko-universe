<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBemm } from 'bemm'
import { Popup } from '@sil/ui'
import { TikoAppShell, TikoSettingsPanel } from '@tiko/ui'
import TalkSentenceBar from './components/TalkSentenceBar.vue'
import TalkWordCloud from './components/TalkWordCloud.vue'
import { useTalkApp } from './composables/useTalkApp'
import { appConfig } from './appConfig'

const bemm = useBemm('talk-screen', { return: 'string', includeBaseClass: true })

const talk = useTalkApp()

const headerActions = computed(() => talk.parentMode.value ? [
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: talk.settingsOpen.value }
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
    :app-color="appConfig.appColor"
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
          :color-mode="talk.colorMode.value"
          @update:language="talk.language.value = $event"
          @update:color-mode="talk.colorMode.value = $event"
        />
        <p :class="bemm('settings-status')">
          Identity: {{ talk.identityStatus.value === 'ready' ? 'ready' : talk.identityStatus.value }}
          <span v-if="talk.identityError.value">({{ talk.identityError.value }})</span>
        </p>
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
