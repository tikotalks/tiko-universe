import type { Lexicon } from '../features'

/**
 * Maltese overlay. Gender is induced (-a is feminine), so this carries the
 * pronouns, the determiners, the verbs whose other persons the prefix rule gets
 * wrong, and the broken plurals of the words a child uses most.
 */
export const malteseLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'lili' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'lilek' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'lilna' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'lilu' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'lilha' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'lilhom' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  a: { pos: 'determiner', determinerKind: 'indefinite' },
  the: { pos: 'determiner', determinerKind: 'definite' },
  this: { pos: 'determiner', determinerKind: 'demonstrative' },
  that: { pos: 'determiner', determinerKind: 'demonstrative' },
  some: { pos: 'determiner', determinerKind: 'quantifier' },
  one: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'sg' },
  // Maltese counts with dedicated forms before a noun.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', attributive: 'żewġ' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', attributive: 'tliet' },
  many: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  little: { pos: 'determiner', determinerKind: 'quantifier' },
  big: { pos: 'adjective', feminine: 'kbira' },

  // Verbs where the prefix rule needs help
  want: { pos: 'verb', forms: { '1sg': 'irrid', '2sg': 'trid', '3sg': 'irid', '1pl': 'irridu', '3pl': 'iridu' } },
  have: { pos: 'verb', forms: { '1sg': 'għandi', '2sg': 'għandek', '3sg': 'għandu', '1pl': 'għandna', '3pl': 'għandhom' } },
  need: { pos: 'verb', forms: { '1sg': 'għandi bżonn', '2sg': 'għandek bżonn', '3sg': 'għandu bżonn', '1pl': 'għandna bżonn', '3pl': 'għandhom bżonn' } },
  go: { pos: 'verb', forms: { '1sg': 'immur', '2sg': 'tmur', '3sg': 'imur', '1pl': 'immorru', '3pl': 'imorru' } },
  eat: { pos: 'verb', forms: { '1sg': 'niekol', '2sg': 'tiekol', '3sg': 'jiekol', '1pl': 'nieklu', '3pl': 'jieklu' } },
  drink: { pos: 'verb', forms: { '1sg': 'nixrob', '2sg': 'tixrob', '3sg': 'jixrob', '1pl': 'nixorbu', '3pl': 'jixorbu' } },
  like: { pos: 'verb', forms: { '1sg': 'inħobb', '2sg': 'tħobb', '3sg': 'iħobb', '1pl': 'inħobbu', '3pl': 'iħobbu' } },
  see: { pos: 'verb', forms: { '1sg': 'nara', '2sg': 'tara', '3sg': 'jara', '1pl': 'naraw', '3pl': 'jaraw' } },
  play: { pos: 'verb', forms: { '1sg': 'nilgħab', '2sg': 'tilgħab', '3sg': 'jilgħab', '1pl': 'nilagħbu', '3pl': 'jilagħbu' } },
  help: { pos: 'verb', forms: { '1sg': 'ngħin', '2sg': 'tgħin', '3sg': 'jgħin', '1pl': 'ngħinu', '3pl': 'jgħinu' } },
  sleep: { pos: 'verb', forms: { '1sg': 'norqod', '2sg': 'torqod', '3sg': 'jorqod', '1pl': 'norqdu', '3pl': 'jorqdu' } },

  // Adjective feminines that are not base + a
  happy: { pos: 'adjective', feminine: 'ferħana' },
  sad: { pos: 'adjective', feminine: 'imdejqa' },
  tired: { pos: 'adjective', feminine: 'għajjiena' },
  cold: { pos: 'adjective', feminine: 'kiesħa' },
  hot: { pos: 'adjective', feminine: 'sħuna' },
  small: { pos: 'adjective', feminine: 'ċkejkna' },

  // Mass nouns and the broken plurals of common words
  water: { pos: 'noun', gender: 'masculine', mass: true },
  milk: { pos: 'noun', gender: 'masculine', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  apple: { pos: 'noun', gender: 'feminine', plural: 'tuffieħ' },
  egg: { pos: 'noun', gender: 'feminine', plural: 'bajd' },
  book: { pos: 'noun', gender: 'masculine', plural: 'kotba' },
  cookie: { pos: 'noun', gender: 'feminine', plural: 'gallettini' },
  ball: { pos: 'noun', gender: 'feminine', plural: 'blalen' },
  school: { pos: 'noun', gender: 'feminine', institutional: true },
  home: { pos: 'noun', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'masculine', institutional: true },

  not: { pos: 'negation' },
}
