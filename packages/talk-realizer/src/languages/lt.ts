import { createSlavic } from '../morphology/slavic-rules'

/**
 * Lithuanian. Not Slavic — Baltic, the most conservative Indo-European branch
 * alive — but built the same way here, because the shape of the problem is
 * identical: seven cases, no articles, adjectives agreeing in gender, number and
 * case, and a copula that is usually left out in the present.
 *
 * What is Lithuanian's own: the masculine nominative ends in a whole syllable
 * (-as, -is, -us) that the other cases replace, so its endings strip two letters
 * where Slavic strips one or none.
 */
export const lithuanian = createSlavic({
  language: 'lt',
  maturity: 'beta',
  genitiveOfNegation: true,
  negation: 'ne',
  negationPrefix: true,
  copula: {
    '1sg': 'esu', '2sg': 'esi', '3sg': 'yra', '1pl': 'esame', '2pl': 'esate', '3pl': 'yra',
  },
  copulaNegated: {
    '1sg': 'nesu', '2sg': 'nesi', '3sg': 'nėra', '1pl': 'nesame', '2pl': 'nesate', '3pl': 'nėra',
  },
  functionWords: ['ne', 'esu', 'esi', 'yra', 'esame', 'esate'],
  notes: 'Five of seven cases are modelled; the instrumental and vocative are not. The negation prefixes the verb. Verb persons beyond the first singular are curated. Vocabulary was generated against the shared concept ids and needs review by a Lithuanian speaker.',
})
