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
  /** The negative form, for languages where the verb itself carries negation. */
  | 'negative'

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
  /**
   * The definite form, where a suffixing language spells it irregularly: Basque
   * "ur" → "ura" while every other -r noun doubles it ("sagar" → "sagarra").
   * Which words double is lexical, so the exceptions are curated.
   */
  definiteForm?: string
  /**
   * Curated case forms, where a rule would be wrong: the accusative and genitive
   * for the Slavic languages, and the partitive for Finnish, whose stem changes
   * ("vesi" → "vettä") are not recoverable from the nominative.
   */
  cases?: Partial<Record<'acc' | 'gen' | 'par', string>>
  /** Mass nouns (water, music) take no indefinite article. */
  mass?: boolean
  proper?: boolean
  /**
   * Animate nouns behave differently in several languages: Armenian marks a
   * definite animate object with -ին, and Slavic languages need it for the
   * accusative.
   */
  animate?: boolean
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
   * Neuter form of an adjective or determiner, for the three-gender languages
   * ("голям" → "голямо", "stor" → "stort").
   */
  neuter?: string
  /**
   * True where the adjective names an inherent quality rather than a passing
   * state. Spanish and its neighbours choose their copula by it: "la manzana **es**
   * grande" (a quality) but "yo **estoy** triste" (a state).
   */
  inherent?: boolean
  /**
   * The noun a language uses with "have" for a bodily sensation: French "j'ai
   * **faim**", Spanish "tengo **hambre**", Dutch "ik heb **honger**". English and
   * German say it with an adjective and a copula, most of Europe does not, and
   * "je suis faim" is not a sentence.
   */
  sensation?: string
  /**
   * True where the language says this sensation with a dative experiencer and no
   * subject at all: German "**mir** ist kalt". "Ich bin kalt" says something else
   * — that the speaker is a cold person.
   */
  dativeSensation?: boolean
  /**
   * A Spanish feminine noun that begins with a stressed "a" and therefore takes
   * the masculine singular article: "el agua", "un área". The noun stays
   * feminine — its adjectives still agree as feminine ("el agua fría").
   */
  stressedInitialA?: boolean
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
   * ("Du hilfst mir"), which no ending rule can guess, and Finnish splits its
   * objects by whether the action completes: `total` is "näen kaverin" against
   * the partitive default of "haluan omenaa".
   */
  objectCase?: 'accusative' | 'dative' | 'genitive' | 'total'
  /**
   * Verbs like Spanish "gustar" and Italian "piacere", where the experiencer is
   * a clitic and the thing liked is the grammatical subject: "Me gusta el pan".
   */
  experiencerDative?: boolean
  /** A preposition this verb requires before its object (pt "gosto **de** pão"). */
  objectPreposition?: string
  /**
   * A word that follows the verb and that negation splits from it: Swedish
   * "vill **ha**" becomes "vill inte ha". German separable prefixes behave the
   * same way.
   */
  verbTail?: string
  /**
   * Where that tail goes. Scandinavian keeps it next to the verb ("vil have et
   * æble"); Afrikaans and Dutch send the infinitive to the end of the clause
   * ("wil nie 'n appel hê nie").
   */
  verbTailPosition?: 'afterVerb' | 'clauseFinal'
  /** A measure word required when counting this noun (zh 个, 块, 本). */
  measureWord?: string
  /**
   * The case a preposition governs. Slavic prepositions each demand one — Polish
   * "do" takes the genitive, Russian "к" the dative — and getting it wrong is
   * one of the most audible errors in these languages.
   */
  governsCase?: 'acc' | 'gen' | 'dat' | 'loc' | 'ins' | 'abl'
  /**
   * True where a preposition tile is realized purely as a case ending, with no
   * word of its own: Lithuanian "sode" for "in the garden", Turkish "parka".
   */
  caseOnly?: boolean
  /**
   * True where this word follows its noun phrase instead of preceding it:
   * Turkish "ile", and every Japanese and Korean particle.
   */
  postposition?: boolean
  /**
   * The verb's stem, for a language that builds its forms by stacking suffixes.
   * Turkish "iste" yields "istiyorum", "istemiyorum" and "istiyorsun"; the packs
   * ship a finished word, so the stem itself has to be curated.
   */
  stem?: string
  /**
   * A Hungarian "-ik verb" — alszik, játszik, eszik — which takes the ending that
   * looks like the definite one even with no object at all: "alszom", "játszom".
   */
  ikVerb?: boolean
  /**
   * The predicative form of an adjective, where a language distinguishes it.
   * Russian says "я счастлив", not "я счастливый".
   */
  predicative?: string

  // Adjectives
  /** Form used directly before a noun. Dutch inflects here ("groot" → "grote"). */
  attributive?: string

  // Determiners
  determinerKind?: DeterminerKind
  /** A quantifier that forces its noun into the plural ("two apples"). */
  forcesNumber?: GrammaticalNumber
  /**
   * A numeral small enough to have its own syntax. Slavic puts the noun in the
   * genitive singular after two, three and four — the paucal — rather than in
   * the plural: "два печива", not "два печива".
   */
  smallNumber?: boolean
  /**
   * True where this word mutates the start of the word after it: Irish "dhá
   * bhriosca", Welsh "dwy fisgeden". Which words do this is lexical.
   */
  lenites?: boolean

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
  /**
   * The gender the speaker's own verbs agree with. Hindi and Urdu need it for
   * every first-person sentence a child makes — "मैं चाहता हूँ" from a boy, "मैं
   * चाहती हूँ" from a girl — and the Slavic past tenses will want it too.
   *
   * Tiko does not record a child's gender, so this defaults to `masculine` and the
   * realizer says so in its notes. That is a placeholder for a decision, not an
   * answer: a language that needs this is wrong for half its users until the
   * profile carries it.
   */
  speakerGender?: 'masculine' | 'feminine'
  /**
   * The lowest maturity this caller will accept. A language below it falls back
   * to plain concatenation — the same output the app produces today — so
   * shipping this package never means shipping every language at once.
   *
   * Defaults to `beta`: production and beta languages realize, drafts do not.
   */
  minMaturity?: 'production' | 'beta' | 'draft'
}
