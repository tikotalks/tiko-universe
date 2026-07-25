/**
 * @tiko/talk-realizer — turns a child's tile selection into a grammatical
 * sentence, deterministically and offline.
 *
 * Today `sentence-api` builds its display string with
 * `words.map((w) => w.text).join(' ')`, so "I", "want", "apple" comes out as
 * "I want apple" and the Dutch pack says "ik wil appel". This package is the
 * missing layer: same input, "I want an apple." / "Ik wil een appel."
 *
 * Three properties matter more than coverage:
 *
 * - **Deterministic.** The same tiles always produce the same sentence, so it
 *   is testable with golden lists (the pattern `NumberSpeller` already proved
 *   across six languages) and a child never sees their sentence change shape.
 * - **Offline.** No network, no model weights, no per-keystroke API call.
 * - **It cannot invent words.** Every content word traces back to a tile the
 *   child chose; the only additions are function words from a fixed per-language
 *   set. `Realization.inserted` exposes them, and the invariant is enforced by
 *   tests.
 */
import { annotate } from './chunk'
import type { Lexicon, RealizeOptions, Realization, SelectedWord } from './features'
import { FUNCTION_WORDS as EN_FUNCTION_WORDS, realizeEnglish } from './languages/en'
import { FUNCTION_WORDS as NL_FUNCTION_WORDS, realizeDutch } from './languages/nl'
import { englishLexicon } from './lexicon/en'
import { dutchLexicon } from './lexicon/nl'

export type {
  DeterminerKind,
  Features,
  Gender,
  GrammaticalNumber,
  Lexicon,
  Pos,
  PronounCase,
  RealizeOptions,
  RealizedToken,
  Realization,
  SelectedWord,
  VerbFormKey,
} from './features'
export { annotate, chunk } from './chunk'
export { englishLexicon } from './lexicon/en'
export { dutchLexicon } from './lexicon/nl'

/** Languages this prototype realizes. */
export const supportedLanguages = ['en', 'nl'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

/** The bundled feature overlays, by language. */
export const lexicons: Record<SupportedLanguage, Lexicon> = {
  en: englishLexicon,
  nl: dutchLexicon,
}

/** The closed set of function words each language is allowed to insert. */
export const functionWords: Record<SupportedLanguage, readonly string[]> = {
  en: EN_FUNCTION_WORDS,
  nl: NL_FUNCTION_WORDS,
}

export function languageOf(locale: string): string {
  return locale.replace('_', '-').split('-')[0]?.toLowerCase() ?? 'en'
}

export function isSupported(locale: string): locale is SupportedLanguage {
  return (supportedLanguages as readonly string[]).includes(languageOf(locale))
}

/**
 * Realizes a selection. Pass a `lexicon` to override the bundled overlay (a pack
 * can ship its own); omit it and the language's default is used.
 */
export function realize(
  words: SelectedWord[],
  options: RealizeOptions | { locale: string, negated?: boolean, tense?: 'present' | 'past' },
): Realization {
  const language = languageOf(options.locale)
  const lexicon = 'lexicon' in options && options.lexicon
    ? options.lexicon
    : lexicons[language as SupportedLanguage] ?? {}
  const annotated = annotate(words, lexicon)
  const realizeOptions = { negated: options.negated, tense: options.tense }

  switch (language) {
    case 'nl':
      return ensureNonEmpty(realizeDutch(annotated, realizeOptions), words)
    case 'en':
      return ensureNonEmpty(realizeEnglish(annotated, realizeOptions), words)
    default:
      // No rules for this language yet: fall back to what sentence-api does
      // today rather than guessing. Honest concatenation beats wrong grammar.
      return fallback(words)
  }
}

/**
 * A selection that produces nothing — a lone conjunction, a lone negation tile —
 * still has to say something. Speaking the child's own tiles is the honest
 * answer; silence is not.
 */
function ensureNonEmpty(realization: Realization, words: SelectedWord[]): Realization {
  if (realization.text || words.length === 0) return realization
  const plain = fallback(words)
  return {
    ...plain,
    text: plain.text ? `${plain.text}.` : '',
    notes: [...realization.notes, 'nothing to build a sentence around: tiles spoken as chosen'],
  }
}

function fallback(words: SelectedWord[]): Realization {
  const text = words.map((word) => word.text).join(' ').replace(/\s+/g, ' ').trim()
  return {
    text: text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '',
    tokens: words.map((word) => ({ text: word.text, from: word.id })),
    inserted: [],
    notes: ['no realizer for this language: tiles joined as-is'],
  }
}
