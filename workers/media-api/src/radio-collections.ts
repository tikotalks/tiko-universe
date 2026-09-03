// ────────────────────────────────────────────────────────────────
// Shared Radio collections.
//
// A published collection is addressed by a short share code. The code goes on a
// QR poster, in a link, or is read out loud, and any Radio can turn it back into
// a collection full of songs. Curated sets built in Admin are the same rows with
// `featured` set, which is what a parent sees listed on the import screen.
// ────────────────────────────────────────────────────────────────

/** Crockford-style base32 without I, L, O and U — no character a parent can misread. */
const SHARE_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const SHARE_CODE_LENGTH = 8
export const MAX_SHARED_SONGS = 100
export const MAX_SHARED_NAME_LENGTH = 60

/** Sources whose songs mean the same thing on someone else's device. */
const SHAREABLE_SOURCES = new Set(['youtube', 'r2', 'spotify', 'apple-music'])

export interface SharedSong {
  title: string
  artist?: string
  source: string
  youtubeVideoId?: string
  audioUrl?: string
  externalId?: string
  externalUrl?: string
  thumbnailUrl?: string
  duration?: number
}

export interface SharedCollection {
  code: string
  name: string
  color: string
  imageUrl?: string
  songs: SharedSong[]
  songCount: number
  featured: boolean
  createdAt: string
  updatedAt: string
}

export interface SharedCollectionRow {
  code: string
  name: string
  color: string
  image_url: string | null
  songs: string
  song_count: number
  featured: number
  owner_user_id: string | null
  created_at: string
  updated_at: string
}

export interface SharedCollectionInput {
  name: string
  color: string
  imageUrl: string | null
  songs: SharedSong[]
  featured: boolean
  /** Songs dropped because they cannot exist on another device (uploads). */
  skippedSongs: number
}

export interface RadioCollectionsError {
  code: string
  message: string
  status: number
}

function error(code: string, message: string, status: number): RadioCollectionsError {
  return { code, message, status }
}

export function isRadioCollectionsError(value: unknown): value is RadioCollectionsError {
  return typeof value === 'object' && value !== null && 'code' in value && 'status' in value
}

/**
 * Accept a share code however a parent typed it: lower case, spaced, hyphenated,
 * or with the letters that look like digits substituted.
 */
export function normalizeShareCode(input: string): string | null {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  if (cleaned.length !== SHARE_CODE_LENGTH) return null
  for (const character of cleaned) {
    if (!SHARE_CODE_ALPHABET.includes(character)) return null
  }
  return cleaned
}

/** A fresh share code. Callers retry on the (very unlikely) collision. */
export function createShareCode(randomBytes: Uint8Array = crypto.getRandomValues(new Uint8Array(SHARE_CODE_LENGTH))): string {
  let code = ''
  for (let index = 0; index < SHARE_CODE_LENGTH; index += 1) {
    code += SHARE_CODE_ALPHABET[randomBytes[index] % SHARE_CODE_ALPHABET.length]
  }
  return code
}

function optionalString(value: unknown, maxLength = 300): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

/**
 * Keep only what another device can actually play. An uploaded file lives in one
 * browser's memory, so it is dropped rather than shared as a dead tile.
 */
export function normalizeSharedSongs(value: unknown): { songs: SharedSong[]; skipped: number } {
  if (!Array.isArray(value)) return { songs: [], skipped: 0 }

  const songs: SharedSong[] = []
  let skipped = 0

  for (const entry of value.slice(0, MAX_SHARED_SONGS)) {
    const row = typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : {}
    const source = typeof row.source === 'string' ? row.source : ''
    const title = optionalString(row.title, MAX_SHARED_NAME_LENGTH * 2)
    if (!title || !SHAREABLE_SOURCES.has(source)) {
      skipped += 1
      continue
    }

    const song: SharedSong = { title, source }
    const artist = optionalString(row.artist)
    const thumbnailUrl = optionalString(row.thumbnailUrl, 500)
    if (artist) song.artist = artist
    if (thumbnailUrl) song.thumbnailUrl = thumbnailUrl
    if (typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration > 0) {
      song.duration = Math.round(row.duration)
    }

    if (source === 'youtube') {
      const videoId = optionalString(row.youtubeVideoId, 20)
      if (!videoId) { skipped += 1; continue }
      song.youtubeVideoId = videoId
    } else if (source === 'r2') {
      const audioUrl = optionalString(row.audioUrl, 500)
      if (!audioUrl || !audioUrl.startsWith('https://')) { skipped += 1; continue }
      song.audioUrl = audioUrl
    } else {
      const externalUrl = optionalString(row.externalUrl, 500)
      const externalId = optionalString(row.externalId, 100)
      if (!externalUrl || !externalUrl.startsWith('https://')) { skipped += 1; continue }
      song.externalUrl = externalUrl
      if (externalId) song.externalId = externalId
    }

    songs.push(song)
  }

  if (Array.isArray(value) && value.length > MAX_SHARED_SONGS) {
    skipped += value.length - MAX_SHARED_SONGS
  }

  return { songs, skipped }
}

/** Validate a publish request body into the row a share is written from. */
export function normalizeSharedCollectionInput(body: unknown): SharedCollectionInput | RadioCollectionsError {
  const row = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}
  const name = optionalString(row.name, MAX_SHARED_NAME_LENGTH)
  if (!name) return error('invalid_request', 'A collection name is required.', 400)

  const { songs, skipped } = normalizeSharedSongs(row.songs)
  if (songs.length === 0) {
    return error('empty_collection', 'A shared collection needs at least one song that plays on another device.', 400)
  }

  return {
    name,
    color: optionalString(row.color, 20) ?? 'red',
    imageUrl: optionalString(row.imageUrl, 500) ?? null,
    songs,
    featured: row.featured === true,
    skippedSongs: skipped,
  }
}

export function rowToSharedCollection(row: SharedCollectionRow): SharedCollection {
  let songs: SharedSong[] = []
  try {
    const parsed = JSON.parse(row.songs) as unknown
    songs = Array.isArray(parsed) ? parsed as SharedSong[] : []
  } catch {
    songs = []
  }

  const collection: SharedCollection = {
    code: row.code,
    name: row.name,
    color: row.color,
    songs,
    songCount: row.song_count,
    featured: row.featured === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
  if (row.image_url) collection.imageUrl = row.image_url
  return collection
}

/** The link a QR code carries, so a phone camera opens Radio on the collection. */
export function shareUrlFor(code: string, appBaseUrl: string): string {
  return `${appBaseUrl.replace(/\/+$/, '')}/?collection=${code}`
}
