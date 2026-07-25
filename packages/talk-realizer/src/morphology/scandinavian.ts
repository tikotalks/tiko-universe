import type { Features, SelectedWord } from '../features'
import { note, type LanguageRules, type SentenceContext } from '../profile'

/**
 * Swedish, Danish and Norwegian share one grammar with three sets of dials, so
 * they share one implementation. What they have in common:
 *
 * - two genders (en/ett, en/et) that are as lexical as Dutch de/het;
 * - a definite article that is a **suffix** on the noun ("äpplet", "æblet");
 * - three adjective forms: indefinite common, indefinite neuter, and a single
 *   form for definite and plural;
 * - verbs that do not inflect for person at all;
 * - verb-second word order, and negation after the verb.
 *
 * Where they differ is captured below. The interesting one is **double
 * definiteness**: Swedish and Norwegian use the free article *and* the suffix
 * ("det stora äpplet", "det store eplet"), while Danish drops the suffix when the
 * free article appears ("det store æble").
 */
export interface ScandinavianConfig {
  language: string
  maturity: 'production' | 'beta' | 'draft'
  /** Indefinite articles, by gender. */
  indefinite: { common: string, neuter: string }
  /** Free definite articles, used with an adjective. */
  free: { common: string, neuter: string, plural: string }
  /** Swedish and Norwegian keep the suffix alongside the free article. */
  doubleDefiniteness: boolean
  /** Definite suffixes: after a consonant and after a vowel. */
  definiteSuffix: { common: string, commonAfterVowel: string, neuter: string, neuterAfterVowel: string }
  /** The definite plural suffix: "-na" in Swedish, "-ene" in Danish/Norwegian. */
  definitePlural: string
  /** Default plural ending for a noun with no curated form. */
  pluralEnding: string
  /** The ending shared by the definite and plural adjective. */
  adjectiveDefiniteEnding: string
  /** The indefinite neuter adjective ending. */
  adjectiveNeuterEnding: string
  copula: { present: string, past: string }
  negation: string
  /** The negated indefinite object, if the language has one. */
  negatedArticle?: string
  notes?: string
}

const VOWELS = /[aeiouyåäöæø]$/i

export function createScandinavian(config: ScandinavianConfig): LanguageRules {
  const definiteSuffix = (text: string, neuter: boolean): string => {
    const afterVowel = VOWELS.test(text)
    if (neuter) return `${text}${afterVowel ? config.definiteSuffix.neuterAfterVowel : config.definiteSuffix.neuter}`
    return `${text}${afterVowel ? config.definiteSuffix.commonAfterVowel : config.definiteSuffix.common}`
  }

  const pluralize = (text: string, features: Features): string =>
    features.plural ?? `${text}${config.pluralEnding}`

  return {
    profile: {
      language: config.language,
      maturity: config.maturity,
      wordOrder: 'svo',
      questionStrategy: 'inversion',
      spacing: 'space',
      capitalize: true,
      punctuation: { statement: '.', question: '?' },
      functionWords: [
        config.indefinite.common, config.indefinite.neuter,
        config.free.common, config.free.neuter, config.free.plural,
        config.copula.present, config.copula.past,
        config.negation,
        ...(config.negatedArticle ? [config.negatedArticle] : []),
      ],
      notes: config.notes,
    },

    induce(word: SelectedWord): Features {
      // Most nouns are common gender; the neuter ones are curated.
      if (word.pos === 'noun') return { gender: 'common' }
      return {}
    },

    verbForm(verb, ctx) {
      // These languages use one form for every person.
      if (ctx.tense === 'past') return verb.features.forms?.past ?? verb.text
      if (verb.features.copula) return config.copula.present
      return verb.features.forms?.['1sg'] ?? verb.text
    },

    copula(ctx) {
      return ctx.tense === 'past' ? config.copula.past : config.copula.present
    },

    determiner(np, ctx) {
      const head = np.head
      const determiner = np.determiner
      const neuter = head?.features.gender === 'neuter'
      const plural = determiner?.features.forcesNumber === 'pl'

      if (determiner) {
        const kind = determiner.features.determinerKind
        if (kind === 'definite') {
          if (np.adjectives.length) {
            const article = plural ? config.free.plural : neuter ? config.free.neuter : config.free.common
            note(ctx.builder, `"${article}": the free article appears with an adjective`)
            return { text: article, from: determiner.id }
          }
          note(ctx.builder, 'definiteness is carried by the noun suffix')
          return null
        }
        if (kind === 'indefinite') {
          return { text: neuter ? config.indefinite.neuter : config.indefinite.common, from: determiner.id }
        }
        return { text: determiner.text, from: determiner.id }
      }

      if (!head) return null
      if (ctx.negateHere && config.negatedArticle) {
        note(ctx.builder, `"${config.negatedArticle}": negated indefinite object`)
        return { text: config.negatedArticle, from: null }
      }
      if (head.features.mass || head.features.proper || plural) {
        if (head.features.mass) note(ctx.builder, 'no article: mass noun')
        return null
      }
      if (ctx.afterPreposition && head.features.institutional) {
        note(ctx.builder, `no article: "${head.text}" is institutional after a preposition`)
        return null
      }
      const article = neuter ? config.indefinite.neuter : config.indefinite.common
      note(ctx.builder, `article "${article}": ${neuter ? 'neuter' : 'common'} gender`)
      return { text: article, from: null }
    },

    adjective(adjective, np, ctx) {
      const neuter = np.head?.features.gender === 'neuter'
      const kind = np.determiner?.features.determinerKind
      const definite = kind === 'definite' || kind === 'demonstrative'
        || np.determiner?.features.pronounCase === 'poss'
      const plural = np.determiner?.features.forcesNumber === 'pl'

      if (definite || plural) {
        const form = adjective.features.attributive ?? `${adjective.text}${config.adjectiveDefiniteEnding}`
        note(ctx.builder, `"${form}": definite or plural adjective`)
        return form
      }
      if (neuter) {
        const form = adjective.features.pluralForm ?? `${adjective.text}${config.adjectiveNeuterEnding}`
        note(ctx.builder, `"${form}": indefinite neuter adjective`)
        return form
      }
      return adjective.text
    },

    noun(head, np, ctx) {
      const neuter = head.features.gender === 'neuter'
      const definite = np.determiner?.features.determinerKind === 'definite'
      const plural = np.determiner?.features.forcesNumber === 'pl'
      let text = plural ? pluralize(head.text, head.features) : head.text

      if (definite) {
        // Danish drops the suffix once the free article is there; Swedish and
        // Norwegian keep both.
        if (np.adjectives.length && !config.doubleDefiniteness) {
          note(ctx.builder, 'no suffix: the free article already marks definiteness')
          return { text, merged: np.determiner ? [np.determiner.id] : [] }
        }
        text = plural ? `${text}${config.definitePlural}` : definiteSuffix(text, neuter)
        note(ctx.builder, 'the definite article is a suffix on the noun')
        return { text, merged: np.determiner ? [np.determiner.id] : [] }
      }
      return text
    },

    pronoun(word, ctx) {
      if (ctx.role === 'subject') return word.text
      return word.features.accusative ?? word.text
    },

    negation(ctx: SentenceContext) {
      if (ctx.needsCopula) return { kind: 'afterVerb', word: config.negation }
      return {
        kind: 'afterVerb',
        word: config.negation,
        afterDefiniteObject: true,
        ...(config.negatedArticle ? { phraseNegation: 'replace' as const } : {}),
      }
    },
  }
}
