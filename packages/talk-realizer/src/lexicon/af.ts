import type { Lexicon } from '../features'

/**
 * Afrikaans overlay. There is no gender and verbs do not inflect, so this is only
 * the irregular plurals, the mass nouns, and the object pronouns.
 */
export const afrikaansLexicon: Lexicon = {
  // "wil" needs an infinitive, and Afrikaans sends it to the end of the clause:
  // "Ek wil nie 'n appel hê nie".
  want: { pos: 'verb', verbTail: 'hê', verbTailPosition: 'clauseFinal' },
  need: { pos: 'verb', verbTail: 'hê', verbTailPosition: 'clauseFinal' },

  i: { pos: 'pronoun', accusative: 'my' },
  you: { pos: 'pronoun', accusative: 'jou' },
  we: { pos: 'pronoun', accusative: 'ons' },
  he: { pos: 'pronoun', accusative: 'hom' },
  she: { pos: 'pronoun', accusative: 'haar' },
  they: { pos: 'pronoun', accusative: 'hulle' },

  water: { pos: 'noun', mass: true },
  milk: { pos: 'noun', mass: true },
  bread: { pos: 'noun', mass: true },
  rice: { pos: 'noun', mass: true },
  cheese: { pos: 'noun', mass: true },
  music: { pos: 'noun', mass: true },
  paper: { pos: 'noun', mass: true },
  juice: { pos: 'noun', mass: true },
  fruit: { pos: 'noun', mass: true },
  hair: { pos: 'noun', mass: true },

  apple: { pos: 'noun', plural: 'appels' },
  book: { pos: 'noun', plural: 'boeke' },
  cookie: { pos: 'noun', plural: 'koekies' },
  ball: { pos: 'noun', plural: 'balle' },
  egg: { pos: 'noun', plural: 'eiers' },
  car: { pos: 'noun', plural: 'karre' },
  hand: { pos: 'noun', plural: 'hande' },
  foot: { pos: 'noun', plural: 'voete' },
  tooth: { pos: 'noun', plural: 'tande' },
  school: { pos: 'noun', plural: 'skole', institutional: true },
  home: { pos: 'noun', proper: true, institutional: true },
  bed: { pos: 'noun', institutional: true },

  not: { pos: 'negation' },
}
