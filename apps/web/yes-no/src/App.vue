<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  TikoAppShell,
  TikoChoiceGrid,
  TikoSettingsPanel,
  TikoSetupCard,
  createTikoChoice,
  createTikoTtsClient,
  type TikoColorMode
} from '@tiko/ui'
import './styles.css'

const language = ref('en')
const colorMode = ref<TikoColorMode>('light')
const latestAnswer = ref('')
const settingsOpen = ref(false)
const sentence = ref('Do you want to go eat?')
const tts = createTikoTtsClient()

const labels = computed(() => {
  if (language.value === 'nl') return { yes: 'Ja', no: 'Nee' }
  if (language.value === 'fr') return { yes: 'Oui', no: 'Non' }
  if (language.value === 'es') return { yes: 'Sí', no: 'No' }
  return { yes: 'Yes', no: 'No' }
})

const choices = computed(() => [
  createTikoChoice({ id: 'yes', label: labels.value.yes, tone: 'primary', speechText: labels.value.yes, icon: '👍' }),
  createTikoChoice({ id: 'no', label: labels.value.no, tone: 'secondary', speechText: labels.value.no, icon: '👎' })
])

const headerActions = computed(() => [
  { id: 'history', label: 'History', icon: 'ui/clock' },
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value }
])

watch(colorMode, (mode) => {
  document.documentElement.dataset.colorMode = mode
  document.documentElement.dataset.theme = mode
}, { immediate: true })

async function speak(text: string) {
  await tts.speak({ text, language: language.value, provider: 'auto' })
}

async function answer(id: string) {
  const choice = choices.value.find((item) => item.id === id)
  if (!choice) return
  latestAnswer.value = choice.label
  await speak(choice.speechText ?? choice.label)
}

function headerAction(id: string) {
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
}
</script>

<template>
  <TikoAppShell
    app-name="Yes No"
    eyebrow="optional setup · no login wall"
    app-icon="👍"
    :actions="headerActions"
    @header-action="headerAction"
  >
    <section class="yes-no-app" :data-color-mode="colorMode">
      <p class="yes-no-app__prompt">{{ sentence }}</p>
      <button class="yes-no-app__speak" type="button" aria-label="Speak sentence" @click="speak(sentence)">🔊</button>
      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
      />
      <TikoChoiceGrid :choices="choices" @answer="answer" />
      <p v-if="latestAnswer" class="yes-no-app__latest">Latest answer: {{ latestAnswer }}</p>
      <TikoSetupCard
        title="Make this device recoverable"
        description="Setup user is optional and can be added later without blocking play."
        action-label="Setup user"
      />
    </section>
  </TikoAppShell>
</template>
