import type { Category, SavedPhrase, Template, WordTile } from '@tiko/talk-types'

export const mockCategories: Category[] = [
  { id: 'people', label: 'People', icon: 'users', posTypes: ['pron'], wordCount: 4 },
  { id: 'actions', label: 'Actions', icon: 'play', posTypes: ['verb'], wordCount: 6 },
  { id: 'needs', label: 'Needs', icon: 'heart', posTypes: ['noun', 'adj'], wordCount: 8 },
  { id: 'extras', label: 'Extras', icon: 'plus', posTypes: ['adv', 'connector'], wordCount: 5 },
]

export const mockWords: WordTile[] = [
  { id: 'en-i', text: 'I', pos: 'pron', category: 'people', icon: 'user' },
  { id: 'en-you', text: 'you', pos: 'pron', category: 'people', icon: 'user' },
  { id: 'en-we', text: 'we', pos: 'pron', category: 'people', icon: 'users' },
  { id: 'en-want', text: 'want', pos: 'verb', category: 'actions', icon: 'hand' },
  { id: 'en-need', text: 'need', pos: 'verb', category: 'actions', icon: 'target' },
  { id: 'en-feel', text: 'feel', pos: 'verb', category: 'actions', icon: 'heart' },
  { id: 'en-go', text: 'go', pos: 'verb', category: 'actions', icon: 'arrow-right' },
  { id: 'en-water', text: 'water', pos: 'noun', category: 'needs', icon: 'drop' },
  { id: 'en-juice', text: 'juice', pos: 'noun', category: 'needs', icon: 'cup' },
  { id: 'en-food', text: 'food', pos: 'noun', category: 'needs', icon: 'plate' },
  { id: 'en-help', text: 'help', pos: 'noun', category: 'needs', icon: 'lifebuoy' },
  { id: 'en-more', text: 'more', pos: 'adj', category: 'extras', icon: 'plus' },
  { id: 'en-please', text: 'please', pos: 'adv', category: 'extras', icon: 'spark' },
]

export const mockTemplates: Template[] = [
  { id: 'tpl-want', pattern: 'I want ___', category: 'needs', slotCount: 1, icon: 'target' },
  { id: 'tpl-need-help', pattern: 'I need help', category: 'needs', slotCount: 0, icon: 'lifebuoy' },
  { id: 'tpl-feel', pattern: 'I feel ___', category: 'needs', slotCount: 1, icon: 'heart' },
]

export const mockSavedPhrases: SavedPhrase[] = [
  { id: 'phrase-water', sentence: 'I want water.', wordIds: ['en-i', 'en-want', 'en-water'], isAuto: true, usageCount: 6 },
  { id: 'phrase-help', sentence: 'I need help.', wordIds: ['en-i', 'en-need', 'en-help'], isAuto: true, usageCount: 4 },
]

export function wordsByCategory(words: WordTile[] = mockWords): Record<string, WordTile[]> {
  return words.reduce<Record<string, WordTile[]>>((grouped, word) => {
    grouped[word.category] = [...(grouped[word.category] ?? []), word]
    return grouped
  }, {})
}
