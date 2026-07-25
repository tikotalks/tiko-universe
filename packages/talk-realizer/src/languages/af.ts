import type { Features, SelectedWord } from '../features'
import { note, type LanguageRules } from '../profile'

/**
 * Afrikaans. The simplest Germanic language here — verbs do not inflect for
 * person *at all*, and there is one definite article for everything ("die") — but
 * with one rule nothing else in this package has:
 *
 * **Double negation.** A negated clause is bracketed by "nie … nie": "ek wil nie
 * 'n appel nie". The second "nie" closes the clause, so it goes after the object.
 * A clause whose last word would already be "nie" keeps only one.
 *
 * Marked `beta`: the vocabulary was generated against the shared concept ids and
 * needs review by an Afrikaans speaker; the grammar is tested.
 */
export const afrikaans: LanguageRules = {
  profile: {
    language: 'af',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['die', "'n", 'is', 'was', 'nie', 'geen'],
    notes: 'Vocabulary was generated against the shared concept ids and needs review by an Afrikaans speaker. The past tense uses "het … ge-", which is not generated.',
  },

  induce(_word: SelectedWord): Features {
    return {}
  },

  verbForm(verb, ctx) {
    // Afrikaans verbs have one present-tense form for every person.
    if (ctx.tense === 'past') return verb.features.forms?.past ?? verb.text
    if (verb.features.copula) return 'is'
    return verb.features.forms?.['1sg'] ?? verb.text
  },

  copula(ctx) {
    return ctx.tense === 'past' ? 'was' : 'is'
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'

    if (determiner) {
      const kind = determiner.features.determinerKind
      // One definite article, regardless of gender or number.
      if (kind === 'definite') return { text: 'die', from: determiner.id }
      if (kind === 'indefinite') return plural ? null : { text: "'n", from: determiner.id }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
    if (head.features.mass || head.features.proper || plural) {
      if (head.features.mass) note(ctx.builder, 'no article: mass noun')
      return null
    }
    if (ctx.afterPreposition && head.features.institutional) return null
    return { text: "'n", from: null }
  },

  adjective(adjective) {
    // Attributive inflection exists but is irregular enough that leaving the
    // base form is the honest choice until a speaker reviews it.
    return adjective.text
  },

  noun(head, np, ctx) {
    if (np.determiner?.features.forcesNumber === 'pl') {
      if (head.features.plural) return head.features.plural
      // Regular plural: -e after a consonant, -s after a vowel.
      const text = head.text
      const plural = /[aeiou]$/i.test(text) ? `${text}s` : `${text}e`
      note(ctx.builder, `"${plural}": regular plural`)
      return plural
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    // "nie … nie" brackets the clause: the first goes after the verb, the second
    // closes the clause after the object.
    return { kind: 'afterVerb', word: 'nie', closing: 'nie' }
  },
}
