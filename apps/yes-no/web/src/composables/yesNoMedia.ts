import type { TikoMedia } from '@tiko/media'
import { tikoMediaThumbnailUrl } from '@tiko/ui'

export function resizedCDNURL(originalUrl: string | undefined) {
  return tikoMediaThumbnailUrl(originalUrl, 300)
}
