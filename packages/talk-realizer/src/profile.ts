import type { Chunks, NounPhrase, Phrase, Word } from './chunk'
import type { Features, RealizedToken, SelectedWord } from './features'

/**
 * A language's declarative shape. Everything that can be stated as a parameter
 * lives here; everything that needs judgement lives in `LanguageRules` hooks.
 * Adding a language is a profile plus a handful of small hooks — never a copy of
 * the sentence-building flow, which is shared by all of them.
 */
export interface LanguageProfile {
  language: string

  /**
   * How much we trust this language's rules.
   *
   * - `production`: golden-tested across the constructions Talk's templates
   *   produce, reviewed against the pack's own vocabulary.
   * - `beta`: the core is right and tested, but the language has morphology we
   *   do not fully model (cases, politeness levels, agreement chains).
   * - `draft`: structurally wired and worth reading, not worth shipping to a
   *   child before a native speaker reviews it.
   *
   * `realize()` will fall back to plain concatenation for anything below the
   * caller's `minMaturity`, so shipping this package never means shipping every
   * language at once.
   */
  maturity: 'production' | 'beta' | 'draft'

  /** Where the finite verb sits. */
  wordOrder: 'svo' | 'sov'

  /**
   * How the language forms a question once a question tile is present.
   *
   * - `auxiliary` — English: "What **do** you want?"
   * - `inversion` — Germanic verb-second: "Wat **wil jij**?"
   * - `particle` — a sentence-final marker: Japanese か, Chinese 吗
   * - `intonation` — nothing moves; the punctuation carries it (Romance,
   *   Maltese, Korean, Armenian, Arabic)
   */
  questionStrategy: 'auxiliary' | 'inversion' | 'particle' | 'intonation'

  /** The sentence-final question particle, for `questionStrategy: 'particle'`. */
  questionParticle?: string

  /**
   * Where the question word goes. Spoken French puts it at the end — "Tu veux
   * quoi ?" — which is what a child hears, and it avoids inventing the
   * "qu'est-ce que" scaffolding.
   */
  questionWordPosition?: 'initial' | 'final'

  /** CJK scripts do not separate words with spaces. */
  spacing: 'space' | 'none'

  /**
   * Japanese and Korean are postpositional: the marker follows its noun phrase
   * ("こうえんへ", "공원에"), where European prepositions precede it.
   */
  prepositionPosition?: 'before' | 'after'

  /**
   * Whether a grammatical particle attaches to the previous word without a
   * space. Korean writes "사과를", not "사과 를".
   */
  glueParticles?: boolean

  /** Separator before a trailing social. Full-width for CJK. */
  listSeparator?: string

  /** Scripts without letter case skip sentence capitalisation. */
  capitalize: boolean

  punctuation: {
    statement: string
    question: string
    /** Spanish opens a question with an inverted mark. */
    questionPrefix?: string
  }

  /**
   * Every word the language is allowed to insert. The realizer may add function
   * words; it may never add content. Tests enforce this.
   */
  functionWords: readonly string[]

  /** What a reviewer should know about the limits of these rules. */
  notes?: string
}

export type Role = 'subject' | 'object' | 'predicate' | 'oblique'

/** Shared, mutable output buffer. */
export interface Builder {
  tokens: RealizedToken[]
  inserted: string[]
  notes: string[]
}

export function push(builder: Builder, text: string, from: string | null, merged?: string[]): void {
  const trimmed = text?.trim()
  if (!trimmed) return
  builder.tokens.push(merged?.length ? { text: trimmed, from, merged } : { text: trimmed, from })
  if (from === null) builder.inserted.push(trimmed)
}

export function note(builder: Builder, message: string): void {
  builder.notes.push(message)
}

/**
 * Picks a verb form for a person and number, falling back from the specific
 * plural key to the generic one so languages that do not distinguish them can
 * write a single `pl` entry.
 */
export function formFor(
  forms: Partial<Record<string, string>> | undefined,
  person: 1 | 2 | 3,
  number: 'sg' | 'pl',
): string | undefined {
  if (!forms) return undefined
  const specific = `${person}${number}`
  return forms[specific] ?? (number === 'pl' ? forms.pl : undefined)
}

export interface SentenceContext {
  /** The verb tile, when the child chose one. */
  verb?: Word
  /** Per-language scratch space, for rules that need to pass state along. */
  scratch: Record<string, unknown>
  person: 1 | 2 | 3
  number: 'sg' | 'pl'
  tense: 'present' | 'past'
  negated: boolean
  isQuestion: boolean
  /** True when the language must supply a copula (no verb tile was chosen). */
  needsCopula: boolean
  builder: Builder
}

