import { computed, h, inject, markRaw, ref } from 'vue'
import { Icon, type PopupService } from '@sil/ui'
import type { IdentityClient, IdentityBundle } from '@tiko/identity'
import TikoProfileMenu from './TikoProfileMenu.vue'
import TikoPinPopup from './TikoPinPopup.vue'
import TikoChildAccountsPanel from './TikoChildAccountsPanel.vue'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentityRuntimeState {
  /** Current session token (empty when not logged in) */
  sessionToken: ReturnType<typeof ref<string>>
  /** User ID / display label */
  userId: ReturnType<typeof ref<string>>
  /** Account email (empty when not recovered) */
  accountEmail: ReturnType<typeof ref<string>>
  /** Whether the account email has been verified */
  accountEmailVerified: ReturnType<typeof ref<boolean>>
  /** User's display name */
  displayName: ReturnType<typeof ref<string>>
  /** Whether parent mode is active (true by default) */
  parentMode: ReturnType<typeof ref<boolean>>
  /** Whether child mode has been enabled on the account */
  childModeEnabled: ReturnType<typeof ref<boolean>>
  /** Whether a PIN has been configured */
  pinConfigured: ReturnType<typeof ref<boolean>>
}

export interface UseIdentityRuntimeOptions {
  /** Configured IdentityClient instance */
  identityClient: IdentityClient
  /** Reactive identity state (typically created by the app) */
  state: IdentityRuntimeState
  /** Device name for bootstrap (e.g. "Yes No web") */
  deviceName: string
  /** localStorage key for persisted identity */
  storageKey?: string
}

