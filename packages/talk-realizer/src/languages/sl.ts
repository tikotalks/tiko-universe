import { createSlavic } from '../morphology/slavic-rules'

/**
 * Slovenian. The case system with a present copula, and one thing no other
 * language in this package has: a **dual** number, for exactly two of something —
 * "midva sva" is "we two are", distinct from "mi smo" for three or more. Talk's
 * `we` tile does not say how many, so the plural is used and the dual is left
 * alone; a language that guessed would be wrong half the time.
 */
export const slovenian = createSlavic({
  language: 'sl',
  maturity: 'beta',
  negation: 'ne',
  clitics: true,
  // Slovenian uses the dual for two, whose masculine form matches the genitive
  // singular this produces: "dva piškota".
  paucalGenitive: true,
  copula: {
    '1sg': 'sem', '2sg': 'si', '3sg': 'je', '1pl': 'smo', '2pl': 'ste', '3pl': 'so',
  },
  copulaNegated: {
    '1sg': 'nisem', '2sg': 'nisi', '3sg': 'ni', '1pl': 'nismo', '2pl': 'niste', '3pl': 'niso',
  },
  functionWords: ['ne', 'sem', 'si', 'je', 'smo', 'ste', 'so'],
  notes: 'The dual is not generated: Talk\'s "we" does not say whether two or more people are meant, and Slovenian needs to know. Five of six cases are modelled; the instrumental is not. Vocabulary was generated against the shared concept ids and needs review by a Slovenian speaker.',
})
