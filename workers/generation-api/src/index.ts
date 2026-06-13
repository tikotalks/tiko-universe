import { authenticate } from '../../shared/auth'
import type { AuthSuccess } from '../../shared/auth'

export interface Env {
  GENERATION_DB: D1DatabaseLike
  GENERATED_MEDIA_BUCKET: R2BucketLike
  OPENAI_API_KEY?: string
  ELEVENLABS_API_KEY?: string
  API_KEYS?: string
  AUTH_DB?: {
    prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; all(): Promise<{ results: unknown[] }> } }
  }
  IDENTITY_BASE_URL?: string
  GENERATION_PUBLIC_ROUTE?: string
  IDENTITY_SERVICE?: {
    fetch(input: Request | string, init?: RequestInit): Promise<Response>
  }
  ATLAS_SERVICE?: {
    fetch(input: Request | string, init?: RequestInit): Promise<Response>
  }
  ATLAS_BASE_URL?: string
  ATLAS_API_KEY?: string
}

export interface D1DatabaseLike {
  prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }>; run(): Promise<{ meta?: { changes?: number } }> } }
}

export interface R2BucketLike {
  get(key: string): Promise<{ body: BodyInit; httpMetadata?: { contentType?: string } } | null>
  put(key: string, value: ArrayBuffer | Uint8Array, options?: Record<string, unknown>): Promise<unknown>
  delete(key: string): Promise<unknown>
}

export type TtsProvider = 'openai' | 'azure' | 'elevenlabs' | 'auto'

export interface GenerationTtsRequest {
  text: string
  language: string
  provider?: TtsProvider
  voice?: string
  model?: string
  speed?: number
  pitch?: number
}

interface NormalizedTtsRequest extends Required<GenerationTtsRequest> {}

interface GenerateAudioSuccess {
  success: true
  bytes: Uint8Array
  contentType: string
}

interface GenerateAudioFailure {
  success: false
  error: string
  status?: number
}

interface PaidAuthContext {
  auth: AuthSuccess
  subjectKey: string
}

interface GenerationAccessContext {
  auth: AuthSuccess | null
}

interface UsagePolicy {
  capability: string
  units: number
  maxRequestsPerMinute: number
  maxUnitsPerDay: number
}

interface AtlasSpeechResponse {
  data?: {
    id?: string
    audioUrl?: string
    contentType?: string
    cached?: boolean
    provider?: { name?: string; model?: string; voice?: string }
  }
  meta?: { cached?: boolean; schemaVersion?: number; requestId?: string }
  error?: { code?: string; message?: string }
}

interface AtlasImageResponse {
  data?: {
    images?: Array<{
      id?: string
      mediaUrl?: string
      contentType?: string
      revisedPrompt?: string | null
      provider?: { name?: string; model?: string }
    }>
  }
  meta?: { cached?: boolean; schemaVersion?: number; requestId?: string }
  error?: { code?: string; message?: string }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const OPENAI_VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'])
const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2'
const DEFAULT_ELEVENLABS_VOICE = '21m00Tcm4TlvDq8ikWAM'
const ELEVENLABS_VOICE_ID_RE = /^[a-zA-Z0-9_-]{6,64}$/
const PROVIDER_TIMEOUT_MS = 20_000
const PROVIDER_IMAGE_TIMEOUT_MS = 45_000
const DEFAULT_ELEVENLABS_VOICES = [
  { id: DEFAULT_ELEVENLABS_VOICE, label: 'Rachel' },
  { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh' },
  { id: 'VR6AewLTigWG4xSOukaG', label: 'Arnold' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', label: 'Sam' },
]
const OPENAI_VOICE_CATALOG = Array.from(OPENAI_VOICES).map((id) => ({
  id,
  provider: 'openai' as const,
  model: 'tts-1',
  label: id.charAt(0).toUpperCase() + id.slice(1),
  sampleUrl: `/v1/generation/voice-samples/${id}?provider=openai&model=tts-1`,
}))
const ELEVENLABS_VOICE_CATALOG = DEFAULT_ELEVENLABS_VOICES.map((voice) => ({
  id: voice.id,
  provider: 'elevenlabs' as const,
  model: DEFAULT_ELEVENLABS_MODEL,
  label: voice.label,
  sampleUrl: `/v1/generation/voice-samples/${voice.id}?provider=elevenlabs&model=${DEFAULT_ELEVENLABS_MODEL}`,
}))

const VOICE_SAMPLE_KEY_RE = /^voice-samples\/[a-z0-9._-]+\/[a-zA-Z0-9_-]{6,64}\.mp3$/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

      const url = new URL(request.url)
      if (url.pathname === '/v1/generation/health' && request.method === 'GET') return generationHealth()
      if (url.pathname === '/v1/generation/voices' && request.method === 'GET') return requirePaidAccess(request, env, { capability: 'voices.list', units: 1, maxRequestsPerMinute: 120, maxUnitsPerDay: 2000 }, () => listVoices(url, env))
      if (url.pathname === '/v1/generation/tts' && request.method === 'POST') return generateTts(request, env)
      if (url.pathname.startsWith('/v1/generation/voice-samples/') && request.method === 'GET') return requirePaidAccess(request, env, { capability: 'voice.sample', units: 40, maxRequestsPerMinute: 30, maxUnitsPerDay: 2000 }, () => getVoiceSample(url, env))
      if (url.pathname === '/v1/generation/image' && request.method === 'POST') return requireAuth(request, env, (access) => generateImage(request, env, access))
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/binary') && request.method === 'GET') return getImage(request, url.pathname, env)
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/promote') && request.method === 'POST') return requireAuth(request, env, (access) => promoteImage(url.pathname, env, access))
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/media-link') && request.method === 'POST') return requireAuth(request, env, (access) => linkImageMedia(url.pathname, request, env, access))
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/enrich') && request.method === 'POST') return requireAuth(request, env, (access) => enrichImage(url.pathname, env, access))
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/edit') && request.method === 'POST') return requireAuth(request, env, (access) => editImageVariant(url.pathname, request, env, access))
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/upscale') && request.method === 'POST') return requireAuth(request, env, (access) => upscaleImage(url.pathname, request, env, access))
      if (url.pathname.startsWith('/v1/generation/images/') && request.method === 'DELETE') return requireAuth(request, env, (access) => deleteImage(url.pathname, env, access))
      if (url.pathname === '/v1/generation/images' && request.method === 'GET') return listImages(request, env)
      if (url.pathname === '/v1/generation/stories/tryout' && request.method === 'POST') return requireAuth(request, env, (access) => generateStoryTryout(request, env, access))
      if (url.pathname === '/v1/generation/stories/render' && request.method === 'POST') return requireAuth(request, env, (access) => renderStory(request, env, access))
      if (url.pathname === '/v1/generation/story-drafts' && request.method === 'POST') return requireAuth(request, env, (access) => createStoryDraft(request, env, access))
      if (url.pathname === '/v1/generation/story-drafts' && request.method === 'GET') return requireAuth(request, env, (access) => listStoryDrafts(env, access))
      if (url.pathname.startsWith('/v1/generation/stories/') && url.pathname.endsWith('/audio') && request.method === 'GET') return getStoryAudio(request, url.pathname, env)
      if (url.pathname.startsWith('/v1/generation/stories/') && url.pathname.endsWith('/promote') && request.method === 'POST') return requireAuth(request, env, (access) => promoteStory(url.pathname, env, access))
      if (url.pathname.startsWith('/v1/generation/stories/') && request.method === 'DELETE') return requireAuth(request, env, (access) => deleteStory(url.pathname, env, access))
      if (url.pathname === '/v1/generation/stories' && request.method === 'GET') return listStories(request, env)

      return apiError('not_found', 'Route not found.', 404)
    } catch (error) {
      console.error('[generation-api] unhandled request error', error)
      return apiError('internal_error', 'Generation request failed.', 500)
    }
  },
}

async function listVoices(url: URL, env: Env): Promise<Response> {
  const requestedModel = url.searchParams.get('model')?.trim()
  const provider = url.searchParams.get('provider')?.trim()
  const dynamicElevenLabsVoices = await fetchElevenLabsVoices(env).catch(() => ELEVENLABS_VOICE_CATALOG)
  let voices = [...dynamicElevenLabsVoices, ...OPENAI_VOICE_CATALOG]
  if (provider) voices = voices.filter((voice) => voice.provider === provider)
  if (requestedModel) {
    const modelProvider = requestedModel.startsWith('eleven_') ? 'elevenlabs' : 'openai'
    voices = voices.filter((voice) => voice.provider === modelProvider).map((voice) => ({ ...voice, model: requestedModel }))
  }
  return json({ data: { voices }, meta: { schemaVersion: 1 } })
}

