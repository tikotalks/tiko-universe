export interface AdminUser {
  userId: string
  email: string
  role: 'admin'
}

export interface AdminConfig {
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
