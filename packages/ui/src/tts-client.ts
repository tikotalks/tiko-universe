import type { GenerationTtsRequest, TikoTtsProvider } from '@tiko/media'
import { generationTtsCacheKey, isGenerationTtsResponse } from '@tiko/media'

export type { TikoTtsProvider }

export interface TikoTtsRequest extends GenerationTtsRequest {}

export interface TikoTtsResponse {
  success: boolean
  audioUrl?: string
  cached?: boolean
  metadata?: Record<string, unknown>
  error?: string
}

export interface TikoTtsClientOptions {
  workerUrl?: string
  fetcher?: typeof fetch
  credentials?: RequestCredentials
  audioFactory?: (url: string) => { play: () => Promise<void> | void }
  speechSynthesis?: SpeechSynthesis
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '')
}

function createBrowserFallback(fallbackUsed = false, error?: string): TikoTtsResponse {
  return {
    success: true,
    cached: false,
    ...(error ? { error } : {}),
    metadata: { provider: 'browser', ...(fallbackUsed ? { fallbackUsed: true } : {}) }
  }
}

export function createTikoTtsClient(options: TikoTtsClientOptions = {}) {
  const workerUrl = normalizeBaseUrl(options.workerUrl ?? 'https://api.tikotalks.com/v1')
  const fetcher = options.fetcher ?? globalThis.fetch
  const credentials = options.credentials ?? 'include'
  const memoryCache = new Map<string, TikoTtsResponse>()

  // Tikoapi.org splits APIs per-service subdomain. Existing callers may still
  // pass identity/generation bases; normalize those to the Atlas gateway so TTS
  // routing stays centralized.
  function atlasBase(): string {
    return workerUrl
      .replace('//identity.tikoapi.org/', '//api.tikotalks.com/')
      .replace('//generation.tikoapi.org/', '//api.tikotalks.com/')
      .replace(/\/v1\/generation$/, '/v1')
      .replace(/\/generate$/, '')
  }

  function cacheKey(request: TikoTtsRequest) {
    return generationTtsCacheKey(request)
  }

  function ttsEndpoint() {
    const base = atlasBase()
    if (base.endsWith('/v1/atlas')) return `${base}/speech`
    if (base.endsWith('/v1')) return `${base}/atlas/speech`
    return `${base}/v1/atlas/speech`
  }

  function normalizeAtlasAudioUrl(audioUrl: string) {
    if (audioUrl.startsWith('http')) return audioUrl
    if (audioUrl.startsWith('/v1/atlas/assets/')) return `${atlasBase().replace(/\/v1(?:\/atlas)?$/, '')}${audioUrl}`
    throw new Error('invalid_atlas_audio_url')
  }

  function normalizeTtsResponse(data: unknown): TikoTtsResponse {
    if (!isGenerationTtsResponse(data)) throw new Error('invalid_atlas_speech_response')

    const provider = typeof data.data.provider === 'object' && data.data.provider !== null
      ? data.data.provider as { name?: string; model?: string; voice?: string }
      : { name: data.data.provider as string | undefined, model: data.data.model, voice: data.data.voice }
    const meta = data.meta as { cached?: boolean; schemaVersion?: number; requestId?: string } | undefined
    return {
      success: true,
      audioUrl: normalizeAtlasAudioUrl(data.data.audioUrl),
      cached: data.meta?.cached ?? false,
      metadata: {
        id: data.data.id,
        provider: provider.name,
        language: data.data.language,
        voice: provider.voice ?? data.data.voice,
        model: provider.model ?? data.data.model,
        schemaVersion: meta?.schemaVersion,
        requestId: meta?.requestId
      }
    }
  }

  async function getAudio(request: TikoTtsRequest): Promise<TikoTtsResponse> {
    const key = cacheKey(request)
    const cached = memoryCache.get(key)
    if (cached) return { ...cached, cached: true }

    if (!fetcher) return createBrowserFallback()

    try {
      const response = await fetcher(ttsEndpoint(), {
        method: 'POST',
        credentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'tiko-ui',
          purpose: 'speech-playback',
          text: request.text,
          language: request.language,
          speed: request.speed,
          pitch: request.pitch
        })
      })

      if (!response.ok) return createBrowserFallback(true, `tts_http_${response.status}`)

      const data = await response.json()
      const normalized = normalizeTtsResponse(data)
      if (normalized.success && normalized.audioUrl) memoryCache.set(key, normalized)
      return normalized
    } catch (error) {
      return createBrowserFallback(true, error instanceof Error ? error.message : 'tts_fetch_failed')
    }
  }

  async function speak(request: TikoTtsRequest): Promise<TikoTtsResponse> {
    const result = await getAudio(request)
    if (result.audioUrl) {
      try {
        const audio = options.audioFactory ? options.audioFactory(result.audioUrl) : new Audio(result.audioUrl)
        await audio.play()
        return result
      } catch (error) {
        const fallback = createBrowserFallback(true, error instanceof Error ? error.message : 'audio_play_failed')
        speakWithBrowser(request)
        return fallback
      }
    }

    speakWithBrowser(request)
    return result
  }

  function speakWithBrowser(request: TikoTtsRequest) {
    const synth = options.speechSynthesis ?? globalThis.speechSynthesis
    if (synth && 'SpeechSynthesisUtterance' in globalThis) {
      const utterance = new SpeechSynthesisUtterance(request.text)
      utterance.lang = request.language
      utterance.rate = request.speed ?? 1
      synth.cancel()
      synth.speak(utterance)
    }
  }

  return { getAudio, speak, clearCache: () => memoryCache.clear(), cacheSize: () => memoryCache.size }
}
