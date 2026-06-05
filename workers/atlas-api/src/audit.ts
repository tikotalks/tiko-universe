import type { AtlasCapability, AtlasProvider, Env } from './types'

export async function recordAtlasRequest(env: Env, params: {
  id: string
  capability: AtlasCapability
  app: string
  purpose: string
  provider: AtlasProvider
  model?: string
  status: 'success' | 'error'
  cacheStatus?: 'none' | 'hit' | 'miss'
  requestHash?: string
  input?: unknown
  output?: unknown
  errorCode?: string
  errorMessage?: string
  durationMs: number
}): Promise<void> {
  if (!env.ATLAS_DB) return
  try {
    await env.ATLAS_DB.prepare(`INSERT INTO atlas_requests (
      id, capability, app, purpose, subject_id, provider, model, status, cache_status,
      request_hash, input_redacted_json, output_redacted_json, error_code, error_message,
      input_units, output_units, estimated_cost_usd, duration_ms, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      params.id,
      params.capability,
      params.app,
      params.purpose,
      null,
      params.provider,
      params.model ?? null,
      params.status,
      params.cacheStatus ?? 'none',
      params.requestHash ?? null,
      redact(params.input),
      redact(params.output),
      params.errorCode ?? null,
      params.errorMessage ?? null,
      null,
      null,
      null,
      params.durationMs,
      new Date().toISOString(),
    ).run()
  } catch {
    // Audit must never break a product request.
  }
}

function redact(value: unknown): string | null {
  if (value === undefined) return null
  try {
    const text = JSON.stringify(value)
    return text.length > 2000 ? `${text.slice(0, 2000)}…` : text
  } catch {
    return null
  }
}
