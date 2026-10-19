import type { TikoColorMode } from '@tiko/ui'
import type { FitzgeraldCategory, TikoColorName } from '@tiko/data'

export type SpeakStatus = 'idle' | 'speaking' | 'error'
export type CardsItemKind = 'collection' | 'card'

export interface CardCollection {
  id: string
  title: string
  color: TikoColorName
  order: number
  parentID?: string | null
  mediaCategories: string[]
  imageRef?: string
  cards: CommunicationCard[]
}

export interface CommunicationCard {
  fitzgeraldCategory?: FitzgeraldCategory
  id: string
  title: string
  speech: string
  imageRef?: string
  color: TikoColorName
  order?: number
}

export interface CardsPayload {
  success?: boolean
  data?: { collections?: CardCollection[] } | CardCollection | CommunicationCard | { id?: string; url?: string }
}

export interface PersistedCards {
  fitzgeraldKey?: boolean
  language?: string
  colorMode?: TikoColorMode
  hideDefaultCollections?: boolean
  showAnimations?: boolean
  cardSizeIndex?: number
  labelSizeIndex?: number
  collections?: CardCollection[]
  collectionStack?: string[]
}

export type CardsGridItem =
  | { id: string; kind: 'collection'; collection: CardCollection }
  | { id: string; kind: 'card'; card: CommunicationCard; collectionID: string }

export interface CardsCollectionInput {
  title: string
  color: TikoColorName
  parentID?: string | null
  imageRef?: string
}

export interface CardsCardInput {
  fitzgeraldCategory?: FitzgeraldCategory
  title: string
  speech: string
  color: TikoColorName
  imageRef?: string
}

export interface CardsSettingsState {
  hideDefaultCollections: boolean
  showAnimations: boolean
  cardSizeIndex: number
  labelSizeIndex: number
}
