import { recordAtlasRequest } from './audit'
import { findCapability, listCapabilities } from './capabilities/registry'
import { executeAtlasCapability, generateImage, generateText, getAtlasAsset, synthesizeSpeech, fetchAtlasData } from './domains'
import { aggregateUsageByProvider, getUsageRequest, listProviderStatus, listUsage } from './observability'
import { apiError, createRequestId, json, optionsResponse, withCors } from './response'
import type { AtlasCapability, AtlasExecutionResult, AtlasRunRequest, DataFetchRequest, Env, ImageRequest, SpeechRequest, TextRequest } from './types'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return optionsResponse()

    const url = new URL(request.url)
    const requestId = createRequestId()
    const pathname = normalizePath(url.pathname)

    if (pathname === '/v1/atlas/health' && request.method === 'GET') return health(requestId)
    if (pathname === '/v1/atlas/capabilities' && request.method === 'GET') return capabilities(requestId)
    if (pathname === '/v1/atlas/run' && request.method === 'POST') return runCapability(request, env, requestId)
    if (pathname === '/v1/atlas/speech' && request.method === 'POST') return typedCapability(request, env, requestId, 'speech.synthesize', synthesizeSpeech)
    if (pathname === '/v1/atlas/images' && request.method === 'POST') return typedCapability(request, env, requestId, 'image.generate', generateImage)
    if (pathname === '/v1/atlas/text' && request.method === 'POST') return typedCapability(request, env, requestId, 'text.generate', generateText)
    if (pathname === '/v1/atlas/data/fetch' && request.method === 'POST') return typedCapability(request, env, requestId, 'data.fetch', fetchAtlasData)
    if (pathname === '/v1/atlas/admin/usage' && request.method === 'GET') return adminUsage(request, env, requestId)
    if (pathname === '/v1/atlas/admin/usage/by-provider' && request.method === 'GET') return adminUsageByProvider(request, env, requestId)
    if (pathname === '/v1/atlas/admin/provider-status' && request.method === 'GET') return adminProviderStatus(request, env, requestId)
    if (pathname.startsWith('/v1/atlas/admin/requests/') && request.method === 'GET') return adminRequestDetail(pathname, request, env, requestId)
    if (pathname.startsWith('/v1/atlas/assets/') && request.method === 'GET') {
      const response = await getAtlasAsset(pathname, env)
      return response ? withCors(response) : apiError('asset_not_found', 'Atlas asset not found.', 404, requestId)
    }

    return apiError('not_found', 'Atlas route not found.', 404, requestId)
  },
}

function normalizePath(pathname: string): string {
  if (pathname === '/health') return '/v1/atlas/health'
  if (pathname === '/capabilities') return '/v1/atlas/capabilities'
  if (pathname === '/run') return '/v1/atlas/run'
  if (pathname === '/speech') return '/v1/atlas/speech'
  if (pathname === '/images') return '/v1/atlas/images'
  if (pathname === '/text') return '/v1/atlas/text'
  if (pathname === '/data/fetch') return '/v1/atlas/data/fetch'
  if (pathname === '/admin/usage') return '/v1/atlas/admin/usage'
  if (pathname === '/admin/usage/by-provider') return '/v1/atlas/admin/usage/by-provider'
  if (pathname === '/admin/provider-status') return '/v1/atlas/admin/provider-status'
  if (pathname.startsWith('/admin/requests/')) return `/v1/atlas${pathname}`
  if (pathname.startsWith('/assets/')) return `/v1/atlas${pathname}`
  return pathname.replace(/\/$/, '')
}

function health(requestId: string): Response {
  const capabilityStatuses = listCapabilities().map((capability) => ({
    capability: capability.capability,
    enabled: capability.enabled,
    status: capability.enabled ? 'ok' : 'disabled',
    defaultProvider: capability.defaultRoute.provider,
  }))

  return json({
    data: {
      service: 'atlas-api',
      status: 'ok',
      capabilities: capabilityStatuses,
    },
    meta: { schemaVersion: 1, requestId },
  })
}

