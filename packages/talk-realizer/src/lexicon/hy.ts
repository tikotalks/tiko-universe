import type { Lexicon } from '../features'

/**
 * Armenian overlay: structure, plus the verbs whose participle is not simply
 * "stem + ում".
 */
export const armenianLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'ինձ' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'քեզ' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'մեզ' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'նրան' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'նրան' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'նրանց' },
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

  // "ունենալ" is irregular: the present is "ունեմ", with no participle.
  have: { pos: 'verb', forms: { '1sg': 'ունեմ', '2sg': 'ունես', '3sg': 'ունի', '1pl': 'ունենք', '3pl': 'ունեն' } },
  // "պետք" is already a predicate, not an infinitive.
  need: { pos: 'verb', forms: { '1sg': 'պետք', '2sg': 'պետք', '3sg': 'պետք', '1pl': 'պետք', '3pl': 'պետք' } },
  come: { pos: 'verb', forms: { '1sg': 'գալիս' } },

  water: { pos: 'noun', mass: true },
  milk: { pos: 'noun', mass: true },
  bread: { pos: 'noun', mass: true },
  rice: { pos: 'noun', mass: true },
  apple: { pos: 'noun', plural: 'խնձորներ' },
  book: { pos: 'noun', plural: 'գրքեր' },
  school: { pos: 'noun', institutional: true },
  home: { pos: 'noun', proper: true, institutional: true },

  not: { pos: 'negation' },
}
