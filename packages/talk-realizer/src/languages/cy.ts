import type { Features, SelectedWord } from '../features'
import { absorb, note, type LanguageRules, type SentenceContext } from '../profile'

/**
 * Welsh. The first **verb-first** language in this package, and the first with
 * **initial mutations** — a sound change at the *start* of a word, triggered by
 * whatever precedes it. Everything else here inflects at the end.
 *
 * - **The verb comes first**, and it is an auxiliary: "Dwi'n bwyta afal" is
 *   literally "am-I eating apple". The person lives in the auxiliary, the meaning
 *   in the verbnoun that follows the subject, which is exactly what the engine's
 *   deferred verb tail does.
 * - **The first person needs no pronoun at all**: "dwi" already says "I am". The
 *   tile is still recorded — it is inside the word.
 * - **No indefinite article.** "afal" is "an apple"; only the definite article
 *   exists, and it has three shapes: "y" before a consonant, "yr" before a vowel,
 *   "'r" after one.
 * - **Soft mutation after the article, for a feminine noun**: "cadair" becomes "y
 *   gadair". No rule anywhere else in this package changes a word's first letter.
 * - **Negation is "ddim" after the subject**: "Dwi ddim yn hoffi afal."
 *
 * Marked `beta`: the present is generated, the past and the future are not, and
 * mutation is implemented for the soft grade after the article and after "yn".
 * Aspirate and nasal mutation are not. The vocabulary was generated against the
 * shared concept ids. Both need review by a Welsh speaker.
 */

/** The present of "bod", in the colloquial forms a child hears. */
const AUXILIARY: Record<string, string> = {
  '1sg': 'dwi', '2sg': 'rwyt', '3sg': 'mae', '1pl': 'dyn', '2pl': 'dych', '3pl': 'maen',
}

/** Persons whose auxiliary already contains the pronoun. */
const PRONOUN_IN_VERB = new Set(['1sg'])

/** Soft mutation: the grade the article and "yn" trigger. */
const SOFT: Record<string, string> = {
  p: 'b', t: 'd', c: 'g', b: 'f', d: 'dd', g: '', m: 'f', ll: 'l', rh: 'r',
}

/** Applies the soft mutation to a word's first sound. */
export function soften(text: string): string {
  const lower = text.toLowerCase()
  for (const digraph of ['ll', 'rh']) {
    if (lower.startsWith(digraph)) return `${SOFT[digraph]}${text.slice(digraph.length)}`
  }
  const first = lower[0]
  if (first && first in SOFT) return `${SOFT[first]}${text.slice(1)}`
  return text
}

const VOWEL = /^[aeiouwyâêîôûŵŷ]/i

