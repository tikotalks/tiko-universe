import { createSlavic } from '../morphology/slavic-rules'

/**
 * Polish. Like Russian it has no articles, but unlike Russian it has a present
 * copula ("jestem szczęśliwy"). Its genitive of negation is obligatory, which
 * makes it the clearest demonstration of the rule: "chcę jabłko" but "nie chcę
 * jabłka".
 *
 * Marked `beta`: nominative, accusative and genitive are modelled, with the
 * animacy split in the masculine accusative. The other four cases are not, so
 * prepositional phrases carry a note. Verb persons beyond the first singular are
 * curated.
 */
export const polish = createSlavic({
  language: 'pl',
  maturity: 'beta',
  negation: 'nie',
  copula: {
    '1sg': 'jestem', '2sg': 'jesteś', '3sg': 'jest',
    '1pl': 'jesteśmy', '2pl': 'jesteście', '3pl': 'są',
  },
  functionWords: ['nie', 'jestem', 'jesteś', 'jest', 'jesteśmy', 'są'],
  notes: 'Nominative, accusative and genitive only — the other four cases are not generated, and case after a preposition is left unmarked with a note. Verb persons are curated rather than derived. Vocabulary was generated against the shared concept ids and needs review by a Polish speaker.',
})