export interface StoredIdentity {
  userId?: string
  deviceId?: string
  deviceSecret?: string
  sessionToken?: string
  expiresAt?: string
  accountEmail?: string | null
  accountEmailVerified?: boolean
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useIdentityRuntime(options: UseIdentityRuntimeOptions) {
  const { identityClient, state, deviceName } = options
  const storageKey = options.storageKey ?? 'tiko:identity:device-session'
  const popup = inject<PopupService>('popupService')!

  const hasParentCode = computed(() => state.pinConfigured.value)

  // ---- Persistence ----

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

  // ---- Identity state management ----

  function applyRuntime(bundle: IdentityBundle) {
    state.parentMode.value = bundle.runtime?.mode !== 'child'
    state.childModeEnabled.value = Boolean(bundle.runtime?.childModeEnabled)
    state.pinConfigured.value = Boolean(bundle.runtime?.pinConfigured)
  }

  function saveIdentity(bundle: IdentityBundle) {
    if (!bundle.session?.token) throw new Error('Identity response did not include a session token.')
    state.sessionToken.value = bundle.session.token
    state.userId.value = bundle.account?.email ?? bundle.subject.id
    state.accountEmail.value = bundle.account?.email ?? bundle.user?.email ?? ''
    state.accountEmailVerified.value = Boolean(bundle.account?.emailVerified ?? bundle.user?.emailVerified)
    state.displayName.value = bundle.user?.displayName ?? state.displayName.value
    applyRuntime(bundle)
    writeJson(storageKey, {
      userId: bundle.subject.id,
      deviceId: bundle.device?.id,
      deviceSecret: bundle.device?.secret,
      sessionToken: bundle.session.token,
      expiresAt: bundle.session.expiresAt,
      accountEmail: bundle.account?.email ?? null,
      accountEmailVerified: Boolean(bundle.account?.emailVerified),
    } satisfies StoredIdentity)
  }

  function resetIdentityState() {
    state.sessionToken.value = ''
    state.userId.value = ''
    state.accountEmail.value = ''
    state.accountEmailVerified.value = false
    state.displayName.value = ''
    state.childModeEnabled.value = false
    state.pinConfigured.value = false
    state.parentMode.value = true
    window.localStorage.removeItem(storageKey)
  }

  // ---- Bootstrap ----

  async function bootstrapIdentity() {
    const storedIdentity = readJson<StoredIdentity>(storageKey, {})
    state.userId.value = storedIdentity.accountEmail || storedIdentity.userId || ''
    state.accountEmail.value = storedIdentity.accountEmail ?? ''
    state.accountEmailVerified.value = Boolean(storedIdentity.accountEmailVerified)

    try {
      const bundle = await identityClient.getCookieSession()
      saveIdentity(bundle)
      return
    } catch {
      // Fall through to local bearer/device fallback.
    }

    if (storedIdentity.sessionToken) {
      try {
        const bundle = await identityClient.getSession(storedIdentity.sessionToken)
        saveIdentity(bundle)
        return
      } catch {
        // Fall through to device bootstrap.
      }
    }

    const bundle = await identityClient.bootstrapDevice({
      device: {
        id: storedIdentity.deviceId,
        secret: storedIdentity.deviceSecret,
        name: deviceName,
        platform: 'web',
      },
    })
    saveIdentity(bundle)
  }

  // ---- Profile ----

  async function loadProfile() {
    if (!state.sessionToken.value) return
    try {
      const { profile } = await identityClient.getProfile(state.sessionToken.value)
      if (typeof profile.displayName === 'string') state.displayName.value = profile.displayName
    } catch {
      // Keep the local state if profile is not reachable.
    }
  }

  // ---- Avatar click (entry point for profile menu) ----

  function handleAvatarClick() {
    // Graceful no-op when popup provider is absent (test env)
    if (popup == null) return
    if (state.parentMode.value) {
      openProfileMenu()
    } else {
      openParentCodePopup()
    }
  }

  // ---- Profile menu ----

  function openProfileMenu() {
    popup.showPopup({
      component: markRaw(TikoProfileMenu),
      title: '',
      props: {
        parentMode: state.parentMode.value,
        hasCode: hasParentCode.value,
        isLoggedIn: Boolean(state.sessionToken.value),
        isRecoverable: state.accountEmailVerified.value,
        userLabel: state.displayName.value || state.accountEmail.value || state.userId.value || 'Device user',
      },
      config: { position: 'center', canClose: true, background: true, width: 'min(34rem, calc(100vw - 2rem))' },
      on: {
        profile: () => { popup.closeAllPopups(); window.setTimeout(openAccountPopup, 180) },
        login: () => { popup.closeAllPopups(); window.setTimeout(openAccountPopup, 180) },
        logout: () => void doLogout(),
        'delete-account': () => void deleteCurrentUser(),
        'enter-parent-mode': () => openParentCodePopup(),
        'enter-child-mode': () => openChildModeFlow(),
        'child-accounts': () => { popup.closeAllPopups(); window.setTimeout(openChildAccounts, 180) },
        close: () => popup.closeAllPopups(),
      },
    })
  }

  // ---- Account popup (email/OTP/recover) ----

  function openAccountPopup() {
    popup.showPopup({
      component: markRaw({
        setup() {
          const nameInput = ref<string>(state.displayName.value ?? '')
          const emailInput = ref<string>(state.accountEmail.value ?? '')
          const codeInput = ref('')
          const sent = ref(false)
          const loading = ref(false)
          const error = ref('')

          async function saveAndSendCode() {
            const email = emailInput.value.trim().toLowerCase()
            if (!state.sessionToken.value || !email.includes('@')) return
            loading.value = true
            error.value = ''
            try {
              if (nameInput.value.trim()) {
                state.displayName.value = nameInput.value.trim()
                await identityClient.updateProfile(state.sessionToken.value, { displayName: state.displayName.value })
              }
              await identityClient.createEmailChallenge({ email, purpose: 'recover' }, state.sessionToken.value)
              state.accountEmail.value = email
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
              state.accountEmailVerified.value = true
              popup.closeAllPopups()
            } catch {
              error.value = 'Invalid or expired code. Try again or resend.'
            } finally {
              loading.value = false
            }
          }

          return () => h('div', { class: 'tiko-identity-popup tiko-account-popup', 'data-test': 'tiko-account-popup' }, [
            h('div', { class: 'tiko-identity-popup__header' }, [
              h(Icon, { class: 'tiko-identity-popup__icon', name: 'ui/avatar', 'aria-hidden': 'true' }),
              h('h2', { class: 'tiko-identity-popup__title' }, state.accountEmailVerified.value ? 'Your account' : 'Set up user'),
            ]),
            h('div', { class: 'tiko-account-popup__avatar', 'aria-hidden': 'true' }, [h(Icon, { name: 'ui/avatar' })]),
            h('div', { class: 'tiko-account-popup__row' }, [
              h(Icon, { class: 'tiko-account-popup__row-icon', name: 'media/icon_mail', 'aria-hidden': 'true' }),
              h('span', { class: 'tiko-account-popup__row-copy' }, [
                h('strong', state.accountEmail.value || state.userId.value || 'Temporary device user'),
                h('small', state.accountEmailVerified.value ? 'Verified account' : 'Add email to recover this user'),
              ]),
              state.accountEmailVerified.value ? h(Icon, { class: 'tiko-account-popup__verified', name: 'ui/check-fat', 'aria-label': 'Verified' }) : null,
            ]),
            h('label', { class: 'tiko-account-popup__label' }, 'Display name'),
            h('input', {
              class: 'tiko-account-popup__field',
              value: nameInput.value,
              placeholder: 'Your name',
              onInput: (event: Event) => { nameInput.value = (event.target as HTMLInputElement).value },
            }),
            !state.accountEmailVerified.value ? h('label', { class: 'tiko-account-popup__label' }, 'Email') : null,
            !state.accountEmailVerified.value ? h('input', {
              class: 'tiko-account-popup__field',
              type: 'email',
              value: emailInput.value,
              placeholder: 'you@example.com',
              onInput: (event: Event) => { emailInput.value = (event.target as HTMLInputElement).value },
            }) : null,
            sent.value ? h('input', {
              class: 'tiko-account-popup__field tiko-account-popup__field--otp',
              inputmode: 'numeric',
              autocomplete: 'one-time-code',
              maxlength: 7,
              value: codeInput.value,
              placeholder: '123 456',
              onInput: (event: Event) => { codeInput.value = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6) },
              onKeydown: (event: KeyboardEvent) => { if (event.key === 'Enter') void verifyCode() },
            }) : null,
            error.value ? h('p', { class: 'tiko-account-popup__error' }, error.value) : null,
            !state.accountEmailVerified.value ? h('button', {
              class: 'tiko-account-popup__signout tiko-account-popup__primary',
              type: 'button',
              disabled: loading.value || !emailInput.value.trim().includes('@'),
              onClick: sent.value ? verifyCode : saveAndSendCode,
            }, loading.value ? 'Please wait...' : sent.value ? 'Verify code' : 'Send magic link') : null,
            state.accountEmailVerified.value ? h('button', { class: 'tiko-account-popup__signout', type: 'button', onClick: doLogout }, 'Sign out') : null,
            state.accountEmailVerified.value ? h('button', { class: 'tiko-account-popup__delete', type: 'button', onClick: deleteCurrentUser }, 'Delete account') : null,
          ])
        },
      }),
      title: '',
      config: { position: 'center', canClose: true, background: true, width: 'min(34rem, calc(100vw - 2rem))' },
      onClose: () => {},
    })
  }

