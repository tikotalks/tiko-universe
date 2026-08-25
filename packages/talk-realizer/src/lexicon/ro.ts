import type { Lexicon } from '../features'

/**
 * Romanian overlay. Gender comes from the ending, so this carries the irregular
 * verbs (Romanian's common ones are all irregular), the mass nouns, and the
 * plurals a rule would get wrong.
 */
export const romanianLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'mă' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'mă' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss', feminine: 'mea' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss', feminine: 'ta' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'te' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'ne' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'îl' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'o' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'îi' },

  // The verbs a child uses most are the irregular ones.
  want: { pos: 'verb', forms: { '1sg': 'vreau', '2sg': 'vrei', '3sg': 'vrea', '1pl': 'vrem', '3pl': 'vor' } },
  have: { pos: 'verb', forms: { '1sg': 'am', '2sg': 'ai', '3sg': 'are', '1pl': 'avem', '3pl': 'au' } },
  need: { pos: 'verb', forms: { '1sg': 'am nevoie', '2sg': 'ai nevoie', '3sg': 'are nevoie', '1pl': 'avem nevoie', '3pl': 'au nevoie' } },
  go: { pos: 'verb', forms: { '1sg': 'merg', '2sg': 'mergi', '3sg': 'merge', '1pl': 'mergem', '3pl': 'merg' } },
  come: { pos: 'verb', forms: { '1sg': 'vin', '2sg': 'vii', '3sg': 'vine', '1pl': 'venim', '3pl': 'vin' } },
  eat: { pos: 'verb', forms: { '1sg': 'mănânc', '2sg': 'mănânci', '3sg': 'mănâncă', '1pl': 'mâncăm', '3pl': 'mănâncă' } },
  drink: { pos: 'verb', forms: { '1sg': 'beau', '2sg': 'bei', '3sg': 'bea', '1pl': 'bem', '3pl': 'beau' } },
  see: { pos: 'verb', forms: { '1sg': 'văd', '2sg': 'vezi', '3sg': 'vede', '1pl': 'vedem', '3pl': 'văd' } },
  // "a plăcea" inverts like Spanish gustar: "îmi place pâinea".
  like: { pos: 'verb', experiencerDative: true, forms: { '3sg': 'place', '3pl': 'plac' } },
  play: { pos: 'verb', forms: { '1sg': 'mă joc', '2sg': 'te joci', '3sg': 'se joacă', '1pl': 'ne jucăm', '3pl': 'se joacă' } },
  help: { pos: 'verb', forms: { '1sg': 'ajut', '2sg': 'ajuți', '3sg': 'ajută', '1pl': 'ajutăm', '3pl': 'ajută' } },
  sleep: { pos: 'verb', forms: { '1sg': 'dorm', '2sg': 'dormi', '3sg': 'doarme', '1pl': 'dormim', '3pl': 'dorm' } },
  read: { pos: 'verb', forms: { '1sg': 'citesc', '2sg': 'citești', '3sg': 'citește', '1pl': 'citim', '3pl': 'citesc' } },

  // Mass nouns
  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'masculine', mass: true },
  bread: { pos: 'noun', gender: 'feminine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'feminine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'feminine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },

  // Nouns whose gender or plural the rule gets wrong
  apple: { pos: 'noun', gender: 'masculine', plural: 'mere' },
  egg: { pos: 'noun', gender: 'masculine', plural: 'ouă' },
  book: { pos: 'noun', gender: 'feminine', plural: 'cărți' },
  cookie: { pos: 'noun', gender: 'masculine', plural: 'biscuiți' },
  ball: { pos: 'noun', gender: 'feminine', plural: 'mingi' },
  school: { pos: 'noun', gender: 'feminine', plural: 'școli', institutional: true },
  home: { pos: 'noun', gender: 'feminine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'masculine', institutional: true },
  park: { pos: 'noun', gender: 'masculine', plural: 'parcuri' },
  bag: { pos: 'noun', gender: 'masculine', plural: 'ghiozdane' },

  big: { pos: 'adjective', feminine: 'mare' },
  small: { pos: 'adjective', feminine: 'mică' },
  happy: { pos: 'adjective', feminine: 'fericită' },

  not: { pos: 'negation' },
}
