import type { Lexicon } from '../features'

/**
 * Spanish overlay. Gender and plurals come from the ending (Spanish is regular),
 * so this carries the stem-changing verbs, the reflexives, the mass nouns and
 * the handful of gender exceptions.
 */
export const spanishLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'me' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'te' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'nos' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'lo' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'la' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'los' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'me' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  a: { pos: 'determiner', determinerKind: 'indefinite' },
  the: { pos: 'determiner', determinerKind: 'definite' },
  this: { pos: 'determiner', determinerKind: 'demonstrative' },
  that: { pos: 'determiner', determinerKind: 'demonstrative' },
  some: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  one: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'sg' },
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  many: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  little: { pos: 'determiner', determinerKind: 'quantifier' },
  big: { pos: 'adjective' },

  // Stem-changing and irregular verbs
  want: { pos: 'verb', forms: { '1sg': 'quiero', '2sg': 'quieres', '3sg': 'quiere', '1pl': 'queremos', '3pl': 'quieren', past: 'quería' } },
  like: { pos: 'verb', experiencerDative: true, forms: { '3sg': 'gusta', '3pl': 'gustan', past: 'gustaba' } },
  feel: { pos: 'verb', forms: { '1sg': 'siento', '2sg': 'sientes', '3sg': 'siente', '1pl': 'sentimos', '3pl': 'sienten' } },
  see: { pos: 'verb', forms: { '1sg': 'veo', '2sg': 'ves', '3sg': 've', '1pl': 'vemos', '3pl': 'ven' } },
  hear: { pos: 'verb', forms: { '1sg': 'oigo', '2sg': 'oyes', '3sg': 'oye', '1pl': 'oímos', '3pl': 'oyen' } },
  have: { pos: 'verb', forms: { '1sg': 'tengo', '2sg': 'tienes', '3sg': 'tiene', '1pl': 'tenemos', '3pl': 'tienen' } },
  go: { pos: 'verb', forms: { '1sg': 'voy', '2sg': 'vas', '3sg': 'va', '1pl': 'vamos', '3pl': 'van' } },
  come: { pos: 'verb', forms: { '1sg': 'vengo', '2sg': 'vienes', '3sg': 'viene', '1pl': 'venimos', '3pl': 'vienen' } },
  play: { pos: 'verb', forms: { '1sg': 'juego', '2sg': 'juegas', '3sg': 'juega', '1pl': 'jugamos', '3pl': 'juegan' } },
  sit: { pos: 'verb', forms: { '1sg': 'me siento', '2sg': 'te sientas', '3sg': 'se sienta', '1pl': 'nos sentamos', '3pl': 'se sientan' } },
  stand: { pos: 'verb', forms: { '1sg': 'me paro', '2sg': 'te paras', '3sg': 'se para', '1pl': 'nos paramos', '3pl': 'se paran' } },
  start: { pos: 'verb', forms: { '1sg': 'empiezo', '2sg': 'empiezas', '3sg': 'empieza', '1pl': 'empezamos', '3pl': 'empiezan' } },
  choose: { pos: 'verb', forms: { '1sg': 'elijo', '2sg': 'eliges', '3sg': 'elige', '1pl': 'elegimos', '3pl': 'eligen' } },
  close: { pos: 'verb', forms: { '1sg': 'cierro', '2sg': 'cierras', '3sg': 'cierra', '1pl': 'cerramos', '3pl': 'cierran' } },
  sleep: { pos: 'verb', forms: { '1sg': 'duermo', '2sg': 'duermes', '3sg': 'duerme', '1pl': 'dormimos', '3pl': 'duermen' } },

  // Mass nouns and gender exceptions
  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'feminine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },
  fruit: { pos: 'noun', gender: 'feminine', mass: true },
  school: { pos: 'noun', gender: 'masculine', institutional: true },
  bed: { pos: 'noun', gender: 'feminine', institutional: true },
  home: { pos: 'noun', proper: true, institutional: true },
  hand: { pos: 'noun', gender: 'feminine' },
  hair: { pos: 'noun', gender: 'masculine', mass: true },
  heart: { pos: 'noun', gender: 'masculine' },
  light: { pos: 'noun', gender: 'feminine', mass: true },
  car: { pos: 'noun', gender: 'masculine' },
  bus: { pos: 'noun', gender: 'masculine' },
  train: { pos: 'noun', gender: 'masculine' },

  not: { pos: 'negation' },
}
