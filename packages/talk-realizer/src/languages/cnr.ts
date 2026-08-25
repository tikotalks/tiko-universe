import { createSlavic } from '../morphology/slavic-rules'

/**
 * Montenegrin. The fourth vocabulary of the one grammar Serbian, Croatian and
 * Bosnian share, written here in the Latin script that dominates in Montenegro.
 * Its own choices are lexical — "hljeb", "gdje" — and it keeps the three
 * consonants (ś, ź, з́) the 2009 orthography added, which this vocabulary does not
 * use because the words a child needs do not contain them.
 */
export const montenegrin = createSlavic({
  language: 'cnr',
  maturity: 'beta',
  negation: 'ne',
  clitics: true,
  paucalGenitive: true,
  copula: {
    '1sg': 'sam', '2sg': 'si', '3sg': 'je', '1pl': 'smo', '2pl': 'ste', '3pl': 'su',
  },
  copulaNegated: {
    '1sg': 'nisam', '2sg': 'nisi', '3sg': 'nije', '1pl': 'nismo', '2pl': 'niste', '3pl': 'nisu',
  },
  functionWords: ['ne', 'sam', 'si', 'je', 'smo', 'ste', 'su'],
  notes: 'Five cases are modelled, the instrumental and vocative are not. Vocabulary was generated against the shared concept ids and needs review by a Montenegrin speaker.',
})
