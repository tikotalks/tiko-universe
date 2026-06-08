import { authenticate } from '../../shared/auth'

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
  IDENTITY_SERVICE?: {
    fetch(input: Request | string, init?: RequestInit): Promise<Response>
  }
  ATLAS_SERVICE?: {
    fetch(input: Request | string, init?: RequestInit): Promise<Response>
  }
  ATLAS_BASE_URL?: string
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

interface GenerationAudioRecord {
  id: string
  request_hash: string
  text: string
  language: string
  provider: string
  voice: string
  model: string
  speed: number
  pitch: number
  audio_url: string
  r2_key: string
  content_type: string
  file_size_bytes?: number
  duration_seconds?: number
  generated_at: string
}

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
const ELEVENLABS_MODELS = new Set(['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_flash_v2_5'])
const ELEVENLABS_VOICE_ID_RE = /^[a-zA-Z0-9_-]{6,64}$/
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
const VOICE_CATALOG = [...ELEVENLABS_VOICE_CATALOG, ...OPENAI_VOICE_CATALOG]

const AUDIO_KEY_RE = /^audio\/[a-f0-9]{32}\.mp3$/
const VOICE_SAMPLE_KEY_RE = /^voice-samples\/[a-z0-9._-]+\/[a-zA-Z0-9_-]{6,64}\.mp3$/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

    const url = new URL(request.url)
    if (url.pathname === '/v1/generation/health' && request.method === 'GET') return generationHealth()
    if (url.pathname === '/v1/generation/voices' && request.method === 'GET') return listVoices(url, env)
    if (url.pathname === '/v1/generation/tts' && request.method === 'POST') return generateTts(request, env)
    if (url.pathname.startsWith('/v1/generation/voice-samples/') && request.method === 'GET') return getVoiceSample(url, env)
    if (url.pathname.startsWith('/v1/generation/audio/') && request.method === 'GET') return getAudio(url.pathname, env)
    if (url.pathname === '/v1/generation/image' && request.method === 'POST') return requireAuth(request, env, () => generateImage(request, env))
    if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/binary') && request.method === 'GET') return getImage(url.pathname, env)
    if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/promote') && request.method === 'POST') return requireAuth(request, env, () => promoteImage(url.pathname, env))
    if (url.pathname.startsWith('/v1/generation/images/') && request.method === 'DELETE') return requireAuth(request, env, () => deleteImage(url.pathname, env))
    if (url.pathname === '/v1/generation/images' && request.method === 'GET') return listImages(request, env)
    if (url.pathname === '/v1/generation/stories/tryout' && request.method === 'POST') return requireAuth(request, env, () => generateStoryTryout(request, env))
    if (url.pathname === '/v1/generation/stories/render' && request.method === 'POST') return requireAuth(request, env, () => renderStory(request, env))
    if (url.pathname === '/v1/generation/story-drafts' && request.method === 'POST') return requireAuth(request, env, () => createStoryDraft(request, env))
    if (url.pathname === '/v1/generation/story-drafts' && request.method === 'GET') return listStoryDrafts(env)
    if (url.pathname.startsWith('/v1/generation/stories/') && url.pathname.endsWith('/audio') && request.method === 'GET') return getStoryAudio(url.pathname, env)
    if (url.pathname.startsWith('/v1/generation/stories/') && url.pathname.endsWith('/promote') && request.method === 'POST') return requireAuth(request, env, () => promoteStory(url.pathname, env))
    if (url.pathname.startsWith('/v1/generation/stories/') && request.method === 'DELETE') return requireAuth(request, env, () => deleteStory(url.pathname, env))
    if (url.pathname === '/v1/generation/stories' && request.method === 'GET') return listStories(request, env)

    return apiError('not_found', 'Route not found.', 404)
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
  const response = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } })
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

