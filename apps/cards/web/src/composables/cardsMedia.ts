import type { TikoMedia } from '@tiko/media'
import type { CardCollection, CommunicationCard } from '../types'

export function resizedCDNURL(originalUrl: string | undefined, baseUrl = 'https://content.tikoapi.org/v1') {
  if (!originalUrl) return ''
  try {
    const url = new URL(originalUrl, baseUrl)
    if (url.hostname === 'data.tikocdn.org' && url.pathname.startsWith('/uploads/')) {
      return `https://data.tikocdn.org/cdn-cgi/image/width=300,quality=80,f=auto${url.pathname}`
    }
    return url.toString()
  } catch {
    return originalUrl
  }
}

export function imageForCollection(collection: CardCollection, thumbnails: Record<string, string>) {
  return resizedCDNURL(collection.imageRef ? imageRefURL(collection.imageRef) : thumbnails[collection.id])
}

export function imageForCard(card: CommunicationCard, contentBaseUrl: string, cardImages: Record<string, string>) {
  return resizedCDNURL(card.imageRef ? imageRefURL(card.imageRef, contentBaseUrl) : cardImages[card.id], contentBaseUrl)
}

export function imageRefURL(imageRef: string, contentBaseUrl = 'https://content.tikoapi.org/v1') {
  return `${contentBaseUrl}/content/images/${encodeURIComponent(imageRef)}`
}

export function matchCardsMedia(collection: CardCollection, mediaItems: TikoMedia[], contentBaseUrl: string): { cardImages: Record<string, string>; thumbnailURL?: string } {
  const updates = new Map<string, string>()
  const matched = new Set<string>()
  const mediaByName = new Map<string, TikoMedia>()

  for (const item of mediaItems) {
    mediaByName.set(normalizeText(item.name), item)
    mediaByName.set(normalizeText(item.title), item)
  }

  for (const card of collection.cards) {
    if (card.imageRef) {
      updates.set(card.id, imageRefURL(card.imageRef, contentBaseUrl))
      continue
    }
    const item = mediaByName.get(normalizeText(card.title))
    if (item) {
      updates.set(card.id, resizedCDNURL(item.original_url, contentBaseUrl))
      matched.add(item.original_url)
    }
  }

  for (const card of collection.cards) {
    if (updates.has(card.id)) continue
    const words = new Set(textWords(card.title))
    const item = mediaItems.find(candidate => {
      if (matched.has(candidate.original_url)) return false
      const tagMatch = candidate.tags?.some(tag => textWords(tag).some(word => words.has(word)))
      const nameMatch = textWords(candidate.name).some(word => words.has(word))
      return tagMatch || nameMatch
    })
    if (item) {
      updates.set(card.id, resizedCDNURL(item.original_url, contentBaseUrl))
      matched.add(item.original_url)
    }
  }

  return {
    cardImages: Object.fromEntries(updates),
    thumbnailURL: mediaItems[0]?.original_url ? resizedCDNURL(mediaItems[0].original_url, contentBaseUrl) : undefined,
  }
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function textWords(value: string) {
  return normalizeText(value).split('_').filter(Boolean)
}
