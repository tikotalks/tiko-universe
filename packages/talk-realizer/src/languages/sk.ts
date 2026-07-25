import { createSlavic } from '../morphology/slavic-rules'

/**
 * Slovak. Czech's shape with its own endings and words: the negation prefixes the
 * verb ("nechcem"), there is no genitive of negation, and the masculine dative is
 * in -ovi rather than -u.
 */
export const slovak = createSlavic({
  language: 'sk',
  maturity: 'beta',
  negation: 'ne',
  negationPrefix: true,
  copulaNegated: {
    '1sg': 'nie som', '2sg': 'nie si', '3sg': 'nie je', '1pl': 'nie sme', '2pl': 'nie ste', '3pl': 'nie sú',
  },
  clitics: true,
  copula: {
    '1sg': 'som', '2sg': 'si', '3sg': 'je', '1pl': 'sme', '2pl': 'ste', '3pl': 'sú',
  },
  functionWords: ['ne', 'som', 'si', 'je', 'sme', 'ste', 'sú'],
  notes: 'The negation is a prefix on the verb. Five of six cases are modelled; the instrumental and vocative are not. Verb persons beyond the first singular are curated. Vocabulary was generated against the shared concept ids and needs review by a Slovak speaker.',
})
