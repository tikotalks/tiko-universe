<script setup lang="ts">
import { computed, h, inject, markRaw, onMounted, ref, watch } from 'vue'
import { Icon, Popup, type PopupService } from '@sil/ui'
import { IdentityClient, type IdentityBundle } from '@tiko/identity'
import { TikoDataClient, type YesNoSettings, type YesNoState } from '@tiko/data'
import { createI18n, defaultLanguage, tikoI18nKeys, tikoLanguages, type TikoLanguage } from '@tiko/i18n'
import {
  TikoAppShell,
  TikoChoiceGrid,
  TikoSettingsPanel,
  TikoProfileMenu,
  TikoPinPopup,
  createTikoChoice,
  createTikoTtsClient,
  type TikoColorMode
} from '@tiko/ui'
import { appConfig } from './appConfig'
import './styles.scss'

const popup = inject<PopupService>('popupService')!

const storageKey = 'tiko:yes-no'
const identityStorageKey = 'tiko:identity:device-session'
const parentModeStorageKey = 'tiko:parent-mode'
const appId = 'yes-no' as const
const apiBaseUrl = resolveApiBaseUrl()
const identityBaseUrl = resolveIdentityBaseUrl()

type YesNoAnswer = 'yes' | 'no'
type SpeakStatus = 'idle' | 'speaking' | 'fallback' | 'error'

interface PersistedState {
  language?: string
  colorMode?: TikoColorMode
  sentence?: string
  latestAnswer?: YesNoAnswer | string | null
  latestAnswerId?: YesNoAnswer | null
  answerHistory?: string[]
}

interface StoredIdentity {
  userId?: string
  deviceId?: string
  deviceSecret?: string
  sessionToken?: string
  expiresAt?: string
  accountEmail?: string | null
  accountEmailVerified?: boolean
}

function resolveApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_TIKO_API_BASE_URL ?? 'https://identity.tikoapi.org/v1').replace(/\/$/, '')
}

function resolveIdentityBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (env?.VITE_IDENTITY_API_URL ?? env?.VITE_TIKO_IDENTITY_BASE_URL ?? 'https://id.tikoapps.org/v1').replace(/\/$/, '')
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function toLanguage(value: string | undefined): TikoLanguage {
  return tikoLanguages.includes(value as TikoLanguage) ? value as TikoLanguage : defaultLanguage
}

function toColorMode(value: string | undefined): TikoColorMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function toAnswer(value: unknown): YesNoAnswer | '' {
  return value === 'yes' || value === 'no' ? value : ''
}

function toHistory(value: unknown): YesNoAnswer[] {
  return Array.isArray(value) ? value.map(toAnswer).filter((answer): answer is YesNoAnswer => answer !== '').slice(0, 6) : []
}

function answerLabel(answer: YesNoAnswer | '') {
  if (answer === 'yes') return i18n.t(tikoI18nKeys.yesNo.answers.yes)
  if (answer === 'no') return i18n.t(tikoI18nKeys.yesNo.answers.no)
  return ''
}

const stored = readJson<PersistedState>(storageKey, {})
const i18n = createI18n({ app: appId, language: toLanguage(stored.language) })
const language = ref<TikoLanguage>(toLanguage(stored.language))
const colorMode = ref<TikoColorMode>(toColorMode(stored.colorMode))
const latestAnswerId = ref<YesNoAnswer | ''>(toAnswer(stored.latestAnswerId ?? stored.latestAnswer))
const answerHistory = ref<YesNoAnswer[]>(toHistory(stored.answerHistory))
const settingsOpen = ref(false)
const historyOpen = ref(false)
const sentence = ref(stored.sentence || i18n.t(tikoI18nKeys.yesNo.sentence.default))
const speakStatus = ref<SpeakStatus>('idle')
const settingsVersion = ref<number | undefined>()
const stateVersion = ref<number | undefined>()
const sessionToken = ref<string>('')
const userId = ref<string>('')
const accountEmail = ref<string>('')
const accountEmailVerified = ref(false)
const displayName = ref('')
const parentMode = ref(readJson<boolean>(parentModeStorageKey, true))
const parentCodeHash = ref<string | undefined>()
const hasParentCode = computed(() => Boolean(parentCodeHash.value))
const bootstrapped = ref(false)
const tts = createTikoTtsClient()
const identityClient = new IdentityClient({ baseUrl: identityBaseUrl, credentials: 'include' })
const dataClient = new TikoDataClient({ baseUrl: apiBaseUrl })

const defaultSentence = computed(() => i18n.t(tikoI18nKeys.yesNo.sentence.default))