function capabilities(requestId: string): Response {
  return json({
    data: { capabilities: listCapabilities() },
    meta: { schemaVersion: 1, requestId },
  })
}

async function runCapability(request: Request, env: Env, requestId: string): Promise<Response> {
  let body: AtlasRunRequest
  try {
    body = await request.json() as AtlasRunRequest
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400, requestId)
  }

  const validationError = validateRunRequest(body)
  if (validationError) return apiError(validationError, 'Atlas run request is invalid.', 400, requestId)

  const descriptor = findCapability(body.capability)
  if (!descriptor) return apiError('unsupported_capability', 'Atlas does not support the requested capability.', 400, requestId)
  if (!descriptor.enabled) return apiError('capability_disabled', 'This Atlas capability is disabled.', 403, requestId)

  return executeAndRespond({ requestId, env, capability: body.capability, app: body.app, purpose: body.purpose, input: body.input }, () => executeAtlasCapability(body, env))
}

async function typedCapability<T extends SpeechRequest | ImageRequest | TextRequest | DataFetchRequest>(
  request: Request,
  env: Env,
  requestId: string,
  capability: AtlasCapability,
  handler: (body: T, env: Env) => Promise<AtlasExecutionResult>,
): Promise<Response> {
  let body: T
  try {
    body = await request.json() as T
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400, requestId)
  }

  const app = typeof body.app === 'string' && body.app.trim() ? body.app.trim() : 'unknown'
  const purpose = typeof body.purpose === 'string' && body.purpose.trim() ? body.purpose.trim() : 'unknown'
  return executeAndRespond({ requestId, env, capability, app, purpose, input: body }, () => handler(body, env))
}

async function executeAndRespond(params: {
  requestId: string
  env: Env
  capability: AtlasCapability
  app: string
  purpose: string
  input: unknown
}, handler: () => Promise<AtlasExecutionResult>): Promise<Response> {
  const started = Date.now()
  try {
    const result = await handler()
    await recordAtlasRequest(params.env, {
      id: params.requestId,
      capability: params.capability,
      app: params.app,
      purpose: params.purpose,
      provider: result.provider,
      model: result.model,
      status: 'success',
      cacheStatus: result.cached ? 'hit' : 'miss',
      input: params.input,
      output: result.data,
      usage: result.usage,
      requestHash: result.requestHash,
      inputUnits: result.inputUnits,
      outputUnits: result.outputUnits,
      estimatedCostUsd: result.estimatedCostUsd,
      providerDurationMs: result.providerDurationMs,
      durationMs: Date.now() - started,
    })
    return json({
      data: result.data,
      meta: {
        schemaVersion: 1,
        requestId: params.requestId,
        capability: params.capability,
        provider: result.provider,
        model: result.model,
        cached: result.cached ?? false,
        ...(result.requestHash ? { requestHash: result.requestHash } : {}),
        ...(result.usage ? { usage: result.usage } : {}),
      },
    }, result.status ?? 200)
  } catch (error) {
    const typed = error as Error & { code?: string; status?: number }
    const code = typed.code ?? 'atlas_execution_failed'
    await recordAtlasRequest(params.env, {
      id: params.requestId,
      capability: params.capability,
      app: params.app,
      purpose: params.purpose,
      provider: 'internal',
      status: 'error',
      input: params.input,
      errorCode: code,
      errorMessage: typed.message,
      durationMs: Date.now() - started,
    })
    return apiError(code, safeMessage(code), typed.status ?? 500, params.requestId)
  }
}

async function adminUsage(request: Request, env: Env, requestId: string): Promise<Response> {
  const authError = requireAdmin(request, env, requestId)
  if (authError) return authError
  const url = new URL(request.url)
  const app = url.searchParams.get('app')
  const capabilityValue = url.searchParams.get('capability')
  const capability = capabilityValue && isKnownCapability(capabilityValue) ? capabilityValue : null
  const limit = Number(url.searchParams.get('limit') ?? '50')
  return json({ data: { requests: await listUsage(env, { app, capability, limit }) }, meta: { schemaVersion: 1, requestId } })
}

