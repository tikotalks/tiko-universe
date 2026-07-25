import type { Features, SelectedWord } from '../features'
import { note, type LanguageRules, type PhraseContext } from '../profile'
import type { Phrase } from '../chunk'

/**
 * Japanese. Verb-final, particle-marked, no articles, no spaces.
 *
 * - The subject takes は and the object を. Getting those two right is most of
 *   what makes a tile sequence read as Japanese rather than as a word list.
 * - Negation is part of the verb: たべる → たべない, ほしい → ほしくない.
 * - A question ends in か.
 *
 * Marked `beta`: this generates the plain (casual) form throughout, which is
 * what the pack's tiles are written in. Politeness levels — ます forms, です —
 * are a real part of the language and are not modelled.
 */

/** Turns a plain verb into its negative. Curated forms win. */
function negativeForm(text: string): string | null {
  if (/い$/.test(text)) return `${text.slice(0, -1)}くない` // i-adjective: ほしい → ほしくない
  if (text === 'くる') return 'こない'
  if (text === 'する') return 'しない'
  if (text === 'ある') return 'ない'
  if (/る$/.test(text)) return `${text.slice(0, -1)}ない` // ichidan: たべる → たべない
  const godan: Record<string, string> = {
    う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら',
  }
  const last = text.slice(-1)
  const replacement = godan[last]
  return replacement ? `${text.slice(0, -1)}${replacement}ない` : null
}

export const japanese: LanguageRules = {
  profile: {
    language: 'ja',
    maturity: 'beta',
    wordOrder: 'sov',
    questionStrategy: 'particle',
    questionParticle: 'か',
    spacing: 'none',
    prepositionPosition: 'after',
    listSeparator: '、',
    capitalize: false,
    punctuation: { statement: '。', question: '？' },
    functionWords: ['は', 'を', 'が', 'に', 'か', 'ない', 'じゃない'],
    notes: 'Plain (casual) forms only, matching the pack. Politeness levels (ます, です) are not modelled, and counters are not generated.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'verb') {
      const negative = negativeForm(word.text)
      return negative ? { forms: { negative } } : {}
    }
    return {}
  },

  verbForm(verb, ctx) {
    if (ctx.negated) {
      const negative = verb.features.forms?.negative ?? negativeForm(verb.text)
      if (negative) {
        note(ctx.builder, `"${negative}": the verb carries the negation`)
        return negative
      }
      note(ctx.builder, `no negative form for "${verb.text}"`)
    }
    return verb.text
  },

  copula(ctx) {
    // An adjective needs no copula in the plain form: わたしは うれしい.
    note(ctx.builder, 'no copula: the plain form leaves it out')
    return null
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) {
      note(ctx.builder, 'no article: Japanese has none')
      return null
    }
    if (determiner.features.forcesNumber === 'pl' && np.head && !/の$/.test(determiner.text)) {
      // A counted noun is linked with の: ふたつのクッキー.
      note(ctx.builder, 'の links the count to the noun')
      return { text: `${determiner.text}の`, from: determiner.id }
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective, _np, ctx) {
    // With no verb, the adjective is the predicate and carries the negation:
    // "うれしくない".
    if (ctx.negated && ctx.role === 'predicate') {
      const negative = negativeForm(adjective.text)
      if (negative) {
        note(ctx.builder, `"${negative}": the adjective carries the negation`)
        return negative
      }
    }
    return adjective.text
  },

  noun(head) {
    return head.text
  },

  pronoun(word) {
    return word.text
  },

  /** は marks the subject, を the object — but ほしい and すき take が. */
  particle(phrase: Phrase, ctx: PhraseContext, realized: string): string | null {
    if (phrase.kind !== 'np') return null
    if (ctx.role === 'subject') return 'は'
    if (ctx.role === 'object') {
      const wantsGa = ctx.verb?.features.forms?.negative?.endsWith('くない')
        || /(ほしい|すき)$/.test(ctx.verb?.text ?? '')
      if (wantsGa) {
        note(ctx.builder, 'が, not を: ほしい and すき are adjectives')
        return 'が'
      }
      return 'を'
    }
    return null
  },

  negation(ctx) {
    // With a verb the verb carries it; with a bare adjective the adjective does.
    return ctx.verb ? { kind: 'verbForm' } : { kind: 'none' }
  },

  transform(chunks, ctx) {
    // A Japanese question word sits where the answer would: "なにがほしい".
    const question = chunks.question
    if (question && chunks.verb) {
      chunks.complements.unshift({ kind: 'np', adjectives: [], head: question })
      chunks.question = undefined
      note(ctx.builder, 'the question word takes the place of the object')
    }
  },
}
