import type { Chunks, NounPhrase, Phrase, Word } from './chunk'
import type { Features, Gender, RealizedToken, SelectedWord } from './features'

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
  /**
   * The order of subject, verb and object. `vso` is the Celtic one: the verb comes
   * first and its non-finite part waits until after the subject — "Dwi'n bwyta
   * afal" is literally "am-I eating apple".
   */
  wordOrder: 'svo' | 'sov' | 'vso'

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

  /**
   * True where the present tense has no copula: Russian "я счастлив", Arabic
   * "التفاحة كبيرة". A copula tile the child chose is absorbed rather than
   * conjugated, because there is no word to conjugate.
   */
  noPresentCopula?: boolean

  /** The sentence-final question particle, for `questionStrategy: 'particle'`. */
  questionParticle?: string

  /**
   * Where the question word goes. Spoken French puts it at the end — "Tu veux
   * quoi ?" — which is what a child hears, and it avoids inventing the
   * "qu'est-ce que" scaffolding.
   */
  /**
   * Where the question word goes. `preverbal` is the verb-final languages' answer:
   * the question word takes the object's slot rather than fronting, which is why
   * Turkish says "Sen ne istiyorsun?" and not "Ne sen istiyorsun?".
   */
  questionWordPosition?: 'initial' | 'final' | 'preverbal'

  /**
   * Which form of a verb the language's pack lists, which decides what a second
   * verb needs. The Romance packs give the infinitive, so it can be used as it
   * stands; the Dutch, German and Slavic packs give a finite form, so a verbal
   * complement needs the curated `inf` and is flagged for review without one; and
   * an `invariant` language — Chinese, Japanese, Afrikaans, Papiamentu — has no
   * such distinction to make. `finite` is the default because it is the one that
   * asks to be checked.
   */
  verbCitation?: 'infinitive' | 'finite' | 'invariant'

  /**
   * True where a subordinate clause puts its verb last: "omdat ik mama wil", "weil
   * ich Mama will". The Scandinavian languages do not — they keep the verb second
   * and only move the negation — so this is not simply "Germanic".
   */
  subordinateVerbFinal?: boolean

  /**
   * True where a subordinate clause moves its negation in front of the verb, the way
   * Swedish, Danish and Norwegian do: "för att jag **inte** vill". Their verb stays
   * where it is, which is why this is a separate dial from `subordinateVerbFinal`.
   */
  subordinateNegationBeforeVerb?: boolean

  /**
   * True where the verb's tail *is* the verb — the Celtic languages realize every
   * verb as an auxiliary plus a verbnoun, so "dwi" alone says only "I am". A tail
   * like that is never dropped, where Swedish "vill **ha**" is.
   */
  verbTailIsVerb?: boolean

  /**
   * Where a second verb goes. The Germanic languages send the infinitive to the end
   * of the clause — "Ik wil een appel eten", not "Ik wil eten een appel" — which is
   * the same rule their `verbTail` already follows.
   */
  verbComplementPosition?: 'afterVerb' | 'clauseFinal'

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
  /**
   * Tiles the language does not spell out, waiting to be attached to the next
   * token. A copula in a language that has none still has to appear in the audit
   * trail — the child tapped it.
   */
  pending?: string[]
}

export function push(builder: Builder, text: string, from: string | null, merged?: string[]): void {
  const trimmed = text?.trim()
  if (!trimmed) return
  // Anything absorbed since the last token rides along with this one.
  const all = [...(merged ?? []), ...(builder.pending ?? [])]
  builder.pending = []
  builder.tokens.push(all.length ? { text: trimmed, from, merged: all } : { text: trimmed, from })
  if (from === null) builder.inserted.push(trimmed)
}

/**
 * Records a tile this language does not spell out. It attaches to the next token
 * pushed, or to the last one if nothing follows, so no tile is ever lost.
 */
export function absorb(builder: Builder, id: string): void {
  (builder.pending ??= []).push(id)
}