async function requireAuth(request: Request, env: Env, handler: () => Promise<Response>): Promise<Response> {
  const authed = await authenticate(request, env)
  if (authed.ok === false) {
    const headers = new Headers(authed.response.headers)
    for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
    return new Response(authed.response.body, { status: authed.response.status, statusText: authed.response.statusText, headers })
  }
  return handler()
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

async function createStoryDraft(request: Request, env: Env): Promise<Response> {
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
    created_at: now,
    updated_at: now,
  }

  await env.GENERATION_DB.prepare(
    `INSERT INTO story_drafts (id, title, description, cover_media_id, default_voice, default_speed, target_album_id, status, chapters, settings, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(row.id, row.title, row.description, row.cover_media_id, row.default_voice, row.default_speed, row.target_album_id, row.status, row.chapters, row.settings, row.created_at, row.updated_at).run()

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

async function listStoryDrafts(env: Env): Promise<Response> {
  const rows = await env.GENERATION_DB.prepare(
    `SELECT id, title, description, cover_media_id, default_voice, default_speed, target_album_id, status, chapters, settings, created_at, updated_at
     FROM story_drafts ORDER BY updated_at DESC`,
  ).bind().all<StoryDraftRow>()
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
  const requestHash = await generateRequestHash(normalized)
  const existing = await findAudioByHash(requestHash, env)
  if (existing) return json(ttsResponseFromRecord(existing, true))

  const atlasResponse = await synthesizeWithAtlas(normalized, env, body.provider)
  if (atlasResponse) return atlasResponse

  const generated = await generateAudioBytes(normalized, env)
  if (generated.success === false) {
    return apiError(generated.error, providerSafeMessage(generated.error), generated.status ?? 503)
  }

  const id = crypto.randomUUID()
  const r2Key = audioKeyForHash(requestHash)
  const audioUrl = `/v1/generation/audio/${encodeURIComponent(id)}`
  const generatedAt = new Date().toISOString()

  await env.GENERATED_MEDIA_BUCKET.put(r2Key, generated.bytes, {
    httpMetadata: { contentType: generated.contentType, cacheControl: 'public, max-age=31536000, immutable' },
  })

  const record: GenerationAudioRecord = {
    id,
    request_hash: requestHash,
    text: normalized.text,
    language: normalized.language,
    provider: normalized.provider === 'auto' ? 'openai' : normalized.provider,
    voice: normalized.voice,
    model: normalized.model,
    speed: normalized.speed,
    pitch: normalized.pitch,
    audio_url: audioUrl,
    r2_key: r2Key,
    content_type: generated.contentType,
    file_size_bytes: generated.bytes.byteLength,
    generated_at: generatedAt,
  }

  await env.GENERATION_DB.prepare(`INSERT INTO generated_audio (
    id, request_hash, text, language, provider, voice, model, speed, pitch, audio_url, r2_key, content_type, file_size_bytes, generated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    record.id,
    record.request_hash,
    record.text,
    record.language,
    record.provider,
    record.voice,
    record.model,
    record.speed,
    record.pitch,
    record.audio_url,
    record.r2_key,
    record.content_type,
    record.file_size_bytes,
    record.generated_at,
  ).run()

  return json(ttsResponseFromRecord(record, false), 201)
}

async function getAudio(pathname: string, env: Env): Promise<Response> {
  const id = decodeURIComponent(pathname.replace('/v1/generation/audio/', ''))
  if (!isSafeId(id)) return apiError('invalid_audio_id', 'Audio id is invalid.', 400)

  const record = await findAudioById(id, env)
  if (!record || !isSafeAudioKey(record.r2_key)) return apiError('audio_not_found', 'Audio not found.', 404)

  const object = await env.GENERATED_MEDIA_BUCKET.get(record.r2_key)
  if (!object) return apiError('audio_not_found', 'Audio not found.', 404)

  return new Response(object.body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': object.httpMetadata?.contentType ?? record.content_type ?? 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

function ttsResponseFromRecord(record: GenerationAudioRecord, cached: boolean) {
  return {
    data: {
      id: record.id,
      audioUrl: record.audio_url,
      contentType: record.content_type ?? 'audio/mpeg',
      fileSizeBytes: record.file_size_bytes,
      generatedAt: record.generated_at,
      provider: record.provider,
      language: record.language,
      voice: record.voice,
      model: record.model,
    },
    meta: {
      cached,
      schemaVersion: 1,
    },
  }
}

async function synthesizeWithAtlas(input: NormalizedTtsRequest, env: Env, requestedProvider?: TtsProvider): Promise<Response | null> {
  if (!env.ATLAS_SERVICE) return null

  const atlasUrl = `${(env.ATLAS_BASE_URL ?? 'https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas').replace(/\/$/, '')}/speech`
  const atlasProvider = requestedProvider && requestedProvider !== 'azure' ? requestedProvider : 'auto'
  const atlasPayload: Record<string, unknown> = {
    app: 'generation-api',
    purpose: 'compatibility-tts',
    text: input.text,
    language: input.language,
    provider: atlasProvider,
    speed: input.speed,
  }
  if (atlasProvider !== 'auto') {
    atlasPayload.voice = input.voice
    atlasPayload.model = input.model
  }

  const response = await env.ATLAS_SERVICE.fetch(new Request(atlasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(atlasPayload),
  }))
  const body = await response.json().catch(() => null) as AtlasSpeechResponse | null

  if (!response.ok) {
    return apiError(body?.error?.code ?? 'atlas_tts_failed', body?.error?.message ?? 'Atlas TTS request failed.', response.status)
  }

  const data = body?.data
  if (!data?.id || !data.audioUrl) {
    return apiError('atlas_tts_invalid_response', 'Atlas returned an invalid TTS response.', 502)
  }

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
      cached: body?.meta?.cached ?? data.cached ?? false,
      schemaVersion: 1,
      atlasRequestId: body?.meta?.requestId,
    },
  }, 201)
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

