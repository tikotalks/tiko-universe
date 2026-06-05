import { findCapability, listCapabilities } from './capabilities/registry'
import { apiError, createRequestId, json, optionsResponse } from './response'
import type { AtlasCapability, AtlasRunRequest, Env } from './types'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return optionsResponse()

    const url = new URL(request.url)
    const requestId = createRequestId()
    const pathname = normalizePath(url.pathname)

    if (pathname === '/v1/atlas/health' && request.method === 'GET') return health(requestId)
    if (pathname === '/v1/atlas/capabilities' && request.method === 'GET') return capabilities(requestId)
    if (pathname === '/v1/atlas/run' && request.method === 'POST') return runCapability(request, env, requestId)

    return apiError('not_found', 'Atlas route not found.', 404, requestId)
  },
}

function normalizePath(pathname: string): string {
  if (pathname === '/health') return '/v1/atlas/health'
  if (pathname === '/capabilities') return '/v1/atlas/capabilities'
  if (pathname === '/run') return '/v1/atlas/run'
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

async function runCapability(request: Request, _env: Env, requestId: string): Promise<Response> {
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

  if (!descriptor.enabled) {
    return apiError('capability_not_implemented', 'This Atlas capability is registered but not implemented yet.', 501, requestId, {
      capability: body.capability,
      defaultRoute: descriptor.defaultRoute,
    })
  }

  return apiError('capability_not_implemented', 'This Atlas capability has no executable adapter yet.', 501, requestId, {
    capability: body.capability,
  })
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