  // ---- Deletion ----

  async function deleteCurrentUser() {
    if (!state.sessionToken.value || !state.accountEmailVerified.value) return
    if (!window.confirm('Delete this Tiko user? This removes the account and sessions.')) return
    try { await identityClient.createDeletionRequest(state.sessionToken.value, { scope: 'account' }) } catch { /* local cleanup still makes the device usable */ }
    resetIdentityState()
    popup.closeAllPopups()
    await bootstrapIdentity().catch(() => undefined)
  }

  // ---- Logout ----

  async function doLogout() {
    if (state.sessionToken.value) {
      try { await identityClient.logout(state.sessionToken.value) } catch { /* ignore */ }
    }
    resetIdentityState()
    popup.closeAllPopups()
  }

  // ---- Parent code popup ----

  function openParentCodePopup() {
    popup.showPopup({
      component: markRaw(TikoPinPopup),
      title: '',
      props: {
        mode: 'verify',
        verifyCode: async (pin: string) => {
          if (!state.sessionToken.value) return false
          try {
            const bundle = await identityClient.enterParentMode(state.sessionToken.value, pin)
            saveIdentity(bundle)
            return true
          } catch {
            return false
          }
        },
      },
      config: { position: 'center', canClose: true, background: true, width: 'min(30rem, calc(100vw - 2rem))' },
      on: {
        set: () => { popup.closeAllPopups() },
        cancel: () => popup.closeAllPopups(),
      },
    })
  }

