import type { Features, SelectedWord } from '../features'
import { agreeAdjective, conjugateRegular, elide, induceGender, pluralize, startsWithVowel } from '../morphology/romance'
import { extractObjectClitic } from '../morphology/clitic'
import { agreesWith, formFor, isSensation, note, type LanguageRules } from '../profile'

/**
 * French. Four things make it more than concatenation:
 *
 * - the pack stores **infinitives**, so every verb must be conjugated;
 * - articles agree and elide: "le pain", "la pomme", "l'eau", "les pommes";
 * - negation is a circumfix, and an indefinite object becomes "de":
 *   "je ne veux pas **de** pomme";
 * - adjectives normally follow the noun, but a short closed set goes in front
 *   ("un **gros** gâteau"), and they all agree.
 */
const COPULA: Record<string, string> = {
  '1sg': 'suis', '2sg': 'es', '3sg': 'est', '1pl': 'sommes', '2pl': 'êtes', '3pl': 'sont',
}
const COPULA_PAST: Record<string, string> = {
  '1sg': 'étais', '2sg': 'étais', '3sg': 'était', '1pl': 'étions', '2pl': 'étiez', '3pl': 'étaient',
}

/** Adjectives that precede the noun in French. */
const PRENOMINAL = new Set(['big', 'small', 'new', 'old', 'kind', 'same', 'different', 'favorite'])

const VOWEL = '[aeiouâàéèêëîïôöûüyh]'

/** Contractions that merge two tokens into one. */
type Replacement = string | ((match: string, ...groups: string[]) => string)
const CONTRACTIONS: Array<[RegExp, Replacement]> = [
  [new RegExp(`^de la (?=${VOWEL})`, 'i'), "de l'"],
  [new RegExp(`^(je|ne|me|te|se|le|la|de|que) (?=${VOWEL})`, 'i'), (_m: string, word: string) => `${word.slice(0, -1)}'`],
  [/^à le$/i, 'au'],
  [/^à les$/i, 'aux'],
  [/^de le$/i, 'du'],
  [/^de les$/i, 'des'],
]

/** Elision inside a single token, e.g. the clitic glued to its verb. */
const INNER_ELISION = new RegExp(`\\b(je|ne|me|te|se|le|la|de|que) (?=${VOWEL})`, 'gi')

const HAVE: Record<string, string> = {
  '1sg': 'ai', '2sg': 'as', '3sg': 'a', '1pl': 'avons', '2pl': 'avez', '3pl': 'ont',
}

export const french: LanguageRules = {
  profile: {
    language: 'fr',
    maturity: 'production',
    wordOrder: 'svo',
    verbCitation: 'infinitive',
    questionStrategy: 'intonation',
    // Spoken French: "Tu veux quoi ?" rather than inventing "qu'est-ce que".
    questionWordPosition: 'final',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: ' ?' },
    functionWords: [
      'le', 'la', 'les', "l'", 'un', 'une', 'des', 'du', 'de', "d'",
      'suis', 'es', 'est', 'sommes', 'êtes', 'sont', 'étais', 'était', 'étaient',
      'ne', "n'", 'pas', 'au', 'aux',
    ],
    notes: 'Questions rely on intonation and the question word; est-ce que and inversion are not generated.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') {
      const gender = induceGender(word.text, 'fr')
      return { gender, plural: pluralize(word.text, 'fr') }
    }
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    const curated = formFor(forms, ctx.person, ctx.number)
    if (curated) return curated
    const regular = conjugateRegular(verb.text, 'fr', ctx.person, ctx.number)
    if (regular) return regular
    note(ctx.builder, `no conjugation for "${verb.text}", left as the infinitive`)
    return verb.text
  },

  copula(ctx) {
    // A sensation is said with "have" and a noun in this language:
    // "j'ai faim", not "je suis faim".
    const sensation = isSensation(ctx)
    if (sensation && ctx.tense === 'present') {
      const form = HAVE[`${ctx.person}${ctx.number}`] ?? 'a'
      note(ctx.builder, `"${form} ${sensation}": a sensation takes "have" and a noun`)
      return form
    }
    const table = ctx.tense === 'past' ? COPULA_PAST : COPULA
    return table[`${ctx.person}${ctx.number}`] ?? 'est'
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'
    const feminine = head?.features.gender === 'feminine'

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') {
        const article = plural ? 'les' : feminine ? 'la' : 'le'
        return { text: article, from: determiner.id }
      }
      if (ctx.negateHere) {
        note(ctx.builder, '"de": the indefinite article disappears under negation')
        return { text: 'de', from: null }
      }
      if (kind === 'indefinite') {
        return { text: plural ? 'des' : feminine ? 'une' : 'un', from: determiner.id }
      }
      if (determiner.features.pronounCase === 'poss') {
        const form = feminine && !plural ? (determiner.features.feminine ?? determiner.text) : determiner.text
        return { text: form, from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
    if (ctx.negateHere) {
      note(ctx.builder, '"de": negated object')
      return { text: 'de', from: null }
    }
    if (ctx.afterPreposition && head.features.institutional) {
      note(ctx.builder, `no article: "${head.text}" is institutional after a preposition`)
      return null
    }
    if (head.features.proper) return null
    if (head.features.mass) {
      // French marks mass nouns with the partitive: "je veux du pain".
      const partitive = feminine ? 'de la' : 'du'
      note(ctx.builder, `partitive "${partitive}": mass noun`)
      return { text: partitive, from: null }
    }
    if (plural) return { text: 'des', from: null }
    return { text: feminine ? 'une' : 'un', from: null }
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    // The sensation noun replaces the adjective entirely.
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation && ctx.tense === 'present') return sensation
    const { gender, plural } = agreesWith(np, ctx)
    return agreeAdjective(adjective.features, adjective.text, 'fr', gender, plural ? 'pl' : 'sg')
  },

  noun(head, np) {
    if (np.determiner?.features.forcesNumber === 'pl') {
      return head.features.plural ?? pluralize(head.text, 'fr')
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    // "ne … pas" wraps the verb, and an indefinite object also becomes "de".
    return { kind: 'circumfix', before: 'ne', after: 'pas', phraseNegation: 'also' }
  },

  transform(chunks, ctx) {
    // Object pronouns are preverbal clitics: "tu m'aides", not "tu aides moi".
    extractObjectClitic(chunks, ctx.scratch)
  },

  postprocess(tokens) {
    // Elision runs twice: once inside a token (the clitic sits on its verb, so
    // "me aides" is a single token) and once across tokens ("de" + "eau").
    const inner = tokens.map((token) => ({
      ...token,
      text: token.text.replace(INNER_ELISION, (_match, word: string) => `${word.slice(0, -1)}'`),
    }))
    return elide(inner, CONTRACTIONS)
  },
}

/** Adjective ordering: French puts most after the noun, a short set before. */
export function isPrenominal(id: string): boolean {
  return PRENOMINAL.has(id)
}

export { startsWithVowel }
