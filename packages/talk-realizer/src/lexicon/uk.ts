import type { Lexicon } from '../features'

/**
 * Ukrainian overlay. As in Russian, what a rule cannot know is the verb
 * paradigms — Slavic conjugation classes are not recoverable from one form — and
 * which nouns are animate, because that decides the masculine accusative.
 */
export const ukrainianLexicon: Lexicon = {
  stand: { pos: 'verb', forms: { '1sg': 'стою', '2sg': 'стоїш', '3sg': 'стоїть', '1pl': 'стоїмо', '2pl': 'стоїте', '3pl': 'стоять' } },
  stop: { pos: 'verb', forms: { '1sg': 'зупиняюся', '2sg': 'зупиняєшся', '3sg': 'зупиняється', '1pl': 'зупиняємося', '2pl': 'зупиняєтеся', '3pl': 'зупиняються' } },
  wash: { pos: 'verb', forms: { '1sg': 'мию', '2sg': 'миєш', '3sg': 'миє', '1pl': 'миємо', '2pl': 'миєте', '3pl': 'миють' } },
  // "два" for a masculine, "дві" for a feminine: Slavic numerals agree.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'дві' },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'мене', dative: 'мені', cases: { gen: 'мене' } },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'тебе', dative: 'тобі', cases: { gen: 'тебе' } },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'нас', dative: 'нам', cases: { gen: 'нас' } },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'його', dative: 'йому', cases: { gen: 'його' } },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'її', dative: 'їй', cases: { gen: 'її' } },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'їх', dative: 'їм', cases: { gen: 'їх' } },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'мене', dative: 'мені' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  want: { pos: 'verb', forms: { '1sg': 'хочу', '2sg': 'хочеш', '3sg': 'хоче', '1pl': 'хочемо', '2pl': 'хочете', '3pl': 'хочуть' } },
  like: { pos: 'verb', forms: { '1sg': 'люблю', '2sg': 'любиш', '3sg': 'любить', '1pl': 'любимо', '2pl': 'любите', '3pl': 'люблять' } },
  see: { pos: 'verb', forms: { '1sg': 'бачу', '2sg': 'бачиш', '3sg': 'бачить', '1pl': 'бачимо', '2pl': 'бачите', '3pl': 'бачать' } },
  hear: { pos: 'verb', forms: { '1sg': 'чую', '2sg': 'чуєш', '3sg': 'чує', '1pl': 'чуємо', '2pl': 'чуєте', '3pl': 'чують' } },
  have: { pos: 'verb', forms: { '1sg': 'маю', '2sg': 'маєш', '3sg': 'має', '1pl': 'маємо', '2pl': 'маєте', '3pl': 'мають' } },
  eat: { pos: 'verb', forms: { '1sg': 'їм', '2sg': 'їси', '3sg': 'їсть', '1pl': 'їмо', '2pl': 'їсте', '3pl': 'їдять' } },
  drink: { pos: 'verb', forms: { '1sg': 'п’ю', '2sg': 'п’єш', '3sg': 'п’є', '1pl': 'п’ємо', '2pl': 'п’єте', '3pl': 'п’ють' } },
  go: { pos: 'verb', forms: { '1sg': 'йду', '2sg': 'йдеш', '3sg': 'йде', '1pl': 'йдемо', '2pl': 'йдете', '3pl': 'йдуть' } },
  play: { pos: 'verb', forms: { '1sg': 'граю', '2sg': 'граєш', '3sg': 'грає', '1pl': 'граємо', '2pl': 'граєте', '3pl': 'грають' } },
  read: { pos: 'verb', forms: { '1sg': 'читаю', '2sg': 'читаєш', '3sg': 'читає', '1pl': 'читаємо', '2pl': 'читаєте', '3pl': 'читають' } },
  sleep: { pos: 'verb', forms: { '1sg': 'сплю', '2sg': 'спиш', '3sg': 'спить', '1pl': 'спимо', '2pl': 'спите', '3pl': 'спять' } },
  talk: { pos: 'verb', forms: { '1sg': 'говорю', '2sg': 'говориш', '3sg': 'говорить', '1pl': 'говоримо', '2pl': 'говорите', '3pl': 'говорять' } },
  // допомагати governs the dative: "допомагаю тобі", never "тебе".
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'допомагаю', '2sg': 'допомагаєш', '3sg': 'допомагає', '1pl': 'допомагаємо', '2pl': 'допомагаєте', '3pl': 'допомагають' } },

  friend: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'друга', gen: 'друга' } },
  brother: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'брата', gen: 'брата' } },
  grandpa: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'дідуся', gen: 'дідуся' } },
  doctor: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'лікаря', gen: 'лікаря' } },
  teddy: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'ведмедика', gen: 'ведмедика' } },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },

  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'neuter', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true, cases: { gen: 'хліба' } },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },

  apple: { pos: 'noun', gender: 'neuter', cases: { gen: 'яблука' }, plural: 'яблука' },
  book: { pos: 'noun', gender: 'feminine', cases: { acc: 'книгу', gen: 'книги' }, plural: 'книги' },
  ball: { pos: 'noun', gender: 'masculine', cases: { gen: 'мʼяча' } },
  cookie: { pos: 'noun', gender: 'neuter', cases: { gen: 'печива' }, plural: 'печиво' },
  egg: { pos: 'noun', gender: 'neuter', cases: { gen: 'яйця' }, plural: 'яйця' },
  school: { pos: 'noun', gender: 'feminine', cases: { acc: 'школу', gen: 'школи' }, institutional: true },
  home: { pos: 'noun', gender: 'masculine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'neuter', institutional: true },
  park: { pos: 'noun', gender: 'masculine', cases: { gen: 'парку' } },
  table: { pos: 'noun', gender: 'masculine', cases: { gen: 'стола' } },

  // Each preposition governs its own case: "до парку", "у школі".
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
