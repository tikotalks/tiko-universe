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
  const body = await request.json() as GenerateRequest
  const validationError = validate(body)
  if (validationError) return json({ success: false, error: validationError }, 400)

  const normalized = normalizeRequest(body)
  const textHash = generateTextHash(normalized)
  const existing = await findAudio(textHash, env)
  if (existing) return json({ success: true, audioUrl: existing.audio_url, cached: true, metadata: existing })

  // Generation provider hook. The old Tiko worker called OpenAI here and stored bytes in R2.
  // This new API-first worker keeps that seam isolated so Azure/OpenAI/browser fallback can share one cache contract.
  const generated = await generateAudioBytes(normalized, env)
  if (!generated.success) return json({ success: false, error: generated.error }, generated.status ?? 503)

  const r2Key = `audio/${textHash}.mp3`
  await env.AUDIO_BUCKET.put(r2Key, generated.bytes, {
    httpMetadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' },
  })

  const audioUrl = `/audio?key=${encodeURIComponent(r2Key)}`
  await env.TTS_DB.prepare(`INSERT INTO tts_audio (
    id, text_hash, text, language, provider, voice, model, speed, pitch, audio_url, r2_key, file_size_bytes, generated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      crypto.randomUUID(),
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
    )
    .run()

  return json({ success: true, audioUrl, cached: false })
}

async function getAudio(request: Request, env: Env): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key')
  if (!key || !key.startsWith('audio/')) return new Response('Missing or invalid key', { status: 400, headers: CORS_HEADERS })

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
  return {
    text: body.text.trim(),
    language: body.language.trim().toLowerCase(),
    provider: body.provider ?? 'auto',
    voice: body.voice ?? 'nova',
    model: body.model ?? 'tts-1',
    speed: body.speed ?? 1,
    pitch: body.pitch ?? 0,
  }
}

function validate(body: GenerateRequest): string | null {
  if (!body.text || !body.text.trim()) return 'missing_text'
  if (!body.language || !body.language.trim()) return 'missing_language'
  if (body.text.length > 500) return 'text_too_long'
  return null
}

function generateTextHash(input: Required<GenerateRequest>): string {
  const str = [input.text, input.language, input.provider, input.voice, input.model, input.speed, input.pitch].join('|')
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash &= hash
  }
  return Math.abs(hash).toString(36)
}

async function findAudio(textHash: string, env: Env): Promise<AudioRecord | null> {
  return env.TTS_DB.prepare(`SELECT audio_url, r2_key, provider, language, voice, model, generated_at, file_size_bytes, duration_seconds
    FROM tts_audio WHERE text_hash = ? LIMIT 1`)
    .bind(textHash)
    .first<AudioRecord>()
}

async function generateAudioBytes(input: Required<GenerateRequest>, env: Env): Promise<{ success: true; bytes: Uint8Array } | { success: false; error: string; status?: number }> {
  if (!env.OPENAI_API_KEY) return { success: false, error: 'tts_generation_not_configured', status: 503 }
  // Provider implementation intentionally left as the next implementation slice to avoid committing secrets
  // or old production-specific assumptions. The cache contract above is complete and mirrors old Tiko.
  void input
  return { success: false, error: 'tts_provider_hook_not_implemented', status: 501 }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export const internals = { generateTextHash, normalizeRequest, validate }
