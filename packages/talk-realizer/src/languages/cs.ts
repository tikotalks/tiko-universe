import { createSlavic } from '../morphology/slavic-rules'

/**
 * Czech. Two things separate it from the Slavic languages already here:
 *
 * - **the negation is written onto the verb** — "nechci", "nemám", one word, so
 *   the token the child's tile maps to is the verb itself;
 * - **no genitive of negation**: "nechci jablko" keeps the accusative. The
 *   genitive survives only in literary Czech.
 *
 * Marked `beta`: five of seven cases are modelled — the instrumental and vocative
 * are not — and the vocabulary was generated against the shared concept ids.
 */
export const czech = createSlavic({
  language: 'cs',
  maturity: 'beta',
  negation: 'ne',
  negationPrefix: true,
  copulaNegated: {
    '1sg': 'nejsem', '2sg': 'nejsi', '3sg': 'není', '1pl': 'nejsme', '2pl': 'nejste', '3pl': 'nejsou',
  },
  clitics: true,
  copula: {
    '1sg': 'jsem', '2sg': 'jsi', '3sg': 'je', '1pl': 'jsme', '2pl': 'jste', '3pl': 'jsou',
  },
  functionWords: ['ne', 'jsem', 'jsi', 'je', 'jsme', 'jste', 'jsou'],
  notes: 'The negation is a prefix on the verb. Five of seven cases are modelled; the instrumental and vocative are not. Verb persons beyond the first singular are curated. Vocabulary was generated against the shared concept ids and needs review by a Czech speaker.',
})