export interface PhraseContext extends SentenceContext {
  role: Role
  /** True when this phrase sits inside a prepositional phrase. */
  afterPreposition: boolean
  /** True when negation should be realized on this phrase (geen / kein). */
  negateHere: boolean
}

/**
 * How a language negates. The engine places it; the language names it.
 *
 * `phraseNegation` says what happens when the sentence has an indefinite object:
 * - `'replace'` — the negation moves into that phrase *instead of* the
 *   verb-adjacent particle (Dutch "geen appel", German "kein Apfel").
 * - `'also'` — the phrase changes too, and the particle stays (French
 *   "ne veux pas **de** pomme").
 * The phrase itself is shaped by the language's `determiner` hook, which
 * receives `negateHere`.
 */
export interface NegationCommon {
  phraseNegation?: 'replace' | 'also'
}

export type NegationPlan = NegationCommon & (
  /** English: do/does/did + not, with the verb going bare. */
  | { kind: 'auxiliary', auxiliary: string, word: string }
  /** Dutch, German: a particle after the verb, or after a definite object. */
  | { kind: 'afterVerb', word: string, afterDefiniteObject?: boolean }
  /** Spanish, Italian, Portuguese, Chinese, Korean: a particle before the verb. */
  | { kind: 'beforeVerb', word: string }
  /** French, Maltese: a particle on each side of the verb. */
  | { kind: 'circumfix', before: string, after: string }
  /** Japanese: the verb form itself carries the negation. */
  | { kind: 'verbForm' }
  /** Nothing verb-adjacent: the negation lives entirely in a noun phrase. */
  | { kind: 'none' }
)

export interface LanguageRules {
  profile: LanguageProfile

  /** The finite verb form for this subject, tense and mood. */
  verbForm(verb: Word, ctx: SentenceContext): string

  /**
   * The copula to insert when the child gave a subject and a predicate but no
   * verb. `null` means the language leaves it out (Chinese with an adjective,
   * Arabic in the present).
   */
  copula(ctx: SentenceContext): string | null

  /**
   * The determiner for a noun phrase, or `null` for none. `merged` lets a
   * language fold neighbouring tiles into this token — Maltese writes the
   * article and the noun as one word, "il-ħobż".
   */
  determiner(np: NounPhrase, ctx: PhraseContext): { text: string, from: string | null, merged?: string[] } | null

  /** An adjective's form inside this noun phrase. */
  adjective(adjective: Word, np: NounPhrase, ctx: PhraseContext): string

  /**
   * The head noun's form: plural, definite suffix, case. Returning an object
   * lets a language report tiles folded into the noun — Armenian writes the
   * definite article as a suffix, "խնձորը".
   */
  noun(head: Word, np: NounPhrase, ctx: PhraseContext): string | { text: string, merged?: string[] }

  /** A pronoun's form in this role. */
  pronoun(word: Word, ctx: PhraseContext): string

  negation(ctx: SentenceContext): NegationPlan

  /** Adjectives before or after the noun. */
  adjectivePosition?: 'before' | 'after'

  /**
   * An element that follows the noun phrase. Maltese possessives are postposed:
   * "il-ballun tiegħi" is literally "the-ball of-mine".
   */
  postposed?(np: NounPhrase, ctx: PhraseContext): { text: string, from: string | null, merged?: string[] } | null

  /**
   * Grammatical particle after a phrase (Japanese は/を, Korean 는/를).
   * `realized` is the text just emitted for the phrase — Korean chooses the
   * particle by its final sound, which the tile's own text may not share.
   */
  particle?(phrase: Phrase, ctx: PhraseContext, realized: string): string | null

  /** The particle a verb wants on its object, overriding the default. */
  objectParticle?(ctx: SentenceContext): string | null

  /** Contractions, elisions and clitics, applied to the finished token list. */
  postprocess?(tokens: RealizedToken[], ctx: SentenceContext): RealizedToken[]

  /**
   * Derives features for a pack word from its own form — regular plurals, gender
   * by ending, a conjugation from an infinitive.
   *
   * This is what makes "every word in every pack" reachable without authoring
   * 295 entries per language by hand: the curated overlay carries the facts a
   * rule cannot know (German gender, Dutch het-words, irregular verbs) and
   * induction covers the regular tail. Curated always wins.
   */
  induce?(word: SelectedWord): Features

  /** Hand-authored facts, keyed by pack concept id. Overrides induction. */
  curated?: Record<string, Features>

  /**
   * Rewrites the parse before assembly. Used where a language restructures the
   * clause rather than just inflecting it — Spanish "Me gusta el pan" turns the
   * child's subject into a clitic and the object into the grammatical subject.
   */
  transform?(chunks: Chunks, ctx: SentenceContext): void
}
