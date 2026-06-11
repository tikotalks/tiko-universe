import { bytesBody, getCachedJson, putCachedJson, sha256Hex } from './cache'
import type { AtlasExecutionResult, AtlasRunRequest, DataFetchRequest, Env, ImageRequest, SpeechRequest, TextRequest } from './types'

interface CachedAssetRow {
  id: string
  public_url: string
  r2_key: string
  content_type: string
  provider: string
  model?: string | null
  byte_size?: number | null
}

type SpeechProvider = 'openai' | 'elevenlabs' | 'narakeet'
type GeneratedSpeech = { bytes: Uint8Array; contentType: string; durationSeconds?: number }

export async function executeAtlasCapability(request: AtlasRunRequest, env: Env): Promise<AtlasExecutionResult> {
  switch (request.capability) {
    case 'speech.synthesize': return synthesizeSpeech({ ...(asRecord(request.input)), app: request.app, purpose: request.purpose } as SpeechRequest, env)
    case 'image.generate': return generateImage({ ...(asRecord(request.input)), app: request.app, purpose: request.purpose } as ImageRequest, env)
    case 'text.generate': return generateText({ ...(asRecord(request.input)), app: request.app, purpose: request.purpose } as TextRequest, env)
    case 'text.classify': return classifyText({ ...(asRecord(request.input)), app: request.app, purpose: request.purpose } as TextRequest, env)
    case 'data.fetch': return fetchAtlasData({ ...(asRecord(request.input)), app: request.app, purpose: request.purpose } as DataFetchRequest, env)
    case 'metadata.lookup': return fetchAtlasData({ source: 'url-metadata', operation: 'url.metadata', input: asRecord(request.input), app: request.app, purpose: request.purpose }, env)
  }
}

export async function synthesizeSpeech(input: SpeechRequest, env: Env): Promise<AtlasExecutionResult> {
  const validation = validateSpeech(input)
  if (validation) throw capabilityError(validation, 400)

  const provider = normalizeSpeechProvider(input.provider, env)
  const normalized = {
    text: input.text.trim(),
    locale: (input.locale ?? input.language ?? 'en').trim().toLowerCase(),
    provider,
    model: input.model?.trim() || defaultSpeechModel(provider),
    voice: input.voice?.trim() || defaultSpeechVoice(provider, (input.locale ?? input.language ?? 'en').trim().toLowerCase()),
    speed: clamp(input.speed ?? 1, 0.25, 4),
    format: 'mp3' as const,
  }
  if (normalized.provider === 'elevenlabs' && normalized.model === 'tts-1') normalized.model = 'eleven_multilingual_v2'
  if (normalized.provider === 'openai' && normalized.model.startsWith('eleven_')) normalized.model = 'tts-1'

  const requestHash = await sha256Hex({ capability: 'speech.synthesize', ...normalized })
  const existing = await findCachedAsset(env, requestHash)
  if (existing) {
    return {
      provider: toSpeechProvider(existing.provider),
      model: existing.model ?? normalized.model,
      cached: true,
      requestHash,
      inputUnits: normalized.text.length,
      outputUnits: existing.byte_size ?? null,
      estimatedCostUsd: 0,
      data: {
        id: existing.id,
        audioUrl: existing.public_url,
        contentType: existing.content_type,
        cached: true,
        provider: { name: existing.provider, model: existing.model ?? normalized.model, voice: normalized.voice },
        usage: { inputCharacters: normalized.text.length },
      },
    }
  }

  const providerStarted = Date.now()
  const generated = normalized.provider === 'narakeet'
    ? await generateNarakeetSpeech(normalized, env)
    : normalized.provider === 'elevenlabs'
      ? await generateElevenLabsSpeech(normalized, env)
      : await generateOpenAiSpeech(normalized, env)
  const providerDurationMs = Date.now() - providerStarted

  const id = crypto.randomUUID()
  const r2Key = `speech/${requestHash}.mp3`
  const publicUrl = `/v1/atlas/assets/${id}`
  await env.ATLAS_ASSETS_BUCKET?.put(r2Key, generated.bytes, {
    httpMetadata: { contentType: generated.contentType, cacheControl: 'public, max-age=31536000, immutable' },
  })
  await storeCachedAsset(env, {
    id,
    capability: 'speech.synthesize',
    requestHash,
    provider: normalized.provider,
    model: normalized.model,
    r2Key,
    publicUrl,
    contentType: generated.contentType,
    byteSize: generated.bytes.byteLength,
    metadata: {
      phrase: normalized.text,
      locale: normalized.locale,
      language: normalized.locale,
      provider: normalized.provider,
      voice: normalized.voice,
      model: normalized.model,
      speed: normalized.speed,
      format: normalized.format,
      settings: {
        provider: normalized.provider,
        voice: normalized.voice,
        model: normalized.model,
        speed: normalized.speed,
        format: normalized.format,
      },
      ...(generated.durationSeconds !== undefined ? { durationSeconds: generated.durationSeconds } : {}),
    },
  })

  return {
    provider: normalized.provider,
    model: normalized.model,
    cached: false,
    status: 201,
    usage: { inputCharacters: normalized.text.length },
    requestHash,
    inputUnits: normalized.text.length,
    outputUnits: generated.bytes.byteLength,
    providerDurationMs,
    data: {
      id,
      audioUrl: publicUrl,
      contentType: generated.contentType,
      cached: false,
      provider: { name: normalized.provider, model: normalized.model, voice: normalized.voice },
      usage: { inputCharacters: normalized.text.length },
    },
  }
}

