import type { Features, SelectedWord } from '../features'
import { note, type LanguageRules } from '../profile'

/**
 * Vietnamese. Isolating like Chinese, but written with spaces.
 *
 * - **Classifiers**: counting needs one — "hai quả táo", "hai cái bánh". The
 *   general-purpose "cái" covers what a curated classifier does not.
 * - **Possessives follow with "của"**: "quả táo của tôi".
 * - **Adjectives follow the noun**: "táo to".
 * - **Negation is "không" before the verb**, and there is no copula before an
 *   adjective: "tôi vui" is "I am happy".
 *
 * Marked `beta`: the grammar is tested, but the vocabulary was generated against
 * the shared concept ids and needs review by a Vietnamese speaker.
 */
export const vietnamese: LanguageRules = {
  profile: {
    language: 'vi',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'intonation',
    // "Bạn muốn gì?" — the question word stays in the answer's place.
    questionWordPosition: 'final',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['không', 'cái', 'của', 'là'],
    notes: 'Tone and diacritics come from the pack as written. Aspect particles (đã, đang, sẽ) and the full classifier system are not generated; "cái" is the default. Vocabulary needs review by a Vietnamese speaker.',
  },

  induce(word: SelectedWord): Features {
    // "cái" is the general classifier; specific ones are curated.
    if (word.pos === 'noun') return { measureWord: 'cái' }
    return {}
  },

  verbForm(verb) {
    return verb.text
  },

  copula(ctx) {
    note(ctx.builder, 'no copula before an adjective in Vietnamese')
    return null
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    const head = np.head
    if (!determiner) {
      note(ctx.builder, 'no article: Vietnamese has none')
      return null
    }
    if (determiner.features.pronounCase === 'poss') return null
    const determinerKind = determiner.features.determinerKind
    if (determinerKind === 'demonstrative' && head) {
      // "táo này": the demonstrative follows the noun.
      note(ctx.builder, `"${determiner.text}" follows the noun`)
      return null
    }
    if (determinerKind === 'definite' && head) {
      // Definiteness is carried by the classifier: "quả táo".
      const classifier = head.features.measureWord ?? 'cái'
      note(ctx.builder, `classifier "${classifier}" marks the definite noun`)
      return { text: classifier, from: determiner.id }
    }
    if (determiner.features.forcesNumber === 'pl' && head) {
      const classifier = head.features.measureWord ?? 'cái'
      note(ctx.builder, `classifier "${classifier}": Vietnamese counts with one`)
      return { text: `${determiner.text} ${classifier}`, from: determiner.id }
    }
    const kind = determiner.features.determinerKind
    if (kind === 'indefinite' && head) {
      const classifier = head.features.measureWord ?? 'cái'
      return { text: `${determiner.text} ${classifier}`, from: determiner.id }
    }
    return { text: determiner.text, from: determiner.id }
  },

  postposed(np) {
    const determiner = np.determiner
    if (!determiner || !np.head) return null
    // "của tôi" (the pack tile carries "của") and "táo này" both follow.
    const postposes = determiner.features.pronounCase === 'poss'
      || determiner.features.determinerKind === 'demonstrative'
    return postposes ? { text: determiner.text, from: determiner.id } : null
  },

  adjectivePosition: 'after',

  adjective(adjective) {
    return adjective.text
  },

  noun(head) {
    return head.text
  },

  pronoun(word) {
    return word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'không' }
  },
}
