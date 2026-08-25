import type { Lexicon } from '../features'

/**
 * Chinese overlay. Nothing inflects, so this carries only structure: which tiles
 * are possessives, which are quantifiers, and the measure words that counting
 * needs.
 */
export const chineseLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: '我' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: '你' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: '我们' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: '他' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: '她' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: '他们' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: '我' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },
  a: { pos: 'determiner', determinerKind: 'indefinite' },
  the: { pos: 'determiner', determinerKind: 'definite' },
  this: { pos: 'determiner', determinerKind: 'demonstrative' },
  that: { pos: 'determiner', determinerKind: 'demonstrative' },
  some: { pos: 'determiner', determinerKind: 'quantifier' },
  one: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'sg' },
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  many: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  little: { pos: 'determiner', determinerKind: 'quantifier' },
  big: { pos: 'adjective' },

  // Measure words a child needs; everything else falls back to 个.
  bread: { pos: 'noun', measureWord: '片' },
  book: { pos: 'noun', measureWord: '本' },
  cookie: { pos: 'noun', measureWord: '块' },
  water: { pos: 'noun', mass: true, measureWord: '杯' },
  milk: { pos: 'noun', mass: true, measureWord: '杯' },
  car: { pos: 'noun', measureWord: '辆' },
  bus: { pos: 'noun', measureWord: '辆' },
  paper: { pos: 'noun', measureWord: '张' },
  picture: { pos: 'noun', measureWord: '张' },

  not: { pos: 'negation' },
}
