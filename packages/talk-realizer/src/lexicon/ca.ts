import type { Lexicon } from '../features'

/**
 * Catalan overlay. Gender comes from the ending, so this carries the irregular
 * verbs (Catalan's common ones are all irregular), the mass nouns, the gender
 * exceptions, and the possessive forms — Catalan possessives take an article:
 * "la meva pilota".
 */
export const catalanLexicon: Lexicon = {
  // "All" agrees and takes the definite article after it.
  all: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', withDefinite: true, feminine: 'totes' },

  hungry: { pos: 'adjective', sensation: 'gana' },
  thirsty: { pos: 'adjective', sensation: 'set' },
  cold: { pos: 'adjective', sensation: 'fred' },
  hot: { pos: 'adjective', sensation: 'calor' },
  scared: { pos: 'adjective', sensation: 'por' },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'em' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'et' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'ens' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'el' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'la' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'els' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'em' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss', feminine: 'meva' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss', feminine: 'teva' },

  // Irregular verbs
  want: { pos: 'verb', forms: { '1sg': 'vull', '2sg': 'vols', '3sg': 'vol', '1pl': 'volem', '3pl': 'volen' } },
  have: { pos: 'verb', forms: { '1sg': 'tinc', '2sg': 'tens', '3sg': 'té', '1pl': 'tenim', '3pl': 'tenen' } },
  go: { pos: 'verb', forms: { '1sg': 'vaig', '2sg': 'vas', '3sg': 'va', '1pl': 'anem', '3pl': 'van' } },
  come: { pos: 'verb', forms: { '1sg': 'vinc', '2sg': 'véns', '3sg': 've', '1pl': 'venim', '3pl': 'vénen' } },
  see: { pos: 'verb', forms: { '1sg': 'veig', '2sg': 'veus', '3sg': 'veu', '1pl': 'veiem', '3pl': 'veuen' } },
  eat: { pos: 'verb', forms: { '1sg': 'menjo', '2sg': 'menges', '3sg': 'menja', '1pl': 'mengem', '3pl': 'mengen' } },
  drink: { pos: 'verb', forms: { '1sg': 'bec', '2sg': 'beus', '3sg': 'beu', '1pl': 'bevem', '3pl': 'beuen' } },
  read: { pos: 'verb', forms: { '1sg': 'llegeixo', '2sg': 'llegeixes', '3sg': 'llegeix', '1pl': 'llegim', '3pl': 'llegeixen' } },
  sleep: { pos: 'verb', forms: { '1sg': 'dormo', '2sg': 'dorms', '3sg': 'dorm', '1pl': 'dormim', '3pl': 'dormen' } },
  // "agradar" inverts like Spanish gustar: "m'agrada el pa".
  like: { pos: 'verb', experiencerDative: true, forms: { '3sg': 'agrada', '3pl': 'agraden' } },

  // Mass nouns
  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'feminine', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  fruit: { pos: 'noun', gender: 'feminine', mass: true },

  // Gender the ending gets wrong
  apple: { pos: 'noun', gender: 'feminine', plural: 'pomes' },
  hand: { pos: 'noun', gender: 'feminine', plural: 'mans' },
  school: { pos: 'noun', gender: 'feminine', institutional: true },
  home: { pos: 'noun', gender: 'feminine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'masculine', institutional: true },
  cookie: { pos: 'noun', gender: 'feminine', plural: 'galetes' },
  ball: { pos: 'noun', gender: 'feminine', plural: 'pilotes' },
  bag: { pos: 'noun', gender: 'feminine', plural: 'motxilles' },
  egg: { pos: 'noun', gender: 'masculine', plural: 'ous' },
  book: { pos: 'noun', gender: 'masculine', plural: 'llibres' },
  car: { pos: 'noun', gender: 'masculine', plural: 'cotxes' },

  big: { pos: 'adjective', feminine: 'gran' },
  small: { pos: 'adjective', feminine: 'petita' },
  happy: { pos: 'adjective', feminine: 'contenta' },

  // "dues galetes": the numeral agrees in Catalan.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'dues' },

  not: { pos: 'negation' },
}
