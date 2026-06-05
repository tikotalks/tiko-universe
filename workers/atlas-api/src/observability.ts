import type { AtlasCapability, AtlasProvider, Env } from './types'

const SECRET_FIELD_PATTERN = /(key|token|secret|password|authorization|cookie|credential|session|bearer|pepper)/i
const TEXT_FIELD_PATTERN = /^(text|input|prompt|output|content|transcript|description|html|markdown)$/i
const URL_FIELD_PATTERN = /url$/i

export interface UsageEstimate {
  inputUnits: number | null
  outputUnits: number | null
  estimatedCostUsd: number | null
}

export interface AtlasUsageRow {
  id: string
  capability: AtlasCapability
  app: string
  purpose: string
  provider: AtlasProvider
  model?: string | null
  status: 'success' | 'error'
  cacheStatus: 'none' | 'hit' | 'miss'
  requestHash?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  inputUnits?: number | null
  outputUnits?: number | null
  estimatedCostUsd?: number | null
  durationMs?: number | null
  providerDurationMs?: number | null
  createdAt: string
}

export function redactForAudit(value: unknown): string | null {
  if (value === undefined) return null
  try {
    return JSON.stringify(redactValue(value, []))
  } catch {
    return null
  }
}

function redactValue(value: unknown, path: string[]): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return redactString(value, path[path.length - 1] ?? '')
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.slice(0, 20).map((item, index) => redactValue(item, [...path, String(index)]))

  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SECRET_FIELD_PATTERN.test(key) ? '[REDACTED]' : redactValue(item, [...path, key])
  }
  return output
}

function redactString(value: string, key: string): unknown {
  if (SECRET_FIELD_PATTERN.test(key)) return '[REDACTED]'
  if (URL_FIELD_PATTERN.test(key)) return redactUrl(value)
  if (TEXT_FIELD_PATTERN.test(key)) return summarizeText(value)
  if (value.length > 500) return `${value.slice(0, 240)}…[${value.length} chars]`
  return value
}

function summarizeText(value: string): Record<string, unknown> | string {
  if (value.length <= 120) return value
  return { preview: `${value.slice(0, 80)}…`, length: value.length }
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value)
    url.search = url.search ? '?[REDACTED]' : ''
    url.hash = ''
    return url.toString()
  } catch {
    return value.length > 160 ? `${value.slice(0, 120)}…` : value
  }
}

export function estimateUsage(params: {
  capability: AtlasCapability
  provider: AtlasProvider
  model?: string
  input?: unknown
  output?: unknown
  usage?: Record<string, unknown>
}): UsageEstimate {
  const explicitInput = numberFrom(params.usage?.inputCharacters) ?? numberFrom(params.usage?.inputTokens) ?? numberFrom(params.usage?.promptTokens)
  const explicitOutput = numberFrom(params.usage?.outputCharacters) ?? numberFrom(params.usage?.outputTokens) ?? numberFrom(params.usage?.completionTokens)
  const inputUnits = explicitInput ?? inferInputUnits(params.capability, params.input)
  const outputUnits = explicitOutput ?? inferOutputUnits(params.capability, params.output)
  return { inputUnits, outputUnits, estimatedCostUsd: estimateCostUsd({ ...params, inputUnits, outputUnits }) }
}

function inferInputUnits(capability: AtlasCapability, input: unknown): number | null {
  const record = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  if (capability === 'speech.synthesize') return typeof record.text === 'string' ? record.text.length : null
  if (capability === 'image.generate') return typeof record.prompt === 'string' ? record.prompt.length : null
  if (capability === 'text.generate' || capability === 'text.classify') return typeof record.input === 'string' ? Math.ceil(record.input.length / 4) : null
  if (capability === 'data.fetch' || capability === 'metadata.lookup') return 1
  return null
}

function inferOutputUnits(capability: AtlasCapability, output: unknown): number | null {
  if (capability === 'image.generate') return Array.isArray((output as { images?: unknown[] } | null)?.images) ? (output as { images: unknown[] }).images.length : null
  if (capability === 'text.generate' || capability === 'text.classify') {
    const text = typeof (output as { output?: unknown } | null)?.output === 'string' ? (output as { output: string }).output : JSON.stringify(output ?? '')
    return Math.ceil(text.length / 4)
  }
  if (capability === 'data.fetch' || capability === 'metadata.lookup') return 1
  return null
}

function estimateCostUsd(params: { capability: AtlasCapability; provider: AtlasProvider; model?: string; inputUnits: number | null; outputUnits: number | null }): number | null {
  const input = params.inputUnits ?? 0
  const output = params.outputUnits ?? 0
  if (params.provider === 'cloudflare-workers-ai' || params.provider === 'youtube' || params.provider === 'url-metadata' || params.provider === 'tiko') return 0
  if (params.capability === 'speech.synthesize') {
    if (params.provider === 'openai') return roundUsd(input * 0.000015)
    if (params.provider === 'elevenlabs') return null
  }
  if ((params.capability === 'text.generate' || params.capability === 'text.classify') && params.provider === 'openai') {
    return roundUsd((input / 1_000_000) * 0.15 + (output / 1_000_000) * 0.6)
  }
  return null
}

