import type { Features, SelectedWord } from '../features'
import { note, type LanguageRules, type PhraseContext } from '../profile'
import type { Phrase } from '../chunk'

/**
 * Korean. Verb-final and particle-marked like Japanese, but written with spaces.
 *
 * The particles agree with the *sound* of the word they attach to: a final
 * consonant (batchim) takes 은/을, a final vowel takes 는/를. That is computable
 * from the syllable block, which is what `hasBatchim` does.
 *
 * Marked `beta`: casual forms throughout, matching the pack. Korean speech
 * levels are a real part of the language and are not modelled.
 */

/** True when a Hangul syllable ends in a consonant. */
export function hasBatchim(text: string): boolean {
  const last = text.trim().slice(-1)
  const code = last.charCodeAt(0)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}

export const korean: LanguageRules = {
  profile: {
    language: 'ko',
    maturity: 'beta',
    wordOrder: 'sov',
    questionStrategy: 'intonation',
    spacing: 'space',
    prepositionPosition: 'after',
    glueParticles: true,
    capitalize: false,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['는', '은', '를', '을', '이', '가', '안', '못'],
    notes: 'Casual forms only, matching the pack. Speech levels (해요, 합니다) and counters are not modelled.',
  },

  induce(_word: SelectedWord): Features {
    return {}
  },

  verbForm(verb) {
    return verb.text
  },

  copula(ctx) {
    note(ctx.builder, 'no copula: the adjective is the predicate')
    return null
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) {
      note(ctx.builder, 'no article: Korean has none')
      return null
    }
    if (determiner.features.attributive) {
      // Korean counts with an attributive numeral: 두, 세.
      note(ctx.builder, `"${determiner.features.attributive}": the counting form`)
      return { text: determiner.features.attributive, from: determiner.id }
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective, _np, ctx) {
    // 안 goes in front of the predicate when there is no verb: "안 기뻐".
    if (ctx.negated && ctx.role === 'predicate') {
      note(ctx.builder, '안 before the predicate')
      return `안 ${adjective.text}`
    }
    return adjective.text
  },

  noun(head) {
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  /** 는/은 for the topic, 를/을 for the object, chosen by the final sound. */
  particle(phrase: Phrase, ctx: PhraseContext, realized: string): string | null {
    if (phrase.kind !== 'np') return null
    // Chosen from what was actually written: "나" takes 를, "빵" takes 을.
    const last = realized || phrase.head?.text || phrase.pronoun?.text
    if (!last) return null
    const batchim = hasBatchim(last)
    if (ctx.role === 'subject') return batchim ? '은' : '는'
    if (ctx.role === 'object') return batchim ? '을' : '를'
    return null
  },

  negation(ctx) {
    // 안 goes before the verb; with no verb the adjective hook handles it.
    return ctx.verb ? { kind: 'beforeVerb', word: '안' } : { kind: 'none' }
  },

  transform(chunks, ctx) {
    // The question word sits in the object's place: "너는 뭐 원해?".
    const question = chunks.question
    if (question && chunks.verb) {
      chunks.complements.unshift({ kind: 'np', adjectives: [], head: question })
      chunks.question = undefined
      note(ctx.builder, 'the question word takes the place of the object')
    }
  },
}
