import { createSlavic } from '../morphology/slavic-rules'

/**
 * Russian. No articles and no present-tense copula: "я счастлив" is a complete
 * sentence, and "я хочу яблоко" needs no word for "an". What an article does in
 * English, a case ending does here.
 *
 * Marked `beta`: nominative, accusative and genitive are modelled, including the
 * genitive of negation and the animacy split in the masculine accusative. The
 * instrumental, dative and locative are not, so prepositional phrases carry a
 * note instead of an ending. Verb persons beyond the first singular are curated.
 */
export const russian = createSlavic({
  language: 'ru',
  maturity: 'beta',
  negation: 'не',
  // Russian has no present copula at all.
  copula: null,
  functionWords: ['не', 'нет'],
  notes: 'Nominative, accusative and genitive only — the instrumental, dative and locative are not generated, and case after a preposition is left unmarked with a note. Verb persons are curated rather than derived. Vocabulary was generated against the shared concept ids and needs review by a Russian speaker.',
})
