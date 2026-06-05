<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { TikoSettingsPanel } from '@tiko/ui'
import TalkCategoryDock from './components/TalkCategoryDock.vue'
import TalkHeader from './components/TalkHeader.vue'
import TalkSentenceBar from './components/TalkSentenceBar.vue'
import TalkWordCloud from './components/TalkWordCloud.vue'
import { useTalkApp } from './composables/useTalkApp'

const appName = 'Talk'
const talk = useTalkApp()

const leftCategories = computed(() => talk.shortcuts.value.slice(0, Math.ceil(talk.shortcuts.value.length / 2)))
const rightCategories = computed(() => talk.shortcuts.value.slice(Math.ceil(talk.shortcuts.value.length / 2)))
const statusMessage = computed(() => {
  if (talk.speechError.value) return `Speech could not start: ${talk.speechError.value}`
  if (talk.speechStatus.value === 'fallback') return 'Using the device voice while cached audio is unavailable.'
  return talk.statusText.value
})

onMounted(() => {
  void talk.bootstrapIdentity()
  void talk.start()
})
</script>

<template>
  <main class="talk-screen" :data-color-mode="talk.colorMode.value">
    <TalkHeader :app-name="appName" @toggle-settings="talk.settingsOpen.value = !talk.settingsOpen.value" />

    <section v-if="talk.settingsOpen.value" class="talk-settings" aria-label="Talk settings">
      <TikoSettingsPanel
        :language="talk.language.value"
        :color-mode="talk.colorMode.value"
        @update:language="talk.language.value = $event"
        @update:color-mode="talk.colorMode.value = $event"
      />
      <p class="talk-settings__status">
        Identity: {{ talk.identityStatus.value === 'ready' ? 'ready' : talk.identityStatus.value }}
        <span v-if="talk.identityError.value">({{ talk.identityError.value }})</span>
      </p>
    </section>

    <TalkSentenceBar
      :words="talk.strip.words.value"
      :can-speak="talk.canSpeak.value"
      :speech-status="talk.speechStatus.value"
      :word-icon="talk.wordIcon"
      @remove-word="talk.removeWord"
      @remove-last-word="talk.removeLastWord"
      @speak="talk.speakSentence"
    />

    <p
      v-if="statusMessage"
      class="talk-screen__status"
      :class="{ 'talk-screen__status--error': Boolean(talk.speechError.value) || talk.sentenceApi.mode.value === 'error' }"
    >
      {{ statusMessage }}
    </p>

    <section class="talk-stage" aria-label="Choose words">
      <TalkCategoryDock
        :categories="leftCategories"
        :active-category-id="talk.activeCategoryId.value"
        side="left"
        @select-category="talk.selectCategory"
      />

      <TalkWordCloud :words="talk.cloudWords.value" @select-word="talk.selectWordNode" />

      <TalkCategoryDock
        :categories="rightCategories"
        :active-category-id="talk.activeCategoryId.value"
        side="right"
        @select-category="talk.selectCategory"
      />
    </section>
  </main>
</template>
