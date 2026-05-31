// ── Media types for the tiko-media gallery ──────────────────────

export type MediaType = 'image' | 'audio' | 'video'
export type MediaSource = 'upload' | 'generated' | 'tts-story'
export type MediaSortField = 'created_at' | 'file_size' | 'title'
export type SortOrder = 'asc' | 'desc'

export interface MediaItem {
  id: string
  title: string
  description?: string
  fileName: string
  fileType: MediaType
  mimeType: string
  fileExtension: string
  fileSizeBytes: number
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  durationSeconds?: number
  category: string
  tags: string[]
  isPublic: boolean
  source: MediaSource
  generationPrompt?: string
  createdAt: string
  updatedAt: string
}

export interface MediaListMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface MediaListResponse {
  data: MediaItem[]
  meta: MediaListMeta
}

export interface MediaDetailResponse {
  data: MediaItem
}

export interface MediaQueryParams {
  type?: MediaType
  category?: string
  tags?: string[]
  search?: string
  page?: number
  limit?: number
  sort?: MediaSortField
  order?: SortOrder
}

export interface MediaDownloadOptions {
  format?: 'png' | 'jpg' | 'webp' | 'mp3' | 'wav'
}
