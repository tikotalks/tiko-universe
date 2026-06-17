import type { TikoColorName } from '@tiko/data'
import type { TikoColorMode } from '@tiko/ui'

export type SpeakStatus = 'idle' | 'speaking' | 'fallback' | 'error'
export type SentenceSpeechState = 'idle' | 'generating' | 'playing'

export interface AnswerTile {
  id: string
  label: string
  speech: string
  labelTranslations?: Record<string, string>
  speechTranslations?: Record<string, string>
  color?: TikoColorName
  imageRef?: string
  icon?: string
  order?: number
}

export interface AnswerSet {
  id: string
  title: string
  description?: string
  color?: TikoColorName
  imageRef?: string
  order: number
  answers: AnswerTile[]
}

export interface YesNoContentResponse {
  answerSets?: AnswerSet[]
  answers?: AnswerTile[]
  selectedSetId?: string | null
}

export interface YesNoPayload {
  success?: boolean
  data?: AnswerSet | AnswerTile | YesNoContentResponse | { answerSets?: AnswerSet[]; selectedSetId?: string | null }
}

export interface AnswerSetInput {
  title: string
  description?: string
  color: TikoColorName
  imageRef?: string
}

export interface AnswerTileInput {
  label: string
  speech: string
  color?: TikoColorName
  imageRef?: string
  icon?: string
}

export interface PersistedYesNo {
  language?: string
  colorMode?: TikoColorMode
  sentence?: string
  latestAnswer?: string | null
  latestAnswerId?: string | null
  answerHistory?: string[]
  answers?: AnswerTile[]
  answerSets?: AnswerSet[]
  selectedSetId?: string | null
}
