import { ref, type Ref } from 'vue'

export interface TikoVersionedSettings<TSettings extends Record<string, unknown>> {
  settings: TSettings
  version: number
}

export interface TikoVersionedState<TState extends Record<string, unknown>> {
  state: TState
  version: number
}

export interface TikoAppDataClient<TApp extends string, TSettings extends Record<string, unknown>, TState extends Record<string, unknown>> {
  getSettings: (app: TApp, sessionToken: string) => Promise<TikoVersionedSettings<TSettings>>
  putSettings: (app: TApp, sessionToken: string, settings: TSettings, options?: { version?: number }) => Promise<TikoVersionedSettings<TSettings>>
  getState: (app: TApp, sessionToken: string) => Promise<TikoVersionedState<TState>>
  putState: (app: TApp, sessionToken: string, state: TState, options?: { version?: number }) => Promise<TikoVersionedState<TState>>
}

export interface TikoAppDataRuntimeOptions<TApp extends string, TSettings extends Record<string, unknown>, TState extends Record<string, unknown>> {
  app: TApp
  sessionToken: Ref<string>
  bootstrapped?: Ref<boolean>
  dataClient: TikoAppDataClient<TApp, TSettings, TState>
  readSettings: () => TSettings
  readState: () => TState
  applySettings: (settings: TSettings, version?: number) => void
  applyState: (state: TState, version?: number) => void
  onError?: (phase: 'hydrate' | 'settings' | 'state', error: unknown) => void
}

export interface TikoAppSettingsClient<TApp extends string, TSettings extends Record<string, unknown>> {
  getSettings: (app: TApp, sessionToken: string) => Promise<TikoVersionedSettings<TSettings>>
  putSettings: (app: TApp, sessionToken: string, settings: TSettings, options?: { version?: number }) => Promise<TikoVersionedSettings<TSettings>>
}

export interface TikoAppSettingsRuntimeOptions<TApp extends string, TSettings extends Record<string, unknown>> {
  app: TApp
  sessionToken: Ref<string>
  bootstrapped?: Ref<boolean>
  dataClient: TikoAppSettingsClient<TApp, TSettings>
  readSettings: () => TSettings
  applySettings: (settings: TSettings, version?: number) => void
  onError?: (phase: 'hydrate' | 'settings', error: unknown) => void
}

export function useTikoAppSettingsRuntime<TApp extends string, TSettings extends Record<string, unknown>>(
  options: TikoAppSettingsRuntimeOptions<TApp, TSettings>,
) {
  const settingsVersion = ref<number | undefined>()
  const bootstrapped = options.bootstrapped ?? ref(false)

  async function hydrateRemoteSettings(): Promise<boolean> {
    if (!options.sessionToken.value) return false

    try {
      const response = await options.dataClient.getSettings(options.app, options.sessionToken.value)
      settingsVersion.value = response.version
      options.applySettings(response.settings, response.version)
      return true
    } catch (error) {
      options.onError?.('hydrate', error)
      return false
    }
  }

  async function persistSettingsRemote(): Promise<boolean> {
    if (!bootstrapped.value || !options.sessionToken.value) return false

    try {
      const response = await options.dataClient.putSettings(options.app, options.sessionToken.value, options.readSettings(), { version: settingsVersion.value })
      settingsVersion.value = response.version
      return true
    } catch (error) {
      options.onError?.('settings', error)
      return false
    }
  }

  return {
    bootstrapped,
    settingsVersion,
    hydrateRemoteSettings,
    persistSettingsRemote,
  }
}

export function useTikoAppDataRuntime<TApp extends string, TSettings extends Record<string, unknown>, TState extends Record<string, unknown>>(
  options: TikoAppDataRuntimeOptions<TApp, TSettings, TState>,
) {
  const settingsVersion = ref<number | undefined>()
  const stateVersion = ref<number | undefined>()
  const bootstrapped = options.bootstrapped ?? ref(false)

  async function hydrateRemoteData(): Promise<boolean> {
    if (!options.sessionToken.value) return false

    try {
      const [settings, state] = await Promise.all([
        options.dataClient.getSettings(options.app, options.sessionToken.value),
        options.dataClient.getState(options.app, options.sessionToken.value),
      ])
      settingsVersion.value = settings.version
      stateVersion.value = state.version
      options.applySettings(settings.settings, settings.version)
      options.applyState(state.state, state.version)
      return true
    } catch (error) {
      options.onError?.('hydrate', error)
      return false
    }
  }

  async function persistSettingsRemote(): Promise<boolean> {
    if (!bootstrapped.value || !options.sessionToken.value) return false

    try {
      const response = await options.dataClient.putSettings(options.app, options.sessionToken.value, options.readSettings(), { version: settingsVersion.value })
      settingsVersion.value = response.version
      return true
    } catch (error) {
      options.onError?.('settings', error)
      return false
    }
  }

  async function persistStateRemote(): Promise<boolean> {
    if (!bootstrapped.value || !options.sessionToken.value) return false

    try {
      const response = await options.dataClient.putState(options.app, options.sessionToken.value, options.readState(), { version: stateVersion.value })
      stateVersion.value = response.version
      return true
    } catch (error) {
      options.onError?.('state', error)
      return false
    }
  }

  return {
    bootstrapped,
    settingsVersion,
    stateVersion,
    hydrateRemoteData,
    persistSettingsRemote,
    persistStateRemote,
  }
}
