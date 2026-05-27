<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button, Card, Colors, InputTextArea } from '@sil/ui'
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

const storageKey = 'tiko:yes-no'
const defaultSentence = 'Do you want to go eat?'

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  sentence?: string
}

function loadState(): PersistedState {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as PersistedState
  } catch {
    return {}
  }
}

const stored = loadState()
const language = ref(stored.language ?? 'en')
const colorMode = ref<TikoColorMode>(stored.colorMode ?? 'system')
const latestAnswer = ref('')
const answerHistory = ref<string[]>([])
const settingsOpen = ref(false)
const historyOpen = ref(false)
const sentence = ref(stored.sentence ?? defaultSentence)
const speakStatus = ref<'idle' | 'speaking' | 'fallback' | 'error'>('idle')
const setupStatus = ref('')
const tts = createTikoTtsClient()

const labels = computed(() => {
  if (language.value === 'nl') return { yes: 'Ja', no: 'Nee', latest: 'Laatste antwoord', fallback: 'Browser voice used' }
  if (language.value === 'fr') return { yes: 'Oui', no: 'Non', latest: 'Dernière réponse', fallback: 'Voix du navigateur utilisée' }
  if (language.value === 'es') return { yes: 'Sí', no: 'No', latest: 'Última respuesta', fallback: 'Voz del navegador usada' }
  return { yes: 'Yes', no: 'No', latest: 'Latest answer', fallback: 'Browser voice used' }
})

const choices = computed(() => [
  createTikoChoice({ id: 'yes', label: labels.value.yes, tone: 'primary', speechText: labels.value.yes, icon: '👍' }),
  createTikoChoice({ id: 'no', label: labels.value.no, tone: 'secondary', speechText: labels.value.no, icon: '👎' })
])

const headerActions = computed(() => [
  { id: 'history', label: 'History', icon: 'ui/clock', active: historyOpen.value },
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value }
])

const canSpeakSentence = computed(() => sentence.value.trim().length > 0)

function resolveColorMode(mode: TikoColorMode) {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

watch(colorMode, (mode) => {
  const effective = resolveColorMode(mode)
  document.documentElement.dataset.colorMode = effective
  document.documentElement.dataset.theme = effective
}, { immediate: true })

watch([language, colorMode, sentence], () => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify({
    language: language.value,
    colorMode: colorMode.value,
    sentence: sentence.value
  }))
}, { immediate: true })

async function speak(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  speakStatus.value = 'speaking'
  try {
    const result = await tts.speak({ text: trimmed, language: language.value, provider: 'auto' })
    speakStatus.value = result.metadata?.fallbackUsed ? 'fallback' : 'idle'
  } catch {
    speakStatus.value = 'error'
  }
}

async function answer(id: string) {
  const choice = choices.value.find((item) => item.id === id)
  if (!choice) return
  latestAnswer.value = choice.label
  answerHistory.value = [choice.label, ...answerHistory.value].slice(0, 6)
  await speak(choice.speechText ?? choice.label)
}

function headerAction(id: string) {
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
  if (id === 'history') historyOpen.value = !historyOpen.value
}

function resetSentence() {
  sentence.value = defaultSentence
}

function setupUser() {
  setupStatus.value = 'Setup user flow will attach a caregiver email later — play remains available now.'
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
      <Card class="yes-no-app__sentence-card" variant="elevated" :color="Colors.BACKGROUND">
        <label class="yes-no-app__sentence-label" for="yes-no-sentence">Sentence</label>
        <InputTextArea
          id="yes-no-sentence"
          v-model="sentence"
          class="yes-no-app__sentence-input"
          :rows="2"
          :maxlength="160"
          aria-label="Sentence to speak"
        />
        <div class="yes-no-app__sentence-actions">
          <Button class="yes-no-app__speak" variant="primary" icon="media/volume-iii" icon-only :disabled="!canSpeakSentence" aria-label="Speak sentence" @click="speak(sentence)" />
          <Button class="yes-no-app__reset" variant="primary" @click="resetSentence">Reset</Button>
        </div>
      </Card>

      <p v-if="speakStatus === 'fallback'" class="yes-no-app__status" role="status">{{ labels.fallback }}</p>
      <p v-if="speakStatus === 'error'" class="yes-no-app__status yes-no-app__status--error" role="alert">Could not speak yet. Try again.</p>

      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
      />

      <aside v-if="historyOpen" class="yes-no-app__history" aria-label="Answer history">
        <strong>History</strong>
        <p v-if="answerHistory.length === 0">No answers yet.</p>
        <ol v-else>
          <li v-for="(item, index) in answerHistory" :key="`${item}-${index}`">{{ item }}</li>
        </ol>
      </aside>

      <TikoChoiceGrid :choices="choices" @answer="answer" />
      <p v-if="latestAnswer" class="yes-no-app__latest">{{ labels.latest }}: {{ latestAnswer }}</p>
      <TikoSetupCard
        title="Make this device recoverable"
        description="Setup user is optional and can be added later without blocking play."
        action-label="Setup user"
        @setup="setupUser"
      />
      <p v-if="setupStatus" class="yes-no-app__status">{{ setupStatus }}</p>
    </section>
  </TikoAppShell>
</template>