export async function generateImage(input: ImageRequest, env: Env): Promise<AtlasExecutionResult> {
  if (!input.prompt || typeof input.prompt !== 'string' || !input.prompt.trim()) throw capabilityError('missing_prompt', 400)
  if (input.prompt.length > 4000) throw capabilityError('prompt_too_long', 400)
  if (!env.OPENAI_API_KEY) throw capabilityError('openai_image_not_configured', 503)

  const size = imageSize(input.size ?? 'square')
  const count = clampInt(input.count ?? 1, 1, 4)
  const model = input.model || 'gpt-image-1'

  const requestHash = await sha256Hex({ capability: 'image.generate', prompt: input.prompt.trim(), size, count, model })
  const providerStarted = Date.now()
  const imagePayload: Record<string, unknown> = { model, prompt: input.prompt.trim(), size, n: count }
  if (input.transparent) imagePayload.background = 'transparent'
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(imagePayload),
  })
  if (!response.ok) throw capabilityError('image_provider_failed', 502)
  const body = await response.json() as { data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }> }
  const providerDurationMs = Date.now() - providerStarted
  const images = []
  for (const item of body.data ?? []) {
    const id = crypto.randomUUID()
    if (item.b64_json && env.ATLAS_ASSETS_BUCKET) {
      const bytes = base64ToBytes(item.b64_json)
      const r2Key = `images/${id}.png`
      await env.ATLAS_ASSETS_BUCKET.put(r2Key, bytes, { httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' } })
      images.push({ id, mediaUrl: `/v1/atlas/assets/${id}`, contentType: 'image/png', provider: { name: 'openai', model }, status: 'stored', revisedPrompt: item.revised_prompt })
      await storeCachedAsset(env, { id, capability: 'image.generate', requestHash: id, provider: 'openai', model, r2Key, publicUrl: `/v1/atlas/assets/${id}`, contentType: 'image/png', byteSize: bytes.byteLength, metadata: { purpose: input.purpose } })
    } else if (item.url) {
      images.push({ id, mediaUrl: item.url, provider: { name: 'openai', model }, status: 'generated', revisedPrompt: item.revised_prompt })
    }
  }
  return { provider: 'openai', model, cached: false, requestHash, inputUnits: input.prompt.trim().length, outputUnits: images.length, providerDurationMs, data: { images } }
}

export async function generateText(input: TextRequest, env: Env): Promise<AtlasExecutionResult> {
  if (!input.input || typeof input.input !== 'string' || !input.input.trim()) throw capabilityError('missing_input', 400)
  if (input.input.length > 12000) throw capabilityError('input_too_long', 400)
  const provider = input.provider === 'openai' ? 'openai' : input.provider === 'cloudflare-workers-ai' ? 'cloudflare-workers-ai' : env.AI ? 'cloudflare-workers-ai' : 'openai'
  const model = input.model || (provider === 'cloudflare-workers-ai' ? '@cf/meta/llama-3.1-8b-instruct' : 'gpt-4o-mini')
  const requestHash = await sha256Hex({ capability: 'text.generate', provider, model, input: input.input, maxTokens: input.maxTokens, temperature: input.temperature })
  const providerStarted = Date.now()
  const output = provider === 'cloudflare-workers-ai'
    ? await runWorkersAiText(env, model, input.input)
    : await runOpenAiText(env, model, input.input, input)
  const providerDurationMs = Date.now() - providerStarted
  return { provider, model, cached: false, requestHash, inputUnits: Math.ceil(input.input.length / 4), outputUnits: Math.ceil(output.length / 4), providerDurationMs, data: { output, format: input.outputFormat ?? 'plain', provider: { name: provider, model } } }
}

export async function classifyText(input: TextRequest, env: Env): Promise<AtlasExecutionResult> {
  const result = await generateText({ ...input, outputFormat: 'json' }, env)
  return { ...result, data: { label: String((result.data as { output?: unknown }).output ?? '').slice(0, 120), confidence: null, provider: (result.data as { provider?: unknown }).provider } }
}

export async function fetchAtlasData(input: DataFetchRequest, env: Env): Promise<AtlasExecutionResult> {
  const normalized = normalizeDataFetchRequest(input)
  const requestHash = await sha256Hex({ source: normalized.source, operation: normalized.operation, input: normalized.input })
  const cacheKey = `atlas:data:${requestHash}`
  const provider = providerForSource(normalized.source)
  if (normalized.cache?.mode !== 'bypass') {
    const cached = await getCachedJson<unknown>(env, cacheKey)
    if (cached) return { provider, cached: true, requestHash, inputUnits: 1, outputUnits: 1, estimatedCostUsd: 0, data: cached }
  }
  const providerStarted = Date.now()
  const data = normalized.source === 'youtube'
    ? await fetchYoutubeMetadata(normalized)
    : await fetchUrlMetadata(normalized)
  const providerDurationMs = Date.now() - providerStarted
  await putCachedJson(env, cacheKey, data, Math.max(normalized.cache?.ttlSeconds ?? 3600, 60))
  return { provider, cached: false, requestHash, inputUnits: 1, outputUnits: 1, estimatedCostUsd: 0, providerDurationMs, data }
}

export async function getAtlasAsset(pathname: string, env: Env): Promise<Response | null> {
  const id = decodeURIComponent(pathname.replace('/v1/atlas/assets/', '').replace('/assets/', ''))
  if (!/^[a-zA-Z0-9_-]{6,80}$/.test(id)) return new Response('Invalid asset id', { status: 400 })
  const row = await env.ATLAS_DB?.prepare('SELECT r2_key, content_type FROM atlas_cached_assets WHERE id = ? LIMIT 1').bind(id).first<{ r2_key: string; content_type: string }>()
  if (!row || !env.ATLAS_ASSETS_BUCKET) return new Response('Asset not found', { status: 404 })
  const object = await env.ATLAS_ASSETS_BUCKET.get(row.r2_key)
  if (!object) return new Response('Asset not found', { status: 404 })
  return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType ?? row.content_type, 'Cache-Control': 'public, max-age=31536000, immutable' } })
}

