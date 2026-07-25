import { createSlavic } from '../morphology/slavic-rules'

/**
 * Ukrainian. Like Russian in shape — no articles, no present copula, the genitive
 * of negation, animacy in the masculine accusative — and unlike it in every
 * ending: the locative is in -і, the feminine genitive in -и, and "мій" declines
 * on its own stem.
 *
 * Marked `beta`: five cases are modelled, the instrumental and vocative are not,
 * and the vocabulary was generated against the shared concept ids.
 */
export const ukrainian = createSlavic({
  language: 'uk',
  maturity: 'beta',
  genitiveOfNegation: true,
  paucalGenitive: true,
  negation: 'не',
  // "Я щасливий" is a complete sentence: no copula in the present.
  copula: null,
  functionWords: ['не', 'немає'],
  notes: 'Nominative, accusative, genitive, dative and locative are generated; the instrumental and vocative are not. Verb persons beyond the first singular are curated. Vocabulary was generated against the shared concept ids and needs review by a Ukrainian speaker.',
})