async function fetchElevenLabsVoices(env: Env) {
  if (!env.ELEVENLABS_API_KEY) return ELEVENLABS_VOICE_CATALOG
  const response = await fetchWithRetry('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } }, { timeoutMs: PROVIDER_TIMEOUT_MS })
  if (!response.ok) return ELEVENLABS_VOICE_CATALOG
  const body = await response.json() as { voices?: Array<{ voice_id?: string; name?: string; labels?: Record<string, string> }> }
  const voices = (body.voices ?? [])
    .filter((voice) => voice.voice_id && ELEVENLABS_VOICE_ID_RE.test(voice.voice_id))
    .map((voice) => ({
      id: voice.voice_id!,
      provider: 'elevenlabs' as const,
      model: DEFAULT_ELEVENLABS_MODEL,
      label: voice.name || voice.voice_id!,
      labels: voice.labels ?? {},
      sampleUrl: `/v1/generation/voice-samples/${voice.voice_id}?provider=elevenlabs&model=${DEFAULT_ELEVENLABS_MODEL}`,
    }))
  return voices.length ? voices : ELEVENLABS_VOICE_CATALOG
}

function generationHealth(): Response {
  return json({
    data: {
      service: 'generation-api',
      status: 'ok',
      capabilities: ['tts', 'image', 'story-drafts', 'story-render', 'voice-samples'],
    },
    meta: { schemaVersion: 1 },
  })
}

async function requireAuth(request: Request, env: Env, handler: (context: GenerationAccessContext) => Promise<Response>): Promise<Response> {
  const authed = await authenticate(request, env)
  if (authed.ok === false) {
    const headers = new Headers(authed.response.headers)
    for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
    return new Response(authed.response.body, { status: authed.response.status, statusText: authed.response.statusText, headers })
  }
  return handler({ auth: authed })
}

async function optionalAuth(request: Request, env: Env): Promise<GenerationAccessContext | Response> {
  if (!request.headers.has('authorization')) return { auth: null }
  const authed = await authenticate(request, env)
  if (authed.ok === false) {
    const headers = new Headers(authed.response.headers)
    for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
    return new Response(authed.response.body, { status: authed.response.status, statusText: authed.response.statusText, headers })
  }
  return { auth: authed }
}

function isServiceAccess(context: GenerationAccessContext): boolean {
  return context.auth?.method === 'api_key'
}

function sessionUserId(context: GenerationAccessContext): string | null {
  return context.auth?.method === 'session' && context.auth.userId ? context.auth.userId : null
}

function createdBy(context: GenerationAccessContext): string | null {
  return sessionUserId(context)
}

function canAccessOwnedRecord(context: GenerationAccessContext, record: { is_public?: unknown; created_by?: unknown }): boolean {
  if (Number(record.is_public ?? 0) === 1) return true
  if (isServiceAccess(context)) return true
  const userId = sessionUserId(context)
  return !!userId && typeof record.created_by === 'string' && record.created_by === userId
}

function canMutateOwnedRecord(context: GenerationAccessContext, record: { created_by?: unknown }): boolean {
  if (isServiceAccess(context)) return true
  const userId = sessionUserId(context)
  return !!userId && typeof record.created_by === 'string' && record.created_by === userId
}

function forbiddenOrUnauthorized(context: GenerationAccessContext): Response {
  return context.auth ? apiError('forbidden', 'You do not have access to this generated content.', 403) : apiError('unauthorized', 'Authentication is required.', 401)
}

async function requirePaidAccess(request: Request, env: Env, policy: UsagePolicy, handler: (context: PaidAuthContext) => Promise<Response>): Promise<Response> {
  const context = await authenticatePaidRequest(request, env)
  if (context instanceof Response) return context
  const usageError = await recordUsageWindow(env, context.subjectKey, policy)
  if (usageError) return usageError
  return handler(context)
}

async function authenticatePaidRequest(request: Request, env: Env): Promise<PaidAuthContext | Response> {
  const authed = await authenticate(request, env)
  if (authed.ok === false) {
    const headers = new Headers(authed.response.headers)
    for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
    return new Response(authed.response.body, { status: authed.response.status, statusText: authed.response.statusText, headers })
  }
  const token = bearerToken(request)
  const subjectKey = authed.method === 'session' && authed.userId
    ? `session:${authed.userId}`
    : `key:${await sha256Hex(token)}`
  return { auth: authed, subjectKey }
}

async function recordUsageWindow(env: Env, subjectKey: string, policy: UsagePolicy): Promise<Response | null> {
  const now = new Date()
  const minuteStart = new Date(Math.floor(now.getTime() / 60000) * 60000).toISOString()
  const dayStart = now.toISOString().slice(0, 10)
  const minute = await readUsageWindow(env, subjectKey, policy.capability, 'minute', minuteStart)
  if (minute.request_count >= policy.maxRequestsPerMinute) return apiError('rate_limited', 'Rate limit exceeded.', 429)
  const day = await readUsageWindow(env, subjectKey, policy.capability, 'day', dayStart)
  if (day.unit_count + policy.units > policy.maxUnitsPerDay) return apiError('budget_exceeded', 'Daily usage budget exceeded.', 429)
  await incrementUsageWindow(env, subjectKey, policy.capability, 'minute', minuteStart, 1, policy.units)
  await incrementUsageWindow(env, subjectKey, policy.capability, 'day', dayStart, 1, policy.units)
  return null
}

async function readUsageWindow(env: Env, subjectKey: string, capability: string, windowKind: string, windowStart: string): Promise<{ request_count: number; unit_count: number }> {
  const row = await env.GENERATION_DB.prepare(`
    SELECT request_count, unit_count FROM generation_usage_windows
    WHERE subject_key = ? AND capability = ? AND window_kind = ? AND window_start = ?
    LIMIT 1
  `).bind(subjectKey, capability, windowKind, windowStart).first<{ request_count: number; unit_count: number }>()
  return { request_count: Number(row?.request_count ?? 0), unit_count: Number(row?.unit_count ?? 0) }
}

async function incrementUsageWindow(env: Env, subjectKey: string, capability: string, windowKind: string, windowStart: string, requests: number, units: number): Promise<void> {
  const at = new Date().toISOString()
  await env.GENERATION_DB.prepare(`
    INSERT INTO generation_usage_windows (subject_key, capability, window_kind, window_start, request_count, unit_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(subject_key, capability, window_kind, window_start) DO UPDATE SET
      request_count = request_count + excluded.request_count,
      unit_count = unit_count + excluded.unit_count,
      updated_at = excluded.updated_at
  `).bind(subjectKey, capability, windowKind, windowStart, requests, units, at).run()
}

interface StoryDraftChapter {
  id?: string
  title?: string
  text?: string
  voice?: string
  speed?: number
  position?: number
}

interface StoryDraftRow {
  id: string
  title: string
  description?: string | null
  cover_media_id?: string | null
  default_voice: string
  default_speed: number
  target_album_id?: string | null
  status: string
  chapters: string
  settings: string
  created_by: string | null
  created_at: string
  updated_at: string
}

function rowToStoryDraft(row: StoryDraftRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    coverMediaId: row.cover_media_id ?? undefined,
    defaultVoice: row.default_voice,
    defaultSpeed: row.default_speed,
    targetAlbumId: row.target_album_id ?? undefined,
    status: row.status,
    chapters: parseJsonArray(row.chapters),
    settings: parseJsonObject(row.settings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function parseJsonArray(value: unknown): unknown[] {
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

async function createStoryDraft(request: Request, env: Env, access: GenerationAccessContext): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400)
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return apiError('missing_title', 'Story title is required.', 400, 'title')
  const defaultVoice = typeof body.defaultVoice === 'string' && ELEVENLABS_VOICE_ID_RE.test(body.defaultVoice) ? body.defaultVoice : DEFAULT_ELEVENLABS_VOICE
  const defaultSpeed = typeof body.defaultSpeed === 'number' ? clamp(body.defaultSpeed, 0.25, 4) : 1
  const chapters = Array.isArray(body.chapters) ? body.chapters.map((chapter, index) => normalizeDraftChapter(chapter as StoryDraftChapter, index, defaultVoice, defaultSpeed)) : []
  const now = new Date().toISOString()
  const row: StoryDraftRow = {
    id: crypto.randomUUID(),
    title,
    description: typeof body.description === 'string' ? body.description : null,
    cover_media_id: typeof body.coverMediaId === 'string' ? body.coverMediaId : null,
    default_voice: defaultVoice,
    default_speed: defaultSpeed,
    target_album_id: typeof body.targetAlbumId === 'string' ? body.targetAlbumId : null,
    status: 'draft',
    chapters: JSON.stringify(chapters),
    settings: JSON.stringify(body.settings && typeof body.settings === 'object' ? body.settings : {}),
    created_by: createdBy(access),
    created_at: now,
    updated_at: now,
  }

  await env.GENERATION_DB.prepare(
    `INSERT INTO story_drafts (id, title, description, cover_media_id, default_voice, default_speed, target_album_id, status, chapters, settings, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(row.id, row.title, row.description, row.cover_media_id, row.default_voice, row.default_speed, row.target_album_id, row.status, row.chapters, row.settings, row.created_by, row.created_at, row.updated_at).run()

  return json({ data: rowToStoryDraft(row), meta: { schemaVersion: 1 } }, 201)
}

function normalizeDraftChapter(chapter: StoryDraftChapter, index: number, defaultVoice: string, defaultSpeed: number) {
  const voice = typeof chapter.voice === 'string' && OPENAI_VOICES.has(chapter.voice) ? chapter.voice : defaultVoice
  return {
    id: typeof chapter.id === 'string' ? chapter.id : crypto.randomUUID(),
    title: typeof chapter.title === 'string' && chapter.title.trim() ? chapter.title.trim() : `Chapter ${index + 1}`,
    text: typeof chapter.text === 'string' ? chapter.text.trim() : '',
    voice,
    speed: typeof chapter.speed === 'number' ? clamp(chapter.speed, 0.25, 4) : defaultSpeed,
    position: typeof chapter.position === 'number' ? chapter.position : index + 1,
  }
}

async function listStoryDrafts(env: Env, access: GenerationAccessContext): Promise<Response> {
  const where = isServiceAccess(access) ? '' : 'WHERE created_by = ?'
  const values = isServiceAccess(access) ? [] : [sessionUserId(access)]
  const rows = await env.GENERATION_DB.prepare(
    `SELECT id, title, description, cover_media_id, default_voice, default_speed, target_album_id, status, chapters, settings, created_by, created_at, updated_at
     FROM story_drafts ${where} ORDER BY updated_at DESC`,
  ).bind(...values).all<StoryDraftRow>()
  return json({ data: rows.results.map(rowToStoryDraft), meta: { total: rows.results.length, schemaVersion: 1 } })
}

async function generateTts(request: Request, env: Env): Promise<Response> {
  let body: GenerationTtsRequest
  try {
    body = await request.json() as GenerationTtsRequest
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400)
  }

  const validationError = validateTtsRequest(body)
  if (validationError) return apiError(validationError.code, validationError.message, 400, validationError.field)

  const normalized = normalizeTtsRequest(body)
  const access = await authenticatePaidRequest(request, env)
  if (access instanceof Response) return access
  const usageError = await recordUsageWindow(env, access.subjectKey, {
    capability: 'tts.generate',
    units: Math.max(1, normalized.text.length),
    maxRequestsPerMinute: 60,
    maxUnitsPerDay: 12000,
  })
  if (usageError) return usageError

  return synthesizeWithAtlas(normalized, env)
}

async function synthesizeWithAtlas(input: NormalizedTtsRequest, env: Env): Promise<Response> {
  const atlas = await requestAtlasSpeech(input, env, 'speech-playback')
  if (atlas.success === false) return apiError(atlas.error, providerSafeMessage(atlas.error), atlas.status ?? 503)

  const data = atlas.body.data
  return json({
    data: {
      id: data.id,
      audioUrl: data.audioUrl,
      contentType: data.contentType ?? 'audio/mpeg',
      provider: data.provider?.name ?? input.provider,
      language: input.language,
      voice: data.provider?.voice ?? input.voice,
      model: data.provider?.model ?? input.model,
    },
    meta: {
      cached: atlas.body.meta?.cached ?? data.cached ?? false,
      schemaVersion: 1,
      atlasRequestId: atlas.body.meta?.requestId,
    },
  }, 201)
}

type AtlasSpeechPurpose = 'speech-playback' | 'voice-sample' | 'story-narration'

type AtlasSpeechSuccess = {
  success: true
  body: AtlasSpeechResponse & { data: { id: string; audioUrl: string; contentType?: string; cached?: boolean; provider?: { name?: string; model?: string; voice?: string } } }
}

type AtlasSpeechFailure = {
  success: false
  error: string
  status?: number
}

async function requestAtlasSpeech(input: NormalizedTtsRequest, env: Env, purpose: AtlasSpeechPurpose): Promise<AtlasSpeechSuccess | AtlasSpeechFailure> {
  if (!env.ATLAS_SERVICE) return { success: false, error: 'atlas_tts_not_configured', status: 503 }
  if (!env.ATLAS_API_KEY) return { success: false, error: 'atlas_service_key_not_configured', status: 503 }

  const atlasPayload: Record<string, unknown> = {
    app: 'generation-api',
    purpose,
    text: input.text,
    language: input.language,
    speed: input.speed,
  }
  if (purpose !== 'speech-playback') {
    atlasPayload.provider = input.provider
    atlasPayload.voice = input.voice
    atlasPayload.model = input.model
  }

  const response = await env.ATLAS_SERVICE.fetch(new Request(atlasUrl(env, '/speech'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.ATLAS_API_KEY}` },
    body: JSON.stringify(atlasPayload),
  }))
  const body = await response.json().catch(() => null) as AtlasSpeechResponse | null

  if (!response.ok) {
    return { success: false, error: body?.error?.code ?? 'atlas_tts_failed', status: response.status }
  }

  const data = body?.data
  if (!data?.id || !data.audioUrl) {
    return { success: false, error: 'atlas_tts_invalid_response', status: 502 }
  }

  return { success: true, body: body as AtlasSpeechSuccess['body'] }
}

