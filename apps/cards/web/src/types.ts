import type { TikoColorMode } from '@tiko/ui'

export type SpeakStatus = 'idle' | 'speaking' | 'error'
export type CardsItemKind = 'collection' | 'card'

export interface CardCollection {
  id: string
  title: string
  colorHex: number
  order: number
  parentID?: string | null
  mediaCategories: string[]
  imageRef?: string
  imageURL?: string
  cards: CommunicationCard[]
}

export interface CommunicationCard {
  id: string
  title: string
  speech: string
  imageURL?: string
  imageRef?: string
  colorHex: number
  order?: number
}

export interface CardsPayload {
  success?: boolean
  data?: { collections?: CardCollection[] } | CardCollection | CommunicationCard | { id?: string; url?: string }
}

export interface PersistedCards {
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
  colorHex: number
  parentID?: string | null
  imageRef?: string
}

export interface CardsCardInput {
  title: string
  speech: string
  colorHex: number
  imageRef?: string
}

export interface CardsSettingsState {
  hideDefaultCollections: boolean
  showAnimations: boolean
  cardSizeIndex: number
  labelSizeIndex: number
}
