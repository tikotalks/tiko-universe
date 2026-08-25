import type { Lexicon } from '../features'

/**
 * Korean overlay: structure only. Particles are computed from the sound of the
 * word they attach to, so nothing here needs to spell them out.
 */
export const koreanLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: '나' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: '너' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: '우리' },
  he: { pos: 'pronoun', person: 3, number: 'sg' },
  she: { pos: 'pronoun', person: 3, number: 'sg' },
  they: { pos: 'pronoun', person: 3, number: 'pl' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: '나' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },
  a: { pos: 'determiner', determinerKind: 'indefinite' },
  the: { pos: 'determiner', determinerKind: 'definite' },
  this: { pos: 'determiner', determinerKind: 'demonstrative' },
  that: { pos: 'determiner', determinerKind: 'demonstrative' },
  some: { pos: 'determiner', determinerKind: 'quantifier' },
  one: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'sg' },
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', attributive: '두' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', attributive: '세' },
  many: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  little: { pos: 'determiner', determinerKind: 'quantifier' },
  // "큰" is attributive; only the finite form can end a sentence.
  big: { pos: 'adjective', predicative: '커' },

  not: { pos: 'negation' },
}
