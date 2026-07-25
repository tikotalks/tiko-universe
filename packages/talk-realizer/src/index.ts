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
import { maltese } from './languages/mt'
import { chinese } from './languages/zh'
import { japanese } from './languages/ja'
import { korean } from './languages/ko'
import { arabic } from './languages/ar'
import { armenian } from './languages/hy'
import { swedish } from './languages/sv'
import { danish } from './languages/da'
import { norwegian } from './languages/nb'
import { indonesian, malay } from './languages/id'
import { vietnamese } from './languages/vi'
import { romanian } from './languages/ro'
import { greek } from './languages/el'
import { catalan } from './languages/ca'
import { galician } from './languages/gl'
import { afrikaans } from './languages/af'
import { russian } from './languages/ru'
import { polish } from './languages/pl'
import { bulgarian } from './languages/bg'
import { albanian } from './languages/sq'
import { english } from './languages/en'
import { dutch } from './languages/nl'
import type { LanguageRules } from './profile'
import { germanLexicon } from './lexicon/de'
import { frenchLexicon } from './lexicon/fr'
import { spanishLexicon } from './lexicon/es'
import { italianLexicon } from './lexicon/it'
import { portugueseLexicon } from './lexicon/pt'
import { malteseLexicon } from './lexicon/mt'
import { chineseLexicon } from './lexicon/zh'
import { japaneseLexicon } from './lexicon/ja'
import { koreanLexicon } from './lexicon/ko'
import { arabicLexicon } from './lexicon/ar'
import { armenianLexicon } from './lexicon/hy'
import { swedishLexicon } from './lexicon/sv'
import { danishLexicon } from './lexicon/da'
import { norwegianLexicon } from './lexicon/nb'
import { indonesianLexicon } from './lexicon/id'
import { vietnameseLexicon } from './lexicon/vi'
import { romanianLexicon } from './lexicon/ro'
import { greekLexicon } from './lexicon/el'
import { catalanLexicon } from './lexicon/ca'
import { galicianLexicon } from './lexicon/gl'
import { afrikaansLexicon } from './lexicon/af'
import { russianLexicon } from './lexicon/ru'
import { polishLexicon } from './lexicon/pl'
import { bulgarianLexicon } from './lexicon/bg'
import { albanianLexicon } from './lexicon/sq'
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
export { sharedStructure } from './lexicon/shared'
export { coverageFor, type LanguageCoverage } from './coverage'
export { englishLexicon } from './lexicon/en'
export { dutchLexicon } from './lexicon/nl'
export { germanLexicon } from './lexicon/de'
export { frenchLexicon } from './lexicon/fr'
export { spanishLexicon } from './lexicon/es'
export { italianLexicon } from './lexicon/it'
export { portugueseLexicon } from './lexicon/pt'
export { malteseLexicon } from './lexicon/mt'
export { chineseLexicon } from './lexicon/zh'
export { japaneseLexicon } from './lexicon/ja'
export { koreanLexicon } from './lexicon/ko'
export { arabicLexicon } from './lexicon/ar'
export { armenianLexicon } from './lexicon/hy'
export { swedishLexicon } from './lexicon/sv'
export { danishLexicon } from './lexicon/da'
export { norwegianLexicon } from './lexicon/nb'
export { indonesianLexicon } from './lexicon/id'
export { vietnameseLexicon } from './lexicon/vi'
export { romanianLexicon } from './lexicon/ro'
export { greekLexicon } from './lexicon/el'

/** Languages this prototype realizes. */
export const supportedLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'mt', 'zh', 'ja', 'ko', 'ar', 'hy', 'sv', 'da', 'nb', 'id', 'vi', 'ro', 'el', 'ms', 'ca', 'gl', 'af', 'ru', 'pl', 'bg', 'sq'] as const
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
  mt: malteseLexicon,
  zh: chineseLexicon,
  ja: japaneseLexicon,
  ko: koreanLexicon,
  ar: arabicLexicon,
  hy: armenianLexicon,
  sv: swedishLexicon,
  da: danishLexicon,
  nb: norwegianLexicon,
  id: indonesianLexicon,
  vi: vietnameseLexicon,
  ro: romanianLexicon,
  el: greekLexicon,
  ca: catalanLexicon,
  gl: galicianLexicon,
  af: afrikaansLexicon,
  ru: russianLexicon,
  pl: polishLexicon,
  bg: bulgarianLexicon,
  sq: albanianLexicon,
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
  mt: maltese,
  zh: chinese,
  ja: japanese,
  ko: korean,
  ar: arabic,
  hy: armenian,
  sv: swedish,
  da: danish,
  nb: norwegian,
  id: indonesian,
  vi: vietnamese,
  ro: romanian,
  el: greek,
  ms: malay,
  ca: catalan,
  gl: galician,
  af: afrikaans,
  ru: russian,
  pl: polish,
  bg: bulgarian,
  sq: albanian,
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
const MATURITY_ORDER = { draft: 0, beta: 1, production: 2 } as const

export function realize(
  words: SelectedWord[],
  options: RealizeOptions | {
    locale: string
    negated?: boolean
    tense?: 'present' | 'past'
    minMaturity?: 'production' | 'beta' | 'draft'
  },
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

  // A language the caller does not trust yet falls back too, for the same reason.
  const required = options.minMaturity ?? 'beta'
  if (MATURITY_ORDER[rules.profile.maturity] < MATURITY_ORDER[required]) {
    const plain = fallback(words)
    return {
      ...plain,
      notes: [`${language} is ${rules.profile.maturity}, below the requested ${required}: tiles joined as-is`],
    }
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
