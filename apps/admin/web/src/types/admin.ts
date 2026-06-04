export interface AdminUser {
  userId: string
  email: string
  role: 'admin'
  roles: string[]
}

export type TikoRole = 'guest' | 'user' | 'child' | 'profile_manager' | 'content_editor' | 'admin'

export interface AdminManagedUser {
  id: string
  kind: string
  email: string | null
  roles: TikoRole[]
  createdAt: string
  updatedAt: string
}

export interface AdminConfig {
  appApiUrl: string
  generationApiUrl: string
  mediaApiUrl: string
  communicationApiUrl: string
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

export interface CommunicationMessage {
  id: string
  direction: 'inbound' | 'outbound'
  channel: 'email'
  type: string
  status: string
  from: string | null
  to: string | null
  subject: string | null
  text: string | null
  html: string | null
  provider: string | null
  providerMessageId: string | null
  relatedUserId: string | null
  relatedApp: string | null
  createdAt: string
  updatedAt: string
}
