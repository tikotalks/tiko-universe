import type { Features, SelectedWord } from '../features'
import { applyExperiencer } from '../morphology/romance'
import { extractObjectClitic } from '../morphology/clitic'
import { agreesWith, formFor, note, type LanguageRules, type SentenceContext } from '../profile'

/**
 * Romanian. A Romance language that postposes its definite article, so it needs
 * both halves of what this package already has: conjugation from infinitives
 * (like French and Spanish) and a suffixed article (like Swedish and Armenian).
 *
 * - **The definite article is a suffix**: "măr" → "mărul", "carte" → "cartea",
 *   "casă" → "casa".
 * - **Three genders**, with neuter behaving as masculine in the singular and
 *   feminine in the plural — modelled here as masculine/feminine, which is what
 *   the singular needs.
 * - **Adjectives follow the noun and agree**: "un măr mare", "o casă mare".
 * - **Negation is "nu" before the verb**, and the copula is "a fi".
 *
 * Marked `beta`: conjugation covers the regular classes and the verbs the pack
 * ships; the vocabulary was generated against the shared concept ids. Both need
 * review by a Romanian speaker.
 */
const COPULA: Record<string, string> = {
  '1sg': 'sunt', '2sg': 'ești', '3sg': 'este', '1pl': 'suntem', '2pl': 'sunteți', '3pl': 'sunt',
}
const COPULA_PAST: Record<string, string> = {
  '1sg': 'eram', '2sg': 'erai', '3sg': 'era', '1pl': 'eram', '2pl': 'erați', '3pl': 'erau',
}

/** Regular present-tense endings by conjugation class. */
const ENDINGS: Record<string, Record<string, string>> = {
  a: { '1sg': '', '2sg': 'i', '3sg': 'ă', '1pl': 'ăm', '2pl': 'ați', '3pl': 'ă' },
  e: { '1sg': '', '2sg': 'i', '3sg': 'e', '1pl': 'em', '2pl': 'eți', '3pl': ' ' },
  i: { '1sg': 'esc', '2sg': 'ești', '3sg': 'ește', '1pl': 'im', '2pl': 'iți', '3pl': 'esc' },
}

function conjugate(infinitive: string, ctx: SentenceContext): string | null {
  const [head, ...tail] = infinitive.split(' ')
  const key = `${ctx.person}${ctx.number}`
  for (const cls of ['a', 'e', 'i']) {
    if (!head.endsWith(cls)) continue
    const stem = head.slice(0, -1)
    const ending = ENDINGS[cls][key]
    if (ending === undefined) return null
    return [`${stem}${ending}`.trim(), ...tail].join(' ')
  }
  return null
}

/** The definite suffix, by gender and ending. */
function definiteSuffix(text: string, feminine: boolean): string {
  if (feminine) {
    if (text.endsWith('ă')) return `${text.slice(0, -1)}a`
    if (text.endsWith('e')) return `${text}a`
    return `${text}a`
  }
  if (/[aeiouăâî]$/.test(text)) return `${text}le`
  return `${text}ul`
}

