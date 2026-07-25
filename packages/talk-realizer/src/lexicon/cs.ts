import type { Lexicon } from '../features'

/**
 * Czech overlay. Czech nouns fall into declension patterns that the nominative
 * alone does not identify — masculine inanimates take -u or -a in the genitive by
 * word, not by rule — so those forms are curated alongside the verb paradigms.
 */
export const czechLexicon: Lexicon = {
  // "dva" for a masculine, "dvě" for a feminine: Slavic numerals agree.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'dvě', neuter: 'dvě' },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'mě', dative: 'mi', cases: { gen: 'mě' } },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'tě', dative: 'ti', cases: { gen: 'tebe' } },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'nás', dative: 'nám', cases: { gen: 'nás' } },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'ho', dative: 'mu', cases: { gen: 'jeho' } },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'ji', dative: 'jí', cases: { gen: 'jí' } },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'je', dative: 'jim', cases: { gen: 'jich' } },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'mě', dative: 'mi' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  want: { pos: 'verb', forms: { '1sg': 'chci', '2sg': 'chceš', '3sg': 'chce', '1pl': 'chceme', '2pl': 'chcete', '3pl': 'chtějí' } },
  like: { pos: 'verb', forms: { '1sg': 'mám rád', '2sg': 'máš rád', '3sg': 'má rád', '1pl': 'máme rádi', '2pl': 'máte rádi', '3pl': 'mají rádi' } },
  see: { pos: 'verb', forms: { '1sg': 'vidím', '2sg': 'vidíš', '3sg': 'vidí', '1pl': 'vidíme', '2pl': 'vidíte', '3pl': 'vidí' } },
  have: { pos: 'verb', forms: { '1sg': 'mám', '2sg': 'máš', '3sg': 'má', '1pl': 'máme', '2pl': 'máte', '3pl': 'mají' } },
  eat: { pos: 'verb', forms: { '1sg': 'jím', '2sg': 'jíš', '3sg': 'jí', '1pl': 'jíme', '2pl': 'jíte', '3pl': 'jedí' } },
  drink: { pos: 'verb', forms: { '1sg': 'piji', '2sg': 'piješ', '3sg': 'pije', '1pl': 'pijeme', '2pl': 'pijete', '3pl': 'pijí' } },
  go: { pos: 'verb', forms: { '1sg': 'jdu', '2sg': 'jdeš', '3sg': 'jde', '1pl': 'jdeme', '2pl': 'jdete', '3pl': 'jdou' } },
  play: { pos: 'verb', forms: { '1sg': 'hraji', '2sg': 'hraješ', '3sg': 'hraje', '1pl': 'hrajeme', '2pl': 'hrajete', '3pl': 'hrají' } },
  read: { pos: 'verb', forms: { '1sg': 'čtu', '2sg': 'čteš', '3sg': 'čte', '1pl': 'čteme', '2pl': 'čtete', '3pl': 'čtou' } },
  sleep: { pos: 'verb', forms: { '1sg': 'spím', '2sg': 'spíš', '3sg': 'spí', '1pl': 'spíme', '2pl': 'spíte', '3pl': 'spí' } },
  talk: { pos: 'verb', forms: { '1sg': 'mluvím', '2sg': 'mluvíš', '3sg': 'mluví', '1pl': 'mluvíme', '2pl': 'mluvíte', '3pl': 'mluví' } },
  // pomáhat governs the dative: "pomáhám ti".
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'pomáhám', '2sg': 'pomáháš', '3sg': 'pomáhá', '1pl': 'pomáháme', '2pl': 'pomáháte', '3pl': 'pomáhají' } },

  friend: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'kamaráda', gen: 'kamaráda' } },
  brother: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'bratra', gen: 'bratra' } },
  doctor: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'doktora', gen: 'doktora' } },
  teddy: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'medvídka', gen: 'medvídka' } },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },

  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'neuter', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true, cases: { gen: 'chleba' } },
  rice: { pos: 'noun', gender: 'feminine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true, cases: { gen: 'sýra' } },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },

  apple: { pos: 'noun', gender: 'neuter', cases: { gen: 'jablka' }, plural: 'jablka' },
  book: { pos: 'noun', gender: 'feminine', cases: { acc: 'knihu', gen: 'knihy' }, plural: 'knihy' },
  ball: { pos: 'noun', gender: 'masculine', cases: { gen: 'míče' } },
  cookie: { pos: 'noun', gender: 'feminine', cases: { acc: 'sušenku', gen: 'sušenky' }, plural: 'sušenky' },
  egg: { pos: 'noun', gender: 'neuter', cases: { gen: 'vejce' }, plural: 'vejce' },
  school: { pos: 'noun', gender: 'feminine', cases: { acc: 'školu', gen: 'školy' }, institutional: true },
  home: { pos: 'noun', gender: 'masculine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'feminine', institutional: true },
  park: { pos: 'noun', gender: 'masculine', cases: { gen: 'parku' } },
  table: { pos: 'noun', gender: 'masculine', cases: { gen: 'stolu' } },

  to: { pos: 'preposition', governsCase: 'gen' },
  in: { pos: 'preposition', governsCase: 'loc' },
  on: { pos: 'preposition', governsCase: 'loc' },
  from: { pos: 'preposition', governsCase: 'gen' },
  without: { pos: 'preposition', governsCase: 'gen' },

  not: { pos: 'negation' },
}
