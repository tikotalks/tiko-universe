// ────────────────────────────────────────────────────────────────
// Unified media-api worker
// Combines media-upload, media-cache, and assets-upload into one
// service with versioned /v1/ routes.
// ────────────────────────────────────────────────────────────────

import { authenticate, type AuthSuccess } from '../../shared/auth'

// ── Inline env / type interfaces (no @cloudflare/workers-types) ─

interface Env {
  MEDIA_DB: D1Database
  ASSETS_DB: D1Database
  MEDIA_BUCKET: R2Bucket
  ASSETS_BUCKET: R2Bucket
  USER_MEDIA_BUCKET: R2Bucket
  AUTH_DB?: {
    prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; all(): Promise<{ results: unknown[] }> } }
  }
  API_KEYS?: string
  OPENAI_API_KEY?: string
  IDENTITY_BASE_URL?: string
}

interface D1Database {
  prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }>; run(): Promise<{ meta?: { changes?: number } }> } }
}

interface R2Bucket {
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>
  put(key: string, value: BodyInit, options?: Record<string, unknown>): Promise<unknown>
  delete(key: string): Promise<unknown>
}

// ── Domain types ───────────────────────────────────────────────

interface MediaItem {
  id: string
  file_name: string
  file_size: number
  mime_type: string
  width?: number
  height?: number
  alt_text?: string
  title?: string
  description?: string
  folder?: string
  tags?: string[]
  is_private: boolean
  original_url: string
  created_at: string
  updated_at: string
}

interface AssetRecord {
  id: string
  title: string
  description?: string
  filename: string
  original_filename: string
  file_path: string
  file_size: number
  mime_type: string
  file_extension: string
  categories: string[]
  tags: string[]
  width?: number
  height?: number
  duration?: number
  is_public: boolean
  user_id?: string
  created_at: string
}

interface ImageMetadata {
  title: string
  description: string
  tags: string[]
  categories: string[]
}

interface AudioAlbumRow {
  id: string
  title: string
  description?: string | null
  cover_media_id?: string | null
  visibility: 'public' | 'private'
  radio_enabled: number
  sort_mode: 'manual' | 'created_desc' | 'title_asc'
  settings: string
  created_at: string
  updated_at: string
}

interface AudioTrackRow {
  track_id: string
  album_id: string
  media_id: string
  title: string
  artist?: string | null
  duration_seconds?: number | null
  position: number
  created_at: string
  updated_at: string
  original_url?: string
  mime_type?: string
  file_name?: string
  filename?: string
  media_title?: string | null
}

interface MediaAccessContext {
  auth: AuthSuccess | null
}

const MAX_MEDIA_UPLOAD_BYTES = 50 * 1024 * 1024
const MAX_ASSET_UPLOAD_BYTES = 25 * 1024 * 1024
const MAX_THUMBNAIL_UPLOAD_BYTES = 5 * 1024 * 1024
const ALLOWED_MEDIA_MIME_PREFIXES = ['image/', 'audio/', 'video/']
const ALLOWED_ASSET_MIME_TYPES = new Set([
  'application/pdf',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
])
const TRUSTED_ANALYSIS_HOSTS = new Set(['data.tikocdn.org', 'data-tikoapps.org', 'data.tikoapps.org'])

// ── CORS helpers ───────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value)
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function ok(data: Record<string, unknown>): Response { return json({ success: true, ...data }) }
function err(message: string, status = 400): Response { return json({ success: false, error: message }, status) }

async function optionalAuth(request: Request, env: Env): Promise<MediaAccessContext | Response> {
  if (!request.headers.has('authorization')) return { auth: null }
  const authed = await authenticate(request, env)
  if (authed.ok === false) return withCors(authed.response)
  return { auth: authed }
}

function isServiceAccess(context: MediaAccessContext): boolean {
  return context.auth?.method === 'api_key'
}

function sessionUserId(context: MediaAccessContext): string | null {
  return context.auth?.method === 'session' && context.auth.userId ? context.auth.userId : null
}

function canReadPrivateOwner(context: MediaAccessContext, ownerUserId: unknown): boolean {
  if (isServiceAccess(context)) return true
  const userId = sessionUserId(context)
  return !!userId && typeof ownerUserId === 'string' && ownerUserId === userId
}

function canReadMedia(row: Record<string, unknown>, context: MediaAccessContext): boolean {
  if (!dbBoolean(row.is_private)) return true
  return canReadPrivateOwner(context, row.owner_user_id)
}

function canReadAsset(row: Record<string, unknown>, context: MediaAccessContext): boolean {
  if (dbBoolean(row.is_public)) return true
  return canReadPrivateOwner(context, row.user_id)
}

function privateAccessResponse(context: MediaAccessContext): Response {
  return context.auth ? err('Forbidden', 403) : err('Authentication required', 401)
}

// ── Utility helpers ────────────────────────────────────────────

