import type { Features, SelectedWord } from '../features'
import { isSensation, note, type LanguageRules } from '../profile'

/**
 * Papiamentu, in the Curaçao orthography. A creole with a Portuguese and Spanish
 * lexicon, Dutch and English on top, and the simplest morphology in this package:
 *
 * - **no gender, no case, and no verb agreement at all.** "mi ke", "bo ke", "nos
 *   ke" — the pronoun carries the person and the verb never changes. Every other
 *   language here needed a conjugation table; this one needs none;
 * - **tense is a particle before the verb**: `ta` for the present, `tabata` for the
 *   past, `lo` for the future. A few verbs — "ke", "tin", "mester", "por" — take no
 *   `ta` at all, which is the one irregularity worth knowing;
 * - **the definite article is "e"** and the plural is **-nan**, added only where
 *   the number is not already obvious;
 * - **negation is "no" before the verb**, including before the particle;
 * - and a sensation is *had*, not *been*: "Mi tin hamber", never "Mi ta hamber" —
 *   the same frame as French "j'ai faim", reached by a completely different route.
 *
 * Marked `beta` for the vocabulary only: the grammar has no morphology left to get
 * wrong. Papiamentu is also the language in this package with the strongest claim
 * on Tiko — Curaçao and Bonaire children are Dutch nationals, and nothing in the
 * Dutch-language market serves them.
 */

/** Verbs that take no tense particle in the present. */
const NO_PARTICLE = new Set(['ke', 'tin', 'mester', 'por', 'sa', 'gusta'])

export const papiamentu: LanguageRules = {
  profile: {
    language: 'pap',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['e', 'un', 'ta', 'tabata', 'lo', 'no', 'tin'],
    notes: 'The grammar is complete: Papiamentu has no inflection beyond the plural -nan, so nothing here is approximated. The vocabulary was generated against the shared concept ids in the Curaçao orthography and needs review by a Papiamentu speaker.',
  },

  induce(word: SelectedWord): Features {
    // The plural is -nan for every noun, with no exceptions to speak of.
    if (word.pos === 'noun') return { plural: `${word.text}nan` }
    return {}
  },

  verbForm(verb, ctx) {
    const bare = verb.text
    if (ctx.tense === 'past') {
      note(ctx.builder, '"tabata": the past is a particle, not an ending')
      return `tabata ${bare}`
    }
    if (NO_PARTICLE.has(bare)) {
      note(ctx.builder, `"${bare}" takes no tense particle`)
      return bare
    }
    return `ta ${bare}`
  },

  copula(ctx) {
    const sensation = isSensation(ctx)
    if (sensation) {
      // "Mi tin hamber": a sensation is had, not been.
      note(ctx.builder, `"tin ${sensation}": a sensation takes "tin"`)
      return 'tin'
    }
    return ctx.tense === 'past' ? 'tabata' : 'ta'
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    const head = np.head
    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') return { text: 'e', from: determiner.id }
      if (kind === 'indefinite') return { text: 'un', from: determiner.id }
      if (determiner.features.pronounCase === 'poss') {
        // The possessive is the plain pronoun, before the noun: "mi bala".
        return { text: determiner.text, from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }
    if (!head) return null
    if (head.features.mass || head.features.proper) {
      if (head.features.mass) note(ctx.builder, 'no article: mass noun')
      return null
    }
    return { text: 'un', from: null }
  },

  adjective(adjective, np, ctx) {
    // Adjectives never agree, and a sensation replaces the adjective outright.
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation) return sensation
    return adjective.text
  },

  adjectivePosition: 'after',

  noun(head, np, ctx) {
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'
    // A numeral already counts, so -nan would be saying it twice: "dos kuki".
    const counted = determiner?.features.determinerKind === 'quantifier'
    if (plural && !counted) {
      const text = head.features.plural ?? `${head.text}nan`
      note(ctx.builder, `"${text}": the plural is -nan`)
      return text
    }
    return head.text
  },

  pronoun(word, ctx) {
    // The same form in every role: no case at all.
    void ctx
    return word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'no' }
  },
}
