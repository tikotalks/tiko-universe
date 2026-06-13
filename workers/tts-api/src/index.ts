import { requireServiceKey, type AuthEnv } from '../../shared/auth'

interface Env extends AuthEnv {
  ATLAS_SERVICE?: {
    fetch(input: Request | string, init?: RequestInit): Promise<Response>
  }
  ATLAS_BASE_URL?: string
  ATLAS_API_KEY?: string
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const OPENAI_VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'])

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
      const url = new URL(request.url)

      if (url.pathname === '/generate' && request.method === 'POST') {
        const auth = await requireServiceKey(request, env, ['tts.generate'])
        if (auth instanceof Response) return serviceAuthFailure(auth)
        return generate(request, env)
      }

      return json({ success: false, error: 'not_found' }, 404)
    } catch (error) {
      console.error('[tts-api] unhandled request error', error)
      return json({ success: false, error: 'internal_error' }, 500)
    }
  },
}

async function serviceAuthFailure(response: Response): Promise<Response> {
  const body = await response.json().catch(() => null) as { error?: { code?: string } } | null
  return json({ success: false, error: body?.error?.code ?? 'unauthorized' }, response.status)
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
  return synthesizeWithAtlas(normalized, env)
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

async function synthesizeWithAtlas(input: Required<GenerateRequest>, env: Env): Promise<Response> {
  if (!env.ATLAS_SERVICE || !env.ATLAS_API_KEY) return json({ success: false, error: 'atlas_tts_not_configured' }, 503)

  const atlasBase = (env.ATLAS_BASE_URL ?? 'https://api.tikotalks.com/v1/atlas').replace(/\/$/, '')
  const atlasURL = atlasBase.endsWith('/speech') ? atlasBase : `${atlasBase}/speech`
  const response = await env.ATLAS_SERVICE.fetch(new Request(atlasURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.ATLAS_API_KEY}` },
    body: JSON.stringify({
      app: 'tts-api',
      purpose: 'compatibility-tts',
      text: input.text,
      language: input.language,
      speed: input.speed,
      pitch: input.pitch,
    }),
  }))
  const body = await response.json().catch(() => null) as AtlasSpeechResponse | null

  if (!response.ok) return json({ success: false, error: body?.error?.code ?? 'atlas_tts_failed' }, response.status)

  const data = body?.data
  if (!data?.audioUrl) return json({ success: false, error: 'atlas_tts_invalid_response' }, 502)

  return json({
    success: true,
    audioUrl: data.audioUrl,
    cached: body?.meta?.cached ?? data.cached ?? false,
    metadata: {
      id: data.id,
      provider: data.provider?.name,
      voice: data.provider?.voice,
      model: data.provider?.model,
      language: input.language,
      requestId: body?.meta?.requestId,
      schemaVersion: body?.meta?.schemaVersion,
    },
  })
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

export const internals = { normalizeRequest, validate }