function nullableString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function nullableNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function parseStringArray(value: unknown): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function parseFormStringArray(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(String).map(item => item.trim()).filter(Boolean)
  } catch {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

function firstCategory(value: unknown): string | undefined {
  const categories = parseStringArray(value)
  return categories[0]
}

function rowToMediaItem(row: Record<string, unknown>): MediaItem {
  return {
    id: String(row.id),
    file_name: String(row.file_name),
    file_size: Number(row.file_size),
    mime_type: String(row.mime_type),
    width: nullableNumber(row.width),
    height: nullableNumber(row.height),
    alt_text: nullableString(row.alt_text),
    title: nullableString(row.title),
    description: nullableString(row.description),
    folder: firstCategory(row.folder),
    tags: parseStringArray(row.tags),
    is_private: dbBoolean(row.is_private),
    original_url: String(row.original_url),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function rowToAsset(row: Record<string, unknown>): AssetRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    description: nullableString(row.description),
    filename: String(row.filename),
    original_filename: String(row.original_filename),
    file_path: String(row.file_path),
    file_size: Number(row.file_size),
    mime_type: String(row.mime_type),
    file_extension: String(row.file_extension),
    categories: parseStringArray(row.categories),
    tags: parseStringArray(row.tags),
    width: nullableNumber(row.width),
    height: nullableNumber(row.height),
    duration: nullableNumber(row.duration),
    is_public: dbBoolean(row.is_public),
    user_id: nullableString(row.user_id),
    created_at: String(row.created_at),
  }
}

function dbBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
  return false
}

function validateMediaUploadFile(file: File): Response | null {
  const mimeType = file.type.toLowerCase()
  if (!mimeType || !ALLOWED_MEDIA_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix))) {
    return err('Unsupported media type', 415)
  }
  if (file.size <= 0) return err('File is empty', 400)
  if (file.size > MAX_MEDIA_UPLOAD_BYTES) return err('File is too large', 413)
  return null
}

function validateAssetUploadFile(file: File): Response | null {
  const mimeType = file.type.toLowerCase()
  if (!mimeType || !ALLOWED_ASSET_MIME_TYPES.has(mimeType)) {
    return err('Unsupported asset type', 415)
  }
  if (file.size <= 0) return err('File is empty', 400)
  if (file.size > MAX_ASSET_UPLOAD_BYTES) return err('File is too large', 413)
  return null
}

function validateThumbnailUploadFile(file: File): Response | null {
  const mimeType = file.type.toLowerCase()
  if (!mimeType.startsWith('image/')) return err('Unsupported thumbnail type', 415)
  if (file.size <= 0) return err('Thumbnail is empty', 400)
  if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) return err('Thumbnail is too large', 413)
  return null
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || !value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function rowToAudioTrack(row: AudioTrackRow) {
  return {
    id: row.track_id,
    albumId: row.album_id,
    mediaId: row.media_id,
    title: row.title || row.media_title || 'Untitled track',
    artist: row.artist ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    position: row.position,
    audioUrl: row.original_url,
    mimeType: row.mime_type,
    fileName: row.file_name ?? row.filename,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToAudioAlbum(row: AudioAlbumRow, tracks: AudioTrackRow[] = []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    coverMediaId: row.cover_media_id ?? undefined,
    visibility: row.visibility,
    radioEnabled: Boolean(row.radio_enabled),
    sortMode: row.sort_mode,
    settings: parseJsonObject(row.settings),
    tracks: tracks.map(rowToAudioTrack),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ── Image dimension helpers (from assets-upload) ───────────────

async function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith('image/')) return {}
  try {
    const buf = new Uint8Array(await file.arrayBuffer())
    if (file.type === 'image/jpeg') return getJPEGDimensions(buf)
    if (file.type === 'image/png') return getPNGDimensions(buf)
    if (file.type === 'image/webp') return getWebPDimensions(buf)
  } catch (e) {
    console.warn('Failed to get image dimensions:', e)
  }
  return {}
}

function getJPEGDimensions(data: Uint8Array): { width?: number; height?: number } {
  let i = 0
  if (data[i] === 0xff && data[i + 1] === 0xd8) {
    i += 2
    while (i < data.length) {
      if (data[i] === 0xff) {
        const marker = data[i + 1]
        if (marker >= 0xc0 && marker <= 0xc3) {
          const height = (data[i + 5] << 8) | data[i + 6]
          const width = (data[i + 7] << 8) | data[i + 8]
          return { width, height }
        }
        i += 2 + ((data[i + 2] << 8) | data[i + 3])
      } else {
        i++
      }
    }
  }
  return {}
}

function getPNGDimensions(data: Uint8Array): { width?: number; height?: number } {
  if (
    data.length >= 24 &&
    data[0] === 0x89 && data[1] === 0x50 &&
    data[2] === 0x4e && data[3] === 0x47
  ) {
    const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19]
    const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23]
    return { width, height }
  }
  return {}
}

