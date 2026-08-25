export interface MediaUploadApiKey {
  id: string
  name: string
  prefix: string
  scopes: string[]
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
}

export interface IssuedMediaUploadApiKey extends MediaUploadApiKey {
  key: string
}

export interface CreateMediaUploadApiKeyInput {
  name: string
  expiresInDays: number
}
