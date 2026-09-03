// ────────────────────────────────────────────────────────────────
// External audio sources for Tiko Radio.
//
// Radio plays songs a family already owns or streams elsewhere. Two
// lookups happen server-side so no key or third-party CORS policy ever
// reaches a child's browser:
//
//   GET /v1/youtube/search   — safe-search video search (and channel listing)
//   GET /v1/music/resolve    — turn a Spotify / Apple Music share link into a song
// ────────────────────────────────────────────────────────────────

export interface ExternalAudioEnv {
  YOUTUBE_API_KEY?: string
}

export interface YouTubeSearchItem {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  durationSeconds?: number
  publishedAt?: string
}

export type MusicProvider = 'spotify' | 'apple-music'

export interface ResolvedMusicLink {
  provider: MusicProvider
  externalId: string
  externalUrl: string
  title: string
  artist?: string
  thumbnailUrl?: string
  durationSeconds?: number
}

interface ApiError {
  code: string
  message: string
  status: number
}

export const YOUTUBE_SEARCH_MAX_RESULTS = 25
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

function apiError(code: string, message: string, status: number): ApiError {
  return { code, message, status }
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'code' in value && 'status' in value
}

// ── YouTube ────────────────────────────────────────────────────

/**
 * Parse an ISO 8601 duration (`PT4M13S`) into seconds.
 * Returns undefined for durations YouTube reports as unknown (live streams).
 */
export function parseIso8601Duration(value: string | undefined): number | undefined {
  if (!value) return undefined
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value)
  if (!match) return undefined
  const [, days, hours, minutes, seconds] = match
  const total = Number(days ?? 0) * 86400 + Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0)
  return total > 0 ? total : undefined
}

function bestThumbnail(thumbnails: Record<string, { url?: string } | undefined> | undefined, videoId: string): string {
  const preferred = thumbnails?.medium?.url ?? thumbnails?.high?.url ?? thumbnails?.default?.url
  return preferred ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

export interface YouTubeSearchParams {
  query?: string
  channelId?: string
  limit?: number
}

/**
 * Search YouTube for embeddable videos, or list a channel's newest videos when
 * only `channelId` is given. Strict safe search — Radio is a child-facing app.
 */
export async function searchYouTube(
  env: ExternalAudioEnv,
  params: YouTubeSearchParams,
  fetcher: typeof fetch = fetch,
): Promise<YouTubeSearchItem[] | ApiError> {
  const apiKey = env.YOUTUBE_API_KEY
  if (!apiKey) {
    return apiError(
      'youtube_not_configured',
      'YouTube search is not configured on this environment.',
      503,
    )
  }

  const query = params.query?.trim() ?? ''
  const channelId = params.channelId?.trim() ?? ''
  if (!query && !channelId) {
    return apiError('invalid_request', 'Provide a search query or a channelId.', 400)
  }

  const limit = Math.min(Math.max(params.limit ?? 12, 1), YOUTUBE_SEARCH_MAX_RESULTS)
  const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`)
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('videoEmbeddable', 'true')
  searchUrl.searchParams.set('safeSearch', 'strict')
  searchUrl.searchParams.set('maxResults', String(limit))
  searchUrl.searchParams.set('order', query ? 'relevance' : 'date')
  searchUrl.searchParams.set('key', apiKey)
  if (query) searchUrl.searchParams.set('q', query)
  if (channelId) searchUrl.searchParams.set('channelId', channelId)

  const searchResponse = await fetcher(searchUrl.toString())
  if (!searchResponse.ok) {
    return apiError('youtube_unavailable', `YouTube search failed (${searchResponse.status}).`, 502)
  }

  const searchBody = await searchResponse.json() as {
    items?: Array<{
      id?: { videoId?: string }
      snippet?: {
        title?: string
        channelTitle?: string
        publishedAt?: string
        thumbnails?: Record<string, { url?: string } | undefined>
      }
    }>
  }

  const items: YouTubeSearchItem[] = (searchBody.items ?? [])
    .filter(item => typeof item.id?.videoId === 'string')
    .map(item => {
      const videoId = item.id!.videoId as string
      return {
        videoId,
        title: item.snippet?.title ?? `Video ${videoId}`,
        channelTitle: item.snippet?.channelTitle ?? '',
        thumbnailUrl: bestThumbnail(item.snippet?.thumbnails, videoId),
        publishedAt: item.snippet?.publishedAt,
      }
    })

  if (items.length === 0) return items

  // Durations live on the videos resource, not on search results.
  const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`)
  detailsUrl.searchParams.set('part', 'contentDetails')
  detailsUrl.searchParams.set('id', items.map(item => item.videoId).join(','))
  detailsUrl.searchParams.set('key', apiKey)

  const detailsResponse = await fetcher(detailsUrl.toString())
  if (!detailsResponse.ok) return items

  const detailsBody = await detailsResponse.json() as {
    items?: Array<{ id?: string; contentDetails?: { duration?: string } }>
  }
  const durations = new Map<string, number | undefined>()
  for (const detail of detailsBody.items ?? []) {
    if (typeof detail.id === 'string') {
      durations.set(detail.id, parseIso8601Duration(detail.contentDetails?.duration))
    }
  }

  return items.map(item => {
    const durationSeconds = durations.get(item.videoId)
    return durationSeconds === undefined ? item : { ...item, durationSeconds }
  })
}