function atlasUrl(env: Env, path: string): string {
  return `${(env.ATLAS_BASE_URL ?? 'https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas').replace(/\/$/, '')}${path}`
}

export function normalizeTtsRequest(body: GenerationTtsRequest): NormalizedTtsRequest {
  const requestedModel = body.model?.trim()
  const modelProvider = requestedModel?.startsWith('eleven_') ? 'elevenlabs' : requestedModel?.startsWith('tts-') || requestedModel === 'gpt-4o-mini-tts' ? 'openai' : null
  const provider = body.provider === 'azure' ? 'azure' : body.provider === 'openai' ? 'openai' : body.provider === 'elevenlabs' ? 'elevenlabs' : modelProvider ?? 'elevenlabs'
  const voice = provider === 'openai'
    ? (body.voice && OPENAI_VOICES.has(body.voice) ? body.voice : 'nova')
    : (body.voice && ELEVENLABS_VOICE_ID_RE.test(body.voice) ? body.voice : DEFAULT_ELEVENLABS_VOICE)
  const model = requestedModel || (provider === 'openai' ? 'tts-1' : DEFAULT_ELEVENLABS_MODEL)

  return {
    text: body.text.trim(),
    language: body.language.trim().toLowerCase(),
    provider,
    voice,
    model,
    speed: clamp(body.speed ?? 1, 0.25, 4),
    pitch: clamp(body.pitch ?? 0, -20, 20),
  }
}

export function validateTtsRequest(body: GenerationTtsRequest): { code: string; message: string; field?: string } | null {
  if (!body || typeof body !== 'object') return { code: 'invalid_body', message: 'Request body must be an object.' }
  if (!body.text || typeof body.text !== 'string' || !body.text.trim()) return { code: 'missing_text', message: 'Text is required.', field: 'text' }
  if (!body.language || typeof body.language !== 'string' || !body.language.trim()) return { code: 'missing_language', message: 'Language is required.', field: 'language' }
  if (body.text.length > 500) return { code: 'text_too_long', message: 'Text must be 500 characters or fewer.', field: 'text' }
  if (body.speed !== undefined && (typeof body.speed !== 'number' || Number.isNaN(body.speed))) return { code: 'invalid_speed', message: 'Speed must be a number.', field: 'speed' }
  if (body.pitch !== undefined && (typeof body.pitch !== 'number' || Number.isNaN(body.pitch))) return { code: 'invalid_pitch', message: 'Pitch must be a number.', field: 'pitch' }
  return null
}

export async function generateRequestHash(input: NormalizedTtsRequest): Promise<string> {
  const str = [input.text, input.language, input.provider, input.voice, input.model, input.speed, input.pitch].join('|')
  const bytes = new TextEncoder().encode(str)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

async function storySegmentCacheKey(input: NormalizedTtsRequest): Promise<string> {
  return `story-segments/${await generateRequestHash(input)}.mp3`
}

function isSafeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id)
}

async function generateAudioBytes(input: NormalizedTtsRequest, env: Env, purpose: AtlasSpeechPurpose): Promise<GenerateAudioSuccess | GenerateAudioFailure> {
  const speech = await requestAtlasSpeech(input, env, purpose)
  if (speech.success === false) return speech

  const assetResponse = await env.ATLAS_SERVICE!.fetch(new Request(atlasAssetUrl(env, speech.body.data.audioUrl)))
  if (!assetResponse.ok) return { success: false, error: 'atlas_tts_asset_unavailable', status: assetResponse.status }

  return {
    success: true,
    bytes: new Uint8Array(await assetResponse.arrayBuffer()),
    contentType: assetResponse.headers.get('content-type') ?? speech.body.data.contentType ?? 'audio/mpeg',
  }
}

