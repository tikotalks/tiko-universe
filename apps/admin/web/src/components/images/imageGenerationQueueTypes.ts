import type { ImageGenerationResult } from '../../types/admin'

export type TikoStyle = 'tiko-original' | 'tiko-v2' | 'tiko-natural'

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

export interface EnrichInput {
  type: 'enrich'
  sourceId: string
  list: 'library' | 'drafts'
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

export interface QueueItem {
  id: string
  label: string
  input: GenerateInput | EditInput | EnrichInput | UpscaleInput
  status: 'pending' | 'generating' | 'done' | 'error'
  result: ImageGenerationResult | ImageGenerationResult[] | null
  error: string | null
}
