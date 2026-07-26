import type { Features, SelectedWord } from '../features'
import { note, type LanguageRules } from '../profile'

/**
 * Mandarin. The opposite problem from German: nothing inflects, so the work is
 * all in what to *add* and what to leave out.
 *
 * - No articles at all. "我要苹果" is "I want an apple".
 * - Counting needs a measure word: "两个饼干", and 二 becomes 两 before one.
 * - Negation is 不 before the verb, except 有 which takes 没.
 * - No spaces, and the punctuation is full-width.
 */
export const chinese: LanguageRules = {
  profile: {
    language: 'zh',
    maturity: 'production',
    wordOrder: 'svo',
    verbCitation: 'invariant',
    questionStrategy: 'particle',
    questionParticle: '',
    // A question word stays where the thing it asks about would be: 你要什么？
    questionWordPosition: 'final',
    spacing: 'none',
    capitalize: false,
    punctuation: { statement: '。', question: '？' },
    functionWords: ['不', '没', '个', '两', '吗', '是', '很'],
    notes: 'Aspect markers (了, 过) and the 是…的 construction are not generated; the plain present is used throughout.',
  },

  induce(word: SelectedWord): Features {
    // 个 is the general-purpose measure word; specific ones are curated.
    if (word.pos === 'noun') return { measureWord: '个' }
    return {}
  },

  verbForm(verb) {
    // Chinese verbs do not inflect.
    return verb.text
  },

  copula(ctx) {
    // An adjective is its own predicate: "我开心" is "I am happy".
    note(ctx.builder, 'no copula before an adjective in Chinese')
    return null
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    const head = np.head
    if (!determiner) {
      note(ctx.builder, 'no article: Chinese has none')
      return null
    }
    const kind = determiner.features.determinerKind
    if (kind === 'indefinite') {
      // 一个 already carries its measure word.
      return { text: determiner.text, from: determiner.id }
    }
    if ((kind === 'demonstrative' || kind === 'definite') && head) {
      // A demonstrative needs its measure word: 这个公园.
      const measure = head.features.measureWord ?? '个'
      return { text: `${determiner.text}${measure}`, from: determiner.id }
    }
    if (determiner.features.forcesNumber === 'pl' && head) {
      const measure = head.features.measureWord ?? '个'
      // 二 is not used before a measure word; 两 is.
      const numeral = determiner.text === '二' ? '两' : determiner.text
      note(ctx.builder, `measure word "${measure}": Chinese counts with one`)
      return { text: `${numeral}${measure}`, from: determiner.id }
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective, np, ctx) {
    // An adjective is a verb in Chinese, and a bare predicate one needs a degree
    // word: "这个苹果很大". Negated, 不 already fills that slot.
    if (ctx.role === 'predicate' && !ctx.negated && !ctx.isQuestion) {
      note(ctx.builder, '很: a predicate adjective needs a degree word')
      return `很${adjective.text}`
    }
    return adjective.text
  },

  noun(head) {
    // No plural marking on the noun itself.
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation(ctx) {
    // 有 is the one verb that takes 没 rather than 不.
    const word = ctx.verb?.text === '有' ? '没' : '不'
    return { kind: 'beforeVerb', word }
  },
}