function atlasAssetUrl(env: Env, audioUrl: string): string {
  if (/^https?:\/\//i.test(audioUrl)) return audioUrl
  const path = audioUrl.startsWith('/v1/atlas/') ? audioUrl.replace('/v1/atlas', '') : audioUrl
  return atlasUrl(env, path.startsWith('/') ? path : `/${path}`)
}

async function getVoiceSample(url: URL, env: Env): Promise<Response> {
  const voiceId = decodeURIComponent(url.pathname.replace('/v1/generation/voice-samples/', ''))
  if (!ELEVENLABS_VOICE_ID_RE.test(voiceId) && !OPENAI_VOICES.has(voiceId)) return apiError('invalid_voice_id', 'Voice id is invalid.', 400)
  const provider = url.searchParams.get('provider') === 'openai' ? 'openai' : 'elevenlabs'
  const normalized = normalizeTtsRequest({
    text: 'Hello from Tiko. This is how this voice sounds.',
    language: 'en',
    provider,
    voice: voiceId,
    model: url.searchParams.get('model') || undefined,
  })
  const safeModel = normalized.model.replace(/[^a-zA-Z0-9._-]/g, '') || (normalized.provider === 'openai' ? 'tts-1' : DEFAULT_ELEVENLABS_MODEL)
  const r2Key = `voice-samples/${safeModel}/${normalized.voice}.mp3`
  if (!VOICE_SAMPLE_KEY_RE.test(r2Key)) return apiError('invalid_voice_sample', 'Voice sample path is invalid.', 400)
  const existing = await env.GENERATED_MEDIA_BUCKET.get(r2Key)
  if (existing) return audioResponse(existing, 'public, max-age=31536000, immutable')
  const generated = await generateAudioBytes(normalized, env, 'voice-sample')
  if (generated.success === false) return apiError(generated.error, providerSafeMessage(generated.error), generated.status ?? 503)
  await env.GENERATED_MEDIA_BUCKET.put(r2Key, generated.bytes, { httpMetadata: { contentType: generated.contentType, cacheControl: 'public, max-age=31536000, immutable' } })
  return new Response(bytesBody(generated.bytes), { headers: { ...CORS_HEADERS, 'Content-Type': generated.contentType, 'Cache-Control': 'public, max-age=31536000, immutable' } })
}

function bytesBody(bytes: Uint8Array): ArrayBuffer {
  const body = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(body).set(bytes)
  return body
}

function providerSafeMessage(code: string) {
  switch (code) {
    case 'atlas_tts_not_configured': return 'Atlas TTS is not configured.'
    case 'atlas_service_key_not_configured': return 'Atlas service key is not configured.'
    case 'atlas_tts_invalid_response': return 'Atlas returned an invalid TTS response.'
    case 'atlas_tts_asset_unavailable': return 'Atlas TTS asset is temporarily unavailable.'
    case 'atlas_tts_failed': return 'Atlas TTS request failed.'
    case 'azure_tts_not_configured': return 'Azure TTS is not configured.'
    case 'tts_generation_not_configured': return 'TTS generation is not configured.'
    case 'elevenlabs_tts_not_configured': return 'ElevenLabs TTS is not configured.'
    case 'tts_provider_failed': return 'TTS provider failed.'
    case 'tts_provider_unavailable': return 'TTS provider is temporarily unavailable.'
    default: return 'TTS generation failed.'
  }
}

// ── Story narration (multi-segment TTS) ───────────────────────────

interface StorySegment {
  id?: string
  text: string
  pauseAfterMs?: number
}

interface StoryTryoutRequest {
  text: string
  language?: string
  voice?: string
  model?: string
  speed?: number
}

interface StoryRenderRequest {
  title: string
  description?: string
  language?: string
  voice?: string
  model?: string
  speed?: number
  segments: StorySegment[]
  category?: string
  tags?: string[]
}

interface StoryRecord {
  id: string
  title: string
  description: string | null
  voice: string
  speed: number
  segments: string
  status: 'draft' | 'rendering' | 'complete' | 'error'
  audio_url: string | null
  r2_key: string | null
  duration_seconds: number | null
  file_size_bytes: number | null
  category: string
  tags: string
  is_public: number
  created_by: string | null
  created_at: string
  updated_at: string
}

async function generateStoryTryout(request: Request, env: Env, _access: GenerationAccessContext): Promise<Response> {
  let body: StoryTryoutRequest
  try { body = await request.json() as StoryTryoutRequest } catch { return apiError('invalid_json', 'Request body must be valid JSON.', 400) }

  if (!body.text || typeof body.text !== 'string' || !body.text.trim()) return apiError('missing_text', 'Text is required.', 400, 'text')
  if (body.text.length > 800) return apiError('text_too_long', 'Tryout text must be 800 characters or fewer.', 400, 'text')

  const normalized = normalizeTtsRequest({ text: body.text, language: body.language || 'en', provider: 'elevenlabs', voice: body.voice, model: body.model, speed: body.speed })
  const generated = await generateAudioBytes(normalized, env, 'story-narration')
  if (generated.success === false) return apiError(generated.error, providerSafeMessage(generated.error), generated.status ?? 503)

  const id = crypto.randomUUID()
  const r2Key = `story-tryouts/${id}.mp3`
  const audioUrl = `/v1/generation/stories/tryouts/${id}/audio`
  await env.GENERATED_MEDIA_BUCKET.put(r2Key, generated.bytes, { httpMetadata: { contentType: generated.contentType, cacheControl: 'private, max-age=3600' } })

  return json({ data: { id, audioUrl, contentType: generated.contentType, fileSizeBytes: generated.bytes.byteLength }, meta: { schemaVersion: 1 } }, 201)
}

async function renderStory(request: Request, env: Env, access: GenerationAccessContext): Promise<Response> {
  let body: StoryRenderRequest
  try { body = await request.json() as StoryRenderRequest } catch { return apiError('invalid_json', 'Request body must be valid JSON.', 400) }

  if (!body.title?.trim()) return apiError('missing_title', 'Story title is required.', 400, 'title')
  if (!Array.isArray(body.segments) || body.segments.length === 0) return apiError('missing_segments', 'At least one story segment is required.', 400, 'segments')
  if (body.segments.length > 40) return apiError('too_many_segments', 'Stories can have at most 40 segments.', 400, 'segments')

  const cleanSegments = body.segments.map((segment, index) => ({ id: segment.id || `segment-${index + 1}`, text: String(segment.text || '').trim(), pauseAfterMs: clamp(Number(segment.pauseAfterMs ?? 350), 0, 5000) }))
  if (cleanSegments.some(segment => !segment.text)) return apiError('empty_segment', 'Every segment needs text.', 400, 'segments')
  if (cleanSegments.reduce((sum, segment) => sum + segment.text.length, 0) > 12000) return apiError('story_too_long', 'Story text must be 12000 characters or fewer.', 400, 'segments')

  const voice = body.voice && ELEVENLABS_VOICE_ID_RE.test(body.voice) ? body.voice : DEFAULT_ELEVENLABS_VOICE
  const speed = clamp(body.speed ?? 1, 0.25, 4)
  const chunks: Uint8Array[] = []

  for (const segment of cleanSegments) {
    const normalized = normalizeTtsRequest({ text: segment.text, language: body.language || 'en', provider: 'elevenlabs', voice, model: body.model || DEFAULT_ELEVENLABS_MODEL, speed })
    const segmentKey = await storySegmentCacheKey(normalized)
    const cached = await env.GENERATED_MEDIA_BUCKET.get(segmentKey)
    if (cached) {
      chunks.push(new Uint8Array(await new Response(cached.body).arrayBuffer()))
    } else {
      const generated = await generateAudioBytes(normalized, env, 'story-narration')
      if (generated.success === false) return apiError(generated.error, providerSafeMessage(generated.error), generated.status ?? 503)
      await env.GENERATED_MEDIA_BUCKET.put(segmentKey, generated.bytes, { httpMetadata: { contentType: generated.contentType, cacheControl: 'public, max-age=31536000, immutable' } })
      chunks.push(generated.bytes)
    }
    if (segment.pauseAfterMs > 0) chunks.push(makeSilentMp3Padding())
  }

  const audioBytes = concatBytes(chunks)
  const id = crypto.randomUUID()
  const r2Key = `stories/${id}.mp3`
  const audioUrl = `/v1/generation/stories/${id}/audio`
  const now = new Date().toISOString()

  await env.GENERATED_MEDIA_BUCKET.put(r2Key, audioBytes, { httpMetadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' } })

  await env.GENERATION_DB.prepare(`INSERT INTO stories (
    id, title, description, voice, speed, segments, status, audio_url, r2_key,
    duration_seconds, file_size_bytes, category, tags, is_public, created_by, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, body.title.trim(), body.description?.trim() || null, voice, speed, JSON.stringify(cleanSegments), 'complete', audioUrl, r2Key,
    null, audioBytes.byteLength, body.category || 'story', JSON.stringify(body.tags || []), 0, createdBy(access), now, now,
  ).run()

  return json({ data: { id, title: body.title.trim(), audioUrl, voice, speed, fileSizeBytes: audioBytes.byteLength, createdAt: now }, meta: { schemaVersion: 1, segmentCount: cleanSegments.length } }, 201)
}

async function getStoryAudio(request: Request, pathname: string, env: Env): Promise<Response> {
  const access = await optionalAuth(request, env)
  if (access instanceof Response) return access
  if (pathname.startsWith('/v1/generation/stories/tryouts/')) {
    if (!access.auth) return forbiddenOrUnauthorized(access)
    const id = decodeURIComponent(pathname.replace('/v1/generation/stories/tryouts/', '').replace('/audio', ''))
    if (!isSafeId(id)) return apiError('invalid_tryout_id', 'Tryout id is invalid.', 400)
    const object = await env.GENERATED_MEDIA_BUCKET.get(`story-tryouts/${id}.mp3`)
    if (!object) return apiError('tryout_not_found', 'Tryout audio not found.', 404)
    return audioResponse(object, 'private, max-age=3600')
  }

  const id = decodeURIComponent(pathname.replace('/v1/generation/stories/', '').replace('/audio', ''))
  if (!isSafeId(id)) return apiError('invalid_story_id', 'Story id is invalid.', 400)
  const record = await env.GENERATION_DB.prepare('SELECT r2_key, is_public, created_by FROM stories WHERE id = ? LIMIT 1').bind(id).first<{ r2_key: string | null; is_public: number; created_by: string | null }>()
  if (!record?.r2_key) return apiError('story_not_found', 'Story not found.', 404)
  if (!canAccessOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)
  const object = await env.GENERATED_MEDIA_BUCKET.get(record.r2_key)
  if (!object) return apiError('story_not_found', 'Story audio not found.', 404)
  return audioResponse(object, 'public, max-age=31536000, immutable')
}

async function listStories(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const access = await optionalAuth(request, env)
  if (access instanceof Response) return access
  const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)
  const offset = (page - 1) * limit
  const status = url.searchParams.get('status') || 'promoted'
  const isPublic = status === 'draft' ? 0 : 1
  if (isPublic === 0 && !access.auth) return forbiddenOrUnauthorized(access)
  const ownerClause = isPublic === 0 && !isServiceAccess(access) ? ' AND created_by = ?' : ''
  const ownerValues = ownerClause ? [sessionUserId(access)] : []

  const rows = await env.GENERATION_DB.prepare(`SELECT id, title, description, voice, speed, segments, status, audio_url, r2_key,
      duration_seconds, file_size_bytes, category, tags, is_public, created_by, created_at, updated_at
    FROM stories WHERE is_public = ?${ownerClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(isPublic, ...ownerValues, limit, offset).all<StoryRecord>()
  const countRow = await env.GENERATION_DB.prepare(`SELECT COUNT(*) AS count FROM stories WHERE is_public = ?${ownerClause}`).bind(isPublic, ...ownerValues).first<{ count: number }>()
  const total = countRow?.count ?? 0
  return json({
    data: rows.results.map(row => ({ id: row.id, title: row.title, description: row.description, voice: row.voice, speed: row.speed, segmentCount: JSON.parse(row.segments || '[]').length, status: row.is_public === 1 ? 'promoted' : 'draft', renderStatus: row.status, audioUrl: row.audio_url, fileSizeBytes: row.file_size_bytes, category: row.category, tags: JSON.parse(row.tags || '[]'), createdAt: row.created_at })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit), status },
  })
}

async function promoteStory(pathname: string, env: Env, access: GenerationAccessContext): Promise<Response> {
  const id = pathname.replace('/v1/generation/stories/', '').replace('/promote', '')
  if (!isSafeId(id)) return apiError('invalid_story_id', 'Story id is invalid.', 400)

  const record = await env.GENERATION_DB.prepare('SELECT created_by FROM stories WHERE id = ? LIMIT 1').bind(id).first<{ created_by: string | null }>()
  if (!record) return apiError('story_not_found', 'Story not found.', 404)
  if (!canMutateOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)

  const now = new Date().toISOString()
  const result = await env.GENERATION_DB.prepare(
    'UPDATE stories SET is_public = 1, updated_at = ? WHERE id = ?',
  ).bind(now, id).run()

  if (!result.meta?.changes) return apiError('story_not_found', 'Story not found.', 404)
  return json({ data: { id, status: 'promoted', updatedAt: now } })
}

async function deleteStory(pathname: string, env: Env, access: GenerationAccessContext): Promise<Response> {
  const id = pathname.replace('/v1/generation/stories/', '')
  if (!isSafeId(id)) return apiError('invalid_story_id', 'Story id is invalid.', 400)

  const record = await env.GENERATION_DB.prepare(
    'SELECT r2_key, created_by FROM stories WHERE id = ? LIMIT 1',
  ).bind(id).first<{ r2_key: string | null; created_by: string | null }>()

  if (!record) return apiError('story_not_found', 'Story not found.', 404)
  if (!canMutateOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)
  if (record.r2_key) await env.GENERATED_MEDIA_BUCKET.delete(record.r2_key).catch(() => null)
  await env.GENERATION_DB.prepare('DELETE FROM stories WHERE id = ?').bind(id).run()

  return json({ data: { id, deleted: true } })
}

function audioResponse(object: { body: BodyInit; httpMetadata?: { contentType?: string } }, cacheControl: string): Response {
  return new Response(object.body, { headers: { ...CORS_HEADERS, 'Content-Type': object.httpMetadata?.contentType ?? 'audio/mpeg', 'Cache-Control': cacheControl } })
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

function makeSilentMp3Padding(): Uint8Array {
  return new Uint8Array(0)
}

// ── Image generation (DALL-E 3) ──────────────────────────────────

type ImageMode = 'icon' | 'coloring' | 'background'
type TikoStyle = 'tiko-original' | 'tiko-v2' | 'tiko-natural'

interface ImageGenerationRequest {
  prompt: string
  mode?: ImageMode
  tikoStyle?: TikoStyle
  size?: '1024x1024' | '1024x1792' | '1792x1024'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  transparent?: boolean
  title?: string
  category?: string
  tags?: string[]
  count?: number
}

interface GeneratedImageRecord {
  id: string
  prompt: string
  revised_prompt: string | null
  model: string
  size: string
  quality: string
  style: string
  image_url: string | null
  r2_key: string
  content_type: string
  file_size_bytes: number | null
  width: number | null
  height: number | null
  category: string
  tags: string
  title: string | null
  description: string | null
  is_public: number
  is_preview: number
  media_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

const ALLOWED_IMAGE_SIZES = new Set(['1024x1024', '1024x1792', '1792x1024'])

const ICON_STYLE_SPECS: Record<TikoStyle, object> = {
  'tiko-original': {
    task: "Generate a friendly flat 2D icon in a warm, sticker-like illustration style. Clean, bold, child-friendly.",
    style_reference: "Flat 2D illustration — like a cheerful sticker or children's book icon. Clean filled shapes with soft outlines. Warm, saturated colors. Minimal shading: flat fills with very subtle edge darkening for form. No 3D rendering, no volumetric lighting.",
    icon_idea: null,
    render_style: {
      materials: "Flat color fills only. Suggest material through color and simple shape — no volumetric rendering, no specular highlights.",
      shapes: "Bold, clean, simplified. Rounded corners, friendly proportions. Slightly stylized — not ultra-minimal, not overly complex.",
      colors: "Warm, cheerful, limited palette: 2–3 bold fills. Saturated but not neon. Warm orange, sky blue, leaf green, sun yellow. Objects look like themselves in a friendly sticker way.",
      lighting: "Flat or very soft inner glow only. No cast shadows, no volumetric lighting.",
      background: "transparent"
    },
    composition: {
      camera: "Straight front-facing or very slight 3/4.",
      layout: "Single centered subject. Clean silhouette. Optional very subtle drop shadow for grounding.",
      aspect_ratio: "1:1 square, minimum 1024x1024px",
      file_format: "High-res PNG"
    },
    surface_texture: {
      enable: false,
      texture_strength: "none",
      texture_scale: "none",
      rules: "No texture. Flat fills only."
    },
    material_hints: {
      animal: "Flat colored areas with simple outline details.",
      plant: "Solid green fills, simple vein line if needed.",
      fabric: "Flat colored panel; seam lines optional.",
      metal: "Flat color with optional thin highlight line.",
      plastic: "Flat color, small circular highlight dot."
    },
    details: {
      expression: "Friendly, simple. Faces optional unless specified.",
      structure: "Bold simplified forms; immediately readable at small sizes.",
      pose: "Clean silhouette for icon use.",
      style_constraints: "No 3D rendering, no gradient shading, no complex textures, no text or letters unless explicitly requested."
    }
  },
  'tiko-v2': {
    task: "Generate a 3D icon in a soft, stylized, contemporary look (playful but mature). Absolutely no leaves, foliage, plant elements, or text/letters unless explicitly described in icon_idea.",
    style_reference: "Soft 3D icon style in a playful, toy-like aesthetic. Smooth rounded forms, vivid natural color, calm proportions. Think high-quality vinyl toy or clay render — stylized and charming, not realistic. Subtle volumetric hints for depth but never photoreal. UI-friendly and readable at small sizes.",
    icon_idea: null,
    render_style: {
      materials: "Soft matte vinyl/clay feel. Suggest material through color and form, not texture maps — a bowl of rice has distinguishable kernels, wood has warm tone variation, fruit has gentle color gradation. Stay stylized, never photorealistic.",
      shapes: "Rounded but not chubby: tighter corner radii, controlled bevels, clean planes. No toy-like bulges; maintain confident geometry.",
      colors: "Truthful colors at natural saturation. Objects look like themselves — green leaves, red tomatoes, golden bread. 2–3 core colors plus one subtle accent. Balanced saturation; avoid candy/neon, rainbow mixes, or oversaturated single-hue dominance.",
      lighting: "Soft studio lighting with gentle key–fill contrast for a hint of dimension — just enough to lift the subject off the page. Faint rim light for pop. Soft grounded shadow. Think vinyl toy photography, not product photography. No harsh speculars.",
      background: "transparent"
    },
    composition: {
      camera: "Orthographic or slight 3/4 top-front",
      layout: "Single centered subject, grounded shadow or soft float. No decorative stars, dots, or clutter.",
      aspect_ratio: "1:1 square format, minimum 1024x1024px",
      file_format: "High-res PNG"
    },
    surface_texture: {
      enable: true,
      texture_strength: "minimal",
      texture_scale: "micro",
      rules: "Suggest material identity through subtle cues, not texture maps. Rice should show individual kernels in a stylized way; wood has warmth but no grain photo-realism; fabric suggests softness through form. Overall feel stays clean and toy-like — detail is a hint, not a feature."
    },
    material_hints: {
      animal: "Ultra-fine short flocking only on edges and silhouette—no visible strands.",
      plant: "Very light velvety bloom on leaves; bark hints only where it aids silhouette.",
      fabric: "Tight felt/woven suggestion, barely visible.",
      metal: "Fine powder-coat or brushed hint; no bright streaks.",
      plastic: "Smooth satin polymer; micro-speckle only on grazing angles."
    },
    details: {
      expression: "Neutral; no faces unless specified.",
      structure: "Clear, mature proportions; stylized but not cute or distorted.",
      pose: "Clean silhouette for icon use; instantly recognizable at small sizes.",
      style_constraints: "No oversized features, blush, sparkles, heavy gloss, visible grain, leaves, foliage, vines, plant parts, text, letters, numbers, or typographic elements unless explicitly requested."
    }
  },
  'tiko-natural': {
    task: "Generate a soft 3D icon in a natural, lively style. Same rounded toy-like forms as Tiko V2 but with a grounded color palette that stays bright and cheerful — not oversaturated, not muted.",
    style_reference: "Soft 3D icon with natural but vibrant colors. Same rounded vinyl-toy aesthetic but colors feel like fresh matte paint — present and lively without being neon. Think high-quality children's wooden toy or Scandinavian illustration with punchy but natural hues — clear greens, warm reds, golden yellows, sky blues.",
    icon_idea: null,
    render_style: {
      materials: "Same satin-matte vinyl/clay as V2. Colors feel like fresh matte paint on physical objects — bright and present, not dull or muddy.",
      shapes: "Rounded but confident. Same as V2.",
      colors: "Natural but bright palette: 2–3 colors at medium-high saturation. A tomato is a clear warm red, leaves are a fresh green, bread is a golden yellow, sky is a clear blue. Never neon, never washed-out or muddy. Target medium-high saturation with warm undertones. When in doubt, choose brighter over more muted.",
      lighting: "Same soft studio lighting as V2 but slightly warmer. Gentle diffuse light that lets the colors read clearly. No harsh speculars.",
      background: "transparent"
    },
    composition: {
      camera: "Orthographic or slight 3/4 top-front.",
      layout: "Single centered subject, grounded shadow or soft float. No decorative clutter.",
      aspect_ratio: "1:1 square, minimum 1024x1024px",
      file_format: "High-res PNG"
    },
    surface_texture: {
      enable: true,
      texture_strength: "minimal",
      texture_scale: "micro",
      rules: "Same as V2 — suggest material through subtle cues, not texture maps."
    },
    material_hints: {
      animal: "Ultra-fine short flocking only on edges.",
      plant: "Very light velvety bloom on leaves.",
      fabric: "Tight felt suggestion, barely visible.",
      metal: "Fine powder-coat hint.",
      plastic: "Smooth satin polymer."
    },
    details: {
      expression: "Neutral; no faces unless specified.",
      structure: "Clear, mature proportions; stylized but not cute or distorted.",
      pose: "Clean silhouette for icon use.",
      style_constraints: "No oversaturation, no candy colors, no neon. No sparkles, gloss streaks, or heavy specular. No text or letters unless explicitly requested."
    }
  }
}

const IMAGE_STYLE_SPECS: Record<ImageMode, object> = {
  icon: ICON_STYLE_SPECS['tiko-v2'],
  coloring: {
    task: "Generate a black-and-white coloring page (clean line art only). The subject must be fully contained within the frame with no parts cut off. CRITICAL: Absolutely NO border lines, frames, or rectangles around the edge of the image.",
    style_reference: "Crisp, closed outlines with consistent stroke weight; pure black lines on white; no shading, gradients, textures, halftones, or colors. Subject fully visible with generous padding from edges. The edge of the image must be pure white with no lines.",
    icon_idea: null,
    render_style: {
      materials: "None (ink line art). Do not simulate materials.",
      shapes: "Fully closed shapes that form clear 'panels' for coloring. Avoid gaps and feathered edges.",
      colors: "Monochrome only: black outlines (#000) on white (#FFF). No gray.",
      lighting: "None. Do not imply light/shadow.",
      background: "Pure white. No border lines, frames, or decorative elements around the edges."
    },
    composition: {
      camera: "Orthographic, straight-on or slight 3/4 if needed for clarity.",
      layout: "Single centered subject with 10-15% padding from all edges. Complete subject visible, no cropping. No border lines or frames.",
      aspect_ratio: "1:1 square, minimum 1024x1024px (vector look acceptable).",
      file_format: "High-res PNG or SVG"
    },
    surface_texture: {
      enable: false,
      texture_strength: "none",
      texture_scale: "none",
      rules: "No hatching, stipple, halftone, or line-weight shading."
    },
    material_hints: {
      animal: "Use contour outlines only; no fur strokes beyond silhouette-defining lines.",
      plant: "Use simple vein lines; keep fills empty.",
      fabric: "Seam lines allowed; no fabric shading.",
      metal: "No reflections; outline only.",
      plastic: "Outline only."
    },
    details: {
      expression: "Neutral unless specified.",
      structure: "Clear, readable proportions; simplified forms to ease coloring.",
      pose: "Strong, readable silhouette. Ensure all parts fit comfortably within frame.",
      style_constraints: "No gradients, noise, shadows, grayscale, or border lines. Keep stroke weight consistent (eg 3–6 px at 1024px). No lines touching or extending to image edges."
    },
    stroke_rules: {
      weight: "Uniform stroke weight; thicker outer contour, optionally slightly thinner inner details.",
      joins_caps: "Round joins and caps preferred; no feathering.",
      closure: "All panels must be watertight (no open paths).",
      borders: "No border lines or frames around the image. Subject should float freely in white space."
    },
    export_rules: {
      vector_priority: "Prefer SVG with paths; if raster, ensure 2-color (1-bit) output.",
      cleanup: "No anti-aliased edges; crisp pixels. No border artifacts."
    }
  },
  background: {
    task: "Generate a stylized background scene with soft 3D elements. Create a cohesive environment with less crowded center area suitable for UI overlays or content placement.",
    style_reference: "Soft 3D background style matching icon aesthetics - smooth rounded forms, calm balanced composition with breathing room in the center. Same refined palette and lighting as icons.",
    icon_idea: null,
    render_style: {
      materials: "Satin-matte surfaces matching icon style. Smooth with minimal texture.",
      shapes: "Rounded environmental elements, architectural or natural forms. Distributed to frame rather than fill the center.",
      colors: "Cohesive palette using 2-3 main colors plus accents. Match icon saturation levels. Gradient-friendly.",
      lighting: "Soft ambient with directional key light. Atmospheric perspective for depth. Subtle volumetric effects allowed.",
      background: "Full scene with sky/environment. Gradient or soft color transitions."
    },
    composition: {
      camera: "Wide angle, slight elevation. Environmental perspective.",
      layout: "Elements concentrated in corners/edges, sparse center. Rule of thirds. Create natural frame or vignette effect.",
      aspect_ratio: "Variable based on mode - landscape (3:2), portrait (2:3), or square (1:1)",
      file_format: "High-res PNG"
    },
    surface_texture: {
      enable: true,
      texture_strength: "minimal",
      texture_scale: "micro",
      rules: "Match icon texture approach. Very subtle, barely perceptible."
    },
    material_hints: {
      clouds: "Soft volumetric forms, no hard edges.",
      terrain: "Smooth rolling forms, stylized not realistic.",
      architecture: "Simplified geometric structures with rounded edges.",
      foliage: "Abstracted shapes, avoid detailed leaves unless specified.",
      water: "Smooth stylized surfaces, minimal ripples."
    },
    details: {
      density: "30-40% coverage, leaving center area relatively open.",
      depth_layers: "Foreground elements at edges, midground sparse, background atmospheric.",
      focal_point: "Avoid strong focal points in center third of image.",
      style_constraints: "No photo-realism, maintain soft 3D icon aesthetic throughout. No text or UI elements."
    }
  }
}

const ICON_ART_DIRECTOR_PROMPTS: Record<TikoStyle, string> = {
  'tiko-original': `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180–300 word image brief for an image-generation model.
Rules:
- Flat 2D illustration only — no 3D rendering, no volumetric lighting, no plastic or vinyl shine.
- Clean filled shapes with soft outlines; warm, cheerful, limited color palette.
- Minimal shading: flat fills with at most a very subtle inner glow or edge darkening for form. No cast shadows.
- Think cheerful sticker art or a friendly children's book illustration — instantly readable, simple, warm.
- Do not use any text, letters, or numbers in the images.
- Include: subject, composition, color palette (name specific warm/bold hues), outline style, simplification level, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`,
  'tiko-v2': `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180–300 word image brief for an image-generation model.
Rules:
- Do not use any wording or letters in the images.
- Keep ONE consistent visual style across outputs (soft 3D toy-like, rounded forms, balanced truthful color).
- The overall aesthetic is playful and stylized like a high-quality vinyl toy or clay render — NOT photorealistic. Ever.
- Truthful colors at natural saturation: a leaf is green, rice is cream, a tomato is red. Keep saturation balanced — not washed out, not candy-bright. Avoid any single hue dominating the whole image.
- Subtle hints of dimension: soft shadows, gentle light wrapping. Just enough to not look flat. Not realistic shading.
- Suggest material identity through form and color cues (rice kernels, wood warmth) — never through photorealistic texture.
- Include: subject, camera, composition, lighting, palette, materials, textures, surface detail, silhouettes, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`,
  'tiko-natural': `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180–300 word image brief for an image-generation model.
Rules:
- Do not use any text or letters in the images.
- Same soft 3D toy-like style as Tiko V2 — rounded forms, vinyl/clay aesthetic, NOT photorealistic.
- CRITICAL: use natural, balanced colors. Pull saturation back to feel like matte print, not a screen-vivid render. A tomato is warm dusty red, not bright neon red. Leaves are sage green, not vivid emerald. Bread is warm beige. Sky is powder blue.
- Target mid-saturation with warm undertones throughout. When choosing between vivid and muted, always choose more muted.
- Soft studio lighting, same as V2 but slightly warmer and lower-contrast. Lean toward calm diffuse light. No harsh speculars.
- Suggest material identity through form and color cues — never through photorealistic texture.
- Include: subject, camera, composition, lighting, palette (with specific muted/warm color names), materials, textures, surface detail, silhouettes, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`,
}

const ART_DIRECTOR_SYSTEM_PROMPTS: Record<ImageMode, string> = {
  icon: ICON_ART_DIRECTOR_PROMPTS['tiko-v2'],
  coloring: `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180–300 word image brief for an image-generation model producing a coloring page.
Rules:
- EMPHASIZE no border lines or frames at the image edges. The image must have a pure white background that extends to the edges with no black lines forming a border or frame.
- Pure black outlines on white only. No shading, no gray, no color.
- Include: subject, composition, stroke style, closure rules, padding, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`,
  background: `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180–300 word image brief for an image-generation model producing a stylized background scene.
Rules:
- Do not use any wording or letters in the images.
- Keep ONE consistent visual style (soft 3D, matching the icon aesthetic).
- Keep the center area sparse — elements should frame, not fill.
- Include: scene description, depth layers, camera, composition, lighting, palette, materials, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`
}

async function boostPrompt(subject: string, mode: ImageMode, tikoStyle: TikoStyle, env: Env): Promise<string> {
  if (!env.ATLAS_SERVICE) throw new Error('Atlas service not available for prompt boost')

  const spec = mode === 'icon'
    ? { ...ICON_STYLE_SPECS[tikoStyle], icon_idea: subject }
    : { ...IMAGE_STYLE_SPECS[mode], icon_idea: subject }
  const systemPrompt = mode === 'icon'
    ? ICON_ART_DIRECTOR_PROMPTS[tikoStyle]
    : ART_DIRECTOR_SYSTEM_PROMPTS[mode]

  const atlasBase = (env.ATLAS_BASE_URL ?? 'https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas').replace(/\/$/, '')
  const response = await env.ATLAS_SERVICE!.fetch(new Request(`${atlasBase}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capability: 'text.generate',
      app: 'generation-api',
      purpose: 'image-art-director',
      input: { input: JSON.stringify(spec, null, 2), system: systemPrompt },
    }),
  }))

  if (!response.ok) {
    const errorText = await response.text()
    let detail = errorText
    try { detail = JSON.parse(errorText).error?.message || errorText } catch { /* keep raw */ }
    console.error('[boost] Atlas prompt boost failed', { status: response.status, detail })
    throw new Error(`Prompt boost failed: ${detail}`)
  }
  const data = await response.json() as { data?: { output?: string } }
  return (data.data?.output ?? '').trim()
}

async function generateImage(request: Request, env: Env, access: GenerationAccessContext): Promise<Response> {
  let body: ImageGenerationRequest
  try {
    body = await request.json() as ImageGenerationRequest
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400)
  }

  if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return apiError('missing_prompt', 'Prompt is required.', 400, 'prompt')
  }
  if (body.prompt.length > 4000) {
    return apiError('prompt_too_long', 'Prompt must be 4000 characters or fewer.', 400, 'prompt')
  }
  if (body.size && !ALLOWED_IMAGE_SIZES.has(body.size)) {
    return apiError('invalid_size', 'Size must be 1024x1024, 1024x1792, or 1792x1024.', 400, 'size')
  }

  const count = typeof body.count === 'number' && body.count >= 1 && body.count <= 8 ? body.count : 1
  const size = body.size || '1024x1024'
  const quality = body.quality === 'hd' ? 'hd' : 'standard'
  const style = body.style === 'natural' ? 'natural' : 'vivid'
  const mode: ImageMode = body.mode === 'coloring' || body.mode === 'background' ? body.mode : 'icon'
  const tikoStyle: TikoStyle = body.tikoStyle === 'tiko-original' || body.tikoStyle === 'tiko-natural' ? body.tikoStyle : 'tiko-v2'
  const transparent = body.transparent !== undefined ? body.transparent : (mode === 'icon')

  if (!env.ATLAS_SERVICE) return apiError('atlas_not_available', 'Atlas service is not available.', 503)
  const atlasBase = (env.ATLAS_BASE_URL ?? 'https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas').replace(/\/$/, '')

  // Multi-preview mode: boost the prompt once via art director, then generate N images concurrently
  // with composition-only variation hints (no color-mood hints that cause hue dominance).
  if (count > 1) {
    if (!env.OPENAI_API_KEY) return apiError('openai_not_configured', 'OpenAI is not configured.', 503)

    let boostedBrief = body.prompt.trim()
    try {
      boostedBrief = await boostPrompt(body.prompt.trim(), mode, tikoStyle, env)
    } catch {
      // fall back to raw prompt
    }

    const variationHints = [
      'Slight 3/4 top-front angle.',
      'Straight front-facing, centered.',
      'Gentle top-down perspective.',
      'Eye-level view, soft grounded shadow.',
    ]
    const now = new Date().toISOString()
    const calls = Array.from({ length: count }, async (_, i) => {
      const variedPrompt = `${boostedBrief}\n\nComposition hint: ${variationHints[i % variationHints.length]}`
      try {
        const payload: Record<string, unknown> = {
          model: 'gpt-image-1-mini',
          prompt: variedPrompt,
          size,
          n: 1,
          quality: 'medium',
          background: 'transparent',
        }
        const openaiResponse = await fetchWithRetry('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }, { timeoutMs: PROVIDER_IMAGE_TIMEOUT_MS })
        if (!openaiResponse.ok) {
          const errText = await openaiResponse.text().catch(() => '')
          console.error('[generate] OpenAI preview failed', { status: openaiResponse.status, body: errText, variation: i })
          return null
        }
        const openaiBody = await openaiResponse.json() as { data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }> }
        const imageItem = openaiBody.data?.[0]
        if (!imageItem) return null

        let imageBytes: Uint8Array
        if (imageItem.b64_json) {
          imageBytes = base64ToBytes(imageItem.b64_json)
        } else if (imageItem.url) {
          const urlRes = await fetchWithRetry(imageItem.url, {}, { timeoutMs: PROVIDER_IMAGE_TIMEOUT_MS })
          if (!urlRes.ok) return null
          imageBytes = new Uint8Array(await urlRes.arrayBuffer())
        } else {
          return null
        }

        const id = crypto.randomUUID()
        const r2Key = `images/${id}.png`
        await env.GENERATED_MEDIA_BUCKET.put(r2Key, imageBytes, { httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' } })
        const dims = parseImageSize(size)
        const imageUrl = `/v1/generation/images/${id}/binary`
        await env.GENERATION_DB.prepare(`INSERT INTO generated_images (
          id, prompt, revised_prompt, model, size, quality, style, image_url, r2_key,
          content_type, file_size_bytes, width, height, category, tags, title, description,
          is_public, is_preview, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          id, body.prompt.trim(), imageItem.revised_prompt || null,
          'gpt-image-1-mini', size, 'medium', tikoStyle, imageUrl, r2Key,
          'image/png', imageBytes.byteLength, dims.width, dims.height,
          body.category || 'generated', JSON.stringify(body.tags || []), body.title || null, null,
          0, 1, createdBy(access), now, now,
        ).run()
        return { id, imageUrl, prompt: body.prompt.trim(), revisedPrompt: imageItem.revised_prompt || null, size, quality: 'medium', style: tikoStyle, width: dims.width, height: dims.height, fileSizeBytes: imageBytes.byteLength, isPreview: true, createdAt: now }
      } catch (e) {
        console.error('[generate] Variation', i, 'failed', e)
        return null
      }
    })
    const settled = await Promise.all(calls)
    const results = settled.filter(Boolean) as Array<{ id: string; imageUrl: string; prompt: string; revisedPrompt: string | null; size: string; quality: string; style: string; width: number; height: number; fileSizeBytes: number; isPreview: boolean; createdAt: string }>
    if (!results.length) return apiError('openai_failed', 'All image variations failed.', 502)
    return json({ data: results, meta: { schemaVersion: 1, count: results.length } }, 201)
  }

  // Single image: use art director boost then generate
  let artBrief: string
  try {
    const boosted = await boostPrompt(body.prompt.trim(), mode, tikoStyle, env)
    artBrief = boosted || body.prompt.trim()
  } catch {
    artBrief = body.prompt.trim()
  }

  const atlasResponse = await env.ATLAS_SERVICE.fetch(new Request(`${atlasBase}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capability: 'image.generate',
      app: 'generation-api',
      purpose: 'image-generation',
      input: { prompt: artBrief, size: toAtlasImageSize(size), transparent, count: 1 },
    }),
  }))

  const atlasBody = await atlasResponse.json().catch(() => null) as AtlasImageResponse | null
  if (!atlasResponse.ok) {
    console.error('[generate] Atlas image.generate failed', { status: atlasResponse.status, error: atlasBody?.error })
    return apiError(atlasBody?.error?.code ?? 'atlas_image_failed', atlasBody?.error?.message ?? 'Atlas image request failed.', atlasResponse.status)
  }

  const atlasImages = atlasBody?.data?.images ?? []
  if (!atlasImages.length || !atlasImages[0]?.mediaUrl) {
    console.error('[generate] Atlas returned no image', { atlasBody })
    return apiError('atlas_image_invalid_response', 'Atlas returned an invalid image response.', 502)
  }

  const now = new Date().toISOString()
  const image = atlasImages[0]
  const assetResponse = await fetchAtlasImageAsset(image.mediaUrl!, env, atlasBase)
  if (!assetResponse.ok) {
    console.error('[generate] Atlas asset fetch failed', { status: assetResponse.status, mediaUrl: image.mediaUrl })
    return apiError('atlas_image_asset_failed', 'Could not fetch image from Atlas.', 502)
  }

  const imageBytes = new Uint8Array(await assetResponse.arrayBuffer())
  const id = crypto.randomUUID()
  const r2Key = `images/${id}.png`
  const contentType = assetResponse.headers.get('content-type') ?? image.contentType ?? 'image/png'
  await env.GENERATED_MEDIA_BUCKET.put(r2Key, imageBytes, { httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' } })
  const dims = parseImageSize(size)
  const imageUrl = `/v1/generation/images/${id}/binary`
  await env.GENERATION_DB.prepare(`INSERT INTO generated_images (
    id, prompt, revised_prompt, model, size, quality, style, image_url, r2_key,
    content_type, file_size_bytes, width, height, category, tags, title, description,
    is_public, created_by, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, body.prompt.trim(), image.revisedPrompt || null, image.provider?.model ?? 'gpt-image-1',
    size, quality, style, imageUrl, r2Key, contentType, imageBytes.byteLength,
    dims.width, dims.height, body.category || 'generated', JSON.stringify(body.tags || []),
    body.title || null, null, 0, createdBy(access), now, now,
  ).run()

  return json({
    data: { id, imageUrl, prompt: body.prompt.trim(), revisedPrompt: image.revisedPrompt || null, size, quality, style, width: dims.width, height: dims.height, fileSizeBytes: imageBytes.byteLength, createdAt: now },
    meta: { cached: atlasBody?.meta?.cached ?? false, schemaVersion: 1, atlasRequestId: atlasBody?.meta?.requestId },
  }, 201)
}

async function fetchAtlasImageAsset(mediaUrl: string, env: Env, atlasBase: string): Promise<Response> {
  if (/^https?:\/\//i.test(mediaUrl)) return fetchWithRetry(mediaUrl, {}, { timeoutMs: PROVIDER_IMAGE_TIMEOUT_MS })
  if (!env.ATLAS_SERVICE) return new Response('Atlas service unavailable', { status: 503 })
  const origin = new URL(atlasBase).origin
  return env.ATLAS_SERVICE.fetch(new Request(`${origin}${mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`}`))
}

function toAtlasImageSize(size: string): 'square' | 'portrait' | 'landscape' {
  if (size === '1024x1792') return 'portrait'
  if (size === '1792x1024') return 'landscape'
  return 'square'
}

async function getImage(request: Request, pathname: string, env: Env): Promise<Response> {
  const access = await optionalAuth(request, env)
  if (access instanceof Response) return access
  const parts = pathname.replace('/v1/generation/images/', '').replace('/binary', '')
  const id = decodeURIComponent(parts)
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)

  const record = await env.GENERATION_DB.prepare(
    'SELECT r2_key, content_type, is_public, created_by FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ r2_key: string; content_type: string; is_public: number; created_by: string | null }>()

  if (!record) return apiError('image_not_found', 'Image not found.', 404)
  if (!canAccessOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)

  const object = await env.GENERATED_MEDIA_BUCKET.get(record.r2_key)
  if (!object) return apiError('image_not_found', 'Image not found.', 404)

  return new Response(object.body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': object.httpMetadata?.contentType ?? record.content_type ?? 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

async function listImages(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const access = await optionalAuth(request, env)
  if (access instanceof Response) return access
  const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)
  const offset = (page - 1) * limit
  const status = url.searchParams.get('status') || 'promoted'
  const isPublic = status === 'draft' ? 0 : 1
  if (isPublic === 0 && !access.auth) return forbiddenOrUnauthorized(access)
  const ownerClause = isPublic === 0 && !isServiceAccess(access) ? ' AND created_by = ?' : ''
  const ownerValues = ownerClause ? [sessionUserId(access)] : []

  const rows = await env.GENERATION_DB.prepare(
    `SELECT id, prompt, revised_prompt, model, size, quality, style, image_url, r2_key,
            content_type, file_size_bytes, width, height, category, tags, title, description,
            is_public, is_preview, media_id, created_by, created_at, updated_at
     FROM generated_images
     WHERE is_public = ?${ownerClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(isPublic, ...ownerValues, limit, offset).all<GeneratedImageRecord>()

  const countRow = await env.GENERATION_DB.prepare(
    `SELECT COUNT(*) AS count FROM generated_images WHERE is_public = ?${ownerClause}`,
  ).bind(isPublic, ...ownerValues).first<{ count: number }>()

  const total = countRow?.count ?? 0

  return json({
    data: rows.results.map(r => ({
      id: r.id,
      imageUrl: r.image_url,
      prompt: r.prompt,
      revisedPrompt: r.revised_prompt,
      size: r.size,
      quality: r.quality,
      style: r.style,
      width: r.width,
      height: r.height,
      fileSizeBytes: r.file_size_bytes,
      title: r.title,
      description: r.description,
      category: r.category,
      tags: JSON.parse(r.tags || '[]'),
      model: r.model,
      isPreview: r.is_preview === 1,
      mediaId: r.media_id ?? null,
      status: r.is_public === 1 ? 'promoted' : 'draft',
      createdAt: r.created_at,
    })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit), status },
  })
}

async function promoteImage(pathname: string, env: Env, access: GenerationAccessContext): Promise<Response> {
  const id = pathname.replace('/v1/generation/images/', '').replace('/promote', '')
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)

  const record = await env.GENERATION_DB.prepare(
    'SELECT is_preview, created_by FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ is_preview: number; created_by: string | null }>()
  if (!record) return apiError('image_not_found', 'Image not found.', 404)
  if (!canMutateOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)
  if (record.is_preview === 1) return apiError('preview_cannot_promote', 'Preview images must be upscaled before promoting.', 400)

  const now = new Date().toISOString()
  const result = await env.GENERATION_DB.prepare(
    'UPDATE generated_images SET is_public = 1, updated_at = ? WHERE id = ?',
  ).bind(now, id).run()

  if (!result.meta?.changes) return apiError('image_not_found', 'Image not found.', 404)
  return json({ data: { id, status: 'promoted', updatedAt: now } })
}

async function linkImageMedia(pathname: string, request: Request, env: Env, access: GenerationAccessContext): Promise<Response> {
  const id = pathname.replace('/v1/generation/images/', '').replace('/media-link', '')
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)

  let body: { mediaId?: unknown }
  try {
    body = await request.json() as { mediaId?: unknown }
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400)
  }

  const mediaId = typeof body.mediaId === 'string' && body.mediaId.trim() ? body.mediaId.trim() : null
  if (!mediaId) return apiError('missing_media_id', 'mediaId is required.', 400, 'mediaId')
  const record = await env.GENERATION_DB.prepare('SELECT created_by FROM generated_images WHERE id = ? LIMIT 1').bind(id).first<{ created_by: string | null }>()
  if (!record) return apiError('image_not_found', 'Image not found.', 404)
  if (!canMutateOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)

  const now = new Date().toISOString()
  const result = await env.GENERATION_DB.prepare(
    'UPDATE generated_images SET media_id = ?, updated_at = ? WHERE id = ?',
  ).bind(mediaId, now, id).run()

  if (!result.meta?.changes) return apiError('image_not_found', 'Image not found.', 404)
  return json({ data: { id, mediaId, updatedAt: now } })
}

async function enrichImage(pathname: string, env: Env, access: GenerationAccessContext): Promise<Response> {
  const id = pathname.replace('/v1/generation/images/', '').replace('/enrich', '')
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)
  if (!env.OPENAI_API_KEY) return apiError('openai_not_configured', 'OpenAI is not configured.', 503)

  const record = await env.GENERATION_DB.prepare(
    'SELECT id, title, prompt, created_by FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ id: string; title: string | null; prompt: string; created_by: string | null }>()

  if (!record) return apiError('image_not_found', 'Image not found.', 404)
  if (!canMutateOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)

  const publicBase = (env.GENERATION_PUBLIC_ROUTE ?? '').replace(/\/$/, '')
  const imageUrl = `${publicBase}/images/${id}/binary`
  const hint = record.title || record.prompt

  const visionResponse = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: [
        { type: 'text', text: buildImageVisionPrompt(hint) },
        { type: 'image_url', image_url: { url: imageUrl } },
      ] }],
      max_tokens: 500,
    }),
  }, { timeoutMs: PROVIDER_TIMEOUT_MS })

  if (!visionResponse.ok) {
    const errBody = await visionResponse.text().catch(() => '')
    console.error('[enrich] OpenAI vision failed', { status: visionResponse.status, body: errBody, imageId: id })
    return apiError('vision_failed', `Vision analysis failed: ${visionResponse.status}`, 502)
  }

  const visionData = await visionResponse.json() as { choices: Array<{ message: { content: string } }> }
  const content = visionData.choices[0]?.message?.content ?? ''
  const parsed = parseImageVisionResponse(content)
  if (!parsed) return apiError('vision_parse_failed', 'Could not parse vision response.', 502)

  const now = new Date().toISOString()
  await env.GENERATION_DB.prepare(
    `UPDATE generated_images
     SET title = CASE WHEN ? != '' THEN ? ELSE title END,
         description = ?,
         tags = ?,
         category = CASE WHEN ? != '' THEN ? ELSE category END,
         updated_at = ?
     WHERE id = ?`,
  ).bind(
    parsed.title, parsed.title,
    parsed.description,
    JSON.stringify(parsed.tags),
    parsed.categories[0] ?? '', parsed.categories[0] ?? '',
    now,
    id,
  ).run()

  return json({ data: { id, title: parsed.title || record.title, description: parsed.description, tags: parsed.tags, categories: parsed.categories, updatedAt: now } })
}

