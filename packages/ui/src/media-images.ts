const DEFAULT_CONTENT_BASE_URL = 'https://content.tikoapi.org/v1'

export { tikoImageUrl, tikoMediaImageUrl, resolveTikoImageUrl, type TikoImageSize } from '@tiko/media'

export function tikoContentImageRefUrl(imageRef: string, contentBaseUrl = DEFAULT_CONTENT_BASE_URL): string {
  const normalizedBase = contentBaseUrl.replace(/\/+$/, '')
  return `${normalizedBase}/content/images/${encodeURIComponent(imageRef)}`
}

export function tikoMediaThumbnailUrl(originalUrl: string | undefined, size = 300): string {
  if (!originalUrl) return ''
  try {
    const url = new URL(originalUrl)
    if (url.hostname === 'data.tikocdn.org' && url.pathname.startsWith('/uploads/')) {
      return `https://data.tikocdn.org/cdn-cgi/image/width=${size},height=${size},fit=cover,quality=85,f=auto${url.pathname}`
    }
    return url.toString()
  } catch {
    return ''
  }
}