function roundUsd(value: number): number { return Math.round(value * 1_000_000) / 1_000_000 }
function numberFrom(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null }

export function writeStructuredEvent(event: Record<string, unknown>): void {
  console.log(JSON.stringify({ service: 'atlas-api', schemaVersion: 1, ...event }))
}

export async function listUsage(env: Env, filters: { app?: string | null; capability?: AtlasCapability | null; limit?: number }): Promise<AtlasUsageRow[]> {
  if (!env.ATLAS_DB) return []
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const where: string[] = []
  const values: unknown[] = []
  if (filters.app) { where.push('app = ?'); values.push(filters.app) }
  if (filters.capability) { where.push('capability = ?'); values.push(filters.capability) }
  values.push(limit)
  const sql = `SELECT id, capability, app, purpose, provider, model, status, cache_status, request_hash, error_code, error_message, input_units, output_units, estimated_cost_usd, duration_ms, provider_duration_ms, created_at FROM atlas_requests${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT ?`
  const result = await env.ATLAS_DB.prepare(sql).bind(...values).all<Record<string, unknown>>()
  return result.results.map(mapUsageRow)
}

export async function getUsageRequest(env: Env, id: string): Promise<AtlasUsageRow | null> {
  if (!env.ATLAS_DB) return null
  const row = await env.ATLAS_DB.prepare('SELECT id, capability, app, purpose, provider, model, status, cache_status, request_hash, error_code, error_message, input_units, output_units, estimated_cost_usd, duration_ms, provider_duration_ms, created_at FROM atlas_requests WHERE id = ? LIMIT 1').bind(id).first<Record<string, unknown>>()
  return row ? mapUsageRow(row) : null
}

export async function aggregateUsageByProvider(env: Env): Promise<Array<{ provider: AtlasProvider; requests: number; errors: number; estimatedCostUsd: number; averageDurationMs: number | null }>> {
  if (!env.ATLAS_DB) return []
  const result = await env.ATLAS_DB.prepare("SELECT provider, COUNT(*) as requests, SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors, COALESCE(SUM(estimated_cost_usd), 0) as estimated_cost_usd, AVG(duration_ms) as average_duration_ms FROM atlas_requests GROUP BY provider ORDER BY requests DESC").bind().all<Record<string, unknown>>()
  return result.results.map((row) => ({
    provider: String(row.provider) as AtlasProvider,
    requests: Number(row.requests ?? 0),
    errors: Number(row.errors ?? 0),
    estimatedCostUsd: Number(row.estimated_cost_usd ?? 0),
    averageDurationMs: row.average_duration_ms === null || row.average_duration_ms === undefined ? null : Math.round(Number(row.average_duration_ms)),
  }))
}

export async function listProviderStatus(env: Env): Promise<Array<{ provider: AtlasProvider; enabled: boolean; status: string; lastCheckedAt?: string | null; lastError?: string | null; metadata?: unknown }>> {
  if (!env.ATLAS_DB) return []
  const result = await env.ATLAS_DB.prepare('SELECT provider, enabled, status, last_checked_at, last_error, metadata_json FROM atlas_provider_status ORDER BY provider').bind().all<Record<string, unknown>>()
  return result.results.map((row) => ({
    provider: String(row.provider) as AtlasProvider,
    enabled: Boolean(row.enabled),
    status: String(row.status ?? 'unknown'),
    lastCheckedAt: row.last_checked_at as string | null | undefined,
    lastError: row.last_error as string | null | undefined,
    metadata: parseMaybeJson(row.metadata_json),
  }))
}

function mapUsageRow(row: Record<string, unknown>): AtlasUsageRow {
  return {
    id: String(row.id),
    capability: String(row.capability) as AtlasCapability,
    app: String(row.app),
    purpose: String(row.purpose),
    provider: String(row.provider) as AtlasProvider,
    model: row.model as string | null | undefined,
    status: String(row.status) as 'success' | 'error',
    cacheStatus: String(row.cache_status ?? 'none') as 'none' | 'hit' | 'miss',
    requestHash: row.request_hash as string | null | undefined,
    errorCode: row.error_code as string | null | undefined,
    errorMessage: row.error_message as string | null | undefined,
    inputUnits: row.input_units as number | null | undefined,
    outputUnits: row.output_units as number | null | undefined,
    estimatedCostUsd: row.estimated_cost_usd as number | null | undefined,
    durationMs: row.duration_ms as number | null | undefined,
    providerDurationMs: row.provider_duration_ms as number | null | undefined,
    createdAt: String(row.created_at),
  }
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return null
  try { return JSON.parse(value) } catch { return null }
}
