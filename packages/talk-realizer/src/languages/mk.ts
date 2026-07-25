import { createBalkanSlavic } from '../morphology/balkan-slavic'

/**
 * Macedonian. Bulgarian's grammar with its own suffixes and one simplification:
 * there is no full/short split in the masculine article, so "-от" is written
 * wherever the noun stands. (Macedonian actually has three articles — "-от",
 * "-ов" and "-он", marking distance the way "this" and "that" do. Only the
 * neutral "-от" is generated; the deictic pair would need a tile to trigger it,
 * and Talk has none.)
 */
export const macedonian = createBalkanSlavic({
  language: 'mk',
  maturity: 'beta',
  negation: 'не',
  copula: { '1sg': 'сум', '2sg': 'си', '3sg': 'е', '1pl': 'сме', '2pl': 'сте', '3pl': 'се' },
  copulaPast: { '1sg': 'бев', '2sg': 'беше', '3sg': 'беше', '1pl': 'бевме', '2pl': 'бевте', '3pl': 'беа' },
  article: {
    masculineFull: 'от', masculineShort: 'от',
    masculineSoftFull: 'от', masculineSoftShort: 'от',
    feminine: 'та', neuter: 'то',
    plural: 'те', pluralA: 'та',
    adjectiveMasculineFull: 'иот', adjectiveMasculineShort: 'иот',
  },
  fullShortDistinction: false,
  functionWords: ['сум', 'си', 'е', 'сме', 'сте', 'се', 'бев', 'беше', 'беа', 'не'],
  notes: 'Only the neutral definite article "-от" is generated; the deictic "-ов" and "-он" would need tiles Talk does not have. Verb persons beyond the first singular are curated. Vocabulary was generated against the shared concept ids and needs review by a Macedonian speaker.',
})
