import type { Features, SelectedWord } from '../features'
import { note, type LanguageRules } from '../profile'

/**
 * Indonesian. The cheapest language in this package: no gender, no case, no verb
 * conjugation, no articles. The grammar is almost entirely about *order*.
 *
 * - **Possessives follow the noun**: "bola saya" is literally "ball my".
 * - **Adjectives follow the noun**: "apel besar".
 * - **Negation is "tidak" before the verb**, but "bukan" before a noun.
 * - **No copula**: "saya senang" is a complete sentence.
 * - Plurals are usually left unmarked when a number is present ("dua kue"),
 *   which is what a child says; reduplication is not generated.
 *
 * Marked `beta`: the grammar is tested, but the vocabulary was generated against
 * the shared concept ids and needs review by an Indonesian speaker.
 */
/**
 * Malay and Indonesian are the same grammar with different words, so they share
 * this implementation — the only difference is which pack is loaded.
 */
export function createMalayic(language: 'id' | 'ms', notes: string): LanguageRules {
  return {
  profile: {
    language,
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'intonation',
    // "Kamu mau apa?" — the question word stays where the answer would be.
    questionWordPosition: 'final',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['tidak', 'bukan'],
    notes,
  },

  induce(_word: SelectedWord): Features {
    return {}
  },

  verbForm(verb) {
    // Indonesian verbs do not inflect.
    return verb.text
  },

  copula(ctx) {
    note(ctx.builder, 'no copula: Indonesian leaves it out')
    return null
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) {
      note(ctx.builder, 'no article: Indonesian has none')
      return null
    }
    // Possessives and demonstratives both follow the noun in Indonesian:
    // "bola saya", "apel itu".
    if (determiner.features.pronounCase === 'poss') return null
    const kind = determiner.features.determinerKind
    if (kind === 'indefinite') {
      note(ctx.builder, 'no indefinite article; "sebuah" is a classifier')
      return null
    }
    if (kind === 'definite' || kind === 'demonstrative') {
      note(ctx.builder, `"${determiner.text}" follows the noun`)
      return null
    }
    return { text: determiner.text, from: determiner.id }
  },

  postposed(np) {
    const determiner = np.determiner
    if (!determiner || !np.head) return null
    const kind = determiner.features.determinerKind
    const postposes = determiner.features.pronounCase === 'poss'
      || kind === 'definite' || kind === 'demonstrative'
    // "bola saya", "apel itu": the possessor and the demonstrative follow.
    return postposes ? { text: determiner.text, from: determiner.id } : null
  },

  adjectivePosition: 'after',

  adjective(adjective) {
    return adjective.text
  },

  noun(head) {
    // A number already marks plurality: "dua kue", not "dua kue-kue".
    return head.text
  },

  pronoun(word) {
    return word.text
  },

  negation(ctx) {
    // "tidak" negates a verb or adjective; "bukan" negates a noun.
    if (!ctx.verb) {
      note(ctx.builder, '"tidak" before a predicate adjective')
      return { kind: 'beforeVerb', word: 'tidak' }
    }
    return { kind: 'beforeVerb', word: 'tidak' }
  },
  }
}

export const indonesian = createMalayic(
  'id',
  'Reduplicated plurals and the meN-/di- verb affixes are not generated. Vocabulary was generated against the shared concept ids and needs review by an Indonesian speaker.',
)

export const malay = createMalayic(
  'ms',
  'Same grammar as Indonesian, which is linguistically accurate. Vocabulary was generated against the shared concept ids and needs review by a Malay speaker.',
)
