import { h, type CSSProperties } from 'vue'
import { Icon } from '@sil/ui'
import { tikoNormalizeOpenIcon, type TikoAppConfig } from './app-config'
import { tikoMediaThumbnailUrl } from './media-images'

function isImageSource(value: string) {
  return /^(https?:|data:|blob:)/.test(value) || /\.(avif|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(value)
}

function normalizedHexColor(value?: string): string {
  const raw = value?.trim()
  if (!raw) return ''
  const match = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return ''
  const hex = match[1]
  if (hex.length === 3) {
    return `#${hex.split('').map((part) => `${part}${part}`).join('')}`.toLowerCase()
  }
  return `#${hex.toLowerCase()}`
}

function readableTextColor(background: string): string {
  const hex = normalizedHexColor(background).slice(1)
  if (!hex) return '#ffffff'
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return luminance > 0.58 ? '#17131c' : '#ffffff'
}

export function appThemeStyle(themeColor?: string): CSSProperties | undefined {
  const primary = normalizedHexColor(themeColor)
  if (!primary) return undefined
  return {
    '--tiko-app-primary': primary,
    '--tiko-app-primary-text': readableTextColor(primary),
    '--tiko-app-primary-deep': `color-mix(in srgb, ${primary}, var(--color-foreground) 42%)`,
  } as CSSProperties
}

export async function fetchTikoMediaIcon(category: string): Promise<string> {
  const endpoint = `https://media.tikoapi.org/v1/media?type=image&category=${encodeURIComponent(category)}&limit=20`
  const response = await fetch(endpoint)
  if (!response.ok) return ''
  const payload = await response.json() as { data?: Array<{ original_url?: string; url?: string }> }
  const item = payload.data?.find((entry) => entry.original_url || entry.url)
  const url = item?.original_url ?? item?.url ?? ''
  return url ? tikoMediaThumbnailUrl(url, 96) : ''
}

export function imageSpan(src: string, alt = '') {
  return h('img', { class: 'tiko-icon tiko-icon--image', src, alt, loading: 'lazy', decoding: 'async', 'aria-hidden': alt ? undefined : 'true' })
}

export function iconSpan(icon: string, alt = '') {
  if (isImageSource(icon)) return imageSpan(icon, alt)
  const openIcon = tikoNormalizeOpenIcon(icon)
  return h(Icon, { class: 'tiko-icon', name: openIcon, size: 'medium', 'aria-hidden': 'true', 'data-icon': openIcon })
}

/**
 * Inject favicon, apple-touch-icon, and theme-color meta tags from app config.
 * Call once in each web app's main.ts before mounting.
 */
export function injectAppMeta(config: TikoAppConfig): void {
  const iconUrl = config.appIconImageUrl
  const color = config.themeColor

  if (iconUrl) {
    const faviconUrl = tikoMediaThumbnailUrl(iconUrl, 32)
    const touchIconUrl = tikoMediaThumbnailUrl(iconUrl, 180)

    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }
    favicon.type = 'image/png'
    favicon.href = faviconUrl

    let touchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
    if (!touchIcon) {
      touchIcon = document.createElement('link')
      touchIcon.rel = 'apple-touch-icon'
      document.head.appendChild(touchIcon)
    }
    touchIcon.href = touchIconUrl
  }

  if (color) {
    let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!themeColor) {
      themeColor = document.createElement('meta')
      themeColor.name = 'theme-color'
      document.head.appendChild(themeColor)
    }
    themeColor.content = color
  }
}
