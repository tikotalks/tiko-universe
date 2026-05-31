import type { RadioTrack } from './index.js'

export interface MediaClientOptions {
  baseUrl: string
  fetch?: typeof fetch
}

export interface UploadAudioResponse {
  track: RadioTrack
}

export interface ExtractYouTubeResponse {
  track: RadioTrack
}

export interface GetTrackResponse {
  track: RadioTrack
  audioUrl: string
}

export class TikoMediaClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch

  constructor(options: MediaClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.fetcher = options.fetch ?? fetch
  }

  /** Upload an audio file to R2 */
  async uploadAudio(sessionToken: string, file: File, metadata?: { title?: string; artist?: string }): Promise<UploadAudioResponse> {
    const formData = new FormData()
    formData.append('file', file)
    if (metadata?.title) formData.append('title', metadata.title)
    if (metadata?.artist) formData.append('artist', metadata.artist)

    const response = await this.fetcher(`${this.baseUrl}/media/upload`, {
      method: 'POST',
      headers: { authorization: `Bearer ${sessionToken}` },
      body: formData,
    })

    if (!response.ok) {
      throw new TikoMediaError(response.status, await response.json().catch(() => null))
    }

    return response.json() as Promise<UploadAudioResponse>
  }

  /** Request server-side YouTube audio extraction to R2 */
  async extractYouTube(sessionToken: string, youtubeUrl: string): Promise<ExtractYouTubeResponse> {
    const response = await this.fetcher(`${this.baseUrl}/media/extract`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ youtubeUrl }),
    })

    if (!response.ok) {
      throw new TikoMediaError(response.status, await response.json().catch(() => null))
    }

    return response.json() as Promise<ExtractYouTubeResponse>
  }

  /** Get track metadata + signed audio URL */
  async getTrack(sessionToken: string, trackId: string): Promise<GetTrackResponse> {
    const response = await this.fetcher(`${this.baseUrl}/media/tracks/${encodeURIComponent(trackId)}`, {
      headers: { authorization: `Bearer ${sessionToken}` },
    })

    if (!response.ok) {
      throw new TikoMediaError(response.status, await response.json().catch(() => null))
    }

    return response.json() as Promise<GetTrackResponse>
  }

  /** Delete a track and its R2 audio */
  async deleteTrack(sessionToken: string, trackId: string): Promise<void> {
    const response = await this.fetcher(`${this.baseUrl}/media/tracks/${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${sessionToken}` },
    })

    if (!response.ok) {
      throw new TikoMediaError(response.status, await response.json().catch(() => null))
    }
  }
}

export class TikoMediaError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    const error = typeof body === 'object' && body !== null && 'error' in body
      ? (body as { error?: { message?: string } }).error
      : undefined
    super(error?.message ?? `Media request failed with status ${status}`)
    this.name = 'TikoMediaError'
    this.status = status
    this.body = body
  }
}