/** Attaches anything still pending to the last token emitted. */
export function flushPending(builder: Builder): void {
  const pending = builder.pending
  if (!pending?.length) return
  builder.pending = []
  const last = builder.tokens[builder.tokens.length - 1]
  if (!last) return
  last.merged = [...(last.merged ?? []), ...pending]
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

/**
 * What an adjective agrees with. Attributively that is the noun it sits next to;
 * as a predicate there is no noun in the phrase at all, and it agrees with the
 * subject instead — "Äpplet är stort", "La pomme est grosse".
 */
/**
 * True where this predicate should be said with "have" and a noun rather than a
 * copula and an adjective: a sensation, felt by someone who can feel it.
 */
export function isSensation(ctx: SentenceContext): string | undefined {
  if (!ctx.subjectAnimate) return undefined
  return ctx.predicate?.features.sensation
}

/**
 * True where this predicate takes a dative experiencer instead of a subject:
 * German "mir ist kalt".
 */
export function isDativeSensation(ctx: SentenceContext): boolean {
  return ctx.subjectAnimate === true && ctx.predicate?.features.dativeSensation === true
}

/**
 * True where this noun phrase is plural. Two different things make it so: a
 * quantifier that forces the count ("two apples"), and a head noun that is
 * lexically plural in this language — "glasses", "Schuhe", "gafas". Only the
 * first was ever asked about, so every language with an article gave a plural
 * noun the singular indefinite one: "a glasses", "una gafas", "einen Schuhe".
 *
 * Deliberately **not** the same question as "does the head have to be
 * pluralised". A lexically plural noun is already spelled plural, so the `noun`
 * hooks go on asking `forcesNumber` on their own; using this there would
 * pluralise a plural.
 */
export function isPlural(np: { head?: Word, determiner?: Word } | undefined): boolean {
  return np?.determiner?.features.forcesNumber === 'pl' || np?.head?.features.number === 'pl'
}

export function agreesWith(
  np: { head?: Word, determiner?: Word } | undefined,
  ctx: PhraseContext,
): { gender?: Gender, plural: boolean } {
  // A predicate *noun* phrase has a head of its own, and an adjective inside it
  // agrees with that head rather than with the subject: "das ist ein guter Arzt".
  // Only a bare predicate adjective, which has no phrase around it, reaches past
  // itself to the subject.
  if (ctx.role === 'predicate' && !np?.head) {
    // "Nous sommes contents": the subject is a pronoun, so its number comes from
    // the agreement the verb already used, not from a determiner.
    return { gender: ctx.subjectGender, plural: ctx.subjectPlural === true || ctx.number === 'pl' }
  }
  return {
    gender: np?.head?.features.gender,
    plural: isPlural(np),
  }
}

export interface SentenceContext {
  /** The verb tile, when the child chose one. */
  verb?: Word
  /**
   * The predicate adjective, where the sentence has one and no verb. The copula
   * can depend on it: Spanish picks "ser" for a quality and "estar" for a state.
   */
  predicate?: Word
  /** Per-language scratch space, for rules that need to pass state along. */
  scratch: Record<string, unknown>
  person: 1 | 2 | 3
  number: 'sg' | 'pl'
  tense: 'present' | 'past'
  negated: boolean
  isQuestion: boolean
  /** True when the language must supply a copula (no verb tile was chosen). */
  needsCopula: boolean
  /**
   * The subject's gender. A predicate adjective agrees with it: "Äpplet är
   * stort", "La pomme est grosse", "Ella está cansada". A noun subject gives its
   * own; a pronoun subject gives the one its concept carries, because "she" is
   * feminine in every language that has the distinction. Undefined only where
   * neither says — an uncurated noun, or a language whose third person does not
   * distinguish gender at all.
   */
  subjectGender?: Gender
  /**
   * The gender the speaker's own verbs agree with, for the languages that mark it.
   * Defaults to masculine, which is a placeholder rather than a claim — see
   * `RealizeOptions.speakerGender`.
   */
  speakerGender: 'masculine' | 'feminine'
  /** True where the caller did not say, so the default is standing in. */
  speakerGenderAssumed: boolean
  /** True when the subject is plural, for the same agreement. */
  subjectPlural?: boolean
  /**
   * True where the subject is a pronoun rather than a noun. Russian and its
   * neighbours want the short predicative adjective there — "он устал", not "он
   * усталый" — while a noun subject takes the long one, "Яблоко большое". They
   * used to tell the two apart by the pronoun having no gender, which is not the
   * same question and stopped being true once pronouns carried one.
   */
  subjectIsPronoun?: boolean
  /**
   * True when the subject is a person rather than a thing. It decides between the
   * two readings of the same tile: "tengo frío" (I feel cold) and "el agua está
   * fría" (the water is cold).
   */
  subjectAnimate?: boolean
  builder: Builder
}

export interface PhraseContext extends SentenceContext {
  role: Role
  /** True when this phrase sits inside a prepositional phrase. */
  afterPreposition: boolean
  /** The preposition governing this phrase, when there is one. */
  preposition?: Word
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
  /**
   * Whether the phrase negation reaches *any* object rather than only an
   * indefinite one. The Slavic genitive of negation does, because these
   * languages have no definiteness to condition it on.
   */
  negatesAnyObject?: boolean
}

export type NegationPlan = NegationCommon & (
  /** English: do/does/did + not, with the verb going bare. */
  | { kind: 'auxiliary', auxiliary: string, word: string }
  /**
   * Dutch, German: a particle after the verb, or after a definite object.
   * `closing` adds a second element at the end of the clause, which is how
   * Afrikaans brackets a negation: "nie … nie".
   */
  | { kind: 'afterVerb', word: string, afterDefiniteObject?: boolean, closing?: string }
  /** Spanish, Italian, Portuguese, Chinese, Korean: a particle before the verb. */
  | { kind: 'beforeVerb', word: string }
  /**
   * Czech, Slovak, Hungarian: the negation is written onto the front of the verb
   * as one word — "nechci", "nemám". It is the same position as `beforeVerb` and
   * a different spelling, which is exactly the kind of thing that has to be in
   * the engine rather than in each language's string handling.
   */
  | { kind: 'prefixVerb', prefix: string }
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
   * The negated copula, where the language fuses the two into a form no rule
   * derives: Serbian "нисам", Czech "není" — not "ne jsem" or "neje". Returning a
   * string means this language has taken care of the negation, and the engine
   * emits no separate particle.
   */
  negatedCopula?(ctx: SentenceContext): string | null

  /**
   * A second verb, complementing the first: the "play" of "I want to play". `base`
   * is the infinitive — the verb's curated `inf`, or the tile's own text where the
   * language has none yet. A language implements this when it needs a marker in
   * front of that: English "to", Swedish "att", Irish "a". Return the parts in
   * order; the last one is taken to be the verb itself, and anything before it
   * counts as inserted, so a marker must also appear in `functionWords`. Returning
   * nothing declines, and the engine falls back to `base` and says in a note that
   * the form was not checked.
   */
  verbComplement?(verb: Word, ctx: SentenceContext, base: string): string | string[] | undefined

  /**
   * How to realize a preposition. Returning `null` suppresses the word entirely,
   * which is what a language does when the relation is spelled as a case suffix
   * on the noun instead: Turkish "okula", not "okul e".
   */
  preposition?(word: Word, ctx: SentenceContext): string | null

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
