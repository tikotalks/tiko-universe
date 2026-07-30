import { CORS_HEADERS, apiError, fetchWithRetry, json } from './http'
import { resolveSecrets } from '../../shared/secrets'
import { authenticate } from '../../shared/auth'
import { ALLOWED_IMAGE_SIZES, atlasAuthorization as atlasAuth, boostPrompt, type ImageMode, type TikoStyle } from './image-prompts'
import {
  authFailureResponse,
  canAccessOwnedRecord,
  canMutateOwnedRecord,
  createdBy,
  forbiddenOrUnauthorized,
  isElevatedAccess,
  optionalAuth,
  requireAuth,
  requirePaidAccess,
  sessionUserId,
  type GenerationAccessContext,
} from './access'
import {
  DEFAULT_ELEVENLABS_MODEL,
  DEFAULT_ELEVENLABS_VOICE,
  ELEVENLABS_VOICE_ID_RE,
  OPENAI_VOICES,
  generateAudioBytes,
  generateRequestHash,
  normalizeTtsRequest,
  providerSafeMessage,
  requestAtlasSpeech,
  storySegmentCacheKey,
  validateTtsRequest,
  type GenerationTtsRequest,
  type NormalizedTtsRequest,
} from './speech'
import {
  claimNextPendingJob,
  claimStalledJob,
  deleteJobRow,
  enqueueJobs,
  getJobRow,
  listJobRows,
  markJobDone,
  markJobError,
  toJobDto,
  type GenerateJobInput,
  type GenerationJobInput,
  type GenerationJobRow,
} from './jobs'

export interface Env {
  GENERATION_DB: D1DatabaseLike
  GENERATED_MEDIA_BUCKET: R2BucketLike
  OPENAI_API_KEY?: string
  OPENAI_SECRET?: { get(): Promise<string> }
  ELEVENLABS_API_KEY?: string
  ELEVENLABS_SECRET?: { get(): Promise<string> }
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
  ATLAS_SECRET?: { get(): Promise<string> }
}

export interface D1DatabaseLike {
  prepare(sql: string): {
    bind(...values: unknown[]): D1StatementLike
    first<T>(): Promise<T | null>
    all<T>(): Promise<{ results: T[] }>
    run(): Promise<{ meta?: { changes?: number } }>
  }
}

interface D1StatementLike {
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
  run(): Promise<{ meta?: { changes?: number } }>
}

