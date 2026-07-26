import type { Lexicon } from '../features'

/** Croatian overlay: the same structure as Serbian, in Latin script and its own words. */
export const croatianLexicon: Lexicon = {
  can: { pos: 'verb', forms: { '1sg': 'mogu', '2sg': 'možeš', '3sg': 'može', '1pl': 'možemo', '2pl': 'možete', '3pl': 'mogu' } },
  // "dva" for a masculine, "dvije" for a feminine: Slavic numerals agree.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'dvije' },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'me', dative: 'mi' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'te', dative: 'ti' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'nas', dative: 'nam' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'ga', dative: 'mu' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'ju', dative: 'joj' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'ih', dative: 'im' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'me', dative: 'mi' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  want: { pos: 'verb', forms: { '1sg': 'želim', '2sg': 'želiš', '3sg': 'želi', '1pl': 'želimo', '2pl': 'želite', '3pl': 'žele' } },
  like: { pos: 'verb', forms: { '1sg': 'volim', '2sg': 'voliš', '3sg': 'voli', '1pl': 'volimo', '2pl': 'volite', '3pl': 'vole' } },
  see: { pos: 'verb', forms: { '1sg': 'vidim', '2sg': 'vidiš', '3sg': 'vidi', '1pl': 'vidimo', '2pl': 'vidite', '3pl': 'vide' } },
  have: { pos: 'verb', forms: { '1sg': 'imam', '2sg': 'imaš', '3sg': 'ima', '1pl': 'imamo', '2pl': 'imate', '3pl': 'imaju' } },
  eat: { pos: 'verb', forms: { '1sg': 'jedem', '2sg': 'jedeš', '3sg': 'jede', '1pl': 'jedemo', '2pl': 'jedete', '3pl': 'jedu' } },
  drink: { pos: 'verb', forms: { '1sg': 'pijem', '2sg': 'piješ', '3sg': 'pije', '1pl': 'pijemo', '2pl': 'pijete', '3pl': 'piju' } },
  go: { pos: 'verb', forms: { '1sg': 'idem', '2sg': 'ideš', '3sg': 'ide', '1pl': 'idemo', '2pl': 'idete', '3pl': 'idu' } },
  play: { pos: 'verb', forms: { '1sg': 'igram', '2sg': 'igraš', '3sg': 'igra', '1pl': 'igramo', '2pl': 'igrate', '3pl': 'igraju' } },
  read: { pos: 'verb', forms: { '1sg': 'čitam', '2sg': 'čitaš', '3sg': 'čita', '1pl': 'čitamo', '2pl': 'čitate', '3pl': 'čitaju' } },
  sleep: { pos: 'verb', forms: { '1sg': 'spavam', '2sg': 'spavaš', '3sg': 'spava', '1pl': 'spavamo', '2pl': 'spavate', '3pl': 'spavaju' } },
  talk: { pos: 'verb', forms: { '1sg': 'govorim', '2sg': 'govoriš', '3sg': 'govori', '1pl': 'govorimo', '2pl': 'govorite', '3pl': 'govore' } },
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'pomažem', '2sg': 'pomažeš', '3sg': 'pomaže', '1pl': 'pomažemo', '2pl': 'pomažete', '3pl': 'pomažu' } },

  friend: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'prijatelja', gen: 'prijatelja' } },
  brother: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'brata', gen: 'brata' } },
  doctor: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'doktora', gen: 'doktora' } },
  teddy: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'medu', gen: 'mede' } },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },

  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'neuter', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true, cases: { gen: 'kruha' } },
  rice: { pos: 'noun', gender: 'feminine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },

  apple: { pos: 'noun', gender: 'feminine', cases: { acc: 'jabuku', gen: 'jabuke' }, plural: 'jabuke' },
  book: { pos: 'noun', gender: 'feminine', cases: { acc: 'knjigu', gen: 'knjige' }, plural: 'knjige' },
  ball: { pos: 'noun', gender: 'feminine', cases: { acc: 'loptu', gen: 'lopte' }, plural: 'lopte' },
  cookie: { pos: 'noun', gender: 'masculine', cases: { gen: 'keksa' }, plural: 'keksi' },
  egg: { pos: 'noun', gender: 'neuter', cases: { gen: 'jajeta' }, plural: 'jaja' },
  school: { pos: 'noun', gender: 'feminine', cases: { acc: 'školu', gen: 'škole' }, institutional: true },
  home: { pos: 'noun', gender: 'masculine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'masculine', institutional: true },
  park: { pos: 'noun', gender: 'masculine', cases: { gen: 'parka' } },
  table: { pos: 'noun', gender: 'masculine', cases: { gen: 'stola' } },

  to: { pos: 'preposition', governsCase: 'gen' },
  in: { pos: 'preposition', governsCase: 'loc' },
  on: { pos: 'preposition', governsCase: 'loc' },
  from: { pos: 'preposition', governsCase: 'gen' },
  without: { pos: 'preposition', governsCase: 'gen' },

  // "with" governs the instrumental — the case this file's tables generate.
  with: { pos: 'preposition', governsCase: 'ins' },
  'next-to': { pos: 'preposition', governsCase: 'gen' },
  under: { pos: 'preposition', governsCase: 'ins' },

  not: { pos: 'negation' },
}