function getWebPDimensions(data: Uint8Array): { width?: number; height?: number } {
  if (
    data.length >= 30 &&
    data[0] === 0x52 && data[1] === 0x49 &&
    data[2] === 0x46 && data[3] === 0x46 &&
    data[8] === 0x57 && data[9] === 0x45 &&
    data[10] === 0x42 && data[11] === 0x50
  ) {
    if (data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38) {
      const width = ((data[26] | (data[27] << 8) | (data[28] << 16)) & 0x3fff) + 1
      const height = (((data[28] >> 6) | (data[29] << 2) | ((data[30] & 0x3f) << 10)) & 0x3fff) + 1
      return { width, height }
    }
  }
  return {}
}

// ── Safe filename generation ───────────────────────────────────

function generateSafeFilename(originalName: string): { safeName: string; extension: string } {
  const extension = originalName.match(/\.[^.]+$/)?.[0] || ''
  const nameWithoutExt = originalName.replace(/\.[^.]+$/, '')
  const safeName =
    nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'file'

  const timestamp = Date.now()
  return {
    safeName: `${timestamp}-${safeName}${extension}`,
    extension: extension.toLowerCase(),
  }
}

// ── OpenAI Vision analysis (ported from media-upload) ──────────

function buildVisionPrompt({ title }: { title?: string }): string {
  return `Analyze this image and return valid JSON metadata following the strict global
rules and field-specific instructions below.${title ? `

IMPORTANT CONTEXT: The image has been titled "${title}". Use this as
context to better understand what the subject is. For example, if the title says "Bao Bun" and you see a
round food item, it's a bao bun, not a hamburger.` : ''}

### GLOBAL RULES (apply to all fields)
- ❌ Do NOT mention that it is an image, drawing, cartoon, illustration, or character.
- ❌ Do NOT include style or emotion words like: "cute", "adorable", "funny",
"playful", "design", "cartoon", "mascot", "illustration", "character", "art", or "concept".
- ❌ Do NOT use self-referential phrases like "This is", "This image shows", or "In the picture".
- ✅ Focus only on what the subject *is*, not how it looks or is styled.
- ✅ Use simple, factual, child-friendly language that a young kid can understand.

### OUTPUT FORMAT (JSON)
Return a JSON object in this format:

{
  "title": "A short, clear name of the subject.${title ? ` If appropriate, you can use or refine the provided title: '${title}'.` : ''} Example: 'Lion', 'Dim Sum', 'Fire Truck'. Do NOT include any adjectives or style words.",

  "description": "2–3 short sentences about the subject. Describe what it is, what it does, where it comes from, or what it's made of. Use friendly and simple language for children. Never mention the style or that it is an image.",

  "tags": [
    "10–15 short keywords someone might use to search for the subject. All should be related to the real content. Do NOT include style words like 'cute', 'illustration', 'cartoon', etc."
  ],

  "categories": [
    "5–8 broad categories the subject fits into. Use general terms like: 'animals', 'food', 'people', 'nature', 'vehicles', 'toys', 'tools', 'plants', 'places', 'clothing'. Never include: 'art', 'illustration', 'characters', or 'design'."
  ]
}

Only return the JSON. Do not include any explanation, formatting, or markdown.`
}

function parseVisionResponse(content: string): ImageMetadata | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0])
      return {
        title: analysis.title || '',
        description: analysis.description || '',
        tags: Array.isArray(analysis.tags) ? analysis.tags : [],
        categories: Array.isArray(analysis.categories) ? analysis.categories : [],
      }
    }
    return null
  } catch {
    return null
  }
}

async function analyzeWithOpenAI(
  imageUrl: string,
  title: string | undefined,
  apiKey: string,
): Promise<{ metadata: ImageMetadata; visionError: string | null }> {
  try {
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: buildVisionPrompt({ title }) },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 500,
      }),
    })

    if (visionResponse.ok) {
      const visionData = (await visionResponse.json()) as {
        choices: Array<{ message: { content: string } }>
      }
      const content = visionData.choices[0].message.content
      const parsed = parseVisionResponse(content)
      if (parsed) return { metadata: parsed, visionError: null }
      return { metadata: { title: '', description: '', tags: [], categories: [] }, visionError: 'No JSON found in response' }
    }

    const errorText = await visionResponse.text()
    let detail = errorText
    try {
      const errorJson = JSON.parse(errorText)
      detail = errorJson.error?.message || errorText
    } catch { /* keep raw text */ }

    return {
      metadata: { title: '', description: '', tags: [], categories: [] },
      visionError: `API error ${visionResponse.status}: ${detail}`,
    }
  } catch (error) {
    return {
      metadata: { title: '', description: '', tags: [], categories: [] },
      visionError: `Request error: ${(error as Error).message}`,
    }
  }
}

// ── Route handlers ─────────────────────────────────────────────

// POST /v1/media/upload — upload media to R2, optionally analyze, return metadata
async function handleMediaUpload(request: Request, env: Env, access: MediaAccessContext): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const thumbnail = formData.get('thumbnail') as File | null
    const duration = formData.get('duration') as string | null
    const widthParam = formData.get('width') as string | null
    const heightParam = formData.get('height') as string | null
    const titleParam = (formData.get('title') as string | null)?.trim()
    const descriptionParam = (formData.get('description') as string | null)?.trim()
    const categoriesParam = parseFormStringArray(formData.get('categories'))
    const tagsParam = parseFormStringArray(formData.get('tags'))

    if (!file) return err('No file provided')
    const validationError = validateMediaUploadFile(file)
    if (validationError) return validationError

    const { safeName, extension } = generateSafeFilename(file.name)
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
    const baseKey = `uploads/${safeName}`
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const isPrivate = formData.get('isPrivate') === 'true'
    const ownerUserId = sessionUserId(access)
    if (isPrivate && !ownerUserId) return err('Private uploads require a user session', 403)
    const mediaBucket = isPrivate ? env.USER_MEDIA_BUCKET : env.MEDIA_BUCKET

    await mediaBucket.put(baseKey, file.stream(), {
      httpMetadata: { contentType: file.type },
    })

    const baseUrl = isPrivate ? `/v1/media/${id}/download` : `https://data.tikocdn.org/${baseKey}`
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    let metadata: ImageMetadata = { title: '', description: '', tags: [], categories: [] }
    let visionError: string | null = null
    let thumbnailUrl: string | undefined

    // Handle video thumbnail upload
    if (isVideo && thumbnail) {
      const thumbnailValidationError = validateThumbnailUploadFile(thumbnail)
      if (thumbnailValidationError) return thumbnailValidationError
      const thumbnailKey = `uploads/thumbnails/${Date.now()}-${nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '-')}-thumb.jpg`
      await mediaBucket.put(thumbnailKey, thumbnail.stream(), {
        httpMetadata: { contentType: 'image/jpeg' },
      })
      thumbnailUrl = isPrivate ? `/v1/media/${id}/download` : `https://data.tikocdn.org/${thumbnailKey}`
    }

    // Analyze with OpenAI Vision
    if (!isPrivate && (isImage || (isVideo && thumbnailUrl)) && env.OPENAI_API_KEY) {
      const analyzeUrl = isVideo ? thumbnailUrl! : baseUrl
      const result = await analyzeWithOpenAI(analyzeUrl, nameWithoutExt, env.OPENAI_API_KEY)
      metadata = result.metadata
      visionError = result.visionError
    }

    // Fallback title
    if (titleParam) metadata.title = titleParam
    if (descriptionParam) metadata.description = descriptionParam
    if (categoriesParam.length) metadata.categories = categoriesParam
    if (tagsParam.length) metadata.tags = tagsParam

    if (!metadata.title) {
      metadata.title = nameWithoutExt
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
    }

    const width = widthParam ? parseInt(widthParam) : undefined
    const height = heightParam ? parseInt(heightParam) : undefined

    const thumbnailUrl2 = isImage ? `${baseUrl}?width=200` : (thumbnailUrl || baseUrl)
    const mediumUrl = isImage ? `${baseUrl}?width=800` : baseUrl

    const insertSql = `INSERT INTO media (
          id, name, filename, file_size, mime_type, width, height, title, description,
          categories, tags, is_private, owner_user_id, original_url, thumbnail_url, medium_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    const insertBindings = [
      id,
      metadata.title || nameWithoutExt,
      baseKey,
      file.size,
      file.type,
      width ?? null,
      height ?? null,
      metadata.title,
      metadata.description || null,
      JSON.stringify(metadata.categories),
      JSON.stringify(metadata.tags),
      isPrivate ? 1 : 0,
      ownerUserId,
      baseUrl,
      thumbnailUrl2,
      mediumUrl,
      now,
      now,
    ]

    let inserted = false
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await env.MEDIA_DB.prepare(insertSql).bind(...insertBindings).run()
        inserted = true
        break
      } catch (dbError) {
        if (attempt === 3) {
          try { await mediaBucket.delete(baseKey) } catch { /* ignore cleanup failure */ }
          return json({ success: false, error: 'Failed to save media metadata', details: (dbError as Error).message }, 500)
        }
        await new Promise(r => setTimeout(r, 150 * attempt))
      }
    }

    return ok({
      id,
      filename: baseKey,
      url: baseUrl,
      thumbnail: isImage ? `${baseUrl}?width=200` : (thumbnailUrl || baseUrl),
      medium: isImage ? `${baseUrl}?width=800` : baseUrl,
      size: file.size,
      type: file.type,
      ...metadata,
      ...(isVideo && {
        thumbnailUrl,
        duration: duration ? parseFloat(duration) : undefined,
        width,
        height,
      }),
      _meta: {
        timestamp: new Date().toISOString(),
        isImage,
        isVideo,
        visionAttempted: !isPrivate && !!env.OPENAI_API_KEY && (isImage || !!thumbnailUrl),
        visionError,
      },
    })
  } catch (error) {
    return json(
      { success: false, error: 'Upload failed', details: (error as Error).message },
      500,
    )
  }
}

// POST /v1/media/analyze — analyze an image URL with Vision, no upload
async function handleMediaAnalyze(request: Request, env: Env, access: MediaAccessContext): Promise<Response> {
  try {
    const body = (await request.json()) as { imageUrl?: string; title?: string }
    if (!body.imageUrl) return err('Image URL is required')
    const trustedImageUrl = await trustedAnalysisImageUrl(body.imageUrl, env, access)
    if (!trustedImageUrl) return err('Image URL must be a readable Tiko media or CDN URL', 403)

    let metadata: ImageMetadata = { title: '', description: '', tags: [], categories: [] }
    let visionError: string | null = null

    if (env.OPENAI_API_KEY) {
      const result = await analyzeWithOpenAI(trustedImageUrl, body.title, env.OPENAI_API_KEY)
      metadata = result.metadata
      visionError = result.visionError
    } else {
      visionError = 'No OpenAI API key configured'
    }

    return ok({
      ...metadata,
      _meta: {
        timestamp: new Date().toISOString(),
        visionAttempted: !!env.OPENAI_API_KEY,
        visionError,
        model: 'gpt-4o',
      },
    })
  } catch (error) {
    return json(
      { success: false, error: 'Analysis failed', details: (error as Error).message },
      500,
    )
  }
}

async function trustedAnalysisImageUrl(imageUrl: string, env: Env, access: MediaAccessContext): Promise<string | null> {
  const trimmed = imageUrl.trim()
  if (!trimmed) return null

  const directUrl = parseHttpUrl(trimmed)
  if (directUrl && directUrl.protocol === 'https:' && TRUSTED_ANALYSIS_HOSTS.has(directUrl.hostname)) {
    return directUrl.toString()
  }

  const mediaId = mediaIdFromAnalysisUrl(trimmed)
  if (!mediaId) return null

  const row = await env.MEDIA_DB.prepare(
    'SELECT id, filename AS file_name, mime_type, is_private, owner_user_id, original_url FROM media WHERE id = ? LIMIT 1',
  )
    .bind(mediaId)
    .first<Record<string, unknown>>()
  if (!row || !canReadMedia(row, access)) return null
  if (!String(row.mime_type ?? '').startsWith('image/')) return null

  const originalUrl = String(row.original_url ?? '')
  const storedUrl = parseHttpUrl(originalUrl)
  if (storedUrl && storedUrl.protocol === 'https:' && TRUSTED_ANALYSIS_HOSTS.has(storedUrl.hostname)) {
    return storedUrl.toString()
  }
  return null
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

function mediaIdFromAnalysisUrl(value: string): string | null {
  const relative = value.startsWith('/') ? value : parseHttpUrl(value)?.pathname
  if (!relative) return null
  const match = relative.match(/^\/v1\/media\/([^/]+)(?:\/download)?$/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

// GET /v1/media — list public media with search, type, category, tags, sort
async function handleListMedia(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const access = await optionalAuth(request, env)
    if (access instanceof Response) return access
    const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)
    const offset = (page - 1) * limit
    const search = url.searchParams.get('search')?.trim()
    const type = url.searchParams.get('type')?.trim()       // image | audio | video
    const categories = url.searchParams.get('category')?.split(',').map(category => category.trim()).filter(Boolean) ?? []
    const tags = url.searchParams.get('tags')?.split(',').map(t => t.trim()).filter(Boolean)
    const sort = url.searchParams.get('sort') || 'created_at'
    const order = url.searchParams.get('order')?.toLowerCase() === 'asc' ? 'ASC' : 'DESC'
    const includePrivate = url.searchParams.get('private') === 'true'

    const allowedSorts = ['created_at', 'file_size', 'title']
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at'

    const clauses: string[] = []
    const values: unknown[] = []
    if (!includePrivate) {
      clauses.push('is_private = 0')
    } else if (!access.auth) {
      return err('Authentication required', 401)
    } else if (!isServiceAccess(access)) {
      clauses.push('(is_private = 0 OR owner_user_id = ?)')
      values.push(sessionUserId(access))
    }

    if (search) {
      clauses.push('(title LIKE ? OR description LIKE ? OR name LIKE ? OR filename LIKE ?)')
      values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (type) {
      clauses.push('mime_type LIKE ?')
      values.push(`${type}/%`)
    }
    if (categories.length) {
      clauses.push(`(${categories.map(() => 'categories LIKE ?').join(' OR ')})`)
      values.push(...categories.map(category => `%"${category}"%`))
    }
    if (tags?.length) {
      for (const tag of tags) {
        clauses.push('tags LIKE ?')
        values.push(`%"${tag}"%`)
      }
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    const rows = await env.MEDIA_DB.prepare(
      `SELECT id, filename AS file_name, file_size, mime_type, width, height, '' AS alt_text, title,
              description, categories AS folder, tags, is_private, owner_user_id, original_url, created_at, updated_at
       FROM media
       ${where}
       ORDER BY ${safeSort} ${order}
       LIMIT ? OFFSET ?`,
    )
      .bind(...values, limit, offset)
      .all<Record<string, unknown>>()

    const countRow = await env.MEDIA_DB.prepare(
      `SELECT COUNT(*) AS count FROM media ${where}`,
    ).bind(...values).first<{ count: number }>()

    const total = countRow?.count ?? 0

    return json({
      data: rows.results.map(rowToMediaItem),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return json(
      { success: false, error: 'Failed to list media', details: (error as Error).message },
      500,
    )
  }
}

// GET /v1/media/:id — get single media item
async function handleGetMedia(request: Request, env: Env, id: string): Promise<Response> {
  try {
    const access = await optionalAuth(request, env)
    if (access instanceof Response) return access
    const row = await env.MEDIA_DB.prepare(
      `SELECT id, filename AS file_name, file_size, mime_type, width, height, '' AS alt_text, title,
              description, categories AS folder, tags, is_private, owner_user_id, original_url, created_at, updated_at
       FROM media WHERE id = ? LIMIT 1`,
    )
      .bind(id)
      .first<Record<string, unknown>>()

    if (!row) return err('Media not found', 404)
    if (!canReadMedia(row, access)) return privateAccessResponse(access)
    return json({ data: rowToMediaItem(row) })
  } catch (error) {
    return json(
      { success: false, error: 'Failed to get media', details: (error as Error).message },
      500,
    )
  }
}

// GET /v1/media/:id/download — proxy download from R2
async function handleMediaDownload(request: Request, env: Env, id: string): Promise<Response> {
  try {
    const access = await optionalAuth(request, env)
    if (access instanceof Response) return access
    const row = await env.MEDIA_DB.prepare(
      'SELECT filename AS file_name, mime_type, is_private, owner_user_id, original_url FROM media WHERE id = ? LIMIT 1',
    )
      .bind(id)
      .first<{ file_name: string; mime_type: string; is_private: unknown; owner_user_id?: string | null; original_url: string }>()

    if (!row) return err('Media not found', 404)
    if (!canReadMedia(row as unknown as Record<string, unknown>, access)) return privateAccessResponse(access)

    const isPrivate = dbBoolean(row.is_private)
    const r2Key = isPrivate ? row.file_name : row.original_url.replace(/^https?:\/\/[^/]+\//, '')
    const r2Object = await (isPrivate ? env.USER_MEDIA_BUCKET : env.MEDIA_BUCKET).get(r2Key)

    if (r2Object) {
      return new Response(r2Object.body, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': row.mime_type,
          'Content-Disposition': `attachment; filename="${row.file_name}"`,
        },
      })
    }

    if (isPrivate) return err('Media file not found', 404)
    return Response.redirect(row.original_url, 302)
  } catch (error) {
    return json(
      { success: false, error: 'Download failed', details: (error as Error).message },
      500,
    )
  }
}

// POST /v1/assets/upload — upload asset to R2, track in D1
async function handleAssetUpload(request: Request, env: Env, access: MediaAccessContext): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string) || ''
    const description = (formData.get('description') as string) || ''
    const categories = formData.get('categories') ? JSON.parse(formData.get('categories') as string) : []
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : []
    const isPublic = formData.get('isPublic') === 'true'
    const userId = sessionUserId(access)

    if (!file) return err('No file provided')
    const validationError = validateAssetUploadFile(file)
    if (validationError) return validationError

    const { safeName, extension } = generateSafeFilename(file.name)
    const filePath = `assets/${safeName}`
    const { width, height } = await getImageDimensions(file)

    await env.ASSETS_BUCKET.put(filePath, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        userId: userId || 'anonymous',
      },
    })

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    try {
      await env.ASSETS_DB.prepare(
        `INSERT INTO assets (
          id, title, description, filename, original_filename, file_path, file_size,
          mime_type, file_extension, categories, tags, width, height, duration,
          is_public, user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          title || file.name.replace(/\.[^.]+$/, ''),
          description || null,
          safeName,
          file.name,
          filePath,
          file.size,
          file.type,
          extension,
          JSON.stringify(categories),
          JSON.stringify(tags),
          width ?? null,
          height ?? null,
          null, // duration
          isPublic ? 1 : 0,
          userId || null,
          now,
          now,
        )
        .run()

      return ok({
        id,
        filename: safeName,
        originalFilename: file.name,
        url: `https://assets.tikocdn.org/${filePath}`,
        filePath,
        fileSize: file.size,
        mimeType: file.type,
        fileExtension: extension,
        width,
        height,
        title: title || file.name.replace(/\.[^.]+$/, ''),
        description: description || undefined,
        categories,
        tags,
        isPublic,
        createdAt: now,
      })
    } catch (dbError) {
      // Roll back R2 upload on D1 failure
      try { await env.ASSETS_BUCKET.delete(filePath) } catch { /* ignore */ }
      return json(
        {
          success: false,
          error: 'Failed to save asset metadata',
          details: (dbError as Error).message,
        },
        500,
      )
    }
  } catch (error) {
    return json(
      { success: false, error: 'Upload failed', details: (error as Error).message },
      500,
    )
  }
}

