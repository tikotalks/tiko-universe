export type TikoAppId = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'radio' | 'todo'
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue | undefined }

export interface VersionedAppData<T extends Record<string, unknown> = Record<string, unknown>> {
  app: TikoAppId
  updatedAt: string | null
  version: number
}

export interface AppSettingsResponse<T extends Record<string, unknown> = Record<string, unknown>> extends VersionedAppData<T> {
  settings: T
}

export interface AppStateResponse<T extends Record<string, unknown> = Record<string, unknown>> extends VersionedAppData<T> {
  state: T
}

export interface WriteOptions {
  version?: number
}

export interface DataClientOptions {
  baseUrl: string
  fetch?: typeof fetch
}

export interface YesNoSettings extends JsonObject {
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
  spokenPrompt?: string
}

export interface YesNoState extends JsonObject {
  prompt?: string
  lastAnswer?: 'yes' | 'no' | null
  answerHistory?: Array<'yes' | 'no'>
}

export interface TypeSettings extends JsonObject {
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
  keyboardLayout?: 'qwerty' | 'azerty' | 'abc'
}

export interface TypeState extends JsonObject {
  text?: string
  completedPrompts?: string[]
}

export interface CardsTile {
  id: string
  title: string
  type: string
  speech: string
  image?: string
  color?: string
}

export interface CardsCollection {
  id: string
  title: string
  color: string
  order: number
  icon?: string
  image?: string
  tiles: CardsTile[]
}

export interface CardsSettings {
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
  hiddenDefaults?: string[]
  collectionOverrides?: Record<string, Partial<{ title: string; icon: string; color: string; image: string; order: number }>>
  tileOverrides?: Record<string, Partial<{ title: string; speech: string; color: string; image: string }>>
  [key: string]: unknown
}

export interface CardsState {
  collections?: CardsCollection[]
  navPath?: string[]
  editMode?: boolean
  [key: string]: unknown
}

export interface SequenceSettings {
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
  [key: string]: unknown
}

export interface SequenceState {
  items?: unknown[]
  playingId?: string | null
  currentStep?: number
  [key: string]: unknown
}

export interface TodoSettings {
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
  [key: string]: unknown
}

export interface TodoState {
  items?: unknown[]
  [key: string]: unknown
}
export interface TimerSettings extends JsonObject {
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
  defaultMinutes?: number
  defaultSeconds?: number
  soundEnabled?: boolean
}

export interface TimerState extends JsonObject {
  mode?: 'idle' | 'running' | 'paused' | 'expired'
  targetMs?: number
  remainingMs?: number
  startedAt?: number | null
  lastPresets?: number[]
}

export type TrackSource = 'youtube' | 'r2' | 'upload'

export interface RadioCategory {
  id: string
  name: string
  icon: string      // e.g. 'animals', 'farm', 'bedtime', 'songs'
  color: string     // e.g. '#FFD93D' (yellow), '#6BCB77' (green), etc.
  order: number
}

export interface RadioTrack {
  id: string
  title: string
  artist?: string
  source: TrackSource
  youtubeVideoId?: string
  audioUrl?: string
  categoryId?: string    // which category this track belongs to
  thumbnailUrl?: string
  duration?: number
  addedAt?: string
}

export interface RadioSettings extends JsonObject {
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
  autoPlay?: boolean
  volume?: number
  pinHash?: string
}

export interface RadioState {
  currentTrackIndex?: number
  tracks?: RadioTrack[]
  categories?: RadioCategory[]
  shuffleEnabled?: boolean
  repeatEnabled?: boolean
  [key: string]: unknown
}

export interface AppSettingsById {
  'yes-no': YesNoSettings
  type: TypeSettings
  cards: CardsSettings
  sequence: SequenceSettings
  timer: TimerSettings
  radio: RadioSettings
  todo: TodoSettings
}

export interface AppStateById {
  'yes-no': YesNoState
  type: TypeState
  cards: CardsState
  sequence: SequenceState
  timer: TimerState
  radio: RadioState
  todo: TodoState
}

export class TikoDataClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch

  constructor(options: DataClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  getSettings<TApp extends TikoAppId>(app: TApp, sessionToken: string): Promise<AppSettingsResponse<AppSettingsById[TApp]>> {
    return this.request<AppSettingsResponse<AppSettingsById[TApp]>>(`/apps/${app}/settings`, {
      headers: bearerHeaders(sessionToken)
    })
  }

  putSettings<TApp extends TikoAppId>(app: TApp, sessionToken: string, settings: AppSettingsById[TApp], options: WriteOptions = {}): Promise<AppSettingsResponse<AppSettingsById[TApp]>> {
    return this.request<AppSettingsResponse<AppSettingsById[TApp]>>(`/apps/${app}/settings`, {
      method: 'PUT',
      headers: jsonBearerHeaders(sessionToken),
      body: JSON.stringify({ settings, ...versionBody(options) })
    })
  }

  getState<TApp extends TikoAppId>(app: TApp, sessionToken: string): Promise<AppStateResponse<AppStateById[TApp]>> {
    return this.request<AppStateResponse<AppStateById[TApp]>>(`/apps/${app}/state`, {
      headers: bearerHeaders(sessionToken)
    })
  }

  putState<TApp extends TikoAppId>(app: TApp, sessionToken: string, state: AppStateById[TApp], options: WriteOptions = {}): Promise<AppStateResponse<AppStateById[TApp]>> {
    return this.request<AppStateResponse<AppStateById[TApp]>>(`/apps/${app}/state`, {
      method: 'PUT',
      headers: jsonBearerHeaders(sessionToken),
      body: JSON.stringify({ state, ...versionBody(options) })
    })
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, init)
    if (!response.ok) {
      let error: unknown
      try {
        error = await response.json()
      } catch {
        error = { error: { code: 'request_failed', message: response.statusText } }
      }
      throw new TikoDataError(response.status, error)
    }
    return (await response.json()) as T
  }
}

export class TikoDataError extends Error {
  readonly code?: string
  readonly field?: string

  constructor(readonly status: number, readonly body: unknown) {
    const error = typeof body === 'object' && body !== null && 'error' in body ? (body as { error?: { code?: string; message?: string; field?: string } }).error : undefined
    super(error?.message ?? `Tiko data request failed with status ${status}`)
    this.name = 'TikoDataError'
    this.code = error?.code
    this.field = error?.field
  }
}

function bearerHeaders(sessionToken: string): Record<string, string> {
  return { authorization: `Bearer ${sessionToken}` }
}

function jsonBearerHeaders(sessionToken: string): Record<string, string> {
  return { ...bearerHeaders(sessionToken), 'content-type': 'application/json' }
}

function versionBody(options: WriteOptions): { version?: number } {
  return options.version === undefined ? {} : { version: options.version }
}

export { TikoMediaClient, TikoMediaError } from './media.js'
export type { MediaClientOptions, UploadAudioResponse, ExtractYouTubeResponse, GetTrackResponse } from './media.js'