function buildImageVisionPrompt(hint?: string | null): string {
  return `Analyze this image and return JSON metadata.${hint ? `\n\nContext: The image represents "${hint}".` : ''}

Rules:
- Do NOT mention it is an image, illustration, drawing, or art style.
- Focus only on what the subject IS, not how it looks or is styled.
- Use simple, child-friendly language suitable for young children.

Return only this JSON object:
{
  "title": "Short factual name of the subject, e.g. 'Lion' or 'Fire Truck'. No adjectives or style words.",
  "description": "2-3 short sentences about what it is, what it does, or where it comes from.",
  "tags": ["10-15 search keywords, no style words like 'cute' or 'cartoon'"],
  "categories": ["5-8 broad categories like 'animals', 'food', 'vehicles', 'nature', 'plants', 'people', 'tools'"]
}

Return only the JSON. No markdown, no explanation.`
}

function parseImageVisionResponse(content: string): { title: string; description: string; tags: string[]; categories: string[] } | null {
  try {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    }
  } catch { return null }
}

async function editImageVariant(pathname: string, request: Request, env: Env, access: GenerationAccessContext): Promise<Response> {
  const id = pathname.replace('/v1/generation/images/', '').replace('/edit', '')
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)
  if (!env.OPENAI_API_KEY) return apiError('openai_not_configured', 'OpenAI is not configured.', 503)

  let body: { prompt?: unknown; mask_base64?: unknown; size?: unknown }
  try {
    body = await request.json() as { prompt?: unknown; mask_base64?: unknown; size?: unknown }
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400)
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) return apiError('missing_prompt', 'Edit prompt is required.', 400, 'prompt')
  if (prompt.length > 4000) return apiError('prompt_too_long', 'Prompt must be 4000 characters or fewer.', 400, 'prompt')
  const size = typeof body.size === 'string' && ALLOWED_IMAGE_SIZES.has(body.size) ? body.size as '1024x1024' | '1024x1792' | '1792x1024' : '1024x1024'

  const record = await env.GENERATION_DB.prepare(
    'SELECT id, r2_key, prompt, category, tags, title, created_by FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ id: string; r2_key: string; prompt: string; category: string; tags: string; title: string | null; created_by: string | null }>()
  if (!record) return apiError('image_not_found', 'Image not found.', 404)
  if (!canMutateOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)

  const object = await env.GENERATED_MEDIA_BUCKET.get(record.r2_key)
  if (!object) return apiError('image_not_found', 'Image not found in storage.', 404)
  const imageBuffer = await new Response(object.body).arrayBuffer()

  const hasAlpha = pngHasAlpha(imageBuffer)
  const editModel = hasAlpha ? 'gpt-image-1' : 'gpt-image-2'

  const form = new FormData()
  form.append('model', editModel)
  form.append('prompt', prompt)
  form.append('n', '1')
  form.append('size', size)
  form.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'image.png')
  if (hasAlpha) form.append('background', 'transparent')

  if (typeof body.mask_base64 === 'string' && body.mask_base64) {
    const maskBuffer = base64ToBytes(body.mask_base64).buffer as ArrayBuffer
    form.append('mask', new Blob([maskBuffer], { type: 'image/png' }), 'mask.png')
  }

  const editResponse = await fetchWithRetry('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  }, { timeoutMs: PROVIDER_IMAGE_TIMEOUT_MS })

  if (!editResponse.ok) {
    const errBody = await editResponse.text().catch(() => '')
    console.error('[edit] OpenAI images/edits failed', { status: editResponse.status, body: errBody, sourceId: id, prompt })
    return apiError('image_edit_failed', `Image edit failed: ${editResponse.status}`, editResponse.status >= 500 ? 502 : editResponse.status)
  }

  const editData = await editResponse.json() as { data?: Array<{ b64_json?: string; url?: string }> }
  const imageItem = editData.data?.[0]
  if (!imageItem) {
    console.error('[edit] OpenAI returned no image data', { editData, sourceId: id })
    return apiError('image_edit_invalid_response', 'Image edit returned no data.', 502)
  }

  let newImageBytes: Uint8Array
  if (imageItem.b64_json) {
    newImageBytes = base64ToBytes(imageItem.b64_json)
  } else if (imageItem.url) {
    const urlRes = await fetchWithRetry(imageItem.url, {}, { timeoutMs: PROVIDER_IMAGE_TIMEOUT_MS })
    if (!urlRes.ok) return apiError('image_edit_asset_failed', 'Could not fetch edited image asset.', 502)
    newImageBytes = new Uint8Array(await urlRes.arrayBuffer())
  } else {
    return apiError('image_edit_invalid_response', 'Image edit returned no image data.', 502)
  }

  const newId = crypto.randomUUID()
  const r2Key = `images/${newId}.png`
  const now = new Date().toISOString()
  const imageUrl = `/v1/generation/images/${newId}/binary`
  const dims = parseImageSize(size)

  await env.GENERATED_MEDIA_BUCKET.put(r2Key, newImageBytes, {
    httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' },
  })

  await env.GENERATION_DB.prepare(`INSERT INTO generated_images (
    id, prompt, revised_prompt, model, size, quality, style, image_url, r2_key,
    content_type, file_size_bytes, width, height, category, tags, title, description,
    is_public, created_by, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    newId, prompt, null, editModel, size, 'standard', 'vivid', imageUrl, r2Key,
    'image/png', newImageBytes.byteLength, dims.width, dims.height,
    record.category || 'generated', record.tags || '[]', record.title || null, null,
    0, createdBy(access), now, now,
  ).run()

  return json({
    data: {
      id: newId,
      imageUrl,
      prompt,
      revisedPrompt: null,
      size,
      quality: 'standard',
      style: 'vivid',
      width: dims.width,
      height: dims.height,
      fileSizeBytes: newImageBytes.byteLength,
      createdAt: now,
    },
    meta: { schemaVersion: 1 },
  }, 201)
}

function pngHasAlpha(buffer: ArrayBuffer): boolean {
  // PNG IHDR color type byte is at offset 25 (8-byte sig + 4 length + 4 type + 4w + 4h + 1 bit-depth)
  // Color type 4 = grayscale+alpha, 6 = RGBA
  const view = new Uint8Array(buffer)
  return view.length >= 26 && (view[25] === 4 || view[25] === 6)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function upscaleImage(pathname: string, request: Request, env: Env, access: GenerationAccessContext): Promise<Response> {
  const id = pathname.replace('/v1/generation/images/', '').replace('/upscale', '')
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)
  if (!env.OPENAI_API_KEY) return apiError('openai_not_configured', 'OpenAI is not configured.', 503)

  let body: { size?: unknown; quality?: unknown; removeBackground?: unknown }
  try {
    body = await request.json() as { size?: unknown; quality?: unknown; removeBackground?: unknown }
  } catch {
    body = {}
  }

  const size = typeof body.size === 'string' && ALLOWED_IMAGE_SIZES.has(body.size) ? body.size as '1024x1024' | '1024x1792' | '1792x1024' : '1024x1024'
  const quality = 'high'
  const removeBackground = typeof body.removeBackground === 'boolean' ? body.removeBackground : true

  const record = await env.GENERATION_DB.prepare(
    'SELECT id, r2_key, prompt, category, tags, title, created_by FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ id: string; r2_key: string; prompt: string; category: string; tags: string; title: string | null; created_by: string | null }>()
  if (!record) return apiError('image_not_found', 'Image not found.', 404)
  if (!canMutateOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)

  const object = await env.GENERATED_MEDIA_BUCKET.get(record.r2_key)
  if (!object) return apiError('image_not_found', 'Image not found in storage.', 404)
  const imageBuffer = await new Response(object.body).arrayBuffer()

  let upscalePrompt: string
  if (removeBackground) {
    upscalePrompt = `Recreate this subject as a high-quality standalone image at ${size} resolution on a clean white background. Remove any existing background. The subject should be centered, well-lit, and professionally rendered.`
  } else {
    upscalePrompt = `Upscale and enhance this image to high quality at ${size} resolution. Preserve the exact same subject, composition, and style.`
  }

  const model = 'gpt-image-1.5'

  const form = new FormData()
  form.append('model', model)
  form.append('prompt', upscalePrompt)
  form.append('n', '1')
  form.append('size', size)
  form.append('quality', quality)
  if (removeBackground) form.append('background', 'transparent')
  form.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'image.png')

  const editResponse = await fetchWithRetry('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  }, { timeoutMs: PROVIDER_IMAGE_TIMEOUT_MS })

  if (!editResponse.ok) {
    const errBody = await editResponse.text().catch(() => '')
    console.error('[upscale] OpenAI images/edits failed', { status: editResponse.status, body: errBody, sourceId: id })
    return apiError('image_upscale_failed', `Image upscale failed: ${editResponse.status}`, editResponse.status >= 500 ? 502 : editResponse.status)
  }

  const editData = await editResponse.json() as { data?: Array<{ b64_json?: string; url?: string }> }
  const imageItem = editData.data?.[0]
  if (!imageItem) {
    console.error('[upscale] OpenAI returned no image data', { editData, sourceId: id })
    return apiError('image_upscale_invalid_response', 'Image upscale returned no data.', 502)
  }

  let newImageBytes: Uint8Array
  if (imageItem.b64_json) {
    newImageBytes = base64ToBytes(imageItem.b64_json)
  } else if (imageItem.url) {
    const urlRes = await fetchWithRetry(imageItem.url, {}, { timeoutMs: PROVIDER_IMAGE_TIMEOUT_MS })
    if (!urlRes.ok) return apiError('image_upscale_asset_failed', 'Could not fetch upscaled image asset.', 502)
    newImageBytes = new Uint8Array(await urlRes.arrayBuffer())
  } else {
    return apiError('image_upscale_invalid_response', 'Image upscale returned no image data.', 502)
  }

  const newId = crypto.randomUUID()
  const r2Key = `images/${newId}.png`
  const now = new Date().toISOString()
  const imageUrl = `/v1/generation/images/${newId}/binary`
  const dims = parseImageSize(size)

  await env.GENERATED_MEDIA_BUCKET.put(r2Key, newImageBytes, {
    httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' },
  })

  await env.GENERATION_DB.prepare(`INSERT INTO generated_images (
    id, prompt, revised_prompt, model, size, quality, style, image_url, r2_key,
    content_type, file_size_bytes, width, height, category, tags, title, description,
    is_public, is_preview, created_by, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    newId, record.prompt, null, model, size, quality, 'tiko-v2', imageUrl, r2Key,
    'image/png', newImageBytes.byteLength, dims.width, dims.height,
    record.category || 'generated', record.tags || '[]', record.title || null, null,
    0, 0, createdBy(access), now, now,
  ).run()

  return json({
    data: {
      id: newId,
      imageUrl,
      prompt: record.prompt,
      revisedPrompt: null,
      size,
      quality,
      style: 'tiko-v2',
      width: dims.width,
      height: dims.height,
      fileSizeBytes: newImageBytes.byteLength,
      isPreview: false,
      createdAt: now,
    },
    meta: { schemaVersion: 1, upscaledFrom: id },
  }, 201)
}

async function deleteImage(pathname: string, env: Env, access: GenerationAccessContext): Promise<Response> {
  const id = pathname.replace('/v1/generation/images/', '')
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)

  const record = await env.GENERATION_DB.prepare(
    'SELECT r2_key, created_by FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ r2_key: string; created_by: string | null }>()

  if (!record) return apiError('image_not_found', 'Image not found.', 404)
  if (!canMutateOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)

  await env.GENERATED_MEDIA_BUCKET.delete(record.r2_key).catch(() => null)
  await env.GENERATION_DB.prepare('DELETE FROM generated_images WHERE id = ?').bind(id).run()

  return json({ data: { id, deleted: true } })
}

function parseImageSize(size: string): { width: number; height: number } {
  const [w, h] = size.split('x').map(Number)
  return { width: w || 1024, height: h || 1024 }
}

async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, options: { timeoutMs: number }): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetchWithTimeout(input, init, options.timeoutMs).catch((error) => {
      lastError = error
      return null
    })
    if (!response) continue
    if (attempt === 0 && isRetryableStatus(response.status)) {
      await response.body?.cancel().catch(() => undefined)
      continue
    }
    return response
  }
  throw lastError instanceof Error ? lastError : new Error('fetch_failed')
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function apiError(code: string, message: string, status = 400, field?: string): Response {
  return json({ error: { code, message, ...(field ? { field } : {}) } }, status)
}

function bearerToken(request: Request): string {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')
  return match?.[1]?.trim() ?? ''
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export const internals = { generateRequestHash, normalizeTtsRequest, validateTtsRequest }
