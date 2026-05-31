export interface Env {
  GENERATION_DB: D1DatabaseLike
  GENERATED_MEDIA_BUCKET: R2BucketLike
  OPENAI_API_KEY?: string
}

export interface D1DatabaseLike {
  prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }>; run(): Promise<unknown> } }
}

export interface R2BucketLike {
  get(key: string): Promise<{ body: BodyInit; httpMetadata?: { contentType?: string } } | null>
  put(key: string, value: ArrayBuffer | Uint8Array, options?: Record<string, unknown>): Promise<unknown>
}

export type TtsProvider = 'openai' | 'azure' | 'auto'

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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const OPENAI_VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'])
const AUDIO_KEY_RE = /^audio\/[a-f0-9]{32}\.mp3$/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

    const url = new URL(request.url)
    if (url.pathname === '/v1/generation/tts' && request.method === 'POST') return generateTts(request, env)
    if (url.pathname.startsWith('/v1/generation/audio/') && request.method === 'GET') return getAudio(url.pathname, env)
    if (url.pathname === '/v1/generation/image' && request.method === 'POST') return generateImage(request, env)
    if (url.pathname.startsWith('/v1/generation/images/') && url.pathname.endsWith('/binary') && request.method === 'GET') return getImage(url.pathname, env)
    if (url.pathname === '/v1/generation/images' && request.method === 'GET') return listImages(request, env)

    return apiError('not_found', 'Route not found.', 404)
  },
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

export function normalizeTtsRequest(body: GenerationTtsRequest): NormalizedTtsRequest {
  const provider = body.provider === 'azure' ? 'azure' : body.provider === 'openai' ? 'openai' : 'auto'
  const voice = body.voice && OPENAI_VOICES.has(body.voice) ? body.voice : 'nova'

  return {
    text: body.text.trim(),
    language: body.language.trim().toLowerCase(),
    provider,
    voice,
    model: body.model?.trim() || 'tts-1',
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

function providerSafeMessage(code: string) {
  switch (code) {
    case 'azure_tts_not_configured': return 'Azure TTS is not configured.'
    case 'tts_generation_not_configured': return 'TTS generation is not configured.'
    case 'tts_provider_failed': return 'TTS provider failed.'
    default: return 'TTS generation failed.'
  }
}

// ── Image generation (DALL-E 3) ──────────────────────────────────

interface ImageGenerationRequest {
  prompt: string
  size?: '1024x1024' | '1024x1792' | '1792x1024'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
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
  if (!env.OPENAI_API_KEY) {
    return apiError('image_generation_not_configured', 'Image generation is not configured.', 503)
  }

  const size = body.size || '1024x1024'
  const quality = body.quality === 'hd' ? 'hd' : 'standard'
  const style = body.style === 'natural' ? 'natural' : 'vivid'

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: body.prompt.trim(),
      n: 1,
      size,
      quality,
      style,
      response_format: 'b64_json',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let detail = errorText
    try { detail = JSON.parse(errorText).error?.message || errorText } catch { /* keep raw */ }
    return apiError('image_provider_failed', `Image generation failed: ${detail}`, 502)
  }

  const data = await response.json() as {
    data: Array<{ b64_json: string; revised_prompt?: string }>
  }

  const imageData = data.data[0]
  if (!imageData?.b64_json) {
    return apiError('image_provider_failed', 'No image data returned from provider.', 502)
  }

  const imageBytes = Uint8Array.from(atob(imageData.b64_json), c => c.charCodeAt(0))
  const id = crypto.randomUUID()
  const r2Key = `images/${id}.png`
  const now = new Date().toISOString()

  await env.GENERATED_MEDIA_BUCKET.put(r2Key, imageBytes, {
    httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' },
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
    imageData.revised_prompt || null,
    'dall-e-3',
    size,
    quality,
    style,
    imageUrl,
    r2Key,
    'image/png',
    imageBytes.byteLength,
    dims.width,
    dims.height,
    body.category || 'generated',
    JSON.stringify(body.tags || []),
    body.title || null,
    null,
    1,
    now,
    now,
  ).run()

  return json({
    data: {
      id,
      imageUrl,
      prompt: body.prompt.trim(),
      revisedPrompt: imageData.revised_prompt || null,
      size,
      quality,
      style,
      width: dims.width,
      height: dims.height,
      fileSizeBytes: imageBytes.byteLength,
      createdAt: now,
    },
    meta: { cached: false, schemaVersion: 1 },
  }, 201)
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

  const rows = await env.GENERATION_DB.prepare(
    `SELECT id, prompt, revised_prompt, model, size, quality, style, image_url, r2_key,
            content_type, file_size_bytes, width, height, category, tags, title, description,
            is_public, created_at, updated_at
     FROM generated_images
     WHERE is_public = 1
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(limit, offset).all<GeneratedImageRecord>()

  const countRow = await env.GENERATION_DB.prepare(
    'SELECT COUNT(*) AS count FROM generated_images WHERE is_public = 1',
  ).bind().first<{ count: number }>()

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
      createdAt: r.created_at,
    })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
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
