import type { Features, SelectedWord } from '../features'
import { note, type LanguageRules, type PhraseContext, type SentenceContext } from '../profile'

/**
 * Swedish — the first language here with no pack of its own until now, which is
 * the point: the vocabulary was authored against the same 295 concept ids and
 * the grammar is this file.
 *
 * What Swedish needs:
 *
 * - **en/ett gender**, exactly like Dutch de/het, and just as lexical.
 * - **A suffixed definite article**: "äpple" → "äpplet", "boll" → "bollen".
 *   Swedish has *both* a suffix and a free article, and the free one only
 *   appears when an adjective does: "det stora äpplet".
 * - **Three adjective forms**: indefinite common ("en stor boll"), indefinite
 *   neuter ("ett stort äpple") and definite ("den stora bollen").
 * - **Verb-second**, and verbs that do not inflect for person at all.
 *
 * Marked `beta`: the grammar is tested, but the vocabulary was generated rather
 * than authored by a Swedish speaker and needs review before it reaches a child.
 */
const COPULA = 'är'
const COPULA_PAST = 'var'

function isNeuter(features: Features): boolean {
  return features.gender === 'neuter'
}

/** The definite suffix: -et/-t for ett-words, -en/-n for en-words. */
function definiteSuffix(text: string, neuter: boolean): string {
  const endsInVowel = /[aeiouyåäö]$/i.test(text)
  if (neuter) return endsInVowel ? `${text}t` : `${text}et`
  return endsInVowel ? `${text}n` : `${text}en`
}

/** The plural: a rough but honest default, with curated forms winning. */
function pluralize(text: string, neuter: boolean): string {
  if (/[aeiouyåäö]$/i.test(text)) return `${text}r`
  return neuter ? text : `${text}ar`
}

export const swedish: LanguageRules = {
  profile: {
    language: 'sv',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['en', 'ett', 'den', 'det', 'de', 'är', 'var', 'inte', 'inga'],
    notes: 'Grammar is rule-based and tested; the vocabulary was generated against the shared concept ids and needs review by a Swedish speaker.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') {
      // Most Swedish nouns are en-words; the ett-words are curated.
      return { gender: 'common' }
    }
    return {}
  },

  verbForm(verb, ctx) {
    // Swedish verbs are the same for every person.
    if (ctx.tense === 'past') return verb.features.forms?.past ?? verb.text
    if (verb.features.copula) return COPULA
    return verb.features.forms?.['1sg'] ?? verb.text
  },

  copula(ctx) {
    return ctx.tense === 'past' ? COPULA_PAST : COPULA
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const neuter = isNeuter(head?.features ?? {})
    const plural = determiner?.features.forcesNumber === 'pl'

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') {
        // The free article appears only alongside an adjective; otherwise the
        // definiteness lives in the noun's own suffix.
        if (np.adjectives.length) {
          const article = plural ? 'de' : neuter ? 'det' : 'den'
          note(ctx.builder, `"${article}": the free article joins the suffix when an adjective is present`)
          return { text: article, from: determiner.id }
        }
        note(ctx.builder, 'definiteness is carried by the noun suffix')
        return null
      }
      if (kind === 'indefinite') {
        return { text: neuter ? 'ett' : 'en', from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
    if (ctx.negateHere) {
      note(ctx.builder, '"inga": negated indefinite object')
      return { text: 'inga', from: null }
    }
    if (head.features.mass || head.features.proper || plural) {
      if (head.features.mass) note(ctx.builder, 'no article: mass noun')
      return null
    }
    if (ctx.afterPreposition && head.features.institutional) {
      note(ctx.builder, `no article: "${head.text}" is institutional after a preposition`)
      return null
    }
    const article = neuter ? 'ett' : 'en'
    note(ctx.builder, `article "${article}": ${neuter ? 'ett' : 'en'}-word`)
    return { text: article, from: null }
  },

  adjective(adjective, np, ctx) {
    const head = np.head
    const neuter = isNeuter(head?.features ?? {})
    const kind = np.determiner?.features.determinerKind
    const definite = kind === 'definite' || kind === 'demonstrative'
      || np.determiner?.features.pronounCase === 'poss'
    const plural = np.determiner?.features.forcesNumber === 'pl'

    if (definite || plural) {
      // The definite and plural form is the same: base + a.
      const form = adjective.features.attributive ?? `${adjective.text}a`
      note(ctx.builder, `"${form}": definite or plural adjective form`)
      return form
    }
    if (neuter) {
      // Indefinite neuter takes -t: "ett stort äpple".
      const form = adjective.features.pluralForm ?? `${adjective.text}t`
      note(ctx.builder, `"${form}": indefinite neuter takes -t`)
      return form
    }
    return adjective.text
  },

  noun(head, np, ctx) {
    const neuter = isNeuter(head.features)
    const kind = np.determiner?.features.determinerKind
    const definite = kind === 'definite'
    const plural = np.determiner?.features.forcesNumber === 'pl'

    let text = plural ? (head.features.plural ?? pluralize(head.text, neuter)) : head.text
    if (definite) {
      text = plural ? `${text}na` : definiteSuffix(text, neuter)
      note(ctx.builder, 'the definite article is a suffix on the noun')
      return { text, merged: np.determiner ? [np.determiner.id] : [] }
    }
    return text
  },

  pronoun(word, ctx: PhraseContext) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation(ctx: SentenceContext) {
    // "inte" after the verb, like Dutch; an indefinite object takes "inga".
    if (ctx.needsCopula) return { kind: 'afterVerb', word: 'inte' }
    return { kind: 'afterVerb', word: 'inte', afterDefiniteObject: true }
  },
}
