import type { Lexicon } from '../features'

/**
 * Latvian overlay. Every masculine nominative ends in -s, which every other case
 * replaces, so the genders and the accusatives are curated alongside the verb
 * persons.
 */
export const latvianLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'mani', dative: 'man' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'tevi', dative: 'tev' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'mūs', dative: 'mums' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'viņu', dative: 'viņam' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'viņu', dative: 'viņai' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'viņus', dative: 'viņiem' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'mani', dative: 'man' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  want: { pos: 'verb', forms: { '1sg': 'gribu', '2sg': 'gribi', '3sg': 'grib', '1pl': 'gribam', '2pl': 'gribat', '3pl': 'grib' } },
  like: { pos: 'verb', forms: { '1sg': 'mīlu', '2sg': 'mīli', '3sg': 'mīl', '1pl': 'mīlam', '3pl': 'mīl' } },
  see: { pos: 'verb', forms: { '1sg': 'redzu', '2sg': 'redzi', '3sg': 'redz', '1pl': 'redzam', '3pl': 'redz' } },
  hear: { pos: 'verb', forms: { '1sg': 'dzirdu', '2sg': 'dzirdi', '3sg': 'dzird', '1pl': 'dzirdam', '3pl': 'dzird' } },
  eat: { pos: 'verb', forms: { '1sg': 'ēdu', '2sg': 'ēd', '3sg': 'ēd', '1pl': 'ēdam', '3pl': 'ēd' } },
  drink: { pos: 'verb', forms: { '1sg': 'dzeru', '2sg': 'dzer', '3sg': 'dzer', '1pl': 'dzeram', '3pl': 'dzer' } },
  go: { pos: 'verb', forms: { '1sg': 'eju', '2sg': 'ej', '3sg': 'iet', '1pl': 'ejam', '3pl': 'iet' } },
  play: { pos: 'verb', forms: { '1sg': 'spēlēju', '2sg': 'spēlē', '3sg': 'spēlē', '1pl': 'spēlējam', '3pl': 'spēlē' } },
  read: { pos: 'verb', forms: { '1sg': 'lasu', '2sg': 'lasi', '3sg': 'lasa', '1pl': 'lasām', '3pl': 'lasa' } },
  sleep: { pos: 'verb', forms: { '1sg': 'guļu', '2sg': 'guli', '3sg': 'guļ', '1pl': 'guļam', '3pl': 'guļ' } },
  talk: { pos: 'verb', forms: { '1sg': 'runāju', '2sg': 'runā', '3sg': 'runā', '1pl': 'runājam', '3pl': 'runā' } },
  // palīdzēt governs the dative: "palīdzu tev".
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'palīdzu', '2sg': 'palīdzi', '3sg': 'palīdz', '1pl': 'palīdzam', '3pl': 'palīdz' } },

  friend: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'draugu', gen: 'drauga' } },
  brother: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'brāli', gen: 'brāļa' } },
  doctor: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'ārstu', gen: 'ārsta' } },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },

  water: { pos: 'noun', gender: 'masculine', mass: true, cases: { acc: 'ūdeni', gen: 'ūdens' } },
  milk: { pos: 'noun', gender: 'masculine', mass: true, cases: { acc: 'pienu', gen: 'piena' } },
  bread: { pos: 'noun', gender: 'feminine', mass: true, cases: { acc: 'maizi', gen: 'maizes' } },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true, cases: { acc: 'sieru', gen: 'siera' } },
  juice: { pos: 'noun', gender: 'feminine', mass: true, cases: { acc: 'sulu', gen: 'sulas' } },
  tea: { pos: 'noun', gender: 'feminine', mass: true, cases: { acc: 'tēju', gen: 'tējas' } },
  music: { pos: 'noun', gender: 'feminine', mass: true, cases: { acc: 'mūziku', gen: 'mūzikas' } },
  paper: { pos: 'noun', gender: 'masculine', mass: true },

  apple: { pos: 'noun', gender: 'masculine', cases: { acc: 'ābolu', gen: 'ābola' }, plural: 'āboli' },
  book: { pos: 'noun', gender: 'feminine', cases: { acc: 'grāmatu', gen: 'grāmatas' }, plural: 'grāmatas' },
  ball: { pos: 'noun', gender: 'feminine', cases: { acc: 'bumbu', gen: 'bumbas' } },
  cookie: { pos: 'noun', gender: 'masculine', cases: { acc: 'cepumu', gen: 'cepuma' }, plural: 'cepumi' },
  egg: { pos: 'noun', gender: 'feminine', cases: { acc: 'olu', gen: 'olas' }, plural: 'olas' },
  school: { pos: 'noun', gender: 'feminine', cases: { acc: 'skolu', gen: 'skolas' }, institutional: true },
  home: { pos: 'noun', gender: 'feminine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'feminine', institutional: true },
  park: { pos: 'noun', gender: 'masculine', cases: { acc: 'parku', gen: 'parka' } },
  garden: { pos: 'noun', gender: 'masculine', cases: { acc: 'dārzu', gen: 'dārza' } },
  table: { pos: 'noun', gender: 'masculine', cases: { acc: 'galdu', gen: 'galda' } },

  // "pie parka": pie governs the genitive.
  to: { pos: 'preposition', governsCase: 'gen' },
  in: { pos: 'preposition', governsCase: 'loc', caseOnly: true },
  on: { pos: 'preposition', governsCase: 'loc' },
  from: { pos: 'preposition', governsCase: 'gen' },
  without: { pos: 'preposition', governsCase: 'gen' },

  not: { pos: 'negation' },
}
