import type { Features, SelectedWord } from '../features'
import { absorb, isSensation, note, type LanguageRules } from '../profile'

/**
 * Irish. Verb-first like Welsh, and with the same trick — an auxiliary carrying
 * the tense and a verbal noun carrying the meaning: "Tá mé ag ithe úll" is "am I
 * at eating apple". Three things are Irish's own:
 *
 * - **The negative is a different word, not an added one.** "Tá" becomes "Níl",
 *   and there is no particle to place: the verb form itself is the negation.
 * - **Mutations on the noun after the article**, and they differ by gender: a
 *   feminine noun lenites ("an bhean"), a masculine one beginning with a vowel
 *   takes a t- ("an t-úll"), and a masculine consonant is untouched.
 * - **A sensation is a thing that sits on you.** "Tá ocras orm" is "hunger is on
 *   me" — the same shape as French "j'ai faim" but with a preposition where French
 *   has a verb, so the frame this package already had needed one more form: the
 *   prepositional pronoun (orm, ort, air, orainn).
 *
 * Marked `beta`: the present is generated, the past and the copula sentences with
 * "is" are not, and lenition is implemented after the article and the possessive.
 * Eclipsis is not. The vocabulary was generated against the shared concept ids.
 * Both need review by an Irish speaker.
 */

/** "Tá" does not conjugate for person in the present; "níl" is its negative. */
const AUXILIARY = { positive: 'tá', negative: 'níl' }

/** The prepositional pronouns a sensation sits on. */
const ON: Record<string, string> = {
  '1sg': 'orm', '2sg': 'ort', '3sg': 'air', '1pl': 'orainn', '2pl': 'oraibh', '3pl': 'orthu',
}

/** The prepositional pronouns of "le", which some verbal nouns govern. */
const WITH: Record<string, string> = {
  '1sg': 'liom', '2sg': 'leat', '3sg': 'leis', '1pl': 'linn', '2pl': 'libh', '3pl': 'leo',
}

/** Lenition: the mutation the article triggers on a feminine noun. */
const LENITE: Record<string, string> = {
  b: 'bh', c: 'ch', d: 'dh', f: 'fh', g: 'gh', m: 'mh', p: 'ph', s: 'sh', t: 'th',
}

const VOWEL = /^[aeiouáéíóú]/i

/** Lenites a word's first consonant, where it has one that can take it. */
export function lenite(text: string): string {
  const first = text[0]?.toLowerCase() ?? ''
  // A cluster beginning with s + a stop resists lenition, as do the others here.
  if (first === 's' && /^s[cpt]/i.test(text)) return text
  const mutated = LENITE[first]
  return mutated ? `${mutated}${text.slice(1)}` : text
}