export interface R2BucketLike {
  get(key: string): Promise<{ body: BodyInit; httpMetadata?: { contentType?: string } } | null>
  put(key: string, value: ArrayBuffer | Uint8Array, options?: Record<string, unknown>): Promise<unknown>
  delete(key: string): Promise<unknown>
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
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    try {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
      const resolvedEnv = await resolveSecrets(env)

      const url = new URL(request.url)
      if (url.pathname === '/v1/generation/health' && request.method === 'GET') return generationHealth()
      if (url.pathname === '/v1/generation/openai-status' && request.method === 'GET') return await openaiStatus(resolvedEnv)
      if (url.pathname === '/v1/generation/voices' && request.method === 'GET') return await requirePaidAccess(request, resolvedEnv, { capability: 'voices.list', units: 1, maxRequestsPerMinute: 120, maxUnitsPerDay: 2000 }, () => listVoices(url, resolvedEnv))
      if (url.pathname === '/v1/generation/tts' && request.method === 'POST') return await generateTts(request, resolvedEnv)
      if (url.pathname.startsWith('/v1/generation/voice-samples/') && request.method === 'GET') return await requirePaidAccess(request, resolvedEnv, { capability: 'voice.sample', units: 40, maxRequestsPerMinute: 30, maxUnitsPerDay: 2000 }, () => getVoiceSample(url, resolvedEnv))
      if (url.pathname === '/v1/generation/image' && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => generateImage(request, resolvedEnv, access))
      if (url.pathname === '/v1/generation/jobs' && request.method === 'POST') return await enqueueJobRoute(request, resolvedEnv, ctx)
      if (url.pathname === '/v1/generation/jobs' && request.method === 'GET') return await listJobsRoute(request, resolvedEnv)
      if (url.pathname === '/v1/generation/jobs/process' && request.method === 'POST') return await processJobsRoute(request, resolvedEnv)
      if (url.pathname.startsWith('/v1/generation/jobs/') && request.method === 'GET') return await getJobRoute(url.pathname, request, resolvedEnv)
      if (url.pathname.startsWith('/v1/generation/jobs/') && request.method === 'DELETE') return await requireAuth(request, resolvedEnv, (access) => deleteJobRoute(url.pathname, resolvedEnv, access))
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/binary') && request.method === 'GET') return await getImage(request, url.pathname, resolvedEnv)
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/promote') && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => promoteImage(url.pathname, resolvedEnv, access))
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/media-link') && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => linkImageMedia(url.pathname, request, resolvedEnv, access))
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/enrich') && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => enrichImage(url.pathname, resolvedEnv, access))
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/edit') && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => editImageVariant(url.pathname, request, resolvedEnv, access))
      if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/upscale') && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => upscaleImage(url.pathname, request, resolvedEnv, access))
      if (url.pathname === '/v1/generation/images/import' && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => importExternalImage(request, resolvedEnv, access))
      if (url.pathname.startsWith('/v1/generation/images/') && request.method === 'DELETE') return await requireAuth(request, resolvedEnv, (access) => deleteImage(url.pathname, resolvedEnv, access))
      if (url.pathname.startsWith('/v1/generation/images/') && request.method === 'PATCH') return await requireAuth(request, resolvedEnv, (access) => updateImageMeta(url.pathname, request, resolvedEnv, access))
      if (url.pathname === '/v1/generation/images/facets' && request.method === 'GET') return await listImageFacets(request, resolvedEnv)
      if (url.pathname === '/v1/generation/images' && request.method === 'GET') return await listImages(request, resolvedEnv)
      if (url.pathname === '/v1/generation/stories/tryout' && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => generateStoryTryout(request, resolvedEnv, access))
      if (url.pathname === '/v1/generation/stories/render' && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => renderStory(request, resolvedEnv, access))
      if (url.pathname === '/v1/generation/story-drafts' && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => createStoryDraft(request, resolvedEnv, access))
      if (url.pathname === '/v1/generation/story-drafts' && request.method === 'GET') return await requireAuth(request, resolvedEnv, (access) => listStoryDrafts(resolvedEnv, access))
      if (url.pathname.startsWith('/v1/generation/stories/') && url.pathname.endsWith('/audio') && request.method === 'GET') return await getStoryAudio(request, url.pathname, resolvedEnv)
      if (url.pathname.startsWith('/v1/generation/stories/') && url.pathname.endsWith('/promote') && request.method === 'POST') return await requireAuth(request, resolvedEnv, (access) => promoteStory(url.pathname, resolvedEnv, access))
      if (url.pathname.startsWith('/v1/generation/stories/') && request.method === 'DELETE') return await requireAuth(request, resolvedEnv, (access) => deleteStory(url.pathname, resolvedEnv, access))
      if (url.pathname === '/v1/generation/stories' && request.method === 'GET') return await listStories(request, resolvedEnv)

      return apiError('not_found', 'Route not found.', 404)
    } catch (error) {
      console.error('[generation-api] unhandled request error', error)
      return apiError('internal_error', 'Generation request failed.', 500)
    }
  },

  // Cron backstop: waitUntil on enqueue starts jobs immediately, but if a Worker
  // is killed mid-run or a job is enqueued out-of-band, this drains the queue.
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const resolvedEnv = await resolveSecrets(env)
    await processPendingJobs(resolvedEnv, 4)
    const stalledBefore = new Date(Date.now() - 5 * 60_000).toISOString()
    const stalled = await claimStalledJob(resolvedEnv, stalledBefore)
    if (stalled) await runJobToCompletion(resolvedEnv, stalled)
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

async function openaiStatus(env: Env): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    return json({ data: { configured: false, keyValid: false, error: 'OPENAI_API_KEY not set' } })
  }
  try {
    const resp = await fetch('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    })
    if (resp.ok) {
      return json({ data: { configured: true, keyValid: true, error: null } })
    }
    const body = await resp.text().catch(() => '')
    const error = resp.status === 429 ? 'Rate limited or insufficient quota'
      : resp.status === 401 ? 'Invalid API key'
      : resp.status === 402 ? 'Payment required — check billing'
      : `HTTP ${resp.status}: ${body.slice(0, 200)}`
    return json({ data: { configured: true, keyValid: false, error } })
  } catch (err) {
    return json({ data: { configured: true, keyValid: false, error: `Network error: ${String(err)}` } })
  }
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
  const where = isElevatedAccess(access) ? '' : 'WHERE created_by = ?'
  const values = isElevatedAccess(access) ? [] : [sessionUserId(access)]
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
  return requirePaidAccess(request, env, {
    capability: 'tts.generate',
    units: Math.max(1, normalized.text.length),
    maxRequestsPerMinute: 60,
    maxUnitsPerDay: 12000,
  }, () => synthesizeWithAtlas(normalized, env, request.headers.get('Authorization')))
}

