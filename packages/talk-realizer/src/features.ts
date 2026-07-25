/**
 * Lexical features the realizer needs and the language packs do not carry yet.
 *
 * Packs today have `text`, `pos`, `category`, `frequency` and (for 23 of 295
 * words) a single `past` inflection. That is enough to concatenate tiles; it is
 * not enough to build a sentence. These features are the missing half.
 *
 * Two deliberate choices:
 *
 * 1. **Keyed by concept id, not by text.** Pack ids are language-independent
 *    (`want` is "want" in en and "wil" in nl), so a feature overlay is authored
 *    per language against the same key set. That is what makes a new language a
 *    data task rather than a code task — including Maltese, where no small
 *    model will help us.
 * 2. **An overlay, not a schema change.** Nothing here has to land in D1 before
 *    the realizer is useful; when it proves out, these fields fold into
 *    `talk_word_inventory.inflections_json` / `metadata_json`.
 */

/** Parts of speech the realizer reasons about. */
export type Pos =
  | 'pronoun'
  | 'verb'
  | 'noun'
  | 'adjective'
  | 'adverb'
  | 'determiner'
  | 'preposition'
  | 'conjunction'
  | 'question'
  | 'social'
  | 'negation'

/**
 * Grammatical gender. Dutch needs only the de/het split (`common` vs `neuter`);
 * German needs three; the Romance languages need masculine/feminine; Arabic and
 * Maltese need masculine/feminine.
 */
export type Gender = 'common' | 'neuter' | 'masculine' | 'feminine'

export type GrammaticalNumber = 'sg' | 'pl'

export type PronounCase = 'nom' | 'acc' | 'poss'

export type DeterminerKind =
  | 'definite'
  | 'indefinite'
  | 'demonstrative'
  | 'quantifier'
  | 'possessive'

/**
 * Verb form keys. English, Dutch and German need only `pl` for the whole plural;
 * the Romance languages distinguish first from third ("queremos" vs "quieren"),
 * so those keys exist too. Lookup falls back from `1pl` to `pl`.
 */
export type VerbFormKey =
  | '1sg' | '2sg' | '3sg'
  | '1pl' | '2pl' | '3pl' | 'pl'
  | 'inf' | 'past' | 'participle'

export interface Features {
  /**
   * Corrects the pack's part of speech where it is wrong. The English pack
   * currently files `big`, `two` and `three` as determiners; `big` is an
   * adjective and the numbers are quantifiers, and the realizer needs the truth.
   */
  pos?: Pos

  // Nouns
  gender?: Gender
  /** Plural form; absent means the noun is not pluralised by the realizer. */
  plural?: string
  /** Mass nouns (water, music) take no indefinite article. */
  mass?: boolean
  proper?: boolean
  /**
   * Institutional nouns drop the article after a preposition: "to school",
   * "in bed", "naar school". They still take one elsewhere ("a school").
   */
  institutional?: boolean

  // Pronouns
  person?: 1 | 2 | 3
  number?: GrammaticalNumber
  pronounCase?: PronounCase
  /** Object form, when the tile shows the subject form ("I" → "me"). */
  accusative?: string
  /** Feminine form of an adjective or determiner ("gros" → "grosse"). */
  feminine?: string
  /**
   * Overrides the language's default adjective position. French puts most
   * adjectives after the noun but a short closed set before it.
   */
  adjectivePosition?: 'before' | 'after'
  /** Plural of an adjective, when it is not base + s. */
  pluralForm?: string
  /** Dative form, for languages that distinguish it ("ich" → "mir"). */
  dative?: string

  // Verbs
  forms?: Partial<Record<VerbFormKey, string>>
  /** True for the copula, which negates and inverts without an auxiliary. */
  copula?: boolean
  /**
   * The case this verb gives its object. German "helfen" takes the dative
   * ("Du hilfst mir"), which no ending rule can guess.
   */
  objectCase?: 'accusative' | 'dative'
  /**
   * Verbs like Spanish "gustar" and Italian "piacere", where the experiencer is
   * a clitic and the thing liked is the grammatical subject: "Me gusta el pan".
   */
  experiencerDative?: boolean
  /** A preposition this verb requires before its object (pt "gosto **de** pão"). */
  objectPreposition?: string

  // Adjectives
  /** Form used directly before a noun. Dutch inflects here ("groot" → "grote"). */
  attributive?: string

  // Determiners
  determinerKind?: DeterminerKind
  /** A quantifier that forces its noun into the plural ("two apples"). */
  forcesNumber?: GrammaticalNumber

  /**
   * English a/an is about sound, not spelling ("an hour", "a unicorn"), so it
   * cannot be derived from the first letter.
   */
  vowelSound?: boolean
}

/** Feature overlay for one language, keyed by pack concept id. */
export type Lexicon = Record<string, Features>

/** A tile the child selected, exactly as the pack describes it. */
export interface SelectedWord {
  id: string
  text: string
  pos: string
}

/** One word in the realized sentence, with its provenance. */
export interface RealizedToken {
  text: string
  /**
   * The concept id this token came from, or `null` when the realizer inserted
   * it (an article, an auxiliary, the copula). Every inserted token must come
   * from the language's closed function-word set — the realizer may never
   * invent content.
   */
  from: string | null
  /**
   * Other concept ids folded into this token. Elision and contraction merge
   * words — French "tu m'aides" is one token carrying both the pronoun and the
   * verb — and the audit trail has to survive that.
   */
  merged?: string[]
}

export interface Realization {
  /** The finished sentence, capitalised and punctuated. */
  text: string
  tokens: RealizedToken[]
  /** Function words the realizer added, for auditing and tests. */
  inserted: string[]
  /** Decisions worth explaining, e.g. "geen: negated indefinite object". */
  notes: string[]
}

export interface RealizeOptions {
  /** Locale or bare language code; only the language part is used. */
  locale: string
  /** Feature overlay for that language. */
  lexicon: Lexicon
  /**
   * Negation is not a tile in the packs yet (only the social "no" exists), so a
   * caller can force it. A `negation` tile in the selection does the same.
   */
  negated?: boolean
  tense?: 'present' | 'past'
}