async function generateOpenAiSpeech(input: { text: string; model: string; voice: string; speed: number }, env: Env): Promise<GeneratedSpeech> {
  if (!env.OPENAI_API_KEY) throw capabilityError('openai_tts_not_configured', 503)
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: input.model, voice: input.voice, input: input.text, response_format: 'mp3', speed: input.speed }),
  })
  if (!response.ok) throw capabilityError('tts_provider_failed', 502)
  return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: 'audio/mpeg' }
}

async function generateElevenLabsSpeech(input: { text: string; model: string; voice: string; speed: number }, env: Env): Promise<GeneratedSpeech> {
  if (!env.ELEVENLABS_API_KEY) throw capabilityError('elevenlabs_tts_not_configured', 503)
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voice)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: input.text, model_id: input.model, voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: input.speed }, apply_text_normalization: 'auto' }),
  })
  if (!response.ok) throw capabilityError('tts_provider_failed', 502)
  return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: 'audio/mpeg' }
}

async function generateNarakeetSpeech(input: { text: string; voice: string; speed: number }, env: Env): Promise<GeneratedSpeech> {
  if (!env.NARAKEET_API_KEY) throw capabilityError('narakeet_tts_not_configured', 503)
  const url = new URL('https://api.narakeet.com/text-to-speech/mp3')
  url.searchParams.set('voice', input.voice)
  if (input.speed !== 1) url.searchParams.set('voice-speed', String(input.speed))
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'x-api-key': env.NARAKEET_API_KEY, 'Content-Type': 'text/plain', Accept: 'application/octet-stream' },
    body: input.text,
  })
  if (!response.ok) throw capabilityError('tts_provider_failed', 502)
  const durationHeader = response.headers.get('x-duration-seconds')
  const durationSeconds = durationHeader ? Number(durationHeader) : undefined
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: 'audio/mpeg',
    ...(Number.isFinite(durationSeconds) ? { durationSeconds } : {}),
  }
}

