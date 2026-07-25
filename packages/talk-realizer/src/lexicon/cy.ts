import type { Lexicon } from '../features'

/**
 * Welsh overlay. Two things a rule cannot know: which nouns are **feminine**,
 * because that is what triggers the mutation after the article, and which verbs
 * take no "yn" ("eisiau", "angen").
 */
export const welshLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'fi' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'ti' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'ni' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'e' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'hi' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'nhw' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'fi' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // "dau" is masculine, "dwy" feminine, and "dwy" softens the noun after it.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'dwy' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'tair' },

  // "eisiau" and "angen" are nouns doing a verb's work, so they take no "yn".
  want: { pos: 'verb', verbTail: 'eisiau', verbTailPosition: 'afterVerb' },
  need: { pos: 'verb', verbTail: 'angen', verbTailPosition: 'afterVerb' },

  // Feminine nouns: the article softens them, and so do their adjectives.
  chair: { pos: 'noun', gender: 'feminine' },
  table: { pos: 'noun', gender: 'feminine' },
  book: { pos: 'noun', gender: 'masculine', plural: 'llyfrau' },
  ball: { pos: 'noun', gender: 'feminine', plural: 'peli' },
  bed: { pos: 'noun', gender: 'masculine', institutional: true },
  school: { pos: 'noun', gender: 'feminine', institutional: true },
  home: { pos: 'noun', gender: 'masculine', institutional: true, proper: true },
  garden: { pos: 'noun', gender: 'feminine' },
  door: { pos: 'noun', gender: 'masculine' },
  window: { pos: 'noun', gender: 'feminine' },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  sister: { pos: 'noun', gender: 'feminine', animate: true },
  friend: { pos: 'noun', gender: 'masculine', animate: true, plural: 'ffrindiau' },
  cookie: { pos: 'noun', gender: 'feminine', plural: 'bisgedi' },
  apple: { pos: 'noun', gender: 'masculine', plural: 'afalau' },
  egg: { pos: 'noun', gender: 'masculine', plural: 'wyau' },
  car: { pos: 'noun', gender: 'masculine' },
  park: { pos: 'noun', gender: 'masculine' },

  water: { pos: 'noun', gender: 'masculine', mass: true },
  milk: { pos: 'noun', gender: 'masculine', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },

  not: { pos: 'negation' },
}