export const romanian: LanguageRules = {
  profile: {
    language: 'ro',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['un', 'o', 'sunt', 'ești', 'este', 'suntem', 'era', 'erau', 'nu', 'niște'],
    notes: 'The neuter gender is modelled as masculine (correct in the singular). Irregular verbs beyond those curated fall back to the infinitive with a note. Vocabulary and conjugations need review by a Romanian speaker.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') {
      // Romanian gender is largely predictable from the ending.
      const feminine = /(ă|e|ie)$/.test(word.text)
      return { gender: feminine ? 'feminine' : 'masculine' }
    }
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    if (ctx.scratch.experiencer) {
      // "îmi place pâinea": the thing liked is the subject.
      const plural = ctx.scratch.experiencerPlural === true
      return forms[plural ? '3pl' : '3sg'] ?? verb.text
    }
    const curated = formFor(forms, ctx.person, ctx.number)
    if (curated) return curated
    const regular = conjugate(verb.text, ctx)
    if (regular) return regular
    note(ctx.builder, `no conjugation for "${verb.text}", left as the infinitive`)
    return verb.text
  },

  copula(ctx) {
    return (ctx.tense === 'past' ? COPULA_PAST : COPULA)[`${ctx.person}${ctx.number}`] ?? 'este'
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const feminine = head?.features.gender === 'feminine'
    const plural = determiner?.features.forcesNumber === 'pl'

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (determiner.features.pronounCase === 'poss') {
        // "mingea mea": the noun takes the article and the possessive follows.
        note(ctx.builder, 'the possessive follows the noun, which takes the article')
        return null
      }
      if (kind === 'definite') {
        note(ctx.builder, 'the definite article is a suffix on the noun')
        return null
      }
      if (kind === 'indefinite') {
        return { text: plural ? 'niște' : feminine ? 'o' : 'un', from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
    if (head.features.mass || head.features.proper) {
      if (head.features.mass) note(ctx.builder, 'no article: mass noun')
      return null
    }
    if (ctx.afterPreposition && head.features.institutional) {
      note(ctx.builder, `no article: "${head.text}" is institutional after a preposition`)
      return null
    }
    if (plural) return { text: 'niște', from: null }
    return { text: feminine ? 'o' : 'un', from: null }
  },

  postposed(np) {
    const determiner = np.determiner
    if (determiner?.features.pronounCase === 'poss' && np.head) {
      const feminine = np.head.features.gender === 'feminine'
      const form = feminine ? (determiner.features.feminine ?? determiner.text) : determiner.text
      return { text: form, from: determiner.id }
    }
    return null
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    const { gender, plural } = agreesWith(np, ctx)
    const feminine = gender === 'feminine'
    let form = adjective.text
    // An adjective in -e is the same in both genders ("mare", "rece").
    if (feminine && !form.endsWith('e')) form = adjective.features.feminine ?? `${form}ă`
    if (plural) form = feminine ? `${form.replace(/ă$/, '')}e` : `${form}i`
    return form
  },

  noun(head, np, ctx) {
    const feminine = head.features.gender === 'feminine'
    const possessive = np.determiner?.features.pronounCase === 'poss'
    const experiencerSubject = ctx.scratch.experiencer === true && ctx.role === 'object'
    // Romanian keeps the noun bare after most prepositions: "la parc", "la școală".
    const definite = !ctx.afterPreposition
      && (np.determiner?.features.determinerKind === 'definite' || possessive || experiencerSubject)
    const droppedArticle = ctx.afterPreposition
      && np.determiner?.features.determinerKind === 'definite'
    if (droppedArticle) {
      note(ctx.builder, 'no article after the preposition: Romanian keeps the noun bare')
    }
    const plural = np.determiner?.features.forcesNumber === 'pl'
    let text = plural
      ? (head.features.plural ?? (feminine ? `${head.text.replace(/ă$/, '')}e` : `${head.text}i`))
      : head.text

    if (definite) {
      text = plural ? (feminine ? `${text}le` : `${text}i`) : definiteSuffix(text, feminine)
      note(ctx.builder, 'the definite article is written onto the noun')
      return { text, merged: np.determiner ? [np.determiner.id] : [] }
    }
    // The dropped article still belongs to this token's provenance.
    if (droppedArticle && np.determiner) return { text, merged: [np.determiner.id] }
    return text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'nu' }
  },

  transform(chunks, ctx) {
    ctx.scratch.experiencerPlural = chunks.complements.some(
      (phrase) => phrase.kind === 'np' && phrase.determiner?.features.forcesNumber === 'pl',
    )
    const clitics = { '1sg': 'îmi', '2sg': 'îți', '3sg': 'îi', '1pl': 'ne', '2pl': 'vă', '3pl': 'le' }
    if (applyExperiencer(chunks, ctx.scratch, clitics, ctx.person, ctx.number)) {
      note(ctx.builder, 'a plăcea inverts: the experiencer becomes a dative clitic')
      return
    }
    // Object pronouns are preverbal clitics: "tu mă ajuți".
    extractObjectClitic(chunks, ctx.scratch)
  },
}
