import { ref } from 'vue'
import { resolveTikoMediaApiBaseUrl } from '@tiko/ui'
import type { RadioCategory, RadioTrack, TikoColorName } from '@tiko/data'

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
  shareUrl: string
}

export interface PublishResult {
  collection: SharedCollection
  /** Songs left out because they only exist on this device (uploads). */
  skippedSongs: number
}

/** Sources that mean the same thing on someone else's device. */
const SHAREABLE_SOURCES = new Set(['youtube', 'r2', 'spotify', 'apple-music'])

/**
 * The code a link opened the app with.
 *
 * Only `?collection=` counts here: at boot the app must not read a code out of
 * whatever else the path happens to say.
 */
export function shareCodeFromLocation(href: string): string | null {
  try {
    const value = new URL(href).searchParams.get('collection')
    return value ? normalizeShareCode(value) : null
  } catch {
    return null
  }
}

/**
 * The code carried by a scan. Accepts a share link (from a QR poster or a
 * message) and a code typed or read out loud.
 */
export function shareCodeFromScan(text: string): string | null {
  const value = text.trim()
  if (!value) return null

  try {
    const url = new URL(value)
    const fromQuery = url.searchParams.get('collection')
    if (fromQuery) return normalizeShareCode(fromQuery)
    const lastSegment = url.pathname.split('/').filter(Boolean).pop()
    return lastSegment ? normalizeShareCode(lastSegment) : null
  } catch {
    return normalizeShareCode(value)
  }
}

/** Mirrors the worker: forgiving about case, spacing and look-alike letters. */
export function normalizeShareCode(input: string): string | null {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  return /^[0-9A-HJKMNP-TV-Z]{8}$/.test(cleaned) ? cleaned : null
}

/** What a collection looks like on the wire when it is published. */
export function toSharedSongs(tracks: RadioTrack[]): { songs: SharedSong[]; skipped: number } {
  const songs: SharedSong[] = []
  let skipped = 0

  for (const track of tracks) {
    if (!SHAREABLE_SOURCES.has(track.source)) {
      skipped += 1
      continue
    }
    songs.push({
      title: track.title,
      artist: track.artist,
      source: track.source,
      youtubeVideoId: track.youtubeVideoId,
      audioUrl: track.audioUrl,
      externalId: track.externalId,
      externalUrl: track.externalUrl,
      thumbnailUrl: track.thumbnailUrl,
      duration: track.duration,
    })
  }

  return { songs, skipped }
}

/**
 * Songs from a scanned collection, as library tracks.
 *
 * The id is derived from the shelf they land on rather than the share code, so
 * re-scanning the same code into the same shelf replaces its songs, while a
 * second import onto a new shelf keeps both copies.
 */
export function toRadioTracks(collection: SharedCollection, categoryId: string): RadioTrack[] {
  const addedAt = new Date().toISOString()
  return collection.songs.map(song => ({
    id: `shared:${categoryId}:${song.youtubeVideoId ?? song.externalId ?? song.audioUrl ?? song.title}`,
    title: song.title,
    artist: song.artist,
    source: song.source as RadioTrack['source'],
    youtubeVideoId: song.youtubeVideoId,
    audioUrl: song.audioUrl,
    externalId: song.externalId,
    externalUrl: song.externalUrl,
    thumbnailUrl: song.thumbnailUrl,
    duration: song.duration,
    categoryId,
    addedAt,
  }))
}

const SHARE_CODE_STORAGE_KEY = 'tiko:radio:share-codes'

/** Which code this device published each collection under, so it stays stable. */
function shareCodes(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(SHARE_CODE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) as unknown : {}
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, string> : {}
  } catch {
    return {}
  }
}

function rememberShareCode(collectionId: string, code: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SHARE_CODE_STORAGE_KEY, JSON.stringify({ ...shareCodes(), [collectionId]: code }))
}

function forgetShareCode(collectionId: string): void {
  if (typeof window === 'undefined') return
  const codes = shareCodes()
  delete codes[collectionId]
  window.localStorage.setItem(SHARE_CODE_STORAGE_KEY, JSON.stringify(codes))
}

/**
 * Collections that travel: published once, then handed around by their share
 * code — scanned off a QR, opened from a link, or typed in.
 */
export function useSharedCollections(baseUrl: string = resolveTikoMediaApiBaseUrl()) {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const featured = ref<SharedCollection[]>([])

  const endpoint = `${baseUrl.replace(/\/$/, '')}/radio/collections`

  async function request<T>(url: string, init?: RequestInit): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(url, init)
      const body = await response.json() as { data?: T; error?: { message?: string } }
      if (!response.ok || body.data === undefined) {
        error.value = body.error?.message ?? 'That did not work.'
        return null
      }
      return body.data
    } catch {
      error.value = 'That did not work.'
      return null
    } finally {
      loading.value = false
    }
  }

  /** Curated sets — the Disney shelf a parent can import without a code. */
  async function loadFeatured(): Promise<SharedCollection[]> {
    const data = await request<SharedCollection[]>(endpoint)
    featured.value = data ?? []
    return featured.value
  }

  async function fetchByCode(rawCode: string): Promise<SharedCollection | null> {
    const code = normalizeShareCode(rawCode)
    if (!code) {
      error.value = 'That code is not a Tiko code.'
      return null
    }
    return request<SharedCollection>(`${endpoint}/${code}`)
  }

  /**
   * Publish a collection, or republish the one this device already shared.
   *
   * A collection keeps its code: a parent who put a QR on the fridge should not
   * find it stale because they opened the share screen again.
   */
  async function publish(
    collection: Pick<RadioCategory, 'id' | 'name' | 'color'> & { imageUrl?: string },
    tracks: RadioTrack[],
    sessionToken: string,
  ): Promise<PublishResult | null> {
    const { songs, skipped } = toSharedSongs(tracks)
    if (songs.length === 0) {
      error.value = 'This collection has nothing that plays on another device yet.'
      return null
    }

    const body = JSON.stringify({
      name: collection.name,
      color: collection.color as TikoColorName,
      imageUrl: collection.imageUrl,
      songs,
    })
    const headers = {
      'content-type': 'application/json',
      ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
    }

    loading.value = true
    error.value = null
    try {
      const knownCode = shareCodes()[collection.id]
      if (knownCode) {
        const republished = await send(`${endpoint}/${knownCode}`, 'PUT', headers, body, skipped)
        if (republished) return republished
        // The share is gone (someone removed it): make a new one rather than
        // leaving the parent with a screen full of nothing.
        forgetShareCode(collection.id)
      }

      const published = await send(endpoint, 'POST', headers, body, skipped)
      if (published) rememberShareCode(collection.id, published.collection.code)
      return published
    } finally {
      loading.value = false
    }
  }

  async function send(
    url: string,
    method: 'POST' | 'PUT',
    headers: Record<string, string>,
    body: string,
    skippedLocally: number,
  ): Promise<PublishResult | null> {
    try {
      const response = await fetch(url, { method, headers, body })
      const payload = await response.json() as {
        data?: SharedCollection
        error?: { message?: string }
        meta?: { skippedSongs?: number }
      }
      if (!response.ok || !payload.data) {
        error.value = payload.error?.message ?? 'That did not work.'
        return null
      }
      error.value = null
      return {
        collection: payload.data,
        skippedSongs: (payload.meta?.skippedSongs ?? 0) + skippedLocally,
      }
    } catch {
      error.value = 'That did not work.'
      return null
    }
  }

  return { loading, error, featured, loadFeatured, fetchByCode, publish }
}
