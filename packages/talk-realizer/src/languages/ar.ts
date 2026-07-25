import type { Features, SelectedWord } from '../features'
import { formFor, note, type LanguageRules } from '../profile'

/**
 * Arabic. Three rules carry most of it:
 *
 * - **The definite article is a prefix**, written solid onto the noun: ال +
 *   تفاحة → التفاحة. A definite noun also makes its adjective definite:
 *   "الخبز الكبير".
 * - **There is no indefinite article** and **no present-tense copula**:
 *   "أنا سعيد" is a complete sentence.
 * - **Negation is لا before a present verb**, and ليس before a predicate.
 *
 * Marked `beta`: person forms are derived from the pack's first-person tile by
 * prefix rule, case endings (i'rab) are not written, and the predicate negation
 * of a nominal sentence is simplified. Needs a native speaker's review.
 */
const DEFINITE = 'ال'

/** ليس agrees with its subject: لست, ليس, ليست, لسنا, ليسوا. */
const NOT_BEING: Record<string, string> = {
  '1sg': 'لست', '2sg': 'لست', '3sg': 'ليس', '1pl': 'لسنا', '2pl': 'لستم', '3pl': 'ليسوا',
}

/** Derives a person form from the first-person tile: أريد → تريد / يريد / نريد. */
function derivePerson(firstPerson: string, person: 1 | 2 | 3, number: 'sg' | 'pl'): string {
  const [head, ...tail] = firstPerson.split(' ')
  const stem = head.replace(/^[أاآ]/, '')
  const plural = number === 'pl'
  let form: string
  if (person === 1) form = plural ? `ن${stem}` : head
  else if (person === 2) form = plural ? `ت${stem}ون` : `ت${stem}`
  else form = plural ? `ي${stem}ون` : `ي${stem}`
  return [form, ...tail].join(' ')
}

export const arabic: LanguageRules = {
  profile: {
    language: 'ar',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: false,
    punctuation: { statement: '.', question: '؟' },
    listSeparator: '، ',
    functionWords: ['ال', 'لا', 'ليس', 'لست', 'لسنا', 'ليسوا', 'لستم'],
    notes: 'Person forms are derived by prefix rule from the pack’s first-person tile; case endings are not written and dual forms are not generated. Needs native review.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') {
      // The ta marbuta marks feminine gender reliably.
      return { gender: word.text.endsWith('ة') ? 'feminine' : 'masculine' }
    }
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    const curated = formFor(forms, ctx.person, ctx.number)
    if (curated) return curated
    if (ctx.person === 1 && ctx.number === 'sg') return verb.text
    const derived = derivePerson(verb.text, ctx.person, ctx.number)
    note(ctx.builder, `"${derived}" derived from "${verb.text}" by prefix rule — needs native review`)
    return derived
  },

  copula(ctx) {
    note(ctx.builder, 'no copula: Arabic nominal sentences have none in the present')
    return null
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    if (!determiner || !head) {
      if (determiner) return { text: determiner.text, from: determiner.id }
      note(ctx.builder, 'no indefinite article in Arabic')
      return null
    }
    const kind = determiner.features.determinerKind
    if (determiner.features.pronounCase === 'poss') {
      // A possessive follows its noun, which takes the article: "الكرة ملكي".
      note(ctx.builder, 'the possessive follows the noun')
      return { text: `${DEFINITE}${head.text}`, from: head.id, merged: [] }
    }
    if (kind === 'definite') {
      // Written solid with the noun: ال + تفاحة → التفاحة.
      note(ctx.builder, 'the article is prefixed to the noun')
      return { text: `${DEFINITE}${head.text}`, from: determiner.id, merged: [head.id] }
    }
    if (kind === 'indefinite') {
      note(ctx.builder, 'no indefinite article in Arabic')
      return null
    }
    return { text: determiner.text, from: determiner.id }
  },

  postposed(np) {
    const determiner = np.determiner
    if (determiner?.features.pronounCase === 'poss' && np.head) {
      return { text: determiner.text, from: determiner.id }
    }
    return null
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    const feminine = np.head?.features.gender === 'feminine'
    const base = feminine ? (adjective.features.feminine ?? `${adjective.text}ة`) : adjective.text
    // A definite noun takes a definite adjective: "الخبز الكبير".
    if (np.determiner?.features.determinerKind === 'definite') {
      note(ctx.builder, 'the adjective agrees in definiteness')
      return `${DEFINITE}${base}`
    }
    return base
  },

  noun(head, np) {
    // With the definite article, or a possessive, the noun is already inside the
    // determiner's token.
    if (np.determiner?.features.pronounCase === 'poss') return ''
    if (np.determiner?.features.determinerKind === 'definite') return ''
    if (np.determiner?.features.forcesNumber === 'pl' && head.features.plural) {
      return head.features.plural
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation(ctx) {
    // لا negates a verb; a nominal predicate takes an agreeing ليس.
    if (!ctx.verb) {
      const word = NOT_BEING[`${ctx.person}${ctx.number}`] ?? 'ليس'
      return { kind: 'beforeVerb', word }
    }
    return { kind: 'beforeVerb', word: 'لا' }
  },
}
