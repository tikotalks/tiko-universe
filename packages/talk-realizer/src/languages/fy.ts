import type { Features, SelectedWord } from '../features'
import { formFor, isPlural, isSensation, note, type LanguageRules } from '../profile'

/**
 * West Frisian. An official language of the Netherlands, and the closest living
 * relative of English — which shows in the shape of the sentence more than in the
 * words: verb-second like Dutch, "net" after the verb for negation, and the same
 * two-gender article system ("de" and "it") that Dutch has.
 *
 * What is Frisian's own here:
 *
 * - **"gjin" for a negated indefinite phrase**, exactly as Dutch uses "geen": "Ik
 *   wol gjin apel", not "Ik wol net in apel";
 * - **a sensation is had**: "Ik haw honger", the same frame as Dutch and German;
 * - and the plural is -en or -s by word, which is curated rather than guessed.
 *
 * Marked `beta`: the present is generated from curated persons and the past is not.
 * The vocabulary was generated against the shared concept ids and needs review by a
 * Frisian speaker — of whom there are about half a million, and none of them are
 * served by anything in this market.
 */
const COPULA: Record<string, string> = {
  '1sg': 'bin', '2sg': 'bist', '3sg': 'is', '1pl': 'binne', '2pl': 'binne', '3pl': 'binne',
}

const HAVE: Record<string, string> = {
  '1sg': 'haw', '2sg': 'hast', '3sg': 'hat', '1pl': 'hawwe', '2pl': 'hawwe', '3pl': 'hawwe',
}

export const frisian: LanguageRules = {
  profile: {
    language: 'fy',
    maturity: 'beta',
    wordOrder: 'svo',
    subordinateVerbFinal: true,
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['de', 'it', 'in', 'gjin', 'net', 'bin', 'bist', 'is', 'binne', 'haw', 'hast', 'hat', 'hawwe'],
    notes: 'The present tense is generated from curated persons; the past is not. Vocabulary was generated against the shared concept ids and needs review by a Frisian speaker.',
  },

  induce(word: SelectedWord): Features {
    // Frisian gender is de/it as in Dutch, and it is not derivable: curated.
    void word
    return {}
  },

  verbForm(verb, ctx) {
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    const curated = formFor(verb.features.forms, ctx.person, ctx.number)
    if (curated) return curated
    if (ctx.person === 1 && ctx.number === 'sg') return verb.text
    // The regular pattern: -st in the second person, -t in the third, -e in the
    // plural, which covers most weak verbs.
    const stem = verb.text
    if (ctx.number === 'pl') return `${stem}e`
    if (ctx.person === 2) return `${stem}st`
    return `${stem}t`
  },

  copula(ctx) {
    const sensation = isSensation(ctx)
    if (sensation) {
      const form = HAVE[`${ctx.person}${ctx.number}`] ?? 'hat'
      note(ctx.builder, `"${form} ${sensation}": a sensation takes "hawwe"`)
      return form
    }
    return COPULA[`${ctx.person}${ctx.number}`] ?? 'is'
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    const head = np.head
    const neuter = head?.features.gender === 'neuter'
    const plural = isPlural(np)

    // "gjin apel": a negated indefinite phrase carries the negation itself.
    if (ctx.negateHere) {
      note(ctx.builder, '"gjin": the negation is inside the noun phrase')
      return { text: 'gjin', from: determiner?.id ?? null }
    }

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') {
        const article = plural ? 'de' : neuter ? 'it' : 'de'
        note(ctx.builder, `"${article}": the definite article`)
        return { text: article, from: determiner.id }
      }
      if (kind === 'indefinite') return { text: 'in', from: determiner.id }
      return { text: determiner.text, from: determiner.id }
    }
    if (!head || plural) return null
    if (head.features.mass || head.features.proper) {
      if (head.features.mass) note(ctx.builder, 'no article: mass noun')
      return null
    }
    return { text: 'in', from: null }
  },

  adjective(adjective, np, ctx) {
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation) return sensation
    if (ctx.role === 'predicate') return adjective.text
    // An attributive adjective takes -e, as in Dutch, except before a bare neuter.
    const neuter = np.head?.features.gender === 'neuter'
    const bare = neuter && np.determiner?.features.determinerKind !== 'definite'
    if (bare) return adjective.text
    // Curated first: a short vowel doubles its consonant ("grut" → "grutte"),
    // which the ending alone does not tell you.
    if (adjective.features.attributive) return adjective.features.attributive
    return adjective.text.endsWith('e') ? adjective.text : `${adjective.text}e`
  },

  noun(head, np, ctx) {
    const plural = np.determiner?.features.forcesNumber === 'pl'
    if (plural) {
      const text = head.features.plural ?? `${head.text}en`
      note(ctx.builder, `"${text}": the plural`)
      return text
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    return { kind: 'afterVerb', word: 'net', phraseNegation: 'replace' }
  },
}
