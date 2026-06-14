import type { ImageGenerationResult } from '../../types/admin'

export type TikoStyle = 'tiko-original' | 'tiko-v2' | 'tiko-v3' | 'tiko-natural'

export interface GenerateInput {
  type: 'generate'
  prompt: string
  size: '1024x1024' | '1024x1792' | '1792x1024'
  quality: 'standard' | 'hd'
  tikoStyle: TikoStyle
  title?: string
  category?: string
  tags?: string[]
  count?: number
}

export interface EditInput {
  type: 'edit'
  sourceId: string
  prompt: string
  maskBase64?: string
  size: '1024x1024' | '1024x1792' | '1792x1024'
}

export interface UpscaleInput {
  type: 'upscale'
  sourceId: string
  size: string
  quality: string
  title?: string
  description?: string
  category?: string
  tags?: string[]
}

export type JobInput = GenerateInput | EditInput | UpscaleInput

// Matches the GenerationJobDto from workers/generation-api/src/jobs.ts.
export interface JobDto {
  id: string
  type: 'generate' | 'edit' | 'upscale'
  status: 'pending' | 'processing' | 'done' | 'error'
  input: JobInput
  label: string
  result: { data: ImageGenerationResult | ImageGenerationResult[]; meta: Record<string, unknown> } | null
  error: { code: string; message: string } | null
  createdAt: string
  updatedAt: string
  processedAt: string | null
}

export function extractJobResults(job: JobDto): ImageGenerationResult[] {
  if (!job.result) return []
  const data = job.result.data
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') return [data]
  return []
}
