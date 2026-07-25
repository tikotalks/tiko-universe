import type { Lexicon } from '../features'

/**
 * Galician overlay: the irregular verbs, the mass nouns and the gender the
 * ending rule gets wrong.
 */
export const galicianLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'me' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'te' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'nos' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'o' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'a' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'os' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'me' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss', feminine: 'miña' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss', feminine: 'túa' },

  want: { pos: 'verb', forms: { '1sg': 'quero', '2sg': 'queres', '3sg': 'quere', '1pl': 'queremos', '3pl': 'queren' } },
  have: { pos: 'verb', forms: { '1sg': 'teño', '2sg': 'tes', '3sg': 'ten', '1pl': 'temos', '3pl': 'teñen' } },
  go: { pos: 'verb', forms: { '1sg': 'vou', '2sg': 'vas', '3sg': 'vai', '1pl': 'imos', '3pl': 'van' } },
  come: { pos: 'verb', forms: { '1sg': 'veño', '2sg': 'vés', '3sg': 'vén', '1pl': 'vimos', '3pl': 'veñen' } },
  see: { pos: 'verb', forms: { '1sg': 'vexo', '2sg': 'ves', '3sg': 've', '1pl': 'vemos', '3pl': 'ven' } },
  eat: { pos: 'verb', forms: { '1sg': 'como', '2sg': 'comes', '3sg': 'come', '1pl': 'comemos', '3pl': 'comen' } },
  read: { pos: 'verb', forms: { '1sg': 'leo', '2sg': 'les', '3sg': 'le', '1pl': 'lemos', '3pl': 'len' } },
  sleep: { pos: 'verb', forms: { '1sg': 'durmo', '2sg': 'dormes', '3sg': 'dorme', '1pl': 'durmimos', '3pl': 'dormen' } },
  // Galician puts the experiencer clitic on the verb: "gústame o pan". The form
  // is keyed by the experiencer's person, because the clitic is inside it.
  like: {
    pos: 'verb',
    experiencerDative: true,
    forms: { '1sg': 'gústame', '2sg': 'gústache', '3sg': 'gústalle', '1pl': 'gústanos', '3pl': 'gústalles' },
  },

  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'masculine', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  fruit: { pos: 'noun', gender: 'feminine', mass: true },

  apple: { pos: 'noun', gender: 'feminine', plural: 'mazás' },
  hand: { pos: 'noun', gender: 'feminine', plural: 'mans' },
  school: { pos: 'noun', gender: 'feminine', institutional: true },
  home: { pos: 'noun', gender: 'feminine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'feminine', institutional: true },
  cookie: { pos: 'noun', gender: 'feminine', plural: 'galletas' },
  ball: { pos: 'noun', gender: 'feminine', plural: 'pelotas' },
  egg: { pos: 'noun', gender: 'masculine', plural: 'ovos' },
  book: { pos: 'noun', gender: 'masculine', plural: 'libros' },
  car: { pos: 'noun', gender: 'masculine', plural: 'coches' },

  big: { pos: 'adjective', feminine: 'grande' },
  small: { pos: 'adjective', feminine: 'pequena' },
  happy: { pos: 'adjective', feminine: 'contenta' },

  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'dúas' },

  not: { pos: 'negation' },
}
