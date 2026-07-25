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
import { realizeWith } from './engine'
import { german } from './languages/de'
import { french } from './languages/fr'
import { spanish } from './languages/es'
import { italian } from './languages/it'
import { portuguese } from './languages/pt'
import { english } from './languages/en'
import { dutch } from './languages/nl'
import type { LanguageRules } from './profile'
import { germanLexicon } from './lexicon/de'
import { frenchLexicon } from './lexicon/fr'
import { spanishLexicon } from './lexicon/es'
import { italianLexicon } from './lexicon/it'
import { portugueseLexicon } from './lexicon/pt'
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
export { germanLexicon } from './lexicon/de'
export { frenchLexicon } from './lexicon/fr'
export { spanishLexicon } from './lexicon/es'
export { italianLexicon } from './lexicon/it'
export { portugueseLexicon } from './lexicon/pt'

/** Languages this prototype realizes. */
export const supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

/** The bundled feature overlays, by language. */
export const lexicons: Record<string, Lexicon> = {
  en: englishLexicon,
  nl: dutchLexicon,
  de: germanLexicon,
  fr: frenchLexicon,
  es: spanishLexicon,
  it: italianLexicon,
  pt: portugueseLexicon,
}

/** Every language's rule set, by language code. */
export const languages: Record<string, LanguageRules> = {
  en: english,
  nl: dutch,
  de: german,
  fr: french,
  es: spanish,
  it: italian,
  pt: portuguese,
}

/** The closed set of function words each language is allowed to insert. */
export const functionWords: Record<string, readonly string[]> = Object.fromEntries(
  Object.entries(languages).map(([code, rules]) => [code, rules.profile.functionWords]),
)

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
    : lexicons[language] ?? {}
  const rulesForLanguage = languages[language]
  const annotated = annotate(words, lexicon, rulesForLanguage?.induce, rulesForLanguage?.curated)
  const realizeOptions = { negated: options.negated, tense: options.tense }

  const rules = rulesForLanguage
  if (!rules) {
    // No rules for this language yet: fall back to what sentence-api does today
    // rather than guessing. Honest concatenation beats wrong grammar.
    return fallback(words)
  }
  return ensureNonEmpty(realizeWith(rules, annotated, realizeOptions), words)
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
