import { createSlavic } from '../morphology/slavic-rules'

/**
 * Bosnian. The same grammar as Croatian and Serbian — the three are one system
 * with three vocabularies and, for Serbian, a second script. Bosnian's own choices
 * show in the words ("hljeb", "kupatilo"), not in the endings.
 */
export const bosnian = createSlavic({
  language: 'bs',
  maturity: 'beta',
  negation: 'ne',
  clitics: true,
  copula: {
    '1sg': 'sam', '2sg': 'si', '3sg': 'je', '1pl': 'smo', '2pl': 'ste', '3pl': 'su',
  },
  copulaNegated: {
    '1sg': 'nisam', '2sg': 'nisi', '3sg': 'nije', '1pl': 'nismo', '2pl': 'niste', '3pl': 'nisu',
  },
  paucalGenitive: true,
  functionWords: ['ne', 'sam', 'si', 'je', 'smo', 'ste', 'su'],
  notes: 'Five cases are modelled, the instrumental and vocative are not. Verb persons beyond the first singular are curated. Vocabulary was generated against the shared concept ids and needs review by a Bosnian speaker.',
})