function audioKeyForHash(requestHash: string) {
  return `audio/${requestHash}.mp3`
}

export function isSafeAudioKey(key: string): boolean {
  return AUDIO_KEY_RE.test(key)
}

function isSafeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id)
}

async function findAudioByHash(requestHash: string, env: Env): Promise<GenerationAudioRecord | null> {
  return env.GENERATION_DB.prepare(`SELECT id, request_hash, text, language, provider, voice, model, speed, pitch, audio_url, r2_key, content_type, file_size_bytes, duration_seconds, generated_at
    FROM generated_audio WHERE request_hash = ? LIMIT 1`).bind(requestHash).first<GenerationAudioRecord>()
}

async function findAudioById(id: string, env: Env): Promise<GenerationAudioRecord | null> {
  return env.GENERATION_DB.prepare(`SELECT id, request_hash, text, language, provider, voice, model, speed, pitch, audio_url, r2_key, content_type, file_size_bytes, duration_seconds, generated_at
    FROM generated_audio WHERE id = ? LIMIT 1`).bind(id).first<GenerationAudioRecord>()
}

async function generateAudioBytes(input: NormalizedTtsRequest, env: Env): Promise<GenerateAudioSuccess | GenerateAudioFailure> {
  if (input.provider === 'azure') return { success: false, error: 'azure_tts_not_configured', status: 501 }
  if (input.provider === 'elevenlabs') return generateElevenLabsAudioBytes(input, env)
  if (!env.OPENAI_API_KEY) return { success: false, error: 'tts_generation_not_configured', status: 503 }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      voice: input.voice,
      input: input.text,
      response_format: 'mp3',
      speed: input.speed,
    }),
  })

  if (!response.ok) return { success: false, error: 'tts_provider_failed', status: 502 }

  return { success: true, bytes: new Uint8Array(await response.arrayBuffer()), contentType: 'audio/mpeg' }
}

async function generateElevenLabsAudioBytes(input: NormalizedTtsRequest, env: Env): Promise<GenerateAudioSuccess | GenerateAudioFailure> {
  if (!env.ELEVENLABS_API_KEY) return { success: false, error: 'elevenlabs_tts_not_configured', status: 503 }
  const model = ELEVENLABS_MODELS.has(input.model) ? input.model : DEFAULT_ELEVENLABS_MODEL
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voice)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: input.text,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: input.speed },
      apply_text_normalization: 'auto',
    }),
  })
  if (!response.ok) return { success: false, error: 'tts_provider_failed', status: 502 }
  return { success: true, bytes: new Uint8Array(await response.arrayBuffer()), contentType: 'audio/mpeg' }
}