async function adminUsageByProvider(request: Request, env: Env, requestId: string): Promise<Response> {
  const authError = requireAdmin(request, env, requestId)
  if (authError) return authError
  return json({ data: { providers: await aggregateUsageByProvider(env) }, meta: { schemaVersion: 1, requestId } })
}

async function adminProviderStatus(request: Request, env: Env, requestId: string): Promise<Response> {
  const authError = requireAdmin(request, env, requestId)
  if (authError) return authError
  return json({ data: { providers: await listProviderStatus(env) }, meta: { schemaVersion: 1, requestId } })
}

async function adminRequestDetail(pathname: string, request: Request, env: Env, requestId: string): Promise<Response> {
  const authError = requireAdmin(request, env, requestId)
  if (authError) return authError
  const id = decodeURIComponent(pathname.replace('/v1/atlas/admin/requests/', ''))
  if (!/^[a-zA-Z0-9_-]{6,80}$/.test(id)) return apiError('invalid_request_id', 'Invalid Atlas request id.', 400, requestId)
  const row = await getUsageRequest(env, id)
  return row ? json({ data: { request: row }, meta: { schemaVersion: 1, requestId } }) : apiError('request_not_found', 'Atlas request not found.', 404, requestId)
}

function requireAdmin(request: Request, env: Env, requestId: string): Response | null {
  const configured = parseServiceKeys(env.SERVICE_API_KEYS)
  if (configured.length === 0) return apiError('admin_auth_not_configured', 'Atlas admin API is not configured.', 503, requestId)
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!token || !configured.includes(token)) return apiError('unauthorized', 'Atlas admin API requires a service token.', 401, requestId)
  return null
}

function parseServiceKeys(value?: string): string[] {
  if (!value) return []
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function validateRunRequest(body: AtlasRunRequest): string | null {
  if (!body || typeof body !== 'object') return 'invalid_body'
  if (!body.capability || typeof body.capability !== 'string') return 'missing_capability'
  if (!isKnownCapability(body.capability)) return 'unsupported_capability'
  if (!body.app || typeof body.app !== 'string') return 'missing_app'
  if (!body.purpose || typeof body.purpose !== 'string') return 'missing_purpose'
  if (!('input' in body)) return 'missing_input'
  return null
}

function isKnownCapability(value: string): value is AtlasCapability {
  return ['speech.synthesize', 'image.generate', 'text.generate', 'text.classify', 'data.fetch', 'metadata.lookup'].includes(value)
}

function safeMessage(code: string): string {
  switch (code) {
    case 'missing_text': return 'Text is required.'
    case 'text_too_long': return 'Text is too long.'
    case 'missing_prompt': return 'Prompt is required.'
    case 'prompt_too_long': return 'Prompt is too long.'
    case 'missing_input': return 'Input is required.'
    case 'input_too_long': return 'Input is too long.'
    case 'missing_source': return 'Data source is required.'
    case 'missing_operation': return 'Data operation is required.'
    case 'missing_url': return 'A valid URL is required.'
    case 'openai_tts_not_configured': return 'OpenAI TTS is not configured.'
    case 'elevenlabs_tts_not_configured': return 'ElevenLabs TTS is not configured.'
    case 'openai_image_not_configured': return 'OpenAI image generation is not configured.'
    case 'workers_ai_not_configured': return 'Workers AI is not configured.'
    case 'openai_text_not_configured': return 'OpenAI text generation is not configured.'
    case 'tts_provider_failed': return 'Speech provider failed.'
    case 'image_provider_failed': return 'Image provider failed.'
    case 'text_provider_failed': return 'Text provider failed.'
    case 'youtube_metadata_failed': return 'YouTube metadata lookup failed.'
    case 'url_metadata_failed': return 'URL metadata lookup failed.'
    default: return 'Atlas request failed.'
  }
}

export const internals = { normalizePath, isKnownCapability }
