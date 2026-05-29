export type TikoAppId = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'radio'
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue | undefined }

export interface VersionedAppData<T extends JsonObject> {
  app: TikoAppId
  updatedAt: string | null
  version: number
}

export interface AppSettingsResponse<T extends JsonObject = JsonObject> extends VersionedAppData<T> {
  settings: T
}

export interface AppStateResponse<T extends JsonObject = JsonObject> extends VersionedAppData<T> {
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

export type CardsSettings = JsonObject
export type CardsState = JsonObject
export type SequenceSettings = JsonObject
export type SequenceState = JsonObject
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

export interface RadioTrack extends JsonObject {
  id: string
  title: string
  artist?: string
  source: TrackSource
  youtubeVideoId?: string
  audioUrl?: string
  thumbnailUrl?: string
  duration?: number
  addedAt?: string
}

export interface RadioSettings extends JsonObject {
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
  autoPlay?: boolean
  volume?: number
}

export interface RadioState extends JsonObject {
  currentTrackIndex?: number
  tracks?: RadioTrack[]
  shuffleEnabled?: boolean
  repeatEnabled?: boolean
}

export interface AppSettingsById {
  'yes-no': YesNoSettings
  type: TypeSettings
  cards: CardsSettings
  sequence: SequenceSettings
  timer: TimerSettings
  radio: RadioSettings
}

export interface AppStateById {
  'yes-no': YesNoState
  type: TypeState
  cards: CardsState
  sequence: SequenceState
  timer: TimerState
  radio: RadioState
}

export class TikoDataClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch

  constructor(options: DataClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.fetcher = options.fetch ?? fetch
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
