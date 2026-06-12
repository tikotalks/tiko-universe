interface Env {
  TTS_DB: {
    prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; run(): Promise<unknown> } }
  }
  AUDIO_BUCKET: {
    get(key: string): Promise<{ body: BodyInit; httpMetadata?: { contentType?: string } } | null>
    put(key: string, value: ArrayBuffer | Uint8Array, options?: Record<string, unknown>): Promise<unknown>
  }
  OPENAI_API_KEY?: string
}

interface GenerateRequest {
  text: string
  language: string
  provider?: 'openai' | 'azure' | 'auto'
  voice?: string
  model?: string
  speed?: number
  pitch?: number
}

interface AudioRecord {
  id: string
  audio_url: string
  r2_key: string
  provider: string
  language: string
  voice: string
  model: string
  generated_at: string
  file_size_bytes?: number
  duration_seconds?: number
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const OPENAI_VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'])

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
    const url = new URL(request.url)

    if (url.pathname === '/generate' && request.method === 'POST') return generate(request, env)
    if (url.pathname === '/audio' && request.method === 'GET') return getAudio(request, env)

    return json({ success: false, error: 'not_found' }, 404)
  },
}

async function generate(request: Request, env: Env): Promise<Response> {
  let body: GenerateRequest
  try {
    body = await request.json() as GenerateRequest
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400)
  }

  const validationError = validate(body)
  if (validationError) return json({ success: false, error: validationError }, 400)

  const normalized = normalizeRequest(body)
  const textHash = await generateTextHash(normalized)
  const existing = await findAudio(textHash, env)
  if (existing) return json({ success: true, audioUrl: existing.audio_url, cached: true, metadata: existing })

  const generated = await generateAudioBytes(normalized, env)
  if ('error' in generated) return json({ success: false, error: generated.error }, generated.status ?? 503)

  const r2Key = `audio/${textHash}.mp3`
  await env.AUDIO_BUCKET.put(r2Key, generated.bytes, {
    httpMetadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' },
  })

  const audioUrl = `/audio?key=${encodeURIComponent(r2Key)}`
  const id = crypto.randomUUID()
  await env.TTS_DB.prepare(`INSERT OR IGNORE INTO tts_audio (
    id, text_hash, text, language, provider, voice, model, speed, pitch, audio_url, r2_key, file_size_bytes, generated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id,
    textHash,
    normalized.text,
    normalized.language,
    normalized.provider,
    normalized.voice,
    normalized.model,
    normalized.speed,
    normalized.pitch,
    audioUrl,
    r2Key,
    generated.bytes.byteLength,
    new Date().toISOString(),
  ).run()

  const stored = await findAudio(textHash, env)
  if (stored) return json({ success: true, audioUrl: stored.audio_url, cached: stored.id !== id, metadata: stored })

  return json({ success: true, audioUrl, cached: false })
}

async function getAudio(request: Request, env: Env): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key')
  if (!key || !key.startsWith('audio/') || key.includes('..')) return new Response('Missing or invalid key', { status: 400, headers: CORS_HEADERS })

  const object = await env.AUDIO_BUCKET.get(key)
  if (!object) return new Response('Audio not found', { status: 404, headers: CORS_HEADERS })

  return new Response(object.body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': object.httpMetadata?.contentType ?? 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

function normalizeRequest(body: GenerateRequest): Required<GenerateRequest> {
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

function validate(body: GenerateRequest): string | null {
  if (!body || typeof body !== 'object') return 'invalid_body'
  if (!body.text || typeof body.text !== 'string' || !body.text.trim()) return 'missing_text'
  if (!body.language || typeof body.language !== 'string' || !body.language.trim()) return 'missing_language'
  if (body.text.length > 500) return 'text_too_long'
  if (body.speed !== undefined && (typeof body.speed !== 'number' || Number.isNaN(body.speed))) return 'invalid_speed'
  if (body.pitch !== undefined && (typeof body.pitch !== 'number' || Number.isNaN(body.pitch))) return 'invalid_pitch'
  return null
}

async function generateTextHash(input: Required<GenerateRequest>): Promise<string> {
  const str = [input.text, input.language, input.provider, input.voice, input.model, input.speed, input.pitch].join('|')
  const bytes = new TextEncoder().encode(str)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

async function findAudio(textHash: string, env: Env): Promise<AudioRecord | null> {
  return env.TTS_DB.prepare(`SELECT audio_url, r2_key, provider, language, voice, model, generated_at, file_size_bytes, duration_seconds
    FROM tts_audio WHERE text_hash = ? LIMIT 1`).bind(textHash).first<AudioRecord>()
}

async function generateAudioBytes(input: Required<GenerateRequest>, env: Env): Promise<{ success: true; bytes: Uint8Array } | { success: false; error: string; status?: number }> {
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

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    return { success: false, error: message ? `openai_tts_failed:${message.slice(0, 180)}` : 'openai_tts_failed', status: 502 }
  }

  return { success: true, bytes: new Uint8Array(await response.arrayBuffer()) }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export const internals = { generateTextHash, normalizeRequest, validate }
