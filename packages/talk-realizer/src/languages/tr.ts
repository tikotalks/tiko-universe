import type { Features, SelectedWord } from '../features'
import type { Word } from '../chunk'
import { applySuffix, stack, TURKISH_HARMONY } from '../morphology/agglutinative'
import { agreesWith, note, type LanguageRules, type SentenceContext } from '../profile'

/**
 * Turkish. The first language here that builds its word forms by **stacking
 * suffixes** rather than picking from a table, which is why it needed
 * `morphology/agglutinative.ts` before it could exist at all.
 *
 * - **No articles and no gender.** "bir" is a numeral doing an indefinite
 *   article's job; definiteness is carried by the accusative case instead, which
 *   is the opposite of how Bulgarian solved the same problem: "elma istiyorum"
 *   (some apple) versus "elmayı istiyorum" (*the* apple). The `the` tile is what
 *   switches it on.
 * - **Verb-final.** Everything else precedes: "Ben elmayı istiyorum."
 * - **Case is a suffix, chosen by harmony**: "evde" but "okulda", "elmayı" but
 *   "evi". One rule covers all 295 tiles, where a table would need 295 entries.
 * - **Negation is inside the verb**: "istiyorum" → "istemiyorum". The tile the
 *   child chose is still the verb, because it is still one word.
 * - **Postpositions, not prepositions**: "okula" (to school) is a case ending, and
 *   "ile" follows its noun.
 *
 * Marked `beta`: the present progressive is generated from curated stems, the
 * aorist and the past are not, and the vocabulary was generated against the
 * shared concept ids. Both need review by a Turkish speaker.
 */

/** Person endings after -Iyor, where the vowel is always rounded. */
const PROGRESSIVE_PERSON: Record<string, string> = {
  '1sg': 'um', '2sg': 'sun', '3sg': '', '1pl': 'uz', '2pl': 'sunuz', '3pl': 'lar',
}

/** The copula, as a suffix on the predicate: "hastayım", "mutluyum". */
const COPULA_PERSON: Record<string, string> = {
  '1sg': '(y)Im', '2sg': 'sIn', '3sg': '', '1pl': '(y)Iz', '2pl': 'sInIz', '3pl': 'lAr',
}

/**
 * The present progressive: stem + (I)yor + person. A stem ending in a or e loses
 * it ("bekle" → "bekliyor"); one ending in a high vowel keeps it ("oku" →
 * "okuyor").
 */
function progressive(stem: string, key: string, negated: boolean): string {
  const person = PROGRESSIVE_PERSON[key] ?? ''
  if (negated) {
    // The negative marker is mA, which raises to a high vowel before -yor.
    const withM = applySuffix(stem, 'm', TURKISH_HARMONY)
    return `${applySuffix(withM, 'I', TURKISH_HARMONY)}yor${person}`
  }
  // A stem in -a or -e loses it: "bekle" → "bekliyor", "oyna" → "oynuyor". The
  // harmony then comes from the vowel *before* the one that dropped — which is
  // why it is "oynuyor" and not "oynıyor" — unless there is none, as in "ye",
  // where the dropped vowel is all there was: "yiyorum", never "yıyorum".
  const dropped = /[ae]$/.test(stem)
  if (!dropped && /[ıiuü]$/.test(stem)) return `${stem}yor${person}`
  const base = dropped ? stem.slice(0, -1) : stem
  const harmonySource = dropped && !/[aeıioöuü]/.test(base) ? stem : base
  const vowel = applySuffix(harmonySource, 'I', TURKISH_HARMONY).slice(harmonySource.length)
  // A verb stem softens its final stop before that vowel — "git" → "gidiyorum",
  // "et" → "ediyorum" — but a consonant only exposed by the dropped vowel does
  // not: "iste" stays "istiyorum", never "isdiyorum".
  const softened = dropped
    ? base
    : applySuffix(base, 'I', TURKISH_HARMONY, { soften: 'always' }).slice(0, -1)
  return `${softened}${vowel}yor${person}`
}

/** The case a noun phrase takes in this role. */
function caseSuffix(
  role: string,
  definite: boolean,
  preposition: Word | undefined,
): string | null {
  if (preposition?.features.governsCase === 'dat') return '(y)A'
  if (preposition?.features.governsCase === 'loc') return 'DA'
  if (preposition?.features.governsCase === 'abl') return 'DAn'
  if (role !== 'object') return null
  // Only a definite object takes the accusative. That distinction is what the
  // language uses an article for elsewhere.
  return definite ? '(y)I' : null
}

