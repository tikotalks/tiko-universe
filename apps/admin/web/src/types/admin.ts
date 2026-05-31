export interface AdminUser {
  userId: string
  email: string
  role: 'admin'
}

export interface AdminConfig {
  appApiUrl: string
  generationApiUrl: string
  mediaApiUrl: string
}

export interface AdminApiResponse<T> {
  data: T
}

export interface ImageGenerationResult {
  id: string
  imageUrl: string
  prompt: string
  revisedPrompt: string | null
  size: string
  quality: string
  style: string
  width: number
  height: number
  fileSizeBytes: number
  createdAt: string
}

export interface StorySegmentInput {
  id: string
  text: string
  pauseAfterMs: number
}

export interface StoryTryoutResult {
  id: string
  audioUrl: string
  contentType: string
  fileSizeBytes: number
}

export interface StoryRenderResult {
  id: string
  title: string
  audioUrl: string
  voice: string
  speed: number
  fileSizeBytes: number
  createdAt: string
}
