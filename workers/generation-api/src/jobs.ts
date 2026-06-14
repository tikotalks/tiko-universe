import type { ImageMode, TikoStyle } from './image-prompts'

export type GenerationJobType = 'generate' | 'edit' | 'upscale'
export type GenerationJobStatus = 'pending' | 'processing' | 'done' | 'error'

export interface GenerateJobInput {
  type: 'generate'
  prompt: string
  mode?: ImageMode
  tikoStyle?: TikoStyle
  size?: '1024x1024' | '1024x1792' | '1792x1024'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  transparent?: boolean
  title?: string
  category?: string
  tags?: string[]
  count?: number
}

export interface EditJobInput {
  type: 'edit'
  sourceId: string
  prompt: string
  maskBase64?: string
  size: '1024x1024' | '1024x1792' | '1792x1024'
}

export interface UpscaleJobInput {
  type: 'upscale'
  sourceId: string
  size: '1024x1024' | '1024x1792' | '1792x1024'
  quality?: string
  title?: string
  description?: string
  category?: string
  tags?: string[]
}

export type GenerationJobInput = GenerateJobInput | EditJobInput | UpscaleJobInput

export interface JobEnv {
  GENERATION_DB: {
    prepare(sql: string): {
      bind(...values: unknown[]): D1Statement
      first<T>(): Promise<T | null>
      all<T>(): Promise<{ results: T[] }>
      run(): Promise<{ meta?: { changes?: number } }>
    }
  }
}

interface D1Statement {
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
  run(): Promise<{ meta?: { changes?: number } }>
}

export interface GenerationJobRow {
  id: string
  type: GenerationJobType
  input_json: string
  status: GenerationJobStatus
  result_json: string | null
  error_code: string | null
  error_message: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  processed_at: string | null
}

const JOB_TTL_DAYS = 7

function jobType(v: unknown): GenerationJobType {
  return v === 'edit' || v === 'upscale' ? v : 'generate'
}

export function parseJobInput(row: GenerationJobRow): GenerationJobInput {
  const parsed = JSON.parse(row.input_json) as Record<string, unknown>
  return { ...parsed, type: jobType(parsed.type) } as GenerationJobInput
}

export function jobResult(row: GenerationJobRow): unknown {
  return row.result_json ? JSON.parse(row.result_json) : null
}

export interface GenerationJobDto {
  id: string
  type: GenerationJobType
  status: GenerationJobStatus
  input: GenerationJobInput
  label: string
  result: unknown
  error: { code: string; message: string } | null
  createdAt: string
  updatedAt: string
  processedAt: string | null
}

export function jobLabel(input: GenerationJobInput): string {
  if (input.type === 'edit') return `Edit: ${input.prompt.slice(0, 40)}`
  if (input.type === 'upscale') return `Upscale: ${input.sourceId.slice(0, 8)}`
  return (input.title || input.prompt.split('\n')[0] || '').slice(0, 40) || 'Generate'
}

export function toJobDto(row: GenerationJobRow): GenerationJobDto {
  const input = parseJobInput(row)
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    input,
    label: jobLabel(input),
    result: jobResult(row),
    error: row.error_code ? { code: row.error_code, message: row.error_message ?? '' } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processedAt: row.processed_at,
  }
}

