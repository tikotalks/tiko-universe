import type { Lexicon } from '../features'

/**
 * Irish overlay. What a rule cannot know: which nouns are **feminine**, because
 * that decides whether the article lenites them, and which words are sensations
 * that sit on a person rather than describing them.
 */
export const irishLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg' },
  you: { pos: 'pronoun', person: 2, number: 'sg' },
  we: { pos: 'pronoun', person: 1, number: 'pl' },
  he: { pos: 'pronoun', person: 3, number: 'sg' },
  she: { pos: 'pronoun', person: 3, number: 'sg' },
  they: { pos: 'pronoun', person: 3, number: 'pl' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // "dhá" lenites the noun it counts.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', lenites: true },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },

  // cabhrú governs "le": "ag cabhrú liom".
  help: { pos: 'verb', objectPreposition: 'le' },

  // Sensations sit on you: "Tá ocras orm."
  hungry: { pos: 'adjective', sensation: 'ocras' },
  thirsty: { pos: 'adjective', sensation: 'tart' },
  scared: { pos: 'adjective', sensation: 'eagla' },
  sorry: { pos: 'social' },

  // Feminine nouns, which the article lenites.
  hand: { pos: 'noun', gender: 'feminine' },
  foot: { pos: 'noun', gender: 'feminine' },
  ear: { pos: 'noun', gender: 'feminine' },
  eye: { pos: 'noun', gender: 'feminine' },
  tooth: { pos: 'noun', gender: 'feminine' },
  school: { pos: 'noun', gender: 'feminine', institutional: true },
  chair: { pos: 'noun', gender: 'feminine' },
  bed: { pos: 'noun', gender: 'feminine', institutional: true },
  window: { pos: 'noun', gender: 'feminine' },
  park: { pos: 'noun', gender: 'feminine' },
  ball: { pos: 'noun', gender: 'feminine', plural: 'liathróidí' },
  cookie: { pos: 'noun', gender: 'masculine', plural: 'brioscaí' },
  book: { pos: 'noun', gender: 'masculine', plural: 'leabhair' },
  egg: { pos: 'noun', gender: 'feminine', plural: 'uibheacha' },
  apple: { pos: 'noun', gender: 'masculine', plural: 'úlla' },
  friend: { pos: 'noun', gender: 'masculine', animate: true, plural: 'cairde' },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  home: { pos: 'noun', gender: 'masculine', institutional: true, proper: true },
  garden: { pos: 'noun', gender: 'masculine' },
  table: { pos: 'noun', gender: 'masculine' },

  water: { pos: 'noun', gender: 'masculine', mass: true },
  milk: { pos: 'noun', gender: 'masculine', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'feminine', mass: true },
  rice: { pos: 'noun', gender: 'feminine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'masculine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },

  not: { pos: 'negation' },
}
