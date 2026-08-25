import { createSlavic } from '../morphology/slavic-rules'

/**
 * Belarusian. East Slavic, like Russian and Ukrainian: no articles, no present
 * copula, the genitive of negation, animacy in the masculine accusative. Its own
 * endings throughout, and the orthography writes what is actually pronounced —
 * unstressed o becomes a, which is why the adjectives end in -ая rather than -ой.
 */
export const belarusian = createSlavic({
  language: 'be',
  maturity: 'beta',
  genitiveOfNegation: true,
  negation: 'не',
  // "Я шчаслівы" is a complete sentence.
  copula: null,
  functionWords: ['не', 'няма'],
  notes: 'Belarusian takes the nominative plural after two and three, not the genitive singular that Russian and Ukrainian use. Five cases are modelled; the instrumental is not. Verb persons beyond the first singular are curated. Vocabulary was generated against the shared concept ids and needs review by a Belarusian speaker.',
})