async function getVoiceSample(url: URL, env: Env): Promise<Response> {
  const voiceId = decodeURIComponent(url.pathname.replace('/v1/generation/voice-samples/', ''))
  if (!ELEVENLABS_VOICE_ID_RE.test(voiceId) && !OPENAI_VOICES.has(voiceId)) return apiError('invalid_voice_id', 'Voice id is invalid.', 400)
  const provider = url.searchParams.get('provider') === 'openai' ? 'openai' : 'elevenlabs'
  const model = url.searchParams.get('model') || (provider === 'openai' ? 'tts-1' : DEFAULT_ELEVENLABS_MODEL)
  const safeModel = model.replace(/[^a-zA-Z0-9._-]/g, '') || (provider === 'openai' ? 'tts-1' : DEFAULT_ELEVENLABS_MODEL)
  const r2Key = `voice-samples/${safeModel}/${voiceId}.mp3`
  if (!VOICE_SAMPLE_KEY_RE.test(r2Key)) return apiError('invalid_voice_sample', 'Voice sample path is invalid.', 400)
  const existing = await env.GENERATED_MEDIA_BUCKET.get(r2Key)
  if (existing) return audioResponse(existing, 'public, max-age=31536000, immutable')
  const generated = await generateAudioBytes(normalizeTtsRequest({
    text: 'Hello from Tiko. This is how this voice sounds.',
    language: 'en',
    provider,
    voice: voiceId,
    model: safeModel,
  }), env)
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
    case 'azure_tts_not_configured': return 'Azure TTS is not configured.'
    case 'tts_generation_not_configured': return 'TTS generation is not configured.'
    case 'elevenlabs_tts_not_configured': return 'ElevenLabs TTS is not configured.'
    case 'tts_provider_failed': return 'TTS provider failed.'
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
  created_at: string
  updated_at: string
}

async function generateStoryTryout(request: Request, env: Env): Promise<Response> {
  let body: StoryTryoutRequest
  try { body = await request.json() as StoryTryoutRequest } catch { return apiError('invalid_json', 'Request body must be valid JSON.', 400) }

  if (!body.text || typeof body.text !== 'string' || !body.text.trim()) return apiError('missing_text', 'Text is required.', 400, 'text')
  if (body.text.length > 800) return apiError('text_too_long', 'Tryout text must be 800 characters or fewer.', 400, 'text')

  const normalized = normalizeTtsRequest({ text: body.text, language: body.language || 'en', provider: 'elevenlabs', voice: body.voice, model: body.model, speed: body.speed })
  const generated = await generateAudioBytes(normalized, env)
  if (generated.success === false) return apiError(generated.error, providerSafeMessage(generated.error), generated.status ?? 503)

  const id = crypto.randomUUID()
  const r2Key = `story-tryouts/${id}.mp3`
  const audioUrl = `/v1/generation/stories/tryouts/${id}/audio`
  await env.GENERATED_MEDIA_BUCKET.put(r2Key, generated.bytes, { httpMetadata: { contentType: generated.contentType, cacheControl: 'private, max-age=3600' } })

  return json({ data: { id, audioUrl, contentType: generated.contentType, fileSizeBytes: generated.bytes.byteLength }, meta: { schemaVersion: 1 } }, 201)
}

async function renderStory(request: Request, env: Env): Promise<Response> {
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
    const generated = await generateAudioBytes(normalizeTtsRequest({ text: segment.text, language: body.language || 'en', provider: 'elevenlabs', voice, model: body.model || DEFAULT_ELEVENLABS_MODEL, speed }), env)
    if (generated.success === false) return apiError(generated.error, providerSafeMessage(generated.error), generated.status ?? 503)
    chunks.push(generated.bytes)
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
    duration_seconds, file_size_bytes, category, tags, is_public, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, body.title.trim(), body.description?.trim() || null, voice, speed, JSON.stringify(cleanSegments), 'complete', audioUrl, r2Key,
    null, audioBytes.byteLength, body.category || 'story', JSON.stringify(body.tags || []), 0, now, now,
  ).run()

  return json({ data: { id, title: body.title.trim(), audioUrl, voice, speed, fileSizeBytes: audioBytes.byteLength, createdAt: now }, meta: { schemaVersion: 1, segmentCount: cleanSegments.length } }, 201)
}

async function getStoryAudio(pathname: string, env: Env): Promise<Response> {
  if (pathname.startsWith('/v1/generation/stories/tryouts/')) {
    const id = decodeURIComponent(pathname.replace('/v1/generation/stories/tryouts/', '').replace('/audio', ''))
    if (!isSafeId(id)) return apiError('invalid_tryout_id', 'Tryout id is invalid.', 400)
    const object = await env.GENERATED_MEDIA_BUCKET.get(`story-tryouts/${id}.mp3`)
    if (!object) return apiError('tryout_not_found', 'Tryout audio not found.', 404)
    return audioResponse(object, 'private, max-age=3600')
  }

  const id = decodeURIComponent(pathname.replace('/v1/generation/stories/', '').replace('/audio', ''))
  if (!isSafeId(id)) return apiError('invalid_story_id', 'Story id is invalid.', 400)
  const record = await env.GENERATION_DB.prepare('SELECT r2_key FROM stories WHERE id = ? LIMIT 1').bind(id).first<{ r2_key: string | null }>()
  if (!record?.r2_key) return apiError('story_not_found', 'Story not found.', 404)
  const object = await env.GENERATED_MEDIA_BUCKET.get(record.r2_key)
  if (!object) return apiError('story_not_found', 'Story audio not found.', 404)
  return audioResponse(object, 'public, max-age=31536000, immutable')
}

