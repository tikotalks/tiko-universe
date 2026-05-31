// ────────────────────────────────────────────────────────────────
// Unified media-api worker
// Combines media-upload, media-cache, and assets-upload into one
// service with versioned /v1/ routes.
// ────────────────────────────────────────────────────────────────

import { authenticate, type AuthResult } from '../../shared/auth'

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
    folder: nullableString(row.folder),
    tags: parseStringArray(row.tags),
    is_private: Boolean(row.is_private),
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
    is_public: Boolean(row.is_public),
    user_id: nullableString(row.user_id),
    created_at: String(row.created_at),
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
async function handleMediaUpload(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const thumbnail = formData.get('thumbnail') as File | null
    const duration = formData.get('duration') as string | null
    const widthParam = formData.get('width') as string | null
    const heightParam = formData.get('height') as string | null

    if (!file) return err('No file provided')

    const { safeName, extension } = generateSafeFilename(file.name)
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
    const baseKey = `uploads/${safeName}`

    await env.MEDIA_BUCKET.put(baseKey, file.stream(), {
      httpMetadata: { contentType: file.type },
    })

    const baseUrl = `https://data.tikocdn.org/${baseKey}`
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    let metadata: ImageMetadata = { title: '', description: '', tags: [], categories: [] }
    let visionError: string | null = null
    let thumbnailUrl: string | undefined

    // Handle video thumbnail upload
    if (isVideo && thumbnail) {
      const thumbnailKey = `uploads/thumbnails/${Date.now()}-${nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '-')}-thumb.jpg`
      await env.MEDIA_BUCKET.put(thumbnailKey, thumbnail.stream(), {
        httpMetadata: { contentType: 'image/jpeg' },
      })
      thumbnailUrl = `https://data.tikocdn.org/${thumbnailKey}`
    }

    // Analyze with OpenAI Vision
    if ((isImage || (isVideo && thumbnailUrl)) && env.OPENAI_API_KEY) {
      const analyzeUrl = isVideo ? thumbnailUrl! : baseUrl
      const result = await analyzeWithOpenAI(analyzeUrl, nameWithoutExt, env.OPENAI_API_KEY)
      metadata = result.metadata
      visionError = result.visionError
    }

    // Fallback title
    if (!metadata.title) {
      metadata.title = nameWithoutExt
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
    }

    return ok({
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
        width: widthParam ? parseInt(widthParam) : undefined,
        height: heightParam ? parseInt(heightParam) : undefined,
      }),
      _meta: {
        timestamp: new Date().toISOString(),
        isImage,
        isVideo,
        visionAttempted: !!env.OPENAI_API_KEY && (isImage || !!thumbnailUrl),
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
async function handleMediaAnalyze(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { imageUrl?: string; title?: string }
    if (!body.imageUrl) return err('Image URL is required')

    let metadata: ImageMetadata = { title: '', description: '', tags: [], categories: [] }
    let visionError: string | null = null

    if (env.OPENAI_API_KEY) {
      const result = await analyzeWithOpenAI(body.imageUrl, body.title, env.OPENAI_API_KEY)
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

// GET /v1/media — list public media with search, type, category, tags, sort
async function handleListMedia(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)
    const offset = (page - 1) * limit
    const search = url.searchParams.get('search')?.trim()
    const type = url.searchParams.get('type')?.trim()       // image | audio | video
    const category = url.searchParams.get('category')?.trim()
    const tags = url.searchParams.get('tags')?.split(',').map(t => t.trim()).filter(Boolean)
    const sort = url.searchParams.get('sort') || 'created_at'
    const order = url.searchParams.get('order')?.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

    const allowedSorts = ['created_at', 'file_size', 'title']
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at'

    const clauses: string[] = ['is_private = 0']
    const values: unknown[] = []

    if (search) {
      clauses.push('(title LIKE ? OR description LIKE ? OR alt_text LIKE ?)')
      values.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (type) {
      clauses.push('mime_type LIKE ?')
      values.push(`${type}/%`)
    }
    if (category) {
      clauses.push('folder = ?')
      values.push(category)
    }
    if (tags?.length) {
      for (const tag of tags) {
        clauses.push('tags LIKE ?')
        values.push(`%"${tag}"%`)
      }
    }

    const where = `WHERE ${clauses.join(' AND ')}`

    const rows = await env.MEDIA_DB.prepare(
      `SELECT id, file_name, file_size, mime_type, width, height, alt_text, title,
              description, folder, tags, is_private, original_url, created_at, updated_at
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
    const row = await env.MEDIA_DB.prepare(
      `SELECT id, file_name, file_size, mime_type, width, height, alt_text, title,
              description, folder, tags, is_private, original_url, created_at, updated_at
       FROM media WHERE id = ? LIMIT 1`,
    )
      .bind(id)
      .first<Record<string, unknown>>()

    if (!row) return err('Media not found', 404)
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
    const row = await env.MEDIA_DB.prepare(
      'SELECT file_name, mime_type, original_url FROM media WHERE id = ? LIMIT 1',
    )
      .bind(id)
      .first<{ file_name: string; mime_type: string; original_url: string }>()

    if (!row) return err('Media not found', 404)

    // Try R2 first, fallback to original URL
    const r2Key = row.original_url.replace(/^https?:\/\/[^/]+\//, '')
    const r2Object = await env.MEDIA_BUCKET.get(r2Key)

    if (r2Object) {
      return new Response(r2Object.body, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': row.mime_type,
          'Content-Disposition': `attachment; filename="${row.file_name}"`,
        },
      })
    }

    // Fallback: redirect to CDN URL
    return Response.redirect(row.original_url, 302)
  } catch (error) {
    return json(
      { success: false, error: 'Download failed', details: (error as Error).message },
      500,
    )
  }
}

// POST /v1/assets/upload — upload asset to R2, track in D1
async function handleAssetUpload(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string) || ''
    const description = (formData.get('description') as string) || ''
    const categories = formData.get('categories') ? JSON.parse(formData.get('categories') as string) : []
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : []
    const isPublic = formData.get('isPublic') === 'true'
    const userId = formData.get('userId') as string | null

    if (!file) return err('No file provided')

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

    if (isPublic) { clauses.push('is_public = 1') }
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
    const row = await env.ASSETS_DB.prepare('SELECT * FROM assets WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>()

    if (!row) return err('Asset not found', 404)
    return ok({ asset: rowToAsset(row) })
  } catch (error) {
    return json(
      { success: false, error: 'Failed to get asset', details: (error as Error).message },
      500,
    )
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

    // ── Media routes (write operations require auth, reads are public) ──
    if (resource === 'media') {
      if (request.method === 'POST' && id === 'upload') {
        const authed = await authenticate(request, env)
        if (!authed.ok) return withCors(authed.response)
        return withCors(await handleMediaUpload(request, env))
      }
      if (request.method === 'POST' && id === 'analyze') {
        const authed = await authenticate(request, env)
        if (!authed.ok) return withCors(authed.response)
        return withCors(await handleMediaAnalyze(request, env))
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
        if (!authed.ok) return withCors(authed.response)
        return withCors(await handleAssetUpload(request, env))
      }
      if (request.method === 'GET' && !id) return handleListAssets(request, env)
      if (request.method === 'GET' && id) return handleGetAsset(request, env, id)
    }

    return err('Not found', 404)
  },
}
