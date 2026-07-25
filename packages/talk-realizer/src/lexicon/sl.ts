import type { Lexicon } from '../features'

/** Slovenian overlay: verb persons, animacy, and the case forms a rule misses. */
export const slovenianLexicon: Lexicon = {
  // "lahko" is an adverb doing a modal's work: it does not conjugate at all.
  can: { pos: 'verb', forms: { '1sg': 'lahko', '2sg': 'lahko', '3sg': 'lahko', pl: 'lahko' } },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'me', dative: 'mi' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'te', dative: 'ti' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'nas', dative: 'nam' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'ga', dative: 'mu' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'jo', dative: 'ji' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'jih', dative: 'jim' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'me', dative: 'mi' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // The fleeting -e- disappears in every form but the masculine singular.
  happy: { pos: 'adjective', pluralForm: 'srečni', feminine: 'srečna' },
  sad: { pos: 'adjective', pluralForm: 'žalostni', feminine: 'žalostna' },
  angry: { pos: 'adjective', pluralForm: 'jezni', feminine: 'jezna' },
  hungry: { pos: 'adjective', pluralForm: 'lačni', feminine: 'lačna' },
  thirsty: { pos: 'adjective', pluralForm: 'žejni', feminine: 'žejna' },
  tired: { pos: 'adjective', pluralForm: 'utrujeni', feminine: 'utrujena' },

  want: { pos: 'verb', forms: { '1sg': 'hočem', '2sg': 'hočeš', '3sg': 'hoče', '1pl': 'hočemo', '2pl': 'hočete', '3pl': 'hočejo' } },
  like: { pos: 'verb', forms: { '1sg': 'rad imam', '2sg': 'rad imaš', '3sg': 'rad ima', '1pl': 'radi imamo', '3pl': 'radi imajo' } },
  see: { pos: 'verb', forms: { '1sg': 'vidim', '2sg': 'vidiš', '3sg': 'vidi', '1pl': 'vidimo', '2pl': 'vidite', '3pl': 'vidijo' } },
  have: { pos: 'verb', forms: { '1sg': 'imam', '2sg': 'imaš', '3sg': 'ima', '1pl': 'imamo', '2pl': 'imate', '3pl': 'imajo' } },
  eat: { pos: 'verb', forms: { '1sg': 'jem', '2sg': 'ješ', '3sg': 'je', '1pl': 'jemo', '2pl': 'jeste', '3pl': 'jejo' } },
  drink: { pos: 'verb', forms: { '1sg': 'pijem', '2sg': 'piješ', '3sg': 'pije', '1pl': 'pijemo', '3pl': 'pijejo' } },
  go: { pos: 'verb', forms: { '1sg': 'grem', '2sg': 'greš', '3sg': 'gre', '1pl': 'gremo', '2pl': 'greste', '3pl': 'grejo' } },
  play: { pos: 'verb', forms: { '1sg': 'igram', '2sg': 'igraš', '3sg': 'igra', '1pl': 'igramo', '3pl': 'igrajo' } },
  read: { pos: 'verb', forms: { '1sg': 'berem', '2sg': 'bereš', '3sg': 'bere', '1pl': 'beremo', '3pl': 'berejo' } },
  sleep: { pos: 'verb', forms: { '1sg': 'spim', '2sg': 'spiš', '3sg': 'spi', '1pl': 'spimo', '3pl': 'spijo' } },
  talk: { pos: 'verb', forms: { '1sg': 'govorim', '2sg': 'govoriš', '3sg': 'govori', '1pl': 'govorimo', '3pl': 'govorijo' } },
  // pomagati governs the dative.
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'pomagam', '2sg': 'pomagaš', '3sg': 'pomaga', '1pl': 'pomagamo', '3pl': 'pomagajo' } },

  friend: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'prijatelja', gen: 'prijatelja' } },
  brother: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'brata', gen: 'brata' } },
  doctor: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'zdravnika', gen: 'zdravnika' } },
  teddy: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'medvedka', gen: 'medvedka' } },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },

  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'neuter', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true, cases: { gen: 'kruha' } },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },

  apple: { pos: 'noun', gender: 'neuter', cases: { gen: 'jabolka' }, plural: 'jabolka' },
  book: { pos: 'noun', gender: 'feminine', cases: { acc: 'knjigo', gen: 'knjige' }, plural: 'knjige' },
  ball: { pos: 'noun', gender: 'feminine', cases: { acc: 'žogo', gen: 'žoge' }, plural: 'žoge' },
  cookie: { pos: 'noun', gender: 'masculine', cases: { gen: 'piškota' }, plural: 'piškoti' },
  egg: { pos: 'noun', gender: 'neuter', cases: { gen: 'jajca' }, plural: 'jajca' },
  school: { pos: 'noun', gender: 'feminine', cases: { acc: 'šolo', gen: 'šole' }, institutional: true },
  home: { pos: 'noun', gender: 'masculine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'feminine', institutional: true },
  park: { pos: 'noun', gender: 'masculine', cases: { gen: 'parka' } },
  garden: { pos: 'noun', gender: 'masculine', cases: { gen: 'vrta', acc: 'vrt' } },
  table: { pos: 'noun', gender: 'feminine', cases: { acc: 'mizo', gen: 'mize' } },

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
