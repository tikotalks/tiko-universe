import { createSlavic } from '../morphology/slavic-rules'

/**
 * Latvian. Baltic, like Lithuanian, with shorter endings and a masculine
 * nominative in -s that every other case replaces: "draugs" but "draugu",
 * "draugam". The copula is used in the present, unlike Lithuanian's.
 */
export const latvian = createSlavic({
  language: 'lv',
  maturity: 'beta',
  negation: 'ne',
  negationPrefix: true,
  copula: {
    '1sg': 'esmu', '2sg': 'esi', '3sg': 'ir', '1pl': 'esam', '2pl': 'esat', '3pl': 'ir',
  },
  functionWords: ['ne', 'esmu', 'esi', 'ir', 'esam', 'esat'],
  notes: 'Five of seven cases are modelled; the instrumental and vocative are not. The definite/indefinite adjective distinction is not modelled. The negation prefixes the verb. Vocabulary was generated against the shared concept ids and needs review by a Latvian speaker.',
})