const labels = computed(() => {
  void language.value
  return {
    appName: i18n.t(tikoI18nKeys.yesNo.appName),
    sentenceLabel: i18n.t(tikoI18nKeys.yesNo.sentence.label),
    reset: i18n.t(tikoI18nKeys.yesNo.sentence.reset),
    speak: i18n.t(tikoI18nKeys.yesNo.sentence.speak),
    yes: i18n.t(tikoI18nKeys.yesNo.answers.yes),
    no: i18n.t(tikoI18nKeys.yesNo.answers.no),
    latest: i18n.t(tikoI18nKeys.yesNo.latestAnswer),
    historyLabel: i18n.t(tikoI18nKeys.yesNo.history.label),
    historyTitle: i18n.t(tikoI18nKeys.yesNo.history.title),
    historyEmpty: i18n.t(tikoI18nKeys.yesNo.history.empty),
    fallback: i18n.t(tikoI18nKeys.yesNo.status.browserVoiceFallback),
    speechError: i18n.t(tikoI18nKeys.yesNo.status.speechError)
  }
})

const choices = computed(() => [
  createTikoChoice({ id: 'yes', label: labels.value.yes, tone: 'primary', speechText: labels.value.yes, icon: 'ui/check-fat' }),
  createTikoChoice({ id: 'no', label: labels.value.no, tone: 'secondary', speechText: labels.value.no, icon: 'wayfinding/cross' })
])

const headerActions = computed(() => parentMode.value ? [
  { id: 'history', label: labels.value.historyTitle, icon: 'ui/clock', active: historyOpen.value },
  { id: 'settings', label: 'Settings', icon: 'ui/settings-dual', active: settingsOpen.value }
] : [])

const canSpeakSentence = computed(() => sentence.value.trim().length > 0)
const latestAnswerLabel = computed(() => answerLabel(latestAnswerId.value))
const answerHistoryLabels = computed(() => answerHistory.value.map(answerLabel))

function resolveColorMode(mode: TikoColorMode) {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function saveLocalFallback() {
  writeJson(storageKey, {
    language: language.value,
    colorMode: colorMode.value,
    sentence: sentence.value,
    latestAnswerId: latestAnswerId.value || null,
    answerHistory: answerHistory.value
  })
}

function saveIdentity(bundle: IdentityBundle) {
  if (!bundle.session?.token) throw new Error('Identity response did not include a session token.')
  sessionToken.value = bundle.session.token
  userId.value = bundle.account?.email ?? bundle.subject.id
  accountEmail.value = bundle.account?.email ?? ''
  accountEmailVerified.value = Boolean(bundle.account?.emailVerified)
  writeJson(identityStorageKey, {
    userId: bundle.subject.id,
    deviceId: bundle.device?.id,
    deviceSecret: bundle.device?.secret,
    sessionToken: bundle.session.token,
    expiresAt: bundle.session.expiresAt,
    accountEmail: bundle.account?.email ?? null,
    accountEmailVerified: Boolean(bundle.account?.emailVerified)
  } satisfies StoredIdentity)
}

async function bootstrapIdentity() {
  const storedIdentity = readJson<StoredIdentity>(identityStorageKey, {})
  userId.value = storedIdentity.accountEmail || storedIdentity.userId || ''
  accountEmail.value = storedIdentity.accountEmail ?? ''
  accountEmailVerified.value = Boolean(storedIdentity.accountEmailVerified)

  try {
    const bundle = await identityClient.getCookieSession()
    saveIdentity(bundle)
    return
  } catch {
    // Fall through to local bearer/device fallback when the shared app-family cookie is missing or expired.
  }

  if (storedIdentity.sessionToken) {
    try {
      const bundle = await identityClient.getSession(storedIdentity.sessionToken)
      saveIdentity(bundle)
      return
    } catch {
      // Fall through to device bootstrap with the known device id/secret.
    }
  }

  const bundle = await identityClient.bootstrapDevice({
    device: {
      id: storedIdentity.deviceId,
      secret: storedIdentity.deviceSecret,
      name: 'Yes No web',
      platform: 'web'
    }
  })
  saveIdentity(bundle)
}

function applySettings(settings: YesNoSettings, version?: number) {
  language.value = toLanguage(settings.language)
  colorMode.value = toColorMode(settings.colorMode)
  sentence.value = typeof settings.spokenPrompt === 'string' && settings.spokenPrompt.trim() ? settings.spokenPrompt : defaultSentence.value
  settingsVersion.value = version
}

function applyState(state: YesNoState, version?: number) {
  latestAnswerId.value = toAnswer(state.lastAnswer)
  answerHistory.value = toHistory(state.answerHistory)
  stateVersion.value = version
}

async function hydrateRemoteData() {
  if (!sessionToken.value) return
  const [settings, state] = await Promise.all([
    dataClient.getSettings(appId, sessionToken.value),
    dataClient.getState(appId, sessionToken.value)
  ])
  applySettings(settings.settings, settings.version)
  applyState(state.state, state.version)
}

async function persistSettingsRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putSettings(appId, sessionToken.value, {
      language: language.value,
      colorMode: colorMode.value,
      spokenPrompt: sentence.value
    }, { version: settingsVersion.value })
    settingsVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next edit.
  }
}

