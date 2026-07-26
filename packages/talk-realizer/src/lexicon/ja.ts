import type { Lexicon } from '../features'

/**
 * Japanese overlay. The pack's tiles are plain forms, so this carries the
 * structural facts (possessives, quantifiers) and the negatives that the rule
 * would get wrong.
 */
export const japaneseLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg' },
  you: { pos: 'pronoun', person: 2, number: 'sg' },
  we: { pos: 'pronoun', person: 1, number: 'pl' },
  he: { pos: 'pronoun', person: 3, number: 'sg' },
  she: { pos: 'pronoun', person: 3, number: 'sg' },
  they: { pos: 'pronoun', person: 3, number: 'pl' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc' },
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

  // すき and ひつよう are not verbs but noun-adjectives; negation differs.
  like: { pos: 'verb', forms: { negative: 'すきじゃない' } },
  need: { pos: 'verb', forms: { negative: 'ひつようじゃない' } },
  have: { pos: 'verb', forms: { negative: 'もってない' } },
  want: { pos: 'verb', forms: { negative: 'ほしくない' } },

  not: { pos: 'negation' },
}