// ── Streaming service share links ──────────────────────────────

/** Spotify track ids are 22 base62 characters. */
export function parseSpotifyTrackId(input: string): string | null {
  const uri = /^spotify:track:([A-Za-z0-9]{22})$/.exec(input.trim())
  if (uri) return uri[1]
  try {
    const url = new URL(input.trim())
    if (!url.hostname.endsWith('spotify.com')) return null
    const segments = url.pathname.split('/').filter(Boolean)
    const trackIndex = segments.indexOf('track')
    const id = trackIndex === -1 ? null : segments[trackIndex + 1]
    return id && /^[A-Za-z0-9]{22}$/.test(id) ? id : null
  } catch {
    return null
  }
}

/**
 * Apple Music links carry the song id either as `?i=` on an album URL or as the
 * last path segment of a `/song/` URL.
 */
export function parseAppleMusicSongId(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (!url.hostname.endsWith('music.apple.com')) return null
    const fromQuery = url.searchParams.get('i')
    if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery
    const segments = url.pathname.split('/').filter(Boolean)
    const songIndex = segments.indexOf('song')
    const id = songIndex === -1 ? null : segments[songIndex + 1]
    return id && /^\d+$/.test(id) ? id : null
  } catch {
    return null
  }
}

async function resolveSpotifyTrack(trackId: string, fetcher: typeof fetch): Promise<ResolvedMusicLink | ApiError> {
  const externalUrl = `https://open.spotify.com/track/${trackId}`
  const response = await fetcher(`https://open.spotify.com/oembed?url=${encodeURIComponent(externalUrl)}`)
  if (!response.ok) {
    return apiError('music_lookup_failed', `Spotify did not recognise that track (${response.status}).`, 502)
  }
  const body = await response.json() as { title?: string; thumbnail_url?: string }
  return {
    provider: 'spotify',
    externalId: trackId,
    externalUrl,
    title: body.title?.trim() || `Spotify track ${trackId}`,
    thumbnailUrl: body.thumbnail_url,
  }
}

async function resolveAppleMusicSong(songId: string, fetcher: typeof fetch): Promise<ResolvedMusicLink | ApiError> {
  const response = await fetcher(`https://itunes.apple.com/lookup?id=${songId}&entity=song`)
  if (!response.ok) {
    return apiError('music_lookup_failed', `Apple Music did not recognise that song (${response.status}).`, 502)
  }
  const body = await response.json() as {
    results?: Array<{
      trackName?: string
      artistName?: string
      artworkUrl100?: string
      trackTimeMillis?: number
      trackViewUrl?: string
    }>
  }
  const song = body.results?.[0]
  if (!song?.trackName) {
    return apiError('music_not_found', 'That Apple Music link does not point at a song.', 404)
  }
  return {
    provider: 'apple-music',
    externalId: songId,
    externalUrl: song.trackViewUrl ?? `https://music.apple.com/song/${songId}`,
    title: song.trackName,
    artist: song.artistName,
    // artworkUrl100 is a template; 300px reads well on a collection card.
    thumbnailUrl: song.artworkUrl100?.replace('100x100bb', '300x300bb'),
    durationSeconds: typeof song.trackTimeMillis === 'number' ? Math.round(song.trackTimeMillis / 1000) : undefined,
  }
}

/**
 * Turn a Spotify or Apple Music share link into a Radio song.
 * Only public metadata endpoints are used — no subscription credentials.
 */
export async function resolveMusicLink(
  input: string,
  fetcher: typeof fetch = fetch,
): Promise<ResolvedMusicLink | ApiError> {
  const link = input.trim()
  if (!link) return apiError('invalid_request', 'Provide a Spotify or Apple Music link.', 400)

  const spotifyId = parseSpotifyTrackId(link)
  if (spotifyId) return resolveSpotifyTrack(spotifyId, fetcher)

  const appleId = parseAppleMusicSongId(link)
  if (appleId) return resolveAppleMusicSong(appleId, fetcher)

  return apiError(
    'unsupported_music_link',
    'Only Spotify track links and Apple Music song links are supported.',
    400,
  )
}