async function persistStateRemote() {
  if (!bootstrapped.value || !sessionToken.value) return
  try {
    const response = await dataClient.putState(appId, sessionToken.value, {
      prompt: sentence.value,
      lastAnswer: latestAnswerId.value || null,
      answerHistory: answerHistory.value
    }, { version: stateVersion.value })
    stateVersion.value = response.version
  } catch {
    // Local fallback is already written; remote will be retried on the next answer.
  }
}

watch(language, (value) => {
  i18n.setLanguage(value)
}, { immediate: true })

watch(colorMode, (mode) => {
  const effective = resolveColorMode(mode)
  document.documentElement.dataset.colorMode = effective
  document.documentElement.dataset.theme = effective
}, { immediate: true })

watch([language, colorMode, sentence], () => {
  saveLocalFallback()
  void persistSettingsRemote()
})

watch([latestAnswerId, answerHistory], () => {
  saveLocalFallback()
  void persistStateRemote()
}, { deep: true })

onMounted(async () => {
  try {
    await bootstrapIdentity()
    await loadParentCodeHash()
    await hydrateRemoteData()
  } catch {
    // Keep the child-facing local flow available when API bootstrap is offline.
  } finally {
    bootstrapped.value = true
    saveLocalFallback()
  }
})

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
  const answerId = toAnswer(id)
  const choice = choices.value.find((item) => item.id === answerId)
  if (!answerId || !choice) return
  latestAnswerId.value = answerId
  answerHistory.value = [answerId, ...answerHistory.value].slice(0, 6)
  await speak(choice.speechText ?? choice.label)
}

function headerAction(id: string) {
  if (id === 'settings') settingsOpen.value = !settingsOpen.value
  if (id === 'history') historyOpen.value = !historyOpen.value
}

async function loadParentCodeHash() {
  if (!sessionToken.value) return
  try {
    const { profile } = await identityClient.getProfile(sessionToken.value)
    if (typeof profile.parentCodeHash === 'string') parentCodeHash.value = profile.parentCodeHash
    if (typeof profile.displayName === 'string') displayName.value = profile.displayName
  } catch {
    // Keep local parent mode available if profile is not reachable.
  }
}

function handleAvatarClick() {
  if (parentMode.value) {
    openProfileMenu()
  } else {
    openParentCodePopup()
  }
}

function openProfileMenu() {
  popup.showPopup({
    component: markRaw(TikoProfileMenu),
    title: '',
    props: {
      parentMode: parentMode.value,
      hasCode: hasParentCode.value,
      isLoggedIn: Boolean(sessionToken.value),
      isRecoverable: accountEmailVerified.value,
      userLabel: displayName.value || accountEmail.value || userId.value || 'Device user',
    },
    config: { position: 'center', canClose: true, background: true, width: 'min(34rem, calc(100vw - 2rem))' },
    on: {
      profile: () => { popup.closeAllPopups(); window.setTimeout(openAccountPopup, 180) },
      login: () => { popup.closeAllPopups(); window.setTimeout(openAccountPopup, 180) },
      logout: () => void doLogout(),
      'delete-account': () => void deleteCurrentUser(),
      'enter-parent-mode': () => openParentCodePopup(),
      'enter-child-mode': () => openChildModeFlow(),
      close: () => popup.closeAllPopups(),
    },
  })
}

