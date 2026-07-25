import type { Lexicon } from '../features'

/**
 * Serbian overlay. The verb paradigms and the animate nouns, as everywhere in
 * Slavic — plus the pronoun clitics, which Serbian places before the verb like
 * Bulgarian rather than declining in place.
 */
export const serbianLexicon: Lexicon = {
  // "два" for a masculine, "две" for a feminine: Slavic numerals agree.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'две' },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'ме', dative: 'ми' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'те', dative: 'ти' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'нас', dative: 'нам' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'га', dative: 'му' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'је', dative: 'јој' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'их', dative: 'им' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'ме', dative: 'ми' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  want: { pos: 'verb', forms: { '1sg': 'желим', '2sg': 'желиш', '3sg': 'жели', '1pl': 'желимо', '2pl': 'желите', '3pl': 'желе' } },
  like: { pos: 'verb', forms: { '1sg': 'волим', '2sg': 'волиш', '3sg': 'воли', '1pl': 'волимо', '2pl': 'волите', '3pl': 'воле' } },
  see: { pos: 'verb', forms: { '1sg': 'видим', '2sg': 'видиш', '3sg': 'види', '1pl': 'видимо', '2pl': 'видите', '3pl': 'виде' } },
  have: { pos: 'verb', forms: { '1sg': 'имам', '2sg': 'имаш', '3sg': 'има', '1pl': 'имамо', '2pl': 'имате', '3pl': 'имају' } },
  eat: { pos: 'verb', forms: { '1sg': 'једем', '2sg': 'једеш', '3sg': 'једе', '1pl': 'једемо', '2pl': 'једете', '3pl': 'једу' } },
  drink: { pos: 'verb', forms: { '1sg': 'пијем', '2sg': 'пијеш', '3sg': 'пије', '1pl': 'пијемо', '2pl': 'пијете', '3pl': 'пију' } },
  go: { pos: 'verb', forms: { '1sg': 'идем', '2sg': 'идеш', '3sg': 'иде', '1pl': 'идемо', '2pl': 'идете', '3pl': 'иду' } },
  play: { pos: 'verb', forms: { '1sg': 'играм', '2sg': 'играш', '3sg': 'игра', '1pl': 'играмо', '2pl': 'играте', '3pl': 'играју' } },
  read: { pos: 'verb', forms: { '1sg': 'читам', '2sg': 'читаш', '3sg': 'чита', '1pl': 'читамо', '2pl': 'читате', '3pl': 'читају' } },
  sleep: { pos: 'verb', forms: { '1sg': 'спавам', '2sg': 'спаваш', '3sg': 'спава', '1pl': 'спавамо', '2pl': 'спавате', '3pl': 'спавају' } },
  talk: { pos: 'verb', forms: { '1sg': 'говорим', '2sg': 'говориш', '3sg': 'говори', '1pl': 'говоримо', '2pl': 'говорите', '3pl': 'говоре' } },
  // помагати governs the dative: "помажем ти".
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'помажем', '2sg': 'помажеш', '3sg': 'помаже', '1pl': 'помажемо', '2pl': 'помажете', '3pl': 'помажу' } },

  friend: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'пријатеља', gen: 'пријатеља' } },
  brother: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'брата', gen: 'брата' } },
  doctor: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'доктора', gen: 'доктора' } },
  teddy: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'меду', gen: 'меде' } },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },

  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'neuter', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true, cases: { gen: 'хлеба' } },
  rice: { pos: 'noun', gender: 'feminine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },

  apple: { pos: 'noun', gender: 'feminine', cases: { acc: 'јабуку', gen: 'јабуке' }, plural: 'јабуке' },
  book: { pos: 'noun', gender: 'feminine', cases: { acc: 'књигу', gen: 'књиге' }, plural: 'књиге' },
  ball: { pos: 'noun', gender: 'feminine', cases: { acc: 'лопту', gen: 'лопте' }, plural: 'лопте' },
  cookie: { pos: 'noun', gender: 'masculine', cases: { gen: 'колача' }, plural: 'колачи' },
  egg: { pos: 'noun', gender: 'neuter', cases: { gen: 'јајета' }, plural: 'јаја' },
  school: { pos: 'noun', gender: 'feminine', cases: { acc: 'школу', gen: 'школе' }, institutional: true },
  home: { pos: 'noun', gender: 'masculine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'masculine', institutional: true },
  park: { pos: 'noun', gender: 'masculine', cases: { gen: 'парка' } },
  table: { pos: 'noun', gender: 'masculine', cases: { gen: 'стола' } },

  to: { pos: 'preposition', governsCase: 'gen' },
  in: { pos: 'preposition', governsCase: 'loc' },
  on: { pos: 'preposition', governsCase: 'loc' },
  from: { pos: 'preposition', governsCase: 'gen' },
  without: { pos: 'preposition', governsCase: 'gen' },

  not: { pos: 'negation' },
}