export const irish: LanguageRules = {
  profile: {
    language: 'ga',
    maturity: 'beta',
    wordOrder: 'vso',
    verbTailIsVerb: true,
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['an', 'na', 'tá', 'níl', 'ag', 'ar', 'orm', 'ort', 'air', 'orainn', 'oraibh', 'orthu', 'is'],
    notes: 'The present tense is generated with "tá" and a verbal noun; the past and the copula sentences with "is" are not. Lenition after the article is implemented; eclipsis is not. Vocabulary was generated against the shared concept ids and needs review by an Irish speaker.',
  },

  induce(word: SelectedWord): Features {
    // The pack stores the verbal noun with its "ag", which is what follows the
    // subject: "Tá mé ag ithe".
    if (word.pos === 'verb') {
      return { verbTail: word.text, verbTailPosition: 'afterVerb' }
    }
    return {}
  },

  verbForm(verb, ctx) {
    void verb
    if (ctx.isQuestion && !ctx.negated) {
      // After a question word Irish uses the relative form: "Cad atá tú ag ól?"
      note(ctx.builder, '"atá": the relative form, after a question word')
      return 'atá'
    }
    const form = ctx.negated ? AUXILIARY.negative : AUXILIARY.positive
    note(ctx.builder, `"${form}": the auxiliary${ctx.negated ? ', which is its own negation' : ''}`)
    return form
  },

  copula(ctx) {
    return ctx.negated ? AUXILIARY.negative : AUXILIARY.positive
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    const head = np.head
    // "i" and the article contract into "sa", which lenites what follows:
    // "sa ghairdín", "sa scoil".
    if (ctx.afterPreposition
      && ctx.preposition?.text === 'i'
      && determiner?.features.determinerKind === 'definite') {
      const article = head && VOWEL.test(head.text) ? 'san' : 'sa'
      note(ctx.builder, `"${article}": "i" and the article contract`)
      return { text: article, from: determiner.id, merged: [ctx.preposition.id] }
    }
    if (!determiner) {
      if (head && !head.features.mass) note(ctx.builder, 'no indefinite article: Irish has none')
      return null
    }
    const kind = determiner.features.determinerKind
    if (kind === 'definite') {
      note(ctx.builder, '"an": the definite article')
      return { text: 'an', from: determiner.id }
    }
    if (kind === 'indefinite') {
      note(ctx.builder, 'no indefinite article: the bare noun says it')
      return null
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation) {
      // "Tá ocras orm": the sensation is the subject and it sits on the person.
      const on = ON[`${ctx.person}${ctx.number}`] ?? 'air'
      note(ctx.builder, `"${sensation} ${on}": the sensation sits on the person`)
      return `${sensation} ${on}`
    }
    // An adjective after a feminine noun lenites: "bean bheag".
    if (np.head?.features.gender === 'feminine' && ctx.role !== 'predicate') {
      const form = lenite(adjective.text)
      if (form !== adjective.text) note(ctx.builder, `"${form}": lenited after a feminine noun`)
      return form
    }
    return adjective.text
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const definite = determiner?.features.determinerKind === 'definite'
    // Irish counts with a singular noun, and "dhá" lenites it: "dhá bhriosca".
    const counted = determiner?.features.determinerKind === 'quantifier'
    const plural = determiner?.features.forcesNumber === 'pl' && !counted
    let text = plural ? head.features.plural ?? head.text : head.text
    if (counted && determiner?.features.lenites) {
      const form = lenite(text)
      if (form !== text) {
        note(ctx.builder, `"${form}": lenited after the numeral`)
        text = form
      }
    }

    // After "sa" every noun lenites, whatever its gender.
    const contracted = ctx.afterPreposition && ctx.preposition?.text === 'i' && definite
    if (contracted && !plural) {
      const form = lenite(text)
      if (form !== text) {
        note(ctx.builder, `"${form}": lenited after "sa"`)
        text = form
      }
      return { text }
    }

    if (definite && !plural) {
      if (head.features.gender === 'feminine') {
        const form = lenite(text)
        if (form !== text) {
          note(ctx.builder, `"${form}": lenited after the article`)
          text = form
        }
      } else if (VOWEL.test(text)) {
        // "an t-úll": a masculine noun beginning with a vowel takes a t-.
        text = `t-${text}`
        note(ctx.builder, `"${text}": a masculine vowel takes t- after the article`)
      }
    }
    const absorbed = determiner?.features.determinerKind === 'indefinite'
      ? [determiner.id]
      : undefined
    return { text, merged: absorbed }
  },

  pronoun(word, ctx) {
    // "Tá ocras orm": with a sensation there is no subject pronoun at all — the
    // person is inside "orm" — so the tile rides along with that word instead.
    if (ctx.role === 'subject' && isSensation(ctx)) {
      note(ctx.builder, 'the person is inside the prepositional pronoun')
      absorb(ctx.builder, word.id)
      return ''
    }
    // A verbal noun that governs "le" takes a prepositional pronoun instead of a
    // plain one: "ag cabhrú liom", never "ag cabhrú mé".
    if (ctx.role === 'object' && ctx.verb?.features.objectPreposition === 'le') {
      const form = WITH[`${word.features.person ?? 3}${word.features.number ?? 'sg'}`]
      if (form) {
        note(ctx.builder, `"${form}": the pronoun and "le" are one word`)
        return form
      }
    }
    // Otherwise Irish pronouns do not change for case, only for emphasis.
    return word.text
  },

  preposition(word, ctx) {
    // Where "i" contracted into "sa", it is no longer a word of its own.
    const contracted = ctx.scratch.contracted
    if (contracted instanceof Set && contracted.has(word.id)) {
      note(ctx.builder, '"i" contracts with the article into "sa"')
      return null
    }
    return word.text
  },

  transform(chunks, ctx) {
    // "i" plus the article is one word, so the two are decided together.
    const contracted = new Set<string>()
    for (const phrase of chunks.complements) {
      if (phrase.kind !== 'pp' || phrase.preposition.text !== 'i') continue
      if (phrase.object?.kind === 'np'
        && phrase.object.determiner?.features.determinerKind === 'definite') {
        contracted.add(phrase.preposition.id)
      }
    }
    ctx.scratch.contracted = contracted
  },

  negation() {
    // "Níl" is the negation: there is no particle to put anywhere.
    return { kind: 'verbForm' }
  },
}