  // ---- Child mode flow ----

  function openChildModeFlow() {
    popup.closeAllPopups()
    if (!state.sessionToken.value || !state.accountEmailVerified.value) {
      window.setTimeout(openAccountPopup, 180)
      return
    }

    if (!hasParentCode.value) {
      popup.showPopup({
        component: markRaw(TikoPinPopup),
        title: '',
        props: { existingHash: undefined },
        config: { position: 'center', canClose: true, background: true, width: 'min(30rem, calc(100vw - 2rem))' },
        on: {
          set: async (...args: unknown[]) => {
            const pin = typeof args[1] === 'string' ? args[1] : ''
            if (!pin || !state.sessionToken.value) return
            try {
              saveIdentity(await identityClient.setPin(state.sessionToken.value, { pin }))
              if (!state.childModeEnabled.value) saveIdentity(await identityClient.enableChildMode(state.sessionToken.value))
              saveIdentity(await identityClient.enterChildMode(state.sessionToken.value))
              popup.closeAllPopups()
            } catch {
              // Keep the menu open on API failure.
            }
          },
          cancel: () => popup.closeAllPopups(),
        },
      })
    } else {
      const token = state.sessionToken.value
      if (!token) return
      void (async () => {
        try {
          if (!state.childModeEnabled.value) saveIdentity(await identityClient.enableChildMode(token))
          saveIdentity(await identityClient.enterChildMode(token))
        } catch {
          // Keep parent mode if the API rejects the transition.
        }
      })()
    }
  }

  // ---- Child accounts ----

  function openChildAccounts() {
    popup.showPopup({
      component: markRaw(TikoChildAccountsPanel),
      title: '',
      props: {
        onLoad: async () => {
          const { childAccounts } = await identityClient.listChildAccounts(state.sessionToken.value!)
          return childAccounts.map(c => ({ id: c.id, name: c.name, code: '****' }))
        },
        onCreate: async (name: string, code: string) => {
          const { child } = await identityClient.createChildAccount(state.sessionToken.value!, { name, code })
          return { id: child.id, name: child.name, code: '****' }
        },
        onUpdate: async (id: string, name: string) => {
          const { child } = await identityClient.updateChildAccount(state.sessionToken.value!, id, { name })
          return { id: child.id, name: child.name, code: '****' }
        },
        onResetCode: async (id: string, code: string) => {
          const { child } = await identityClient.resetChildAccountCode(state.sessionToken.value!, id, code)
          return { id: child.id, name: child.name, code: '****' }
        },
        onDelete: async (id: string) => {
          await identityClient.deleteChildAccount(state.sessionToken.value!, id)
        },
      },
      config: { position: 'center', canClose: true, background: true, width: 'min(34rem, calc(100vw - 2rem))' },
      on: {
        close: () => popup.closeAllPopups(),
      },
    })
  }

  return {
    // State
    hasParentCode,
    // Persistence helpers
    readJson,
    writeJson,
    // Identity lifecycle
    saveIdentity,
    resetIdentityState,
    bootstrapIdentity,
    loadProfile,
    // UI flows
    handleAvatarClick,
    openProfileMenu,
    openParentCodePopup,
    openChildModeFlow,
    openChildAccounts,
    // Account actions
    deleteCurrentUser,
    doLogout,
  }
}
