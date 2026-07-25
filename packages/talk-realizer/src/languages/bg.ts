import { createBalkanSlavic } from '../morphology/balkan-slavic'

/**
 * Bulgarian. Slavic without cases: it lost them and grew a suffixed article
 * instead, which lands on the first word of the noun phrase rather than on the
 * noun — "ябълката" alone, "голямата ябълка" with an adjective.
 *
 * The masculine has two written forms, full in the subject ("хлябът е топъл") and
 * short elsewhere ("искам хляба").
 */
export const bulgarian = createBalkanSlavic({
  language: 'bg',
  maturity: 'beta',
  negation: 'не',
  copula: { '1sg': 'съм', '2sg': 'си', '3sg': 'е', '1pl': 'сме', '2pl': 'сте', '3pl': 'са' },
  copulaPast: { '1sg': 'бях', '2sg': 'беше', '3sg': 'беше', '1pl': 'бяхме', '2pl': 'бяхте', '3pl': 'бяха' },
  article: {
    masculineFull: 'ът', masculineShort: 'а',
    masculineSoftFull: 'ят', masculineSoftShort: 'я',
    feminine: 'та', neuter: 'то',
    plural: 'те', pluralA: 'та',
    adjectiveMasculineFull: 'ият', adjectiveMasculineShort: 'ия',
  },
  fullShortDistinction: true,
  functionWords: ['съм', 'си', 'е', 'сме', 'сте', 'са', 'бях', 'беше', 'бяхме', 'бяха', 'не'],
  notes: 'The soft masculine declension is not modelled. Yes/no questions need the particle "ли", which Talk never generates, because every question it builds starts with a question word. Vocabulary needs review by a Bulgarian speaker.',
})
