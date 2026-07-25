import { createSlavic } from '../morphology/slavic-rules'

/**
 * Croatian. The same grammar as Serbian with its own vocabulary — "kruh" not
 * "хлеб", "mlijeko" not "млеко" — and Latin script. No genitive of negation.
 */
export const croatian = createSlavic({
  language: 'hr',
  maturity: 'beta',
  paucalGenitive: true,
  negation: 'ne',
  copulaNegated: {
    '1sg': 'nisam', '2sg': 'nisi', '3sg': 'nije', '1pl': 'nismo', '2pl': 'niste', '3pl': 'nisu',
  },
  clitics: true,
  copula: {
    '1sg': 'sam', '2sg': 'si', '3sg': 'je', '1pl': 'smo', '2pl': 'ste', '3pl': 'su',
  },
  functionWords: ['ne', 'sam', 'si', 'je', 'smo', 'ste', 'su'],
  notes: 'Five cases are modelled, the instrumental and vocative are not. Verb persons beyond the first singular are curated. Vocabulary was generated against the shared concept ids and needs review by a Croatian speaker.',
})
