export type TalkLocale = string
export type TalkWordId = string
export type TalkPhraseId = string
export type TalkTemplateId = string
export type TalkCategoryId = string
export type TalkPartOfSpeech = string
export type TalkIsoDateString = string
export type TalkIconName = string

export interface WordTile {
  id: TalkWordId
  text: string
  pos: TalkPartOfSpeech
  category: TalkCategoryId
  icon?: TalkIconName
  image?: string
  /** True when this tile is a user-added word rather than a curated pack word. */
  isCustom?: boolean
}

export interface Category {
  id: TalkCategoryId
  label: string
  icon?: TalkIconName
  posTypes: TalkPartOfSpeech[]
  wordCount: number
}

export interface Template {
  id: TalkTemplateId
  pattern: string
  category: TalkCategoryId
  icon?: TalkIconName
  slotCount: number
}

export interface SavedPhrase {
  id: TalkPhraseId
  sentence: string
  wordIds: TalkWordId[]
  isAuto: boolean
  usageCount: number
  label?: string
}

export interface StripState {
  display: string
  validNext: TalkPartOfSpeech[]
  canComplete: boolean
}

export interface InitialStripState {
  words: []
  validNext: TalkPartOfSpeech[]
  canComplete: false
}

export interface LanguagePack {
  locale: TalkLocale
  version: number
  words: PackWord[]
  templates: PackTemplate[]
  grammar: GrammarRules
}

export interface PackWord {
  id: TalkWordId
  text: string
  pos: TalkPartOfSpeech
  category: TalkCategoryId
  frequency: number
  icon?: TalkIconName
  inflections?: Record<string, string>
}

export interface PackTemplate {
  id: TalkTemplateId
  pattern: string
  category: TalkCategoryId
  icon?: TalkIconName
  slots: SlotDef[]
}

export interface SlotDef {
  acceptedPos: TalkPartOfSpeech[]
  categoryFilter?: TalkCategoryId
}

export interface GrammarRules {
  wordOrder: string
  validTransitions: Record<TalkPartOfSpeech, TalkPartOfSpeech[]>
  articles?: Record<string, ArticleRule>
  negation?: NegationPattern
}

export interface ArticleRule {
  beforeConsonant: string
  beforeVowel: string
}

export interface NegationPattern {
  position: string
  words: string[]
}

export interface TalkUserScopedRequest {
  locale: TalkLocale
  /** Ankore subject id. Optional only for anonymous/global suggestions. */
  userId?: string
}

export interface SentenceStartRequest extends TalkUserScopedRequest {}

export interface SentenceStartResponse {
  templates: Template[]
  initialCategories: Category[]
  initialWords: WordTile[]
  savedPhrases: SavedPhrase[]
  stripState: InitialStripState
}

export interface SentenceNextRequest extends TalkUserScopedRequest {
  /** Ordered word ids currently in the sentence strip. */
  currentWords: TalkWordId[]
}

export interface SentenceNextResponse {
  suggestions: WordTile[]
  categories: Category[]
  words: Record<TalkCategoryId, WordTile[]>
  stripState: StripState
}

export interface SentenceCompleteRequest extends TalkUserScopedRequest {
  /** Ordered word ids from the strip. */
  wordIds: TalkWordId[]
  autoSave?: boolean
}

export interface SentenceCompleteResponse {
  sentence: string
  audioUrl: string
  audioCached: boolean
  savedPhraseId?: TalkPhraseId
  templateMatch?: TalkTemplateId
}

export interface SentenceVocabularyRequest {
  locale: TalkLocale
  category?: TalkCategoryId
  pos?: TalkPartOfSpeech
  /** Free-text board filter; matches word text case-insensitively. */
  q?: string
  /** Ankore subject id. When present, the user's custom words are merged in. */
  userId?: string
}

export interface SentenceVocabularyResponse {
  words: WordTile[]
  categories: Category[]
  totalWords: number
}

/** A word a user added themselves (e.g. a name like "Sil") for their own vocabulary. */
export interface UserWord {
  id: TalkWordId
  text: string
  pos: TalkPartOfSpeech
  category: TalkCategoryId
  icon?: TalkIconName
  usageCount: number
}

export interface ListUserWordsResponse {
  words: UserWord[]
}

export interface AddUserWordRequest extends TalkUserScopedRequest {
  text: string
  /** Part of speech so grammar transitions keep working. Defaults to "noun". */
  pos?: TalkPartOfSpeech
  category?: TalkCategoryId
  icon?: TalkIconName
  /**
   * Ordered word ids already in the strip when the word was added. When present,
   * the new word is immediately learned for that position so it surfaces next time
   * the same prefix is built (e.g. "My name is" -> "Sil").
   */
  afterWordIds?: TalkWordId[]
}

export interface AddUserWordResponse {
  word: UserWord
}

export interface DeleteUserWordResponse {
  deleted: true
}

export interface SentencePhrasesRequest {
  locale: TalkLocale
  /** Ankore subject id. Required for saved phrases. */
  userId: string
}

export interface SentencePhrasesResponse {
  phrases: SavedPhrase[]
}

export interface SaveSentencePhraseRequest extends SentencePhrasesRequest {
  wordIds: TalkWordId[]
  label?: string
}

export interface SaveSentencePhraseResponse {
  phrase: SavedPhrase
}

export interface DeleteSentencePhraseRequest {
  phraseId: TalkPhraseId
  locale: TalkLocale
  /** Ankore subject id. Required to enforce ownership. */
  userId: string
}

export interface DeleteSentencePhraseResponse {
  deleted: true
}

export interface GenerateLanguagePackRequest {
  baseLocale: TalkLocale
  targetLocale: TalkLocale
}

export interface GenerateLanguagePackResponse {
  pack: LanguagePack
  warnings: string[]
}

export type SentenceApiRoute =
  | 'GET /v1/sentence/start'
  | 'POST /v1/sentence/next'
  | 'POST /v1/sentence/complete'
  | 'GET /v1/sentence/vocabulary'
  | 'GET /v1/sentence/phrases'
  | 'POST /v1/sentence/phrases'
  | 'DELETE /v1/sentence/phrases/:phraseId'
  | 'GET /v1/sentence/words'
  | 'POST /v1/sentence/words'
  | 'DELETE /v1/sentence/words/:wordId'
  | 'POST /v1/sentence-admin/generate-pack'

export interface SentenceUsageAggregate {
  id: string
  locale: TalkLocale
  posSequence: TalkPartOfSpeech[]
  /** Hash of normalized word ids + locale + server-side salt/pepper; never readable sentence text. */
  wordSequenceHash: string
  wordCount: number
  usageCount: number
  firstSeen: TalkIsoDateString
  lastSeen: TalkIsoDateString
}

export const sentenceApiRoutes = [
  'GET /v1/sentence/start',
  'POST /v1/sentence/next',
  'POST /v1/sentence/complete',
  'GET /v1/sentence/vocabulary',
  'GET /v1/sentence/phrases',
  'POST /v1/sentence/phrases',
  'DELETE /v1/sentence/phrases/:phraseId',
  'GET /v1/sentence/words',
  'POST /v1/sentence/words',
  'DELETE /v1/sentence/words/:wordId',
  'POST /v1/sentence-admin/generate-pack',
] as const satisfies readonly SentenceApiRoute[]

export function isInitialStripState(state: StripState | InitialStripState): state is InitialStripState {
  return 'words' in state && Array.isArray(state.words) && state.words.length === 0 && state.canComplete === false
}