function openAccountPopup() {
  popup.showPopup({
    component: markRaw({
      setup() {
        const nameInput = ref(displayName.value)
        const emailInput = ref(accountEmail.value)
        const codeInput = ref('')
        const sent = ref(false)
        const loading = ref(false)
        const error = ref('')

        async function saveAndSendCode() {
          const email = emailInput.value.trim().toLowerCase()
          if (!sessionToken.value || !email.includes('@')) return
          loading.value = true
          error.value = ''
          try {
            if (nameInput.value.trim()) {
              displayName.value = nameInput.value.trim()
              await identityClient.updateProfile(sessionToken.value, { displayName: displayName.value })
            }
            await identityClient.createEmailChallenge({ email, purpose: 'recover' }, sessionToken.value)
            accountEmail.value = email
            sent.value = true
          } catch {
            error.value = 'Could not send the code. Please try again.'
          } finally {
            loading.value = false
          }
        }

        async function verifyCode() {
          const otp = codeInput.value.replace(/\D/g, '')
          if (otp.length !== 6) return
          loading.value = true
          error.value = ''
          try {
            const bundle = await identityClient.verifyOtp(otp)
            saveIdentity(bundle)
            accountEmailVerified.value = true
            popup.closeAllPopups()
          } catch {
            error.value = 'Invalid or expired code. Try again or resend.'
          } finally {
            loading.value = false
          }
        }

        return () => h('div', { class: 'yes-no-profile-popup yes-no-account-popup', 'data-test': 'yes-no-account-popup' }, [
          h('div', { class: 'yes-no-profile-popup__header' }, [
            h(Icon, { class: 'yes-no-profile-popup__icon', name: 'ui/avatar', 'aria-hidden': 'true' }),
            h('h2', { class: 'yes-no-profile-popup__title' }, accountEmailVerified.value ? 'Your account' : 'Set up user'),
          ]),
          h('div', { class: 'yes-no-account-popup__avatar', 'aria-hidden': 'true' }, [h(Icon, { name: 'ui/avatar' })]),
          h('div', { class: 'yes-no-account-popup__row' }, [
            h(Icon, { class: 'yes-no-account-popup__row-icon', name: 'media/icon_mail', 'aria-hidden': 'true' }),
            h('span', { class: 'yes-no-account-popup__row-copy' }, [
              h('strong', accountEmail.value || userId.value || 'Temporary device user'),
              h('small', accountEmailVerified.value ? 'Verified account' : 'Add email to recover this user'),
            ]),
            accountEmailVerified.value ? h(Icon, { class: 'yes-no-account-popup__verified', name: 'ui/check-fat', 'aria-label': 'Verified' }) : null,
          ]),
          h('label', { class: 'yes-no-account-popup__label' }, 'Display name'),
          h('input', {
            class: 'yes-no-account-popup__field',
            value: nameInput.value,
            placeholder: 'Your name',
            onInput: (event: Event) => { nameInput.value = (event.target as HTMLInputElement).value }
          }),
          !accountEmailVerified.value ? h('label', { class: 'yes-no-account-popup__label' }, 'Email') : null,
          !accountEmailVerified.value ? h('input', {
            class: 'yes-no-account-popup__field',
            type: 'email',
            value: emailInput.value,
            placeholder: 'you@example.com',
            onInput: (event: Event) => { emailInput.value = (event.target as HTMLInputElement).value }
          }) : null,
          sent.value ? h('input', {
            class: 'yes-no-account-popup__field yes-no-account-popup__field--otp',
            inputmode: 'numeric',
            autocomplete: 'one-time-code',
            maxlength: 7,
            value: codeInput.value,
            placeholder: '123 456',
            onInput: (event: Event) => { codeInput.value = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6) },
            onKeydown: (event: KeyboardEvent) => { if (event.key === 'Enter') void verifyCode() }
          }) : null,
          error.value ? h('p', { class: 'yes-no-account-popup__error' }, error.value) : null,
          !accountEmailVerified.value ? h('button', {
            class: 'yes-no-account-popup__signout yes-no-account-popup__primary',
            type: 'button',
            disabled: loading.value || !emailInput.value.trim().includes('@'),
            onClick: sent.value ? verifyCode : saveAndSendCode,
          }, loading.value ? 'Please wait…' : sent.value ? 'Verify code' : 'Send magic link') : null,
          accountEmailVerified.value ? h('button', { class: 'yes-no-account-popup__signout', type: 'button', onClick: doLogout }, 'Sign out') : null,
          accountEmailVerified.value ? h('button', { class: 'yes-no-account-popup__delete', type: 'button', onClick: deleteCurrentUser }, 'Delete account') : null,
        ])
      },
    }),
    title: '',
    config: { position: 'center', canClose: true, background: true, width: 'min(34rem, calc(100vw - 2rem))' },
    onClose: () => {},
  })
}

async function deleteCurrentUser() {
  if (!sessionToken.value || !accountEmailVerified.value) return
  if (!window.confirm('Delete this Tiko user? This removes the account and sessions.')) return
  try { await identityClient.deleteSelf(sessionToken.value) } catch { /* local cleanup still makes the device usable */ }
  sessionToken.value = ''
  userId.value = ''
  accountEmail.value = ''
  accountEmailVerified.value = false
  displayName.value = ''
  parentCodeHash.value = undefined
  parentMode.value = true
  writeJson(parentModeStorageKey, true)
  window.localStorage.removeItem(identityStorageKey)
  popup.closeAllPopups()
  await bootstrapIdentity().catch(() => undefined)
}