async function listStories(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)
  const offset = (page - 1) * limit
  const status = url.searchParams.get('status') || 'promoted'
  const isPublic = status === 'draft' ? 0 : 1

  const rows = await env.GENERATION_DB.prepare(`SELECT id, title, description, voice, speed, segments, status, audio_url, r2_key,
      duration_seconds, file_size_bytes, category, tags, is_public, created_at, updated_at
    FROM stories WHERE is_public = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(isPublic, limit, offset).all<StoryRecord>()
  const countRow = await env.GENERATION_DB.prepare('SELECT COUNT(*) AS count FROM stories WHERE is_public = ?').bind(isPublic).first<{ count: number }>()
  const total = countRow?.count ?? 0
  return json({
    data: rows.results.map(row => ({ id: row.id, title: row.title, description: row.description, voice: row.voice, speed: row.speed, segmentCount: JSON.parse(row.segments || '[]').length, status: row.is_public === 1 ? 'promoted' : 'draft', renderStatus: row.status, audioUrl: row.audio_url, fileSizeBytes: row.file_size_bytes, category: row.category, tags: JSON.parse(row.tags || '[]'), createdAt: row.created_at })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit), status },
  })
}

async function promoteStory(pathname: string, env: Env): Promise<Response> {
  const id = pathname.replace('/v1/generation/stories/', '').replace('/promote', '')
  if (!isSafeId(id)) return apiError('invalid_story_id', 'Story id is invalid.', 400)

  const now = new Date().toISOString()
  const result = await env.GENERATION_DB.prepare(
    'UPDATE stories SET is_public = 1, updated_at = ? WHERE id = ?',
  ).bind(now, id).run()

  if (!result.meta?.changes) return apiError('story_not_found', 'Story not found.', 404)
  return json({ data: { id, status: 'promoted', updatedAt: now } })
}

async function deleteStory(pathname: string, env: Env): Promise<Response> {
  const id = pathname.replace('/v1/generation/stories/', '')
  if (!isSafeId(id)) return apiError('invalid_story_id', 'Story id is invalid.', 400)

  const record = await env.GENERATION_DB.prepare(
    'SELECT r2_key FROM stories WHERE id = ? LIMIT 1',
  ).bind(id).first<{ r2_key: string | null }>()

  if (!record) return apiError('story_not_found', 'Story not found.', 404)
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

interface ImageGenerationRequest {
  prompt: string
  mode?: ImageMode
  size?: '1024x1024' | '1024x1792' | '1792x1024'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  transparent?: boolean
  title?: string
  category?: string
  tags?: string[]
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
  created_at: string
  updated_at: string
}

const ALLOWED_IMAGE_SIZES = new Set(['1024x1024', '1024x1792', '1792x1024'])

const IMAGE_STYLE_SPECS: Record<ImageMode, object> = {
  icon: {
    task: "Generate a 3D icon in a soft, stylized, contemporary look (playful but mature). Absolutely no leaves, foliage, plant elements, or text/letters unless explicitly described in icon_idea.",
    style_reference: "Soft 3D icon style with smooth rounded forms, crisper edges, slightly richer saturation, and calm, balanced proportions. UI-friendly and readable at small sizes; professional product-icon vibe.",
    icon_idea: null,
    render_style: {
      materials: "Satin–matte. Minimal subject-specific micro-texture only where needed to suggest material; otherwise smooth. Avoid gloss and strong reflections.",
      shapes: "Rounded but not chubby: tighter corner radii, controlled bevels, clean planes. No toy-like bulges; maintain confident geometry.",
      colors: "Refined, punchier palette. Use 2–3 core colors plus one subtle accent. Slightly richer saturation than pastel, avoid candy/neon or rainbow mixes.",
      lighting: "Soft studio lighting with a gentle key–fill ratio (a bit more contrast than before) and a faint rim/edge light for pop. Subtle grounded shadow. No harsh speculars.",
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
      rules: "Only apply subtle, subject-aware micro-texture to avoid flatness; keep large areas smooth. No generic grain; texture must be barely perceptible at 100%."
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

const ART_DIRECTOR_SYSTEM_PROMPTS: Record<ImageMode, string> = {
  icon: `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180–300 word image brief for an image-generation model.
Rules:
- Do not use any wording or letters in the images.
- Keep ONE consistent visual style across outputs (soft 3D, rounded forms, pastel accents).
- Include: subject, camera, composition, lighting, palette, materials, textures, surface detail, silhouettes, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`,
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

async function boostPrompt(subject: string, mode: ImageMode, env: Env): Promise<string> {
  if (!env.ATLAS_SERVICE) throw new Error('Atlas service not available for prompt boost')

  const spec = { ...IMAGE_STYLE_SPECS[mode], icon_idea: subject }
  const atlasBase = (env.ATLAS_BASE_URL ?? 'https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas').replace(/\/$/, '')
  const response = await env.ATLAS_SERVICE!.fetch(new Request(`${atlasBase}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capability: 'text.generate',
      app: 'generation-api',
      purpose: 'image-art-director',
      input: { input: JSON.stringify(spec, null, 2), system: ART_DIRECTOR_SYSTEM_PROMPTS[mode] },
    }),
  }))

  if (!response.ok) {
    const errorText = await response.text()
    let detail = errorText
    try { detail = JSON.parse(errorText).error?.message || errorText } catch { /* keep raw */ }
    throw new Error(`Prompt boost failed: ${detail}`)
  }
  const data = await response.json() as { data?: { output?: string } }
  return (data.data?.output ?? '').trim()
}