// Enqueue validates + inserts one or more jobs owned by the caller. Returns the
// created rows in order. Cheap D1 writes — the heavy work happens out-of-band.
export async function enqueueJobs(env: JobEnv, createdByValue: string | null, inputs: GenerationJobInput[]): Promise<GenerationJobRow[]> {
  const now = new Date().toISOString()
  const rows: GenerationJobRow[] = []
  for (const input of inputs) {
    const id = crypto.randomUUID()
    const row: GenerationJobRow = {
      id,
      type: input.type,
      input_json: JSON.stringify(input),
      status: 'pending',
      result_json: null,
      error_code: null,
      error_message: null,
      created_by: createdByValue,
      created_at: now,
      updated_at: now,
      processed_at: null,
    }
    await env.GENERATION_DB.prepare(
      `INSERT INTO generation_jobs (id, type, input_json, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
    ).bind(id, row.type, row.input_json, row.created_by, now, now).run()
    rows.push(row)
  }
  return rows
}

// Owner-scoped list. Elevates (admins / service keys) see all when ownerId is null.
export async function listJobRows(env: JobEnv, ownerId: string | null, limit = 50): Promise<GenerationJobRow[]> {
  const cutoff = new Date(Date.now() - JOB_TTL_DAYS * 86_400_000).toISOString()
  if (ownerId) {
    const result = await env.GENERATION_DB.prepare(
      `SELECT id, type, input_json, status, result_json, error_code, error_message, created_by, created_at, updated_at, processed_at
       FROM generation_jobs WHERE created_by = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?`,
    ).bind(ownerId, cutoff, limit).all<GenerationJobRow>()
    return result.results
  }
  const result = await env.GENERATION_DB.prepare(
    `SELECT id, type, input_json, status, result_json, error_code, error_message, created_by, created_at, updated_at, processed_at
     FROM generation_jobs WHERE created_at >= ? ORDER BY created_at DESC LIMIT ?`,
  ).bind(cutoff, limit).all<GenerationJobRow>()
  return result.results
}

export async function getJobRow(env: JobEnv, id: string): Promise<GenerationJobRow | null> {
  return env.GENERATION_DB.prepare(
    `SELECT id, type, input_json, status, result_json, error_code, error_message, created_by, created_at, updated_at, processed_at
     FROM generation_jobs WHERE id = ? LIMIT 1`,
  ).bind(id).first<GenerationJobRow>()
}

// Claims the oldest pending job by flipping it to 'processing'. Returns null when
// the queue is drained. The status filter makes concurrent claimers (cron vs
// waitUntil) race-safe: only one UPDATE lands per row.
export async function claimNextPendingJob(env: JobEnv): Promise<GenerationJobRow | null> {
  const candidate = await env.GENERATION_DB.prepare(
    `SELECT id, type, input_json, status, result_json, error_code, error_message, created_by, created_at, updated_at, processed_at
     FROM generation_jobs WHERE status = 'pending' ORDER BY created_at LIMIT 1`,
  ).first<GenerationJobRow>()
  if (!candidate) return null
  const now = new Date().toISOString()
  const claimed = await env.GENERATION_DB.prepare(
    `UPDATE generation_jobs SET status = 'processing', updated_at = ? WHERE id = ? AND status = 'pending'`,
  ).bind(now, candidate.id).run()
  if (!claimed.meta?.changes) return null
  return { ...candidate, status: 'processing', updated_at: now }
}

// Re-claim jobs that stalled in 'processing' (worker died mid-run). Guarded by a
// staleness threshold so an in-flight job isn't double-processed.
export async function claimStalledJob(env: JobEnv, stalledBeforeIso: string): Promise<GenerationJobRow | null> {
  const candidate = await env.GENERATION_DB.prepare(
    `SELECT id, type, input_json, status, result_json, error_code, error_message, created_by, created_at, updated_at, processed_at
     FROM generation_jobs WHERE status = 'processing' AND updated_at < ? ORDER BY created_at LIMIT 1`,
  ).bind(stalledBeforeIso).first<GenerationJobRow>()
  if (!candidate) return null
  const now = new Date().toISOString()
  await env.GENERATION_DB.prepare(
    `UPDATE generation_jobs SET updated_at = ? WHERE id = ?`,
  ).bind(now, candidate.id).run()
  return candidate
}

export async function markJobDone(env: JobEnv, id: string, result: unknown): Promise<void> {
  const now = new Date().toISOString()
  await env.GENERATION_DB.prepare(
    `UPDATE generation_jobs SET status = 'done', result_json = ?, error_code = NULL, error_message = NULL, updated_at = ?, processed_at = ? WHERE id = ?`,
  ).bind(JSON.stringify(result), now, now, id).run()
}

export async function markJobError(env: JobEnv, id: string, code: string, message: string): Promise<void> {
  const now = new Date().toISOString()
  await env.GENERATION_DB.prepare(
    `UPDATE generation_jobs SET status = 'error', error_code = ?, error_message = ?, updated_at = ?, processed_at = ? WHERE id = ?`,
  ).bind(code, message, now, now, id).run()
}

export async function deleteJobRow(env: JobEnv, id: string): Promise<number> {
  const result = await env.GENERATION_DB.prepare(`DELETE FROM generation_jobs WHERE id = ?`).bind(id).run()
  return result.meta?.changes ?? 0
}