// GET /v1/assets — list assets with filtering & pagination
async function handleListAssets(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const access = await optionalAuth(request, env)
    if (access instanceof Response) return access
    const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)
    const isPublic = url.searchParams.get('public') === 'true'
    const userId = url.searchParams.get('userId')
    const search = url.searchParams.get('search')
    const category = url.searchParams.get('category')
    const tag = url.searchParams.get('tag')
    const mimeType = url.searchParams.get('type')

    const clauses: string[] = []
    const values: unknown[] = []

    if (!access.auth || isPublic) {
      clauses.push('is_public = 1')
    } else if (!isServiceAccess(access)) {
      clauses.push('(is_public = 1 OR user_id = ?)')
      values.push(sessionUserId(access))
    }
    if (userId) { clauses.push('user_id = ?'); values.push(userId) }
    if (search) {
      clauses.push('(title LIKE ? OR description LIKE ?)')
      values.push(`%${search}%`, `%${search}%`)
    }
    if (category) { clauses.push('categories LIKE ?'); values.push(`%${JSON.stringify(category).slice(1, -1)}%`) }
    if (tag) { clauses.push('tags LIKE ?'); values.push(`%${JSON.stringify(tag).slice(1, -1)}%`) }
    if (mimeType) { clauses.push('mime_type LIKE ?'); values.push(`${mimeType}%`) }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const offset = (page - 1) * limit

    const rows = await env.ASSETS_DB.prepare(
      `SELECT * FROM assets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(...values, limit, offset)
      .all<Record<string, unknown>>()

    const countRow = await env.ASSETS_DB.prepare(
      `SELECT COUNT(*) AS count FROM assets ${where}`,
    )
      .bind(...values)
      .first<{ count: number }>()

    return ok({
      assets: rows.results.map(rowToAsset),
      total: countRow?.count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    return json(
      { success: false, error: 'Failed to list assets', details: (error as Error).message },
      500,
    )
  }
}

// GET /v1/assets/:id — get single asset
async function handleGetAsset(request: Request, env: Env, id: string): Promise<Response> {
  try {
    const access = await optionalAuth(request, env)
    if (access instanceof Response) return access
    const row = await env.ASSETS_DB.prepare('SELECT * FROM assets WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>()

    if (!row) return err('Asset not found', 404)
    if (!canReadAsset(row, access)) return privateAccessResponse(access)
    return ok({ asset: rowToAsset(row) })
  } catch (error) {
    return json(
      { success: false, error: 'Failed to get asset', details: (error as Error).message },
      500,
    )
  }
}

// GET /v1/audio/albums — list public radio-ready audio albums with tracks
async function handleListAudioAlbums(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const radioOnly = url.searchParams.get('radioEnabled') === 'true'
    const clauses = ['visibility = ?']
    const values: unknown[] = ['public']
    if (radioOnly) { clauses.push('radio_enabled = 1') }
    const rows = await env.MEDIA_DB.prepare(
      `SELECT id, title, description, cover_media_id, visibility, radio_enabled, sort_mode, settings, created_at, updated_at
       FROM audio_albums
       WHERE ${clauses.join(' AND ')}
       ORDER BY created_at DESC`,
    ).bind(...values).all<AudioAlbumRow>()

    const albumIds = rows.results.map(album => album.id)
    const tracksByAlbum = new Map<string, AudioTrackRow[]>()
    if (albumIds.length > 0) {
      const placeholders = albumIds.map(() => '?').join(', ')
      const tracks = await env.MEDIA_DB.prepare(
        `SELECT t.id AS track_id, t.album_id, t.media_id, t.title, t.artist, t.duration_seconds,
                t.position, t.created_at, t.updated_at,
                m.original_url, m.mime_type, m.filename AS file_name, m.title AS media_title
         FROM audio_tracks t
         JOIN media m ON m.id = t.media_id
         WHERE t.album_id IN (${placeholders})
         ORDER BY t.album_id ASC, t.position ASC, t.created_at ASC`,
      ).bind(...albumIds).all<AudioTrackRow>()
      for (const track of tracks.results) {
        const existing = tracksByAlbum.get(track.album_id)
        if (existing) existing.push(track)
        else tracksByAlbum.set(track.album_id, [track])
      }
    }
    const data = rows.results.map(album => rowToAudioAlbum(album, tracksByAlbum.get(album.id) ?? []))

    return json({ data, meta: { total: data.length, schemaVersion: 1 } })
  } catch (error) {
    return json({ success: false, error: 'Failed to list audio albums', details: (error as Error).message }, 500)
  }
}

async function handleCreateAudioAlbum(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as Record<string, unknown>
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return err('Album title is required')
    const visibility = body.visibility === 'private' ? 'private' : 'public'
    const sortMode = body.sortMode === 'created_desc' || body.sortMode === 'title_asc' ? body.sortMode : 'manual'
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row: AudioAlbumRow = {
      id,
      title,
      description: typeof body.description === 'string' ? body.description : null,
      cover_media_id: typeof body.coverMediaId === 'string' ? body.coverMediaId : null,
      visibility,
      radio_enabled: body.radioEnabled === false ? 0 : 1,
      sort_mode: sortMode,
      settings: JSON.stringify(body.settings && typeof body.settings === 'object' ? body.settings : {}),
      created_at: now,
      updated_at: now,
    }

    await env.MEDIA_DB.prepare(
      `INSERT INTO audio_albums (id, title, description, cover_media_id, visibility, radio_enabled, sort_mode, settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(row.id, row.title, row.description, row.cover_media_id, row.visibility, row.radio_enabled, row.sort_mode, row.settings, row.created_at, row.updated_at).run()

    return json({ data: rowToAudioAlbum(row), meta: { schemaVersion: 1 } }, 201)
  } catch (error) {
    return json({ success: false, error: 'Failed to create audio album', details: (error as Error).message }, 500)
  }
}

