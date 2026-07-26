import type { Lexicon } from '../features'

/**
 * Vietnamese overlay: structure, plus the classifiers a child's vocabulary
 * actually needs. Fruit takes "quả", flat things "tấm", books "quyển", animals
 * "con" — using "cái" for all of them is understandable but childish.
 */
export const vietnameseLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg' },
  you: { pos: 'pronoun', person: 2, number: 'sg' },
  we: { pos: 'pronoun', person: 1, number: 'pl' },
  he: { pos: 'pronoun', person: 3, number: 'sg' },
  she: { pos: 'pronoun', person: 3, number: 'sg' },
  they: { pos: 'pronoun', person: 3, number: 'pl' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // Classifiers
  apple: { pos: 'noun', measureWord: 'quả' },
  banana: { pos: 'noun', measureWord: 'quả' },
  egg: { pos: 'noun', measureWord: 'quả' },
  book: { pos: 'noun', measureWord: 'quyển' },
  paper: { pos: 'noun', measureWord: 'tờ', mass: true },
  picture: { pos: 'noun', measureWord: 'bức' },
  car: { pos: 'noun', measureWord: 'chiếc' },
  bike: { pos: 'noun', measureWord: 'chiếc' },
  bus: { pos: 'noun', measureWord: 'chiếc' },
  cookie: { pos: 'noun', measureWord: 'cái' },
  ball: { pos: 'noun', measureWord: 'quả' },
  teddy: { pos: 'noun', measureWord: 'con' },
  doll: { pos: 'noun', measureWord: 'con' },

  water: { pos: 'noun', mass: true },
  milk: { pos: 'noun', mass: true },
  rice: { pos: 'noun', mass: true },
  bread: { pos: 'noun', mass: true },
  music: { pos: 'noun', mass: true },
  home: { pos: 'noun', proper: true, institutional: true },
  school: { pos: 'noun', institutional: true },

  not: { pos: 'negation' },
}