export const welsh: LanguageRules = {
  profile: {
    language: 'cy',
    maturity: 'beta',
    wordOrder: 'vso',
    verbTailIsVerb: true,
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: [
      'y', 'yr', "'r", 'yn', "'n", 'ddim',
      'dwi', 'rwyt', 'mae', 'dyn', 'dych', 'maen', 'dyw', 'dydyn',
      // The contractions are words in their own right, and the realizer writes them.
      "dwi'n", "dwi'r", "mae'n", "mae'r", "dyw'n", "dyw'r", "maen'n", "dydyn'n",
      'i', 'ti', 'e', 'hi', 'ni', 'nhw',
    ],
    notes: 'The present tense is generated with "bod" and a verbnoun; the past and future are not. Soft mutation after the article and after "yn" is implemented; aspirate and nasal mutation are not. Vocabulary was generated against the shared concept ids and needs review by a Welsh speaker.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos !== 'verb') return {}
    // Every verb is realized as an auxiliary plus this verbnoun, which the engine
    // holds back until after the subject.
    return { verbTail: `yn ${word.text}`, verbTailPosition: 'afterVerb' }
  },

  verbForm(verb, ctx) {
    const key = `${ctx.person}${ctx.number}`
    // "eisiau" and "angen" take no "yn": "Dwi eisiau afal."
    const auxiliary = AUXILIARY[key] ?? 'mae'
    if (ctx.negated) {
      // The negative auxiliary differs in the third person: "dyw", "dydyn".
      const negative = key === '3sg' ? 'dyw' : key === '3pl' ? 'dydyn' : auxiliary
      note(ctx.builder, `"${negative}": the auxiliary, negated`)
      return negative
    }
    return auxiliary
  },

  copula(ctx) {
    const key = `${ctx.person}${ctx.number}`
    if (ctx.negated && key === '3sg') return 'dyw'
    return AUXILIARY[key] ?? 'mae'
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    const head = np.head
    if (!determiner) {
      // Welsh has no indefinite article at all, so a bare noun is complete.
      if (head && !head.features.mass) note(ctx.builder, 'no indefinite article: Welsh has none')
      return null
    }
    const kind = determiner.features.determinerKind
    if (kind === 'definite') {
      const raw = np.adjectives[0]?.text ?? head?.text ?? ''
      // Mutation happens first: "gardd" softens to "ardd", and the article that
      // precedes a vowel is "yr".
      const next = head?.features.gender === 'feminine' ? soften(raw) : raw
      const article = VOWEL.test(next) ? 'yr' : 'y'
      note(ctx.builder, `"${article}": the definite article, by the next sound`)
      return { text: article, from: determiner.id }
    }
    if (kind === 'indefinite') {
      // The tile has no Welsh counterpart; it is carried by the bare noun.
      note(ctx.builder, 'no indefinite article: the bare noun says it')
      return null
    }
    if (determiner.features.pronounCase === 'poss') {
      return { text: determiner.text, from: determiner.id }
    }
    // "dau afal" but "dwy fisgeden": the numeral agrees and then softens.
    const agreed = head?.features.gender === 'feminine'
      ? determiner.features.feminine
      : undefined
    if (agreed) {
      note(ctx.builder, `"${agreed}": the numeral agrees with a feminine noun`)
      return { text: agreed, from: determiner.id }
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    // A predicate adjective is introduced by "yn", which softens what follows:
    // "Dwi'n hapus", "Mae e'n flinedig".
    if (ctx.role === 'predicate') {
      const form = soften(adjective.text)
      note(ctx.builder, `"yn ${form}": a predicate takes "yn", which softens it`)
      return `yn ${form}`
    }
    // An adjective after a feminine singular noun softens: "cadair fach".
    const feminine = np.head?.features.gender === 'feminine'
    if (feminine) {
      const form = soften(adjective.text)
      if (form !== adjective.text) note(ctx.builder, `"${form}": soft mutation after a feminine noun`)
      return form
    }
    return adjective.text
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const definite = determiner?.features.determinerKind === 'definite'
    // Welsh counts with a singular noun: "dau afal", not "dau afalau".
    const counted = determiner?.features.determinerKind === 'quantifier'
    const plural = determiner?.features.forcesNumber === 'pl' && !counted
    let text = plural ? head.features.plural ?? head.text : head.text

    // A feminine noun softens after "dwy" as well as after the article.
    if (counted && head.features.gender === 'feminine' && determiner?.features.feminine) {
      const softened = soften(text)
      if (softened !== text) {
        note(ctx.builder, `"${softened}": soft mutation after the numeral`)
        text = softened
      }
    }

    // A feminine singular noun softens after the article: "y gadair".
    if (definite && !plural && head.features.gender === 'feminine') {
      const softened = soften(text)
      if (softened !== text) {
        note(ctx.builder, `"${softened}": soft mutation after the article`)
        text = softened
      }
    }
    const absorbed = determiner?.features.determinerKind === 'indefinite'
      ? [determiner.id]
      : undefined
    return { text, merged: absorbed }
  },

  pronoun(word, ctx) {
    // "dwi" already contains the first person, so the pronoun is not written
    // again — but the tile it came from is still accounted for.
    if (ctx.role === 'subject' && PRONOUN_IN_VERB.has(`${ctx.person}${ctx.number}`)) {
      note(ctx.builder, 'the first person is inside the auxiliary')
      // "dwi" is "am-I": the tile is spoken, inside another word, so it belongs to
      // whichever token carries it rather than vanishing.
      absorb(ctx.builder, word.id)
      return ''
    }
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  postprocess(tokens, ctx) {
    const out: typeof tokens = []
    for (const token of tokens) {
      const previous = out[out.length - 1]
      const endsInVowel = previous ? /[aeiouwyâêîôûŵŷ]$/i.test(previous.text) : false
      if (previous && endsInVowel && (token.text === 'y' || token.text === 'yr')) {
        // "Dwi eisiau'r afal": the article contracts onto the word before it.
        out[out.length - 1] = {
          text: `${previous.text}'r`,
          from: previous.from,
          merged: [...(previous.merged ?? []), ...(token.from ? [token.from] : [])],
        }
        note(ctx.builder, `"${previous.text}'r": the article contracts after a vowel`)
        continue
      }
      if (previous && endsInVowel && token.text.startsWith('yn ')) {
        // "Dwi'n bwyta": so does the particle.
        const rest = token.text.slice(3)
        out[out.length - 1] = {
          text: `${previous.text}'n`,
          from: previous.from,
          merged: previous.merged,
        }
        out.push({ text: rest, from: token.from, merged: token.merged })
        note(ctx.builder, `"${previous.text}'n": "yn" contracts after a vowel`)
        continue
      }
      out.push(token)
    }
    return out
  },

  negation(ctx: SentenceContext) {
    // "ddim" follows the subject, which is where the engine puts an afterVerb
    // particle in a verb-first language.
    void ctx
    return { kind: 'afterVerb', word: 'ddim' }
  },
}