async function handleAddAudioTrack(request: Request, env: Env, albumId: string): Promise<Response> {
  try {
    const album = await env.MEDIA_DB.prepare('SELECT id, title, description, cover_media_id, visibility, radio_enabled, sort_mode, settings, created_at, updated_at FROM audio_albums WHERE id = ? LIMIT 1')
      .bind(albumId).first<AudioAlbumRow>()
    if (!album) return err('Audio album not found', 404)

    const body = await request.json() as Record<string, unknown>
    const mediaId = typeof body.mediaId === 'string' ? body.mediaId.trim() : ''
    if (!mediaId) return err('Track mediaId is required')
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Untitled track'
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const position = typeof body.position === 'number' ? body.position : Date.now()
    const durationSeconds = typeof body.durationSeconds === 'number' ? body.durationSeconds : null
    const artist = typeof body.artist === 'string' ? body.artist : null

    await env.MEDIA_DB.prepare(
      `INSERT INTO audio_tracks (id, album_id, media_id, title, artist, duration_seconds, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, albumId, mediaId, title, artist, durationSeconds, position, now, now).run()

    return json({
      data: {
        id,
        albumId,
        mediaId,
        title,
        artist: artist ?? undefined,
        durationSeconds: durationSeconds ?? undefined,
        position,
        createdAt: now,
        updatedAt: now,
      },
      meta: { schemaVersion: 1 },
    }, 201)
  } catch (error) {
    return json({ success: false, error: 'Failed to add audio track', details: (error as Error).message }, 500)
  }
}

// ── Router ─────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    // Expected pattern: /v1/<resource>[/<id>]
    const version = segments[0]   // "v1"
    const resource = segments[1]  // "media" | "assets"
    const id = segments[2]        // optional UUID

    if (version !== 'v1') return err('Not found', 404)

    // ── Audio library routes (admin writes, public radio reads) ──
    if (resource === 'audio' && id === 'albums') {
      const albumId = segments[3]
      const child = segments[4]
      if (request.method === 'GET' && !albumId) return handleListAudioAlbums(request, env)
      if (request.method === 'POST' && !albumId) {
        const authed = await authenticate(request, env)
        if (authed.ok === false) return withCors(authed.response)
        return withCors(await handleCreateAudioAlbum(request, env))
      }
      if (request.method === 'POST' && albumId && child === 'tracks') {
        const authed = await authenticate(request, env)
        if (authed.ok === false) return withCors(authed.response)
        return withCors(await handleAddAudioTrack(request, env, albumId))
      }
    }

    // ── Media routes (write operations require auth, reads are public) ──
    if (resource === 'media') {
      if (request.method === 'POST' && id === 'upload') {
        const authed = await authenticate(request, env)
        if (authed.ok === false) return withCors(authed.response)
        return withCors(await handleMediaUpload(request, env, { auth: authed }))
      }
      if (request.method === 'POST' && id === 'analyze') {
        const authed = await authenticate(request, env)
        if (authed.ok === false) return withCors(authed.response)
        return withCors(await handleMediaAnalyze(request, env, { auth: authed }))
      }
      if (request.method === 'GET' && !id) return handleListMedia(request, env)
      if (request.method === 'GET' && id && segments[3] === 'download') {
        return handleMediaDownload(request, env, id)
      }
      if (request.method === 'GET' && id) return handleGetMedia(request, env, id)
    }

    // ── Asset routes (upload requires auth, reads are public) ──
    if (resource === 'assets') {
      if (request.method === 'POST' && id === 'upload') {
        const authed = await authenticate(request, env)
        if (authed.ok === false) return withCors(authed.response)
        return withCors(await handleAssetUpload(request, env, { auth: authed }))
      }
      if (request.method === 'GET' && !id) return handleListAssets(request, env)
      if (request.method === 'GET' && id) return handleGetAsset(request, env, id)
    }

    return err('Not found', 404)
  },
}
