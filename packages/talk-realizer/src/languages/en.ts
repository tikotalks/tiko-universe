import type { NounPhrase, Word } from '../chunk'
import { formFor, note, type LanguageRules, type PhraseContext, type SentenceContext } from '../profile'

/**
 * English. Little morphology, but two rules that concatenation always misses:
 * `a` vs `an` by sound (and keyed to whatever comes next, adjective included),
 * and do-support for negation and questions.
 */
const COPULA: Record<string, string> = { '1sg': 'am', '2sg': 'are', '3sg': 'is', pl: 'are' }
const COPULA_PAST: Record<string, string> = { '1sg': 'was', '2sg': 'were', '3sg': 'was', pl: 'were' }

function key(ctx: SentenceContext): string {
  return ctx.number === 'pl' ? 'pl' : `${ctx.person}sg`
}

function startsWithVowelSound(word: Word): boolean {
  if (word.features.vowelSound !== undefined) return word.features.vowelSound
  return /^[aeiou]/i.test(word.text)
}

export const english: LanguageRules = {
  profile: {
    language: 'en',
    maturity: 'production',
    wordOrder: 'svo',
    questionStrategy: 'auxiliary',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['a', 'an', 'the', 'am', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'not'],
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[key(ctx)] ?? verb.text
    const direct = formFor(forms, ctx.person, ctx.number)
    if (direct) return direct
    // Only the third person singular is marked.
    if (ctx.person === 3 && ctx.number === 'sg') return forms['3sg'] ?? `${verb.text}s`
    return verb.text
  },

  copula(ctx) {
    return (ctx.tense === 'past' ? COPULA_PAST : COPULA)[key(ctx)] ?? 'is'
  },

  determiner(np, ctx) {
    if (np.determiner) return { text: np.determiner.text, from: np.determiner.id }
    const head = np.head
    if (!head) return null
    const plural = np.determiner?.features.forcesNumber === 'pl'
    if (ctx.afterPreposition && head.features.institutional) {
      note(ctx.builder, `no article: "${head.text}" is institutional after a preposition`)
      return null
    }
    if (head.features.mass) {
      note(ctx.builder, 'no article: mass noun')
      return null
    }
    if (head.features.proper || plural) return null
    const next = np.adjectives[0] ?? head
    const article = startsWithVowelSound(next) ? 'an' : 'a'
    note(ctx.builder, `article "${article}": indefinite countable singular`)
    return { text: article, from: null }
  },

  adjective(adjective) {
    return adjective.text
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

  negation(ctx) {
    if (ctx.needsCopula) return { kind: 'afterVerb', word: 'not' }
    const auxiliary = ctx.tense === 'past' ? 'did' : (ctx.person === 3 && ctx.number === 'sg' ? 'does' : 'do')
    return { kind: 'auxiliary', auxiliary, word: 'not' }
  },
}

/** Retained for tests and callers that assert on the whitelist. */
export const FUNCTION_WORDS = english.profile.functionWords
export type { NounPhrase, PhraseContext }