async function synthesizeWithAtlas(input: NormalizedTtsRequest, env: Env, callerAuth?: string | null): Promise<Response> {
  const atlas = await requestAtlasSpeech(input, env, 'speech-playback', callerAuth)
  if (atlas.success === false) return apiError(atlas.error, providerSafeMessage(atlas.error), atlas.status ?? 503)

  const data = atlas.body.data
  // Atlas returns a host-relative asset path; clients (e.g. the iOS player) need
  // an absolute URL. The /v1/atlas/assets/* endpoint is public, so resolve it
  // against the Atlas origin.
  let audioUrl = data.audioUrl
  if (audioUrl && !audioUrl.startsWith('http')) {
    let origin = 'https://api.tikotalks.com'
    try { origin = new URL(env.ATLAS_BASE_URL ?? origin).origin } catch { /* keep default */ }
    audioUrl = `${origin}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`
  }
  return json({
    data: {
      id: data.id,
      audioUrl,
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

function isSafeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id)
}

// `%` and `_` are LIKE wildcards, so a search for "100%" or "_" would otherwise
// match everything. Neutralise them and pair with likeClause's ESCAPE.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, character => `\\${character}`)
}

function likeClause(column: string): string {
  return `${column} LIKE ? ESCAPE '\\'`
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
  const ownerClause = isPublic === 0 && !isElevatedAccess(access) ? ' AND created_by = ?' : ''
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
  const tikoStyle: TikoStyle = body.tikoStyle === 'tiko-original' || body.tikoStyle === 'tiko-v2' || body.tikoStyle === 'tiko-natural' ? body.tikoStyle : 'tiko-v3'
  const transparent = body.transparent !== undefined ? body.transparent : (mode === 'icon')

  if (!env.ATLAS_SERVICE) return apiError('atlas_not_available', 'Atlas service is not available.', 503)
  const atlasBase = (env.ATLAS_BASE_URL ?? 'https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas').replace(/\/$/, '')

  // Multi-preview mode: boost the prompt once via art director, then generate N images concurrently
  // with composition-only variation hints (no color-mood hints that cause hue dominance).
  if (count > 1) {
    if (!env.OPENAI_API_KEY) return apiError('openai_not_configured', 'OpenAI is not configured.', 503)

    let boostedBrief = body.prompt.trim()
    try {
      boostedBrief = await boostPrompt(body.prompt.trim(), mode, tikoStyle, env, request.headers.get('Authorization'))
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
    const variationErrors: Array<{ status: number; code: string | null; message: string }> = []
    const calls = Array.from({ length: count }, async (_, i) => {
      const variedPrompt = `${boostedBrief}\n\nComposition hint: ${variationHints[i % variationHints.length]}`
      try {
        const isTikoV3 = tikoStyle === 'tiko-v3'
        const payload: Record<string, unknown> = {
          model: isTikoV3 ? 'gpt-image-1' : 'gpt-image-1-mini',
          prompt: variedPrompt,
          size,
          n: 1,
          quality: isTikoV3 ? 'high' : 'medium',
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
          variationErrors.push(parseOpenAIImageError(openaiResponse.status, errText))
          return null
        }
        const openaiBody = await openaiResponse.json() as { data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }> }
        const imageItem = openaiBody.data?.[0]
        if (!imageItem) {
          variationErrors.push({ status: 502, code: null, message: 'OpenAI returned no image data.' })
          return null
        }

        let imageBytes: Uint8Array
        if (imageItem.b64_json) {
          imageBytes = base64ToBytes(imageItem.b64_json)
        } else if (imageItem.url) {
          const urlRes = await fetchWithRetry(imageItem.url, {}, { timeoutMs: PROVIDER_IMAGE_TIMEOUT_MS })
          if (!urlRes.ok) {
            variationErrors.push(parseOpenAIImageError(urlRes.status, await urlRes.text().catch(() => '')))
            return null
          }
          imageBytes = new Uint8Array(await urlRes.arrayBuffer())
        } else {
          variationErrors.push({ status: 502, code: null, message: 'OpenAI returned no image bytes.' })
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
        const message = e instanceof Error ? e.message : 'Variation failed.'
        console.error('[generate] Variation', i, 'failed', e)
        variationErrors.push({ status: 502, code: null, message })
        return null
      }
    })
    const settled = await Promise.all(calls)
    const results = settled.filter(Boolean) as Array<{ id: string; imageUrl: string; prompt: string; revisedPrompt: string | null; size: string; quality: string; style: string; width: number; height: number; fileSizeBytes: number; isPreview: boolean; createdAt: string }>
    if (!results.length) {
      const { code, message } = deriveOpenAIVariationError(variationErrors)
      return apiError(code, message, 502)
    }
    return json({ data: results, meta: { schemaVersion: 1, count: results.length } }, 201)
  }

  // Single image: use art director boost then generate
  let artBrief: string
  try {
    const boosted = await boostPrompt(body.prompt.trim(), mode, tikoStyle, env, request.headers.get('Authorization'))
    artBrief = boosted || body.prompt.trim()
  } catch {
    artBrief = body.prompt.trim()
  }

  const atlasHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  const atlasAuthorization = atlasAuth(env, request.headers.get('Authorization'))
  if (atlasAuthorization) atlasHeaders.Authorization = atlasAuthorization
  const atlasResponse = await env.ATLAS_SERVICE.fetch(new Request(`${atlasBase}/run`, {
    method: 'POST',
    headers: atlasHeaders,
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

// ── Server-side generation queue ───────────────────────────────────────
// Enqueue is a cheap write that returns immediately; processing happens in a
// waitUntil (kicked off on enqueue) and/or the scheduled() cron backstop. The
// client polls GET /jobs to render progress, so closing the laptop loses
// nothing — jobs live in D1 and run to completion regardless of the client.

const MAX_JOBS_PER_ENQUEUE = 8

interface EnqueueRequestBody {
  items?: unknown
  input?: unknown
}

function coerceJobInputs(body: EnqueueRequestBody): GenerationJobInput[] | { error: Response } {
  const candidates = Array.isArray(body.items) ? body.items : [body.input]
  const inputs: GenerationJobInput[] = []
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'object') return { error: apiError('invalid_job_input', 'Each job needs a type and input.', 400) }
    const type = (raw as { type?: unknown }).type
    if (type === 'generate') {
      const g = raw as Record<string, unknown>
      if (typeof g.prompt !== 'string' || !g.prompt.trim()) return { error: apiError('missing_prompt', 'Prompt is required.', 400, 'prompt') }
      inputs.push({ type: 'generate', prompt: g.prompt, mode: g.mode as GenerateJobInput['mode'], tikoStyle: g.tikoStyle as GenerateJobInput['tikoStyle'], size: g.size as GenerateJobInput['size'], quality: g.quality as GenerateJobInput['quality'], style: g.style as GenerateJobInput['style'], transparent: g.transparent as boolean | undefined, title: g.title as string | undefined, category: g.category as string | undefined, tags: g.tags as string[] | undefined, count: g.count as number | undefined })
    } else if (type === 'edit') {
      const e = raw as Record<string, unknown>
      if (typeof e.sourceId !== 'string' || typeof e.prompt !== 'string') return { error: apiError('invalid_job_input', 'Edit jobs need sourceId and prompt.', 400) }
      inputs.push({ type: 'edit', sourceId: e.sourceId, prompt: e.prompt, maskBase64: e.maskBase64 as string | undefined, size: (e.size as GenerateJobInput['size']) ?? '1024x1024' })
    } else if (type === 'upscale') {
      const u = raw as Record<string, unknown>
      if (typeof u.sourceId !== 'string') return { error: apiError('invalid_job_input', 'Enhance jobs need sourceId.', 400) }
      inputs.push({ type: 'upscale', sourceId: u.sourceId, size: (u.size as GenerateJobInput['size']) ?? '1024x1024', quality: u.quality as string | undefined, title: u.title as string | undefined, description: u.description as string | undefined, category: u.category as string | undefined, tags: u.tags as string[] | undefined })
    } else {
      return { error: apiError('invalid_job_type', 'Job type must be generate, edit, or enhance.', 400) }
    }
    if (inputs.length > MAX_JOBS_PER_ENQUEUE) return { error: apiError('too_many_jobs', `At most ${MAX_JOBS_PER_ENQUEUE} jobs per request.`, 400) }
  }
  if (!inputs.length) return { error: apiError('invalid_job_input', 'No jobs provided.', 400) }
  return inputs
}

async function enqueueJobRoute(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const authed = await authenticate(request, env)
  if (authed.ok === false) return authFailureResponse(authed.response)
  const ownerId = authed.method === 'session' && authed.userId ? authed.userId : null

  let body: EnqueueRequestBody
  try {
    body = await request.json() as EnqueueRequestBody
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400)
  }

  const coerced = coerceJobInputs(body)
  if ('error' in coerced) return coerced.error
  const rows = await enqueueJobs(env, ownerId, coerced)

  // Kick off processing immediately so latency is sub-second under normal load.
  // The cron handler covers the case where this Worker invocation ends early.
  ctx?.waitUntil(processPendingJobs(env, rows.length))

  return json({ data: rows.map(toJobDto), meta: { schemaVersion: 1, count: rows.length } }, 202)
}

// Manual processing trigger — the client calls this after enqueue and during
// polling. This is the primary processing path; ctx.waitUntil and cron are
// backstops. Processes one job per call so a single generate (30-60s) can't
// blow the wall-time budget. The client polls every few seconds, providing
// throughput without sequential stacking.
async function processJobsRoute(request: Request, env: Env): Promise<Response> {
  const authed = await authenticate(request, env)
  if (authed.ok === false) return authFailureResponse(authed.response)
  const active = await countPendingJobs(env)
  if (active === 0) return json({ data: { processed: 0, remaining: 0 } })
  const processed = await processPendingJobs(env, 1)
  const remaining = await countPendingJobs(env)
  return json({ data: { processed, remaining } })
}

async function countPendingJobs(env: Env): Promise<number> {
  const row = await env.GENERATION_DB.prepare(
    `SELECT COUNT(*) as count FROM generation_jobs WHERE status = 'pending' OR status = 'processing'`,
  ).first<{ count: number }>()
  return row?.count ?? 0
}

async function listJobsRoute(request: Request, env: Env): Promise<Response> {
  const authed = await authenticate(request, env)
  if (authed.ok === false) return authFailureResponse(authed.response)
  const ownerId = authed.method === 'session' && authed.userId ? authed.userId : null
  // Service keys / admins (no session userId) see all jobs; users see their own.
  const rows = await listJobRows(env, ownerId, 100)
  return json({ data: rows.map(toJobDto), meta: { schemaVersion: 1, count: rows.length } })
}

async function getJobRoute(pathname: string, request: Request, env: Env): Promise<Response> {
  const authed = await authenticate(request, env)
  if (authed.ok === false) return authFailureResponse(authed.response)
  const id = pathname.replace('/v1/generation/jobs/', '')
  if (!isSafeId(id)) return apiError('invalid_job_id', 'Job id is invalid.', 400)
  const row = await getJobRow(env, id)
  if (!row) return apiError('job_not_found', 'Job not found.', 404)
  // Scope to owner unless the caller is elevated (service key / admin).
  if (row.created_by && authed.method === 'session' && authed.userId !== row.created_by && !isAdmin(authed)) {
    return apiError('job_not_found', 'Job not found.', 404)
  }
  return json({ data: toJobDto(row) })
}

async function deleteJobRoute(pathname: string, env: Env, access: GenerationAccessContext): Promise<Response> {
  const id = pathname.replace('/v1/generation/jobs/', '')
  if (!isSafeId(id)) return apiError('invalid_job_id', 'Job id is invalid.', 400)
  const row = await getJobRow(env, id)
  if (!row) return apiError('job_not_found', 'Job not found.', 404)
  if (row.created_by && !isElevatedAccess(access) && sessionUserId(access) !== row.created_by) return forbiddenOrUnauthorized(access)
  const changes = await deleteJobRow(env, id)
  if (!changes) return apiError('job_not_found', 'Job not found.', 404)
  return json({ data: { id, deleted: true } })
}

function isAdmin(authed: { method: string; roles?: string[] }): boolean {
  return Array.isArray(authed.roles) && authed.roles.includes('admin')
}

// Reconstruct the in-process auth context for a job owner. The job already passed
// auth at enqueue time; here we only need createdBy() and ownership checks to
// resolve to the same owner. Bearer token is intentionally absent — async Atlas
// calls fall back to ATLAS_API_KEY (the service credential).
function accessForJobOwner(createdByValue: string | null): GenerationAccessContext {
  return {
    auth: createdByValue
      ? { ok: true, method: 'session', userId: createdByValue, roles: [], capabilities: {}, bearerToken: 'job' }
      : { ok: true, method: 'api_key', subjectId: 'job', roles: [], capabilities: {}, bearerToken: 'job' },
  }
}

// Internal requests carry the service key so Atlas capability calls authenticate.
function syntheticRequest(pathname: string, body: unknown, env: Env): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const auth = atlasAuth(env, null)
  if (auth) headers.Authorization = auth
  return new Request(`https://generation.local${pathname}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

// Runs a single claimed job to completion, persisting result or error.
export async function runJobToCompletion(env: Env, job: GenerationJobRow): Promise<void> {
  try {
    const input = JSON.parse(job.input_json) as GenerationJobInput
    const access = accessForJobOwner(job.created_by)
    let response: Response
    if (input.type === 'edit') {
      response = await editImageVariant(`/v1/generation/images/${input.sourceId}/edit`, syntheticRequest('/edit', { prompt: input.prompt, mask_base64: input.maskBase64, size: input.size }, env), env, access)
    } else if (input.type === 'upscale') {
      response = await upscaleImage(`/v1/generation/images/${input.sourceId}/upscale`, syntheticRequest('/upscale', { size: input.size, quality: input.quality }, env), env, access)
    } else {
      response = await generateImage(syntheticRequest('/v1/generation/image', input, env), env, access)
    }
    const body = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null
    if (!response.ok || body?.error) {
      await markJobError(env, job.id, body?.error?.code ?? 'job_failed', body?.error?.message ?? `Generation failed with status ${response.status}.`)
      return
    }
    await markJobDone(env, job.id, body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed.'
    console.error('[jobs] processing failed for', job.id, error)
    await markJobError(env, job.id, 'job_failed', message)
  }
}

// Drains up to `limit` pending jobs sequentially. Sequential keeps provider rate
// limits sane and lets each job store its result before the next starts.
export async function processPendingJobs(env: Env, limit: number): Promise<number> {
  let processed = 0
  for (let i = 0; i < limit; i += 1) {
    const job = await claimNextPendingJob(env)
    if (!job) break
    await runJobToCompletion(env, job)
    processed += 1
  }
  return processed
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
  const ownerClause = isPublic === 0 && !isElevatedAccess(access) ? ' AND created_by = ?' : ''
  const ownerValues = ownerClause ? [sessionUserId(access)] : []

  const search = url.searchParams.get('search')?.trim()
  const category = url.searchParams.get('category')?.trim()
  const tag = url.searchParams.get('tag')?.trim()

  const filterClauses: string[] = []
  const filterValues: unknown[] = []
  // Generated images are described by their prompt as much as by their metadata,
  // so free text has to match both, plus the tag list. Prose matches anywhere,
  // but the category and each tag anchor to the start of the value, so "pet"
  // finds "pets" without dragging in everything tagged "carpet".
  if (search) {
    filterClauses.push(`(${['title', 'description', 'prompt', 'revised_prompt'].map(column => likeClause(column)).join(' OR ')} OR ${likeClause('category')} OR ${likeClause('tags')})`)
    const anywhere = `%${escapeLike(search)}%`
    filterValues.push(anywhere, anywhere, anywhere, anywhere, `${escapeLike(search)}%`, `%"${escapeLike(search)}%`)
  }
  if (category) {
    filterClauses.push('category = ?')
    filterValues.push(category)
  }
  if (tag) {
    filterClauses.push(likeClause('tags'))
    filterValues.push(`%"${escapeLike(tag)}"%`)
  }
  const filters = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : ''

  const rows = await env.GENERATION_DB.prepare(
    `SELECT id, prompt, revised_prompt, model, size, quality, style, image_url, r2_key,
            content_type, file_size_bytes, width, height, category, tags, title, description,
            is_public, is_preview, media_id, created_by, created_at, updated_at
     FROM generated_images
     WHERE is_public = ?${ownerClause}${filters}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(isPublic, ...ownerValues, ...filterValues, limit, offset).all<GeneratedImageRecord>()

  const countRow = await env.GENERATION_DB.prepare(
    `SELECT COUNT(*) AS count FROM generated_images WHERE is_public = ?${ownerClause}${filters}`,
  ).bind(isPublic, ...ownerValues, ...filterValues).first<{ count: number }>()

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
  if (record.is_preview === 1) return apiError('preview_cannot_promote', 'Preview images must be enhanced before promoting.', 400)

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
    'SELECT id, title, prompt, r2_key, content_type, created_by FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ id: string; title: string | null; prompt: string; r2_key: string | null; content_type: string | null; created_by: string | null }>()

  if (!record) return apiError('image_not_found', 'Image not found.', 404)
  if (!canMutateOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)

  // Embed the image inline as a base64 data URL. The /binary endpoint is auth-gated
  // (private drafts), so OpenAI cannot fetch it by URL — reading the bytes from R2
  // and inlining them avoids the auth/reachability problem entirely.
  if (!record.r2_key) return apiError('image_not_found', 'Image has no stored binary.', 404)
  const object = await env.GENERATED_MEDIA_BUCKET.get(record.r2_key)
  if (!object) return apiError('image_not_found', 'Image binary not found.', 404)
  const contentType = object.httpMetadata?.contentType ?? record.content_type ?? 'image/png'
  const imageUrl = `data:${contentType};base64,${bytesToBase64(await new Response(object.body).arrayBuffer())}`
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

async function importExternalImage(request: Request, env: Env, access: GenerationAccessContext): Promise<Response> {
  let body: { imageUrl?: unknown; title?: unknown; category?: unknown; tags?: unknown }
  try {
    body = await request.json() as { imageUrl?: unknown; title?: unknown; category?: unknown; tags?: unknown }
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400)
  }

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
  if (!imageUrl) return apiError('missing_image_url', 'imageUrl is required.', 400)

  let imageResponse: Response
  try {
    imageResponse = await fetchWithRetry(imageUrl, {}, { timeoutMs: PROVIDER_IMAGE_TIMEOUT_MS })
  } catch {
    return apiError('image_fetch_failed', 'Could not fetch the source image.', 502)
  }
  if (!imageResponse.ok) return apiError('image_fetch_failed', `Could not fetch the source image: ${imageResponse.status}`, 502)

  const imageBuffer = await imageResponse.arrayBuffer()
  const contentType = imageResponse.headers.get('content-type') || 'image/png'

  const id = crypto.randomUUID()
  const r2Key = `images/${id}.png`
  const now = new Date().toISOString()
  const imageUrlPath = `/v1/generation/images/${id}/binary`

  await env.GENERATED_MEDIA_BUCKET.put(r2Key, imageBuffer, {
    httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' },
  })

  const title = typeof body.title === 'string' ? body.title : null
  const category = typeof body.category === 'string' ? body.category : 'imported'
  const tags = Array.isArray(body.tags) ? JSON.stringify(body.tags.filter((t): t is string => typeof t === 'string')) : '[]'

  await env.GENERATION_DB.prepare(`INSERT INTO generated_images (
    id, prompt, revised_prompt, model, size, quality, style, image_url, r2_key,
    content_type, file_size_bytes, width, height, category, tags, title, description,
    is_public, created_by, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, `Imported from ${imageUrl}`, null, 'import', 'unknown', 'standard', 'natural', imageUrlPath, r2Key,
    contentType, imageBuffer.byteLength, null, null,
    category, tags, title, null,
    0, createdBy(access), now, now,
  ).run()

  return json({
    data: {
      id,
      imageUrl: imageUrlPath,
      prompt: `Imported from ${imageUrl}`,
      revisedPrompt: null,
      model: 'import',
      size: 'unknown',
      quality: 'standard',
      style: 'natural',
      width: null,
      height: null,
      fileSizeBytes: imageBuffer.byteLength,
      title,
      description: null,
      category,
      tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : [],
      status: 'draft',
      isPreview: false,
      mediaId: null,
      createdAt: now,
    },
    meta: { schemaVersion: 1 },
  }, 201)
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

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
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
    return apiError('image_upscale_failed', `Image enhance failed: ${editResponse.status}`, editResponse.status >= 500 ? 502 : editResponse.status)
  }

  const editData = await editResponse.json() as { data?: Array<{ b64_json?: string; url?: string }> }
  const imageItem = editData.data?.[0]
  if (!imageItem) {
    console.error('[upscale] OpenAI returned no image data', { editData, sourceId: id })
    return apiError('image_upscale_invalid_response', 'Image enhance returned no data.', 502)
  }

  let newImageBytes: Uint8Array
  if (imageItem.b64_json) {
    newImageBytes = base64ToBytes(imageItem.b64_json)
  } else if (imageItem.url) {
    const urlRes = await fetchWithRetry(imageItem.url, {}, { timeoutMs: PROVIDER_IMAGE_TIMEOUT_MS })
    if (!urlRes.ok) return apiError('image_upscale_asset_failed', 'Could not fetch upscaled image asset.', 502)
    newImageBytes = new Uint8Array(await urlRes.arrayBuffer())
  } else {
    return apiError('image_upscale_invalid_response', 'Image enhance returned no image data.', 502)
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

// PATCH /v1/generation/images/:id — hand-edit the descriptive metadata. This is
// the counterpart to /enrich (which writes the same fields from vision) and is
// deliberately separate from /edit, which regenerates the picture itself.
async function updateImageMeta(pathname: string, request: Request, env: Env, access: GenerationAccessContext): Promise<Response> {
  const id = pathname.replace('/v1/generation/images/', '')
  if (!isSafeId(id)) return apiError('invalid_image_id', 'Image id is invalid.', 400)

  const record = await env.GENERATION_DB.prepare(
    'SELECT created_by FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ created_by: string | null }>()

  if (!record) return apiError('image_not_found', 'Image not found.', 404)
  if (!canMutateOwnedRecord(access, record)) return forbiddenOrUnauthorized(access)

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return apiError('invalid_body', 'Body must be a JSON object.', 400)

  const sets: string[] = []
  const values: unknown[] = []
  if (typeof body.title === 'string') { sets.push('title = ?'); values.push(body.title.trim() || null) }
  if (typeof body.description === 'string') { sets.push('description = ?'); values.push(body.description.trim() || null) }
  if (typeof body.category === 'string') { sets.push('category = ?'); values.push(body.category.trim()) }
  if (Array.isArray(body.tags)) {
    sets.push('tags = ?')
    values.push(JSON.stringify(body.tags.filter((tag): tag is string => typeof tag === 'string')))
  }
  if (sets.length === 0) return apiError('no_fields', 'No editable fields were supplied.', 400)

  sets.push('updated_at = ?')
  values.push(new Date().toISOString(), id)

  await env.GENERATION_DB.prepare(
    `UPDATE generated_images SET ${sets.join(', ')} WHERE id = ?`,
  ).bind(...values).run()

  const updated = await env.GENERATION_DB.prepare(
    'SELECT id, title, description, category, tags FROM generated_images WHERE id = ? LIMIT 1',
  ).bind(id).first<{ id: string; title: string | null; description: string | null; category: string; tags: string }>()

  return json({
    data: {
      id: updated!.id,
      title: updated!.title,
      description: updated!.description,
      category: updated!.category,
      tags: JSON.parse(updated!.tags || '[]') as string[],
    },
  })
}

// GET /v1/generation/images/facets — the categories and tags that actually occur,
// so the admin filter bar can offer real options.
async function listImageFacets(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const access = await optionalAuth(request, env)
  if (access instanceof Response) return access
  const status = url.searchParams.get('status') || 'promoted'
  const isPublic = status === 'draft' ? 0 : 1
  if (isPublic === 0 && !access.auth) return forbiddenOrUnauthorized(access)
  const ownerClause = isPublic === 0 && !isElevatedAccess(access) ? ' AND created_by = ?' : ''
  const ownerValues = ownerClause ? [sessionUserId(access)] : []

  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '500'), 1), 2000)

  const [categories, tags, tagTotal] = await Promise.all([
    env.GENERATION_DB.prepare(
      `SELECT category AS value, COUNT(*) AS count
       FROM generated_images
       WHERE is_public = ?${ownerClause} AND category IS NOT NULL AND category != ''
       GROUP BY category
       ORDER BY count DESC, value ASC
       LIMIT ?`,
    ).bind(isPublic, ...ownerValues, limit).all<{ value: string; count: number }>(),
    // json_each aborts the whole query on a malformed document, hence json_valid.
    env.GENERATION_DB.prepare(
      `SELECT entry.value AS value, COUNT(*) AS count
       FROM generated_images, json_each(generated_images.tags) AS entry
       WHERE is_public = ?${ownerClause} AND json_valid(generated_images.tags)
       GROUP BY entry.value
       ORDER BY count DESC, value ASC
       LIMIT ?`,
    ).bind(isPublic, ...ownerValues, limit).all<{ value: string; count: number }>(),
    env.GENERATION_DB.prepare(
      `SELECT COUNT(DISTINCT entry.value) AS count
       FROM generated_images, json_each(generated_images.tags) AS entry
       WHERE is_public = ?${ownerClause} AND json_valid(generated_images.tags)`,
    ).bind(isPublic, ...ownerValues).first<{ count: number }>(),
  ])

  const clean = (rows: Array<{ value: string; count: number }>) => rows
    .filter(row => typeof row.value === 'string' && row.value.length > 0)
    .map(row => ({ value: row.value, count: Number(row.count) }))

  const cleanCategories = clean(categories.results)
  const cleanTags = clean(tags.results)

  // Say what was left out rather than letting a capped list read as the whole set.
  return json({
    data: { categories: cleanCategories, tags: cleanTags },
    meta: {
      limit,
      categories: { returned: cleanCategories.length, total: cleanCategories.length, truncated: false },
      tags: {
        returned: cleanTags.length,
        total: Number(tagTotal?.count ?? cleanTags.length),
        truncated: Number(tagTotal?.count ?? cleanTags.length) > cleanTags.length,
      },
    },
  })
}

function parseImageSize(size: string): { width: number; height: number } {
  const [w, h] = size.split('x').map(Number)
  return { width: w || 1024, height: h || 1024 }
}

function parseOpenAIImageError(status: number, body: string): { status: number; code: string | null; message: string } {
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string; message?: string } }
    return { status, code: parsed.error?.code ?? null, message: parsed.error?.message ?? `OpenAI returned status ${status}` }
  } catch {
    return { status, code: null, message: body?.trim() || `OpenAI returned status ${status}` }
  }
}

// Maps the first/representative provider failure into a clear job error so the
// admin queue surfaces the real reason (e.g. billing cap) instead of a generic
// "All image variations failed." that gives no actionable signal.
function deriveOpenAIVariationError(errors: Array<{ status: number; code: string | null; message: string }>): { code: string; message: string } {
  if (!errors.length) return { code: 'openai_failed', message: 'All image variations failed.' }
  const billing = errors.find((e) => e.code === 'billing_hard_limit_reached' || e.code === 'insufficient_quota' || e.status === 402)
  if (billing) {
    return {
      code: 'openai_billing_limit',
      message: 'OpenAI billing limit reached — raise the spending limit in the OpenAI dashboard, then retry.',
    }
  }
  const first = errors[0]
  return { code: 'openai_failed', message: `All image variations failed (${first.status}${first.code ? ` ${first.code}` : ''}): ${first.message}` }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export const internals = { generateRequestHash, normalizeTtsRequest, validateTtsRequest }