function normalizeSpeechProvider(provider: SpeechRequest['provider'], env: Env): SpeechProvider {
  if (provider === 'narakeet') return 'narakeet'
  if (provider === 'elevenlabs') return 'elevenlabs'
  if (provider === 'openai') return 'openai'
  if (env.NARAKEET_API_KEY) return 'narakeet'
  if (env.ELEVENLABS_API_KEY) return 'elevenlabs'
  return 'openai'
}

function defaultSpeechModel(provider: SpeechProvider) {
  if (provider === 'narakeet') return 'narakeet-mp3'
  if (provider === 'elevenlabs') return 'eleven_multilingual_v2'
  return 'tts-1'
}

function defaultSpeechVoice(provider: SpeechProvider, locale = 'en') {
  if (provider === 'narakeet') return defaultNarakeetVoice(locale)
  if (provider === 'elevenlabs') return '21m00Tcm4TlvDq8ikWAM'
  return 'nova'
}

function defaultNarakeetVoice(locale: string) {
  const normalizedLocale = locale.trim().toLowerCase()
  const language = normalizedLocale.split('-')[0]
  switch (language) {
    case 'nl': return 'famke'
    default: return 'Raymond'
  }
}

function toSpeechProvider(provider: string): SpeechProvider {
  if (provider === 'narakeet') return 'narakeet'
  if (provider === 'elevenlabs') return 'elevenlabs'
  return 'openai'
}

async function runWorkersAiText(env: Env, model: string, input: string): Promise<string> {
  if (!env.AI) throw capabilityError('workers_ai_not_configured', 503)
  const result = await env.AI.run(model, { messages: [{ role: 'user', content: input }] }) as { response?: string; result?: { response?: string } }
  return result.response ?? result.result?.response ?? JSON.stringify(result)
}

async function runOpenAiText(env: Env, model: string, input: string, params: TextRequest): Promise<string> {
  if (!env.OPENAI_API_KEY) throw capabilityError('openai_text_not_configured', 503)
  const messages: Array<{ role: string; content: string }> = []
  if (params.system) messages.push({ role: 'system', content: params.system })
  messages.push({ role: 'user', content: input })
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: params.maxTokens ?? 800, temperature: params.temperature ?? 0.4 }),
  })
  if (!response.ok) throw capabilityError('text_provider_failed', 502)
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  return body.choices?.[0]?.message?.content ?? ''
}


