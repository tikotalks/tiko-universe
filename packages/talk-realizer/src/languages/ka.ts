import type { Features, SelectedWord } from '../features'
import { note, type LanguageRules } from '../profile'

/**
 * Georgian. Its own family (Kartvelian), its own alphabet, and a verb that is
 * unlike anything else here: it agrees with **both** its subject and its object
 * through prefixes and suffixes at once, so "მინდა" (I want) contains the person
 * who wants and the thing wanted without any pronoun at all.
 *
 * What this implementation does:
 *
 * - **Verb-final**, with the question word immediately before the verb;
 * - **no articles and no gender**, so a noun is the tile's own text;
 * - **negation is "არ" before the verb**;
 * - **relations are case suffixes**: "ში" is written onto the noun ("სახლში", in
 *   the house), not placed as a word;
 * - and the verb forms come from the pack, because Georgian's polypersonal
 *   agreement cannot be generated from a stem by any rule this package could hold.
 *
 * **Marked `draft`, and that is the important part.** `draft` means `realize()`
 * will not use it: a caller gets the tiles joined as they are, with a note saying
 * why, unless it explicitly asks for `minMaturity: 'draft'`. The vocabulary was
 * generated and is known to need correction — `reviewStatus: 'needs-correction'`
 * in the pack says so — and the verb morphology is only as good as the first-person
 * forms the pack ships. A Georgian speaker (or a tool with one behind it) has to
 * go through it before this language is shown to a child.
 */
const COPULA: Record<string, string> = {
  '1sg': 'ვარ', '2sg': 'ხარ', '3sg': 'არის', '1pl': 'ვართ', '2pl': 'ხართ', '3pl': 'არიან',
}

/** The case suffixes that stand in for prepositions. */
function caseSuffix(preposition: { text: string } | undefined): string | null {
  switch (preposition?.text) {
    case 'ში': return 'ში'    // in
    case 'ზე': return 'ზე'    // on
    case 'კენ': return 'კენ'  // towards
    case 'დან': return 'დან'  // from
    default: return null
  }
}

export const georgian: LanguageRules = {
  profile: {
    language: 'ka',
    maturity: 'draft',
    wordOrder: 'sov',
    questionStrategy: 'intonation',
    questionWordPosition: 'preverbal',
    spacing: 'space',
    capitalize: false,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['არ', 'ვარ', 'ხარ', 'არის', 'ვართ', 'ხართ', 'არიან', 'ერთი'],
    notes: 'DRAFT, awaiting correction. The vocabulary was generated and is flagged "needs-correction" in the pack; Georgian polypersonal verb agreement is not generated, so any person other than the first singular falls back to the form the pack ships. Not used by realize() unless a caller asks for draft output.',
  },

  induce(word: SelectedWord): Features {
    // No gender, no articles. The plural is -ები, which is regular.
    if (word.pos === 'noun') return { plural: `${word.text}ები` }
    return {}
  },

  verbForm(verb, ctx) {
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    const forms = verb.features.forms ?? {}
    const curated = forms[`${ctx.person}${ctx.number}`]
    if (curated) return curated
    if (ctx.person === 1 && ctx.number === 'sg') return verb.text
    // Georgian marks both arguments on the verb, which no rule here can build.
    note(ctx.builder, `no ${ctx.person}${ctx.number} form for "${verb.text}": Georgian agreement is not generated`)
    return verb.text
  },

  copula(ctx) {
    return COPULA[`${ctx.person}${ctx.number}`] ?? 'არის'
  },

  preposition(word, ctx) {
    if (caseSuffix(word)) {
      note(ctx.builder, `"${word.text}" is a case suffix on the noun, not a word`)
      return null
    }
    return word.text
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) return null
    const kind = determiner.features.determinerKind
    if (kind === 'definite' || kind === 'indefinite') {
      note(ctx.builder, 'no article: Georgian has none')
      return null
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective) {
    // Georgian adjectives before a noun do not agree.
    return adjective.text
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const kind = determiner?.features.determinerKind
    const counted = kind === 'quantifier'
    const plural = determiner?.features.forcesNumber === 'pl' && !counted
    let text = plural ? head.features.plural ?? `${head.text}ები` : head.text

    const suffix = caseSuffix(ctx.preposition)
    if (suffix) {
      // The suffix replaces the nominative -ი: "სახლი" → "სახლში".
      text = `${text.replace(/ი$/, '')}${suffix}`
      note(ctx.builder, `"${text}": a case suffix`)
      return { text, merged: [...(determiner ? [determiner.id] : []), ctx.preposition!.id] }
    }
    const absorbed = kind === 'definite' || kind === 'indefinite' ? [determiner!.id] : undefined
    return { text, merged: absorbed }
  },

  pronoun(word, ctx) {
    void ctx
    return word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'არ' }
  },
}