async function generateImage(request: Request, env: Env): Promise<Response> {
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

  const size = body.size || '1024x1024'
  const quality = body.quality === 'hd' ? 'hd' : 'standard'
  const style = body.style === 'natural' ? 'natural' : 'vivid'
  const mode: ImageMode = body.mode === 'coloring' || body.mode === 'background' ? body.mode : 'icon'
  const transparent = body.transparent !== undefined ? body.transparent : (mode === 'icon')

  // Expand the user's subject into a detailed art brief via atlas
  let artBrief: string
  try {
    artBrief = await boostPrompt(body.prompt.trim(), mode, env)
  } catch (err) {
    return apiError('prompt_boost_failed', `Failed to expand prompt: ${(err as Error).message}`, 502)
  }

  // Generate the image via atlas
  const atlasBase = (env.ATLAS_BASE_URL ?? 'https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas').replace(/\/$/, '')
  const atlasResponse = await env.ATLAS_SERVICE!.fetch(new Request(`${atlasBase}/run`, {
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
    return apiError(atlasBody?.error?.code ?? 'atlas_image_failed', atlasBody?.error?.message ?? 'Atlas image request failed.', atlasResponse.status)
  }

  const image = atlasBody?.data?.images?.[0]
  if (!image?.mediaUrl) return apiError('atlas_image_invalid_response', 'Atlas returned an invalid image response.', 502)

  const assetResponse = await fetchAtlasImageAsset(image.mediaUrl, env, atlasBase)
  if (!assetResponse.ok) return apiError('atlas_image_asset_failed', 'Atlas image asset could not be read.', 502)

  const imageBytes = new Uint8Array(await assetResponse.arrayBuffer())
  const id = crypto.randomUUID()
  const r2Key = `images/${id}.png`
  const now = new Date().toISOString()
  const contentType = assetResponse.headers.get('content-type') ?? image.contentType ?? 'image/png'

  await env.GENERATED_MEDIA_BUCKET.put(r2Key, imageBytes, {
    httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
  })

  const dims = parseImageSize(size)
  const imageUrl = `/v1/generation/images/${id}/binary`
  await env.GENERATION_DB.prepare(`INSERT INTO generated_images (
    id, prompt, revised_prompt, model, size, quality, style, image_url, r2_key,
    content_type, file_size_bytes, width, height, category, tags, title, description,
    is_public, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id,
    body.prompt.trim(),
    image.revisedPrompt || null,
    image.provider?.model ?? 'gpt-image-1',
    size,
    quality,
    style,
    imageUrl,
    r2Key,
    contentType,
    imageBytes.byteLength,
    dims.width,
    dims.height,
    body.category || 'generated',
    JSON.stringify(body.tags || []),
    body.title || null,
    null,
    0,
    now,
    now,
  ).run()

  return json({
    data: {
      id,
      imageUrl,
      prompt: body.prompt.trim(),
      revisedPrompt: image.revisedPrompt || null,
      size,
      quality,
      style,
      width: dims.width,
      height: dims.height,
      fileSizeBytes: imageBytes.byteLength,
      createdAt: now,
    },
    meta: { cached: atlasBody?.meta?.cached ?? false, schemaVersion: 1, atlasRequestId: atlasBody?.meta?.requestId },
  }, 201)
}

async function fetchAtlasImageAsset(mediaUrl: string, env: Env, atlasBase: string): Promise<Response> {
  if (/^https?:\/\//i.test(mediaUrl)) return fetch(mediaUrl)
  if (!env.ATLAS_SERVICE) return new Response('Atlas service unavailable', { status: 503 })
  const origin = new URL(atlasBase).origin
  return env.ATLAS_SERVICE.fetch(new Request(`${origin}${mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`}`))
}

function toAtlasImageSize(size: string): 'square' | 'portrait' | 'landscape' {
  if (size === '1024x1792') return 'portrait'
  if (size === '1792x1024') return 'landscape'
  return 'square'
}

async function getImage(pathname: string, env: Env): Promise<Response> {
  const parts = pathname.replace('/v1/generation/images/', '').replace('/binary', '')
  const id = decodeURIComponent(parts)
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)

  const record = await env.GENERATION_DB.prepare(
    'SELECT r2_key, content_type FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ r2_key: string; content_type: string }>()

  if (!record) return apiError('image_not_found', 'Image not found.', 404)

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
  const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)
  const offset = (page - 1) * limit
  const status = url.searchParams.get('status') || 'promoted'
  const isPublic = status === 'draft' ? 0 : 1

  const rows = await env.GENERATION_DB.prepare(
    `SELECT id, prompt, revised_prompt, model, size, quality, style, image_url, r2_key,
            content_type, file_size_bytes, width, height, category, tags, title, description,
            is_public, created_at, updated_at
     FROM generated_images
     WHERE is_public = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(isPublic, limit, offset).all<GeneratedImageRecord>()

  const countRow = await env.GENERATION_DB.prepare(
    'SELECT COUNT(*) AS count FROM generated_images WHERE is_public = ?',
  ).bind(isPublic).first<{ count: number }>()

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
      category: r.category,
      tags: JSON.parse(r.tags || '[]'),
      status: r.is_public === 1 ? 'promoted' : 'draft',
      createdAt: r.created_at,
    })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit), status },
  })
}

async function promoteImage(pathname: string, env: Env): Promise<Response> {
  const id = pathname.replace('/v1/generation/images/', '').replace('/promote', '')
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)

  const now = new Date().toISOString()
  const result = await env.GENERATION_DB.prepare(
    'UPDATE generated_images SET is_public = 1, updated_at = ? WHERE id = ?',
  ).bind(now, id).run()

  if (!result.meta?.changes) return apiError('image_not_found', 'Image not found.', 404)
  return json({ data: { id, status: 'promoted', updatedAt: now } })
}

async function deleteImage(pathname: string, env: Env): Promise<Response> {
  const id = pathname.replace('/v1/generation/images/', '')
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)

  const record = await env.GENERATION_DB.prepare(
    'SELECT r2_key FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ r2_key: string }>()

  if (!record) return apiError('image_not_found', 'Image not found.', 404)

  await env.GENERATED_MEDIA_BUCKET.delete(record.r2_key).catch(() => null)
  await env.GENERATION_DB.prepare('DELETE FROM generated_images WHERE id = ?').bind(id).run()

  return json({ data: { id, deleted: true } })
}

function parseImageSize(size: string): { width: number; height: number } {
  const [w, h] = size.split('x').map(Number)
  return { width: w || 1024, height: h || 1024 }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function apiError(code: string, message: string, status = 400, field?: string): Response {
  return json({ error: { code, message, ...(field ? { field } : {}) } }, status)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export const internals = { generateRequestHash, normalizeTtsRequest, validateTtsRequest, isSafeAudioKey }