function normalizeDataFetchRequest(input: DataFetchRequest): DataFetchRequest {
  const source = typeof input.source === 'string' ? input.source.trim() : ''
  const operation = typeof input.operation === 'string' ? input.operation.trim() : ''
  const requestInput = asRecord(input.input)
  const topLevelUrl = typeof (input as unknown as { url?: unknown }).url === 'string' ? String((input as unknown as { url?: unknown }).url).trim() : ''
  const sourceUrl = /^https?:\/\//i.test(source) ? source : ''
  const url = String(requestInput.url || requestInput.videoUrl || topLevelUrl || sourceUrl || '').trim()

  if (!source && !url) throw capabilityError('missing_source', 400)
  if (!operation && !url) throw capabilityError('missing_operation', 400)
  if (url && !/^https?:\/\//i.test(url)) throw capabilityError('missing_url', 400)

  if (sourceUrl || topLevelUrl) {
    return {
      ...input,
      source: isYoutubeUrl(url) ? 'youtube' : 'url-metadata',
      operation: operation && operation !== 'fetch' ? operation : isYoutubeUrl(url) ? 'video.metadata' : 'url.metadata',
      input: { ...requestInput, url },
    }
  }

  if (!source) throw capabilityError('missing_source', 400)
  if (!operation) throw capabilityError('missing_operation', 400)
  if (Object.keys(requestInput).length === 0) throw capabilityError('missing_input', 400)

  return { ...input, source, operation, input: requestInput }
}

function isYoutubeUrl(url: string): boolean {
  return /(^https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url)
}

async function fetchYoutubeMetadata(input: DataFetchRequest): Promise<unknown> {
  const url = String(input.input.url ?? input.input.videoUrl ?? '')
  if (!url) throw capabilityError('missing_url', 400)
  const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`)
  if (!response.ok) throw capabilityError('youtube_metadata_failed', 502)
  return { source: 'youtube', operation: input.operation, metadata: await response.json() }
}

async function fetchUrlMetadata(input: DataFetchRequest): Promise<unknown> {
  const url = String(input.input.url ?? '')
  if (!url || !/^https?:\/\//.test(url)) throw capabilityError('missing_url', 400)
  const response = await fetch(url, { headers: { Accept: 'text/html,application/xhtml+xml' } })
  if (!response.ok) throw capabilityError('url_metadata_failed', 502)
  const html = await response.text()
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)?.[1]?.trim() ?? null
  return { source: 'url-metadata', operation: input.operation, metadata: { url, title, description } }
}

async function findCachedAsset(env: Env, requestHash: string): Promise<CachedAssetRow | null> {
  return env.ATLAS_DB?.prepare('SELECT id, public_url, r2_key, content_type, provider, model, byte_size FROM atlas_cached_assets WHERE request_hash = ? LIMIT 1').bind(requestHash).first<CachedAssetRow>() ?? null
}

async function storeCachedAsset(env: Env, params: { id: string; capability: string; requestHash: string; provider: string; model?: string; r2Key: string; publicUrl: string; contentType: string; byteSize?: number; metadata?: unknown }) {
  if (!env.ATLAS_DB) return
  await env.ATLAS_DB.prepare(`INSERT INTO atlas_cached_assets (
    id, capability, request_hash, provider, model, r2_key, public_url, content_type, byte_size, metadata_json, created_at, expires_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    params.id, params.capability, params.requestHash, params.provider, params.model ?? null, params.r2Key,
    params.publicUrl, params.contentType, params.byteSize ?? null, JSON.stringify(params.metadata ?? {}), new Date().toISOString(), null,
  ).run()
}

function validateSpeech(input: SpeechRequest): string | null {
  if (!input.text || typeof input.text !== 'string' || !input.text.trim()) return 'missing_text'
  if (input.text.length > 5000) return 'text_too_long'
  if (input.speed !== undefined && (typeof input.speed !== 'number' || Number.isNaN(input.speed))) return 'invalid_speed'
  return null
}

function imageSize(size: 'square' | 'portrait' | 'landscape'): string {
  if (size === 'portrait') return '1024x1536'
  if (size === 'landscape') return '1536x1024'
  return '1024x1024'
}

function providerForSource(source: string) {
  if (source === 'youtube') return 'youtube' as const
  if (source === 'url-metadata') return 'url-metadata' as const
  return 'tiko' as const
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)) }
function clampInt(value: number, min: number, max: number) { return Math.round(clamp(value, min, max)) }
function base64ToBytes(value: string): Uint8Array { return Uint8Array.from(atob(value), (char) => char.charCodeAt(0)) }

export function capabilityError(code: string, status = 400): Error & { code: string; status: number } {
  const error = new Error(code) as Error & { code: string; status: number }
  error.code = code
  error.status = status
  return error
}