async function doLogout() {
  if (sessionToken.value) {
    try { await identityClient.logout(sessionToken.value) } catch { /* ignore */ }
  }
  sessionToken.value = ''
  userId.value = ''
  accountEmail.value = ''
  accountEmailVerified.value = false
  displayName.value = ''
  parentMode.value = true
  writeJson(parentModeStorageKey, true)
  window.localStorage.removeItem(identityStorageKey)
  popup.closeAllPopups()
}

function openParentCodePopup() {
  popup.showPopup({
    component: markRaw(TikoPinPopup),
    title: '',
    props: { existingHash: parentCodeHash.value },
    config: { position: 'center', canClose: true, background: true, width: 'min(30rem, calc(100vw - 2rem))' },
    on: {
      set: () => {
        parentMode.value = true
        writeJson(parentModeStorageKey, true)
        popup.closeAllPopups()
      },
      cancel: () => popup.closeAllPopups(),
    },
  })
}

function openChildModeFlow() {
  popup.closeAllPopups()
  if (!hasParentCode.value) {
    popup.showPopup({
      component: markRaw(TikoPinPopup),
      title: '',
      props: { existingHash: undefined },
      config: { position: 'center', canClose: true, background: true, width: 'min(30rem, calc(100vw - 2rem))' },
      on: {
        set: async (...args: unknown[]) => {
          const hash = args[0] as string
          parentCodeHash.value = hash
          parentMode.value = false
          writeJson(parentModeStorageKey, false)
          if (sessionToken.value) {
            try { await identityClient.updateProfile(sessionToken.value, { parentCodeHash: hash }) } catch { /* ignore */ }
          }
          popup.closeAllPopups()
        },
        cancel: () => popup.closeAllPopups(),
      },
    })
  } else {
    parentMode.value = false
    writeJson(parentModeStorageKey, false)
  }
}

function resetSentence() {
  sentence.value = defaultSentence.value
}
</script>

<template>
  <TikoAppShell
    :app-name="labels.appName"
    :app-icon="appConfig.appIcon"
    :app-icon-media-category="appConfig.appIconMediaCategory"
    :app-color="appConfig.appColor"
    avatar="ui/avatar"
    :actions="headerActions"
    :show-settings-button="parentMode"
    @header-action="headerAction"
    @avatar-click="handleAvatarClick"
  >
    <section class="yes-no-app" :data-color-mode="colorMode">
      <Popup />
      <section class="yes-no-app__sentence" :aria-label="labels.sentenceLabel">
        <textarea
          id="yes-no-sentence"
          v-model="sentence"
          class="yes-no-app__sentence-input"
          :rows="2"
          :maxlength="160"
          :aria-label="labels.sentenceLabel"
        />
        <div class="yes-no-app__sentence-actions">
          <button
            class="yes-no-app__round-control yes-no-app__speak"
            type="button"
            :disabled="!canSpeakSentence"
            :aria-label="labels.speak"
            @click="speak(sentence)"
          >
            <Icon name="media/volume-iii" size="large" aria-hidden="true" />
          </button>
          <button
            class="yes-no-app__round-control yes-no-app__reset"
            type="button"
            :aria-label="labels.reset"
            @click="resetSentence"
          >
            <Icon name="wayfinding/cross" size="medium" aria-hidden="true" />
          </button>
        </div>
      </section>

      <p v-if="speakStatus === 'fallback'" class="yes-no-app__status" role="status">{{ labels.fallback }}</p>
      <p v-if="speakStatus === 'error'" class="yes-no-app__status yes-no-app__status--error" role="alert">{{ labels.speechError }}</p>

      <TikoSettingsPanel
        v-if="settingsOpen"
        v-model:language="language"
        v-model:color-mode="colorMode"
      />

      <aside v-if="historyOpen" class="yes-no-app__history" :aria-label="labels.historyLabel">
        <strong>{{ labels.historyTitle }}</strong>
        <p v-if="answerHistory.length === 0">{{ labels.historyEmpty }}</p>
        <ol v-else>
          <li v-for="(item, index) in answerHistoryLabels" :key="`${item}-${index}`">{{ item }}</li>
        </ol>
      </aside>

      <TikoChoiceGrid :choices="choices" @answer="answer" />
      <p v-if="latestAnswerLabel" class="yes-no-app__latest">{{ labels.latest }}: {{ latestAnswerLabel }}</p>
    </section>
  </TikoAppShell>
</template>
