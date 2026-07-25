import { createSlavic } from '../morphology/slavic-rules'

/**
 * Serbian, in Cyrillic. The case system of Russian with a present copula like
 * Polish, and **no genitive of negation**: "не желим јабуку" keeps the accusative,
 * which is the one place BCS parts company with the East Slavic languages.
 *
 * Marked `beta`: the Latin orthography Serbian also uses is not generated — a
 * child sees the script their pack ships. Croatian is the same grammar with its
 * own words and Latin script.
 */
export const serbian = createSlavic({
  language: 'sr',
  maturity: 'beta',
  paucalGenitive: true,
  negation: 'не',
  copulaNegated: {
    '1sg': 'нисам', '2sg': 'ниси', '3sg': 'није', '1pl': 'нисмо', '2pl': 'нисте', '3pl': 'нису',
  },
  clitics: true,
  copula: {
    '1sg': 'сам', '2sg': 'си', '3sg': 'је', '1pl': 'смо', '2pl': 'сте', '3pl': 'су',
  },
  functionWords: ['не', 'сам', 'си', 'је', 'смо', 'сте', 'су'],
  notes: 'Cyrillic only; the Latin orthography is not generated. Five cases are modelled, the instrumental and vocative are not. Verb persons beyond the first singular are curated. Vocabulary was generated against the shared concept ids and needs review by a Serbian speaker.',
})
