import { annotate } from './chunk'
import type { SelectedWord } from './features'
import { languages, lexicons } from './index'
import { sharedStructure } from './lexicon/shared'

/**
 * How completely a language is covered, measured rather than assumed.
 *
 * "Curated" means a human wrote the facts for that tile; "induced" means they
 * were derived from the tile's own form by rule. Both are real coverage — the
 * distinction is how much a reviewer should trust them. A tile that is neither
 * still works: it falls through to its own text.
 */
export interface LanguageCoverage {
  language: string
  maturity: 'production' | 'beta' | 'draft'
  total: number
  curated: number
  induced: number
  bare: number
  /** Closed-class tiles (pronouns, determiners) are the ones grammar leans on. */
  closedClassCurated: number
  closedClassTotal: number
  notes?: string
}

const CLOSED_CLASSES = new Set(['pronoun', 'determiner', 'question', 'negation'])

export function coverageFor(language: string, words: SelectedWord[]): LanguageCoverage {
  const rules = languages[language]
  const lexicon = lexicons[language] ?? {}
  const annotated = annotate(words, lexicon, rules?.induce, rules?.curated)

  let curated = 0
  let induced = 0
  let bare = 0
  let closedClassCurated = 0
  let closedClassTotal = 0

  for (const [index, word] of words.entries()) {
    const isCurated = !!lexicon[word.id] || !!rules?.curated?.[word.id] || !!sharedStructure[word.id]
    const hasInduced = Object.keys(rules?.induce?.(word) ?? {}).length > 0
    if (isCurated) curated += 1
    else if (hasInduced) induced += 1
    else bare += 1

    const pos = annotated[index].effectivePos
    if (CLOSED_CLASSES.has(pos)) {
      closedClassTotal += 1
      if (isCurated) closedClassCurated += 1
    }
  }

  return {
    language,
    maturity: rules?.profile.maturity ?? 'draft',
    total: words.length,
    curated,
    induced,
    bare,
    closedClassCurated,
    closedClassTotal,
    notes: rules?.profile.notes,
  }
}
