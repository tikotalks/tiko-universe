import type { Lexicon } from '../features'

/**
 * Hungarian overlay. The nouns need almost nothing — harmony builds the plural and
 * the accusative for every tile — so what is here is the **verb stems**, from which
 * both present paradigms are generated, and the handful of nouns whose accusative
 * shortens a vowel ("víz" → "vizet").
 */
export const hungarianLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'engem', dative: 'nekem' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'téged', dative: 'neked' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'minket', dative: 'nekünk' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'őt', dative: 'neki' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'őt', dative: 'neki' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'őket', dative: 'nekik' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'engem', dative: 'nekem' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // The stem carries both paradigms: "akarok" and "akarom" come from "akar".
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', attributive: 'két' },

  want: { pos: 'verb', stem: 'akar' },
  like: { pos: 'verb', stem: 'szeret' },
  see: { pos: 'verb', stem: 'lát' },
  hear: { pos: 'verb', stem: 'hall' },
  feel: { pos: 'verb', stem: 'érez' },
  have: { pos: 'verb', stem: 'van' },
  eat: { pos: 'verb', stem: 'esz', ikVerb: true },
  drink: { pos: 'verb', stem: 'isz', ikVerb: true },
  // megy and jön are irregular: no stem rule produces "megyünk" or "jövünk".
  go: { pos: 'verb', stem: 'megy', forms: { '1sg': 'megyek', '2sg': 'mész', '3sg': 'megy', '1pl': 'megyünk', '2pl': 'mentek', '3pl': 'mennek' } },
  come: { pos: 'verb', stem: 'jön', forms: { '1sg': 'jövök', '2sg': 'jössz', '3sg': 'jön', '1pl': 'jövünk', '2pl': 'jöttök', '3pl': 'jönnek' } },
  play: { pos: 'verb', stem: 'játsz', ikVerb: true },
  read: { pos: 'verb', stem: 'olvas' },
  draw: { pos: 'verb', stem: 'rajzol' },
  sit: { pos: 'verb', stem: 'ül' },
  stand: { pos: 'verb', stem: 'áll' },
  walk: { pos: 'verb', stem: 'sétál' },
  run: { pos: 'verb', stem: 'fut' },
  wait: { pos: 'verb', stem: 'vár' },
  // segít governs the dative: "segítek neked".
  help: { pos: 'verb', stem: 'segít', objectCase: 'dative' },
  choose: { pos: 'verb', stem: 'választ' },
  open: { pos: 'verb', stem: 'nyit' },
  close: { pos: 'verb', stem: 'csuk' },
  wash: { pos: 'verb', stem: 'mos' },
  sleep: { pos: 'verb', stem: 'alsz', ikVerb: true },
  rest: { pos: 'verb', stem: 'pihen' },
  try: { pos: 'verb', stem: 'próbál' },
  talk: { pos: 'verb', stem: 'beszél' },

  // Accusatives that shorten or change the stem vowel.
  water: { pos: 'noun', mass: true, cases: { acc: 'vizet' } },
  bread: { pos: 'noun', mass: true, cases: { acc: 'kenyeret' } },
  hand: { pos: 'noun', cases: { acc: 'kezet' } },
  // A front-rounded stem that takes -e- rather than -ö- in the accusative.
  book: { pos: 'noun', cases: { acc: 'könyvet' } },
  milk: { pos: 'noun', mass: true },
  rice: { pos: 'noun', mass: true },
  cheese: { pos: 'noun', mass: true },
  music: { pos: 'noun', mass: true },
  juice: { pos: 'noun', mass: true },
  tea: { pos: 'noun', mass: true },
  paper: { pos: 'noun', mass: true },
  home: { pos: 'noun', institutional: true },
  school: { pos: 'noun', institutional: true },
  bed: { pos: 'noun', institutional: true },
  mum: { pos: 'noun', animate: true, proper: true },
  dad: { pos: 'noun', animate: true, proper: true },

  // These tiles are case suffixes in Hungarian, not words.
  in: { pos: 'preposition' },
  on: { pos: 'preposition' },
  to: { pos: 'preposition' },
  from: { pos: 'preposition' },
  with: { pos: 'preposition' },

  not: { pos: 'negation' },
}
