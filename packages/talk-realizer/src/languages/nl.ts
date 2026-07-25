import { formFor, isSensation, note, type LanguageRules, type SentenceContext } from '../profile'

/**
 * Dutch. Three rules carry the weight, and each is one that plain tile
 * concatenation gets wrong every time:
 *
 * - **de/het** by the noun's gender: "de appel", "het brood". Not derivable.
 * - **The attributive -e**: "de grote appel", "een grote appel", "het grote
 *   boek" — but "een groot boek". No -e before a singular indefinite neuter.
 * - **niet vs geen**: negating an indefinite object replaces its article
 *   ("Ik wil geen appel"); otherwise "niet" goes before a predicate but after a
 *   definite object ("Ik wil de appel niet").
 */
const COPULA: Record<string, string> = { '1sg': 'ben', '2sg': 'bent', '3sg': 'is', pl: 'zijn' }
const COPULA_PAST: Record<string, string> = { '1sg': 'was', '2sg': 'was', '3sg': 'was', pl: 'waren' }

function key(ctx: SentenceContext): string {
  return ctx.number === 'pl' ? 'pl' : `${ctx.person}sg`
}

const HAVE: Record<string, string> = {
  '1sg': 'heb', '2sg': 'hebt', '3sg': 'heeft', '1pl': 'hebben', '2pl': 'hebben', '3pl': 'hebben',
}

export const dutch: LanguageRules = {
  profile: {
    language: 'nl',
    maturity: 'production',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['de', 'het', 'een', 'ben', 'bent', 'is', 'zijn', 'was', 'waren', 'niet', 'geen'],
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[key(ctx)] ?? verb.text
    // Inversion drops the second-person -t: "jij wilt" but "wil jij?".
    if (ctx.isQuestion && ctx.person === 2 && ctx.number === 'sg') {
      return forms['1sg'] ?? verb.text
    }
    return formFor(forms, ctx.person, ctx.number) ?? verb.text
  },

  copula(ctx) {
    // A sensation is said with "have" and a noun in this language:
    // "j'ai faim", not "je suis faim".
    const sensation = isSensation(ctx)
    if (sensation && ctx.tense === 'present') {
      const form = HAVE[`${ctx.person}${ctx.number}`] ?? 'heeft'
      note(ctx.builder, `"${form} ${sensation}": a sensation takes "have" and a noun`)
      return form
    }
    return (ctx.tense === 'past' ? COPULA_PAST : COPULA)[key(ctx)] ?? 'is'
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') {
        const article = head?.features.gender === 'neuter' && !plural ? 'het' : 'de'
        if (article !== determiner.text) {
          note(ctx.builder, `"${article}" not "${determiner.text}": ${head?.id} is ${head?.features.gender}`)
        }
        return { text: article, from: determiner.id }
      }
      if (ctx.negateHere) {
        note(ctx.builder, '"geen": negated indefinite object')
        return { text: 'geen', from: null }
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
    if (ctx.negateHere) {
      note(ctx.builder, '"geen": negated object with no article')
      return { text: 'geen', from: null }
    }
    if (ctx.afterPreposition && head.features.institutional) {
      note(ctx.builder, `no article: "${head.text}" is institutional after a preposition`)
      return null
    }
    if (head.features.mass) {
      note(ctx.builder, 'no article: mass noun')
      return null
    }
    if (head.features.proper || plural) return null
    note(ctx.builder, 'article "een": indefinite countable singular')
    return { text: 'een', from: null }
  },

  adjective(adjective, np, ctx) {
    // The sensation noun replaces the adjective entirely.
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation && ctx.tense === 'present') return sensation
    const head = np.head
    if (!head) return adjective.text
    const inflected = adjective.features.attributive ?? `${adjective.text}e`
    const plural = np.determiner?.features.forcesNumber === 'pl'
    const kind = np.determiner?.features.determinerKind
    const definite = kind === 'definite' || kind === 'demonstrative'
      || np.determiner?.features.pronounCase === 'poss'
    if (head.features.gender === 'neuter' && !plural && !definite) {
      note(ctx.builder, `"${adjective.text}" stays uninflected: singular indefinite neuter noun`)
      return adjective.text
    }
    return inflected
  },

  noun(head, np, ctx) {
    if (np.determiner?.features.forcesNumber === 'pl') {
      if (!head.features.plural) {
        note(ctx.builder, `no plural form for "${head.id}", using the singular`)
        return head.text
      }
      return head.features.plural
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role !== 'subject' && word.features.accusative) return word.features.accusative
    return word.text
  },

  negation() {
    // "geen" replaces the particle when there is an indefinite object; otherwise
    // "niet" goes before a predicate but after a definite object.
    return { kind: 'afterVerb', word: 'niet', afterDefiniteObject: true, phraseNegation: 'replace' }
  },
}

export const FUNCTION_WORDS = dutch.profile.functionWords
