/** Six-category modified Fitzgerald Key. Never infer grammar from translated text. */
export const fitzgeraldCategories = ['person', 'action', 'thing', 'describing', 'social', 'miscellaneous'] as const
export type FitzgeraldCategory = typeof fitzgeraldCategories[number]
export function isFitzgeraldCategory(value: unknown): value is FitzgeraldCategory {
  return typeof value === 'string' && (fitzgeraldCategories as readonly string[]).includes(value)
}
export function fitzgeraldCategory(pos: string): FitzgeraldCategory {
  switch (pos) {
    case 'pronoun': case 'person': return 'person'
    case 'verb': return 'action'
    case 'noun': return 'thing'
    case 'adjective': case 'adverb': return 'describing'
    case 'social': case 'interjection': return 'social'
    default: return 'miscellaneous'
  }
}
/** Fixed reference colours, with dark ink. Same values as TikoFitzgerald.swift. */
export const fitzgeraldColors: Record<FitzgeraldCategory, string> = {
  person: '#FFE38B', action: '#BCE5BA', thing: '#FFD0A1',
  describing: '#B8DDF6', social: '#FFB8D0', miscellaneous: '#F1F1F1',
}
export const fitzgeraldInk = '#202431'
