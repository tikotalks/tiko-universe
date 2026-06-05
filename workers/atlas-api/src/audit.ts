import { estimateUsage, redactForAudit, writeStructuredEvent } from './observability'
import type { AtlasCapability, AtlasProvider, Env } from './types'

export async function recordAtlasRequest(env: Env, params: {
  id: string
  capability: AtlasCapability
  app: string
  purpose: string
  subjectId?: string | null
  provider: AtlasProvider
  model?: string
  status: 'success' | 'error'
  cacheStatus?: 'none' | 'hit' | 'miss'
  requestHash?: string
  input?: unknown
  output?: unknown
  usage?: Record<string, unknown>
  inputUnits?: number | null
  outputUnits?: number | null
  estimatedCostUsd?: number | null
  providerDurationMs?: number | null
  errorCode?: string
  errorMessage?: string
  durationMs: number
}): Promise<void> {
  const estimate = estimateUsage({ capability: params.capability, provider: params.provider, model: params.model, input: params.input, output: params.output, usage: params.usage })
  const inputUnits = params.inputUnits ?? estimate.inputUnits
  const outputUnits = params.outputUnits ?? estimate.outputUnits
  const estimatedCostUsd = params.estimatedCostUsd ?? estimate.estimatedCostUsd

  writeStructuredEvent({
    event: 'atlas.request',
    requestId: params.id,
    capability: params.capability,
    app: params.app,
    purpose: params.purpose,
    provider: params.provider,
    model: params.model,
    status: params.status,
    cacheStatus: params.cacheStatus ?? 'none',
    requestHash: params.requestHash,
    errorCode: params.errorCode,
    inputUnits,
    outputUnits,
    estimatedCostUsd,
    durationMs: params.durationMs,
    providerDurationMs: params.providerDurationMs ?? null,
  })

  if (!env.ATLAS_DB) return
  try {
    await env.ATLAS_DB.prepare(`INSERT INTO atlas_requests (
      id, capability, app, purpose, subject_id, provider, model, status, cache_status,
      request_hash, input_redacted_json, output_redacted_json, error_code, error_message,
      input_units, output_units, estimated_cost_usd, duration_ms, provider_duration_ms, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      params.id,
      params.capability,
      params.app,
      params.purpose,
      params.subjectId ?? null,
      params.provider,
      params.model ?? null,
      params.status,
      params.cacheStatus ?? 'none',
      params.requestHash ?? null,
      redactForAudit(params.input),
      redactForAudit(params.output),
      params.errorCode ?? null,
      params.errorMessage ? sanitizeError(params.errorMessage) : null,
      inputUnits,
      outputUnits,
      estimatedCostUsd,
      params.durationMs,
      params.providerDurationMs ?? null,
      new Date().toISOString(),
    ).run()
    await recordProviderStatus(env, { provider: params.provider, status: params.status === 'success' ? 'ok' : 'error', error: params.status === 'error' ? params.errorCode ?? params.errorMessage : undefined, model: params.model })
  } catch {
    // Audit must never break a product request.
  }
}

async function recordProviderStatus(env: Env, params: { provider: AtlasProvider; status: string; error?: string; model?: string }): Promise<void> {
  try {
    await env.ATLAS_DB?.prepare(`INSERT INTO atlas_provider_status (
      provider, enabled, status, last_checked_at, last_error, metadata_json
    ) VALUES (?, 1, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      status = excluded.status,
      last_checked_at = excluded.last_checked_at,
      last_error = excluded.last_error,
      metadata_json = excluded.metadata_json`).bind(
      params.provider,
      params.status,
      new Date().toISOString(),
      params.error ? sanitizeError(params.error) : null,
      JSON.stringify({ model: params.model ?? null }),
    ).run()
  } catch {
    // Provider status is diagnostic only.
  }
}

function sanitizeError(value: string): string {
  return value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [REDACTED]').slice(0, 500)
}