export const turkish: LanguageRules = {
  profile: {
    language: 'tr',
    maturity: 'beta',
    wordOrder: 'sov',
    questionStrategy: 'intonation',
    questionWordPosition: 'preverbal',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['bir', 'değil', 'ile', 've'],
    notes: 'The present progressive is generated from curated stems; the aorist, the past and the evidential are not. Yes/no questions need the particle "mI", which Talk never generates because every question it builds starts with a question word. Vocabulary was generated against the shared concept ids and needs review by a Turkish speaker.',
  },

  induce(word: SelectedWord): Features {
    // Turkish has no gender and no declension classes: nothing to induce, which
    // is exactly why the suffix rules can cover every tile.
    if (word.pos === 'noun') return { plural: applySuffix(word.text, 'lAr', TURKISH_HARMONY) }
    return {}
  },

  verbForm(verb, ctx) {
    const key = `${ctx.person}${ctx.number}`
    const stem = verb.features.stem
    if (!stem) {
      note(ctx.builder, `no stem for "${verb.text}" — needs curation`)
      return verb.text
    }
    if (ctx.tense === 'past') {
      const past = verb.features.forms?.past
      if (past) return past
      note(ctx.builder, 'the past tense is not generated')
    }
    const form = progressive(stem, key, ctx.negated)
    if (ctx.negated) note(ctx.builder, `"${form}": the negation is inside the verb`)
    return form
  },

  copula(ctx) {
    // The copula is a suffix on the predicate, not a word, so there is nothing to
    // emit here — `postprocess` writes it onto the adjective.
    note(ctx.builder, 'the copula is a suffix on the predicate, not a word')
    return null
  },

  preposition(word, ctx) {
    if (word.features.governsCase) {
      note(ctx.builder, `"${word.text}" is a case suffix on the noun, not a word`)
      return null
    }
    return word.text
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) return null
    const kind = determiner.features.determinerKind
    if (kind === 'definite') {
      // Definiteness is the accusative ending on the noun, not a word.
      note(ctx.builder, 'no definite article: the accusative marks it')
      return null
    }
    if (kind === 'indefinite') return { text: 'bir', from: determiner.id }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective, np, ctx) {
    // Turkish adjectives never agree — no gender, no number, no case.
    if (ctx.role === 'predicate' && !ctx.negated) {
      const suffix = COPULA_PERSON[`${ctx.person}${ctx.number}`]
      if (suffix) {
        const form = applySuffix(adjective.text, suffix, TURKISH_HARMONY)
        note(ctx.builder, `"${form}": the copula is a suffix on the predicate`)
        return form
      }
    }
    const { plural } = agreesWith(np, ctx)
    void plural
    return adjective.text
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const definite = determiner?.features.determinerKind === 'definite'
      || determiner?.features.pronounCase === 'poss'
    const plural = determiner?.features.forcesNumber === 'pl'
    // A numeral already says how many, so the noun stays singular: "iki elma".
    const counted = determiner?.features.smallNumber === true
      || determiner?.features.determinerKind === 'quantifier'

    let text = head.text
    if (plural && !counted) text = head.features.plural ?? applySuffix(text, 'lAr', TURKISH_HARMONY)

    // A possessive is a suffix on the noun: "benim topum".
    const possessive = determiner?.features.pronounCase === 'poss'
      ? determiner.features.person === 2 ? '(I)n' : '(I)m'
      : null
    if (possessive) {
      text = applySuffix(text, possessive, TURKISH_HARMONY, { soften: true })
      note(ctx.builder, `"${text}": the possessive is a suffix`)
    }

    const suffix = caseSuffix(ctx.role, definite, ctx.preposition)
    if (suffix) {
      text = applySuffix(text, suffix, TURKISH_HARMONY, { soften: true })
      note(ctx.builder, `"${text}": ${suffix === '(y)I' ? 'the accusative marks a definite object' : 'a case suffix'}`)
    }
    // The article tile is spelled by that ending, so it belongs to this token.
    const absorbed = definite && determiner ? [determiner.id] : undefined
    return { text, merged: absorbed }
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    if (ctx.verb?.features.objectCase === 'dative' && word.features.dative) {
      note(ctx.builder, `"${word.features.dative}": the dative, governed by the verb`)
      return word.features.dative
    }
    return word.features.accusative ?? word.text
  },

  postposed(np, ctx) {
    // "ile" and the other postpositions follow their noun.
    const preposition = ctx.preposition
    if (preposition?.features.postposition && np.head) {
      return { text: preposition.text, from: preposition.id }
    }
    return null
  },

  negation(ctx: SentenceContext) {
    // There is no negative word: the verb carries it. With no verb, "değil"
    // negates the predicate instead: "Ben mutlu değilim".
    if (!ctx.verb) return { kind: 'none' }
    return { kind: 'verbForm' }
  },

  postprocess(tokens, ctx) {
    if (!ctx.negated || ctx.verb) return tokens
    // "değil" carries the person ending that the predicate would have had.
    const suffix = COPULA_PERSON[`${ctx.person}${ctx.number}`] ?? ''
    const form = suffix ? applySuffix('değil', suffix, TURKISH_HARMONY) : 'değil'
    note(ctx.builder, `"${form}": a predicate is negated with "değil"`)
    return [...tokens, { text: form, from: null }]
  },
}

/** Exported for the spec: the stem-based progressive is worth testing directly. */
export const turkishProgressive = progressive
export const turkishStack = stack
