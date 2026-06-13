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

export interface NormalizedTtsRequest extends Required<GenerationTtsRequest> {}

export interface SpeechEnv {
  ATLAS_SERVICE?: {
    fetch(input: Request | string, init?: RequestInit): Promise<Response>
  }
  ATLAS_BASE_URL?: string
  ATLAS_API_KEY?: string
}

export interface GenerateAudioSuccess {
  success: true
  bytes: Uint8Array
  contentType: string
}

export interface GenerateAudioFailure {
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

export type AtlasSpeechPurpose = 'speech-playback' | 'voice-sample' | 'story-narration'

export type AtlasSpeechSuccess = {
  success: true
  body: AtlasSpeechResponse & { data: { id: string; audioUrl: string; contentType?: string; cached?: boolean; provider?: { name?: string; model?: string; voice?: string } } }
}

export type AtlasSpeechFailure = {
  success: false
  error: string
  status?: number
}

export const OPENAI_VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'])
export const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2'
export const DEFAULT_ELEVENLABS_VOICE = '21m00Tcm4TlvDq8ikWAM'
export const ELEVENLABS_VOICE_ID_RE = /^[a-zA-Z0-9_-]{6,64}$/

export async function requestAtlasSpeech(input: NormalizedTtsRequest, env: SpeechEnv, purpose: AtlasSpeechPurpose): Promise<AtlasSpeechSuccess | AtlasSpeechFailure> {
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

export async function storySegmentCacheKey(input: NormalizedTtsRequest): Promise<string> {
  return `story-segments/${await generateRequestHash(input)}.mp3`
}

export async function generateAudioBytes(input: NormalizedTtsRequest, env: SpeechEnv, purpose: AtlasSpeechPurpose): Promise<GenerateAudioSuccess | GenerateAudioFailure> {
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

export function providerSafeMessage(code: string) {
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

function atlasAssetUrl(env: SpeechEnv, audioUrl: string): string {
  if (/^https?:\/\//i.test(audioUrl)) return audioUrl
  const path = audioUrl.startsWith('/v1/atlas/') ? audioUrl.replace('/v1/atlas', '') : audioUrl
  return atlasUrl(env, path.startsWith('/') ? path : `/${path}`)
}

function atlasUrl(env: SpeechEnv, path: string): string {
  return `${(env.ATLAS_BASE_URL ?? 'https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas').replace(/\/$/, '')}${path}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
