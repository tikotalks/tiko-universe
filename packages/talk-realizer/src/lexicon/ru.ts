import type { Lexicon } from '../features'

/**
 * Russian overlay. Two things a rule cannot know: which verbs conjugate how
 * (Russian classes are not recoverable from one form), and which nouns are
 * animate — animacy decides the masculine accusative.
 */
export const russianLexicon: Lexicon = {
  // Impersonal: "мне нужно" has no person, so every form is the same word.
  need: { pos: 'verb', forms: { '1sg': 'нужно', '2sg': 'нужно', '3sg': 'нужно', pl: 'нужно' } },
  // A reflexive verb conjugates inside the -ся.
  stop: { pos: 'verb', forms: { '1sg': 'останавливаюсь', '2sg': 'останавливаешься', '3sg': 'останавливается', '1pl': 'останавливаемся', '2pl': 'останавливаетесь', '3pl': 'останавливаются' } },
  // "два" for a masculine, "две" for a feminine: Slavic numerals agree.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'две' },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'меня', dative: 'мне', cases: { gen: 'меня' } },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'тебя', dative: 'тебе', cases: { gen: 'тебя' } },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'нас', dative: 'нам', cases: { gen: 'нас' } },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'его', cases: { gen: 'его' } },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'её', cases: { gen: 'её' } },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'их', cases: { gen: 'их' } },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'меня', dative: 'мне' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // Verbs: the pack stores the first person, and the rest are curated.
  want: { pos: 'verb', forms: { '1sg': 'хочу', '2sg': 'хочешь', '3sg': 'хочет', '1pl': 'хотим', '3pl': 'хотят' } },
  like: { pos: 'verb', forms: { '1sg': 'люблю', '2sg': 'любишь', '3sg': 'любит', '1pl': 'любим', '3pl': 'любят' } },
  see: { pos: 'verb', forms: { '1sg': 'вижу', '2sg': 'видишь', '3sg': 'видит', '1pl': 'видим', '3pl': 'видят' } },
  eat: { pos: 'verb', forms: { '1sg': 'ем', '2sg': 'ешь', '3sg': 'ест', '1pl': 'едим', '3pl': 'едят' } },
  drink: { pos: 'verb', forms: { '1sg': 'пью', '2sg': 'пьёшь', '3sg': 'пьёт', '1pl': 'пьём', '3pl': 'пьют' } },
  go: { pos: 'verb', forms: { '1sg': 'иду', '2sg': 'идёшь', '3sg': 'идёт', '1pl': 'идём', '3pl': 'идут' } },
  play: { pos: 'verb', forms: { '1sg': 'играю', '2sg': 'играешь', '3sg': 'играет', '1pl': 'играем', '3pl': 'играют' } },
  read: { pos: 'verb', forms: { '1sg': 'читаю', '2sg': 'читаешь', '3sg': 'читает', '1pl': 'читаем', '3pl': 'читают' } },
  // помогать governs the dative: "помогаю тебе", never "тебя".
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'помогаю', '2sg': 'помогаешь', '3sg': 'помогает', '1pl': 'помогаем', '3pl': 'помогают' } },
  sleep: { pos: 'verb', forms: { '1sg': 'сплю', '2sg': 'спишь', '3sg': 'спит', '1pl': 'спим', '3pl': 'спят' } },
  talk: { pos: 'verb', forms: { '1sg': 'говорю', '2sg': 'говоришь', '3sg': 'говорит', '1pl': 'говорим', '3pl': 'говорят' } },
  have: { pos: 'verb', forms: { '1sg': 'есть', '2sg': 'есть', '3sg': 'есть', '1pl': 'есть', '3pl': 'есть' } },

  // Animate nouns: animacy decides the masculine accusative.
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  teacher: { pos: 'noun', gender: 'feminine', animate: true },
  friend: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'друга', gen: 'друга' } },
  brother: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'брата', gen: 'брата' } },
  sister: { pos: 'noun', gender: 'feminine', animate: true },
  grandma: { pos: 'noun', gender: 'feminine', animate: true },
  grandpa: { pos: 'noun', gender: 'masculine', animate: true },
  doctor: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'врача', gen: 'врача' } },
  helper: { pos: 'noun', gender: 'masculine', animate: true },
  teddy: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'мишку', gen: 'мишки' } },
  doll: { pos: 'noun', gender: 'feminine', animate: false },

  // Mass nouns
  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'neuter', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'feminine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },

  // Nouns whose case forms a rule would get wrong
  apple: { pos: 'noun', gender: 'neuter', cases: { gen: 'яблока' }, plural: 'яблоки' },
  book: { pos: 'noun', gender: 'feminine', cases: { acc: 'книгу', gen: 'книги' }, plural: 'книги' },
  cookie: { pos: 'noun', gender: 'neuter', cases: { gen: 'печенья' }, plural: 'печенья' },
  ball: { pos: 'noun', gender: 'masculine', cases: { gen: 'мяча' }, plural: 'мячи' },
  bed: { pos: 'noun', gender: 'feminine', institutional: true },
  school: { pos: 'noun', gender: 'feminine', cases: { acc: 'школу', gen: 'школы' }, institutional: true },
  home: { pos: 'noun', gender: 'masculine', proper: true, institutional: true },
  egg: { pos: 'noun', gender: 'neuter', cases: { gen: 'яйца' }, plural: 'яйца' },

  // Each preposition governs a case.
  to: { pos: 'preposition', governsCase: 'dat' },
  in: { pos: 'preposition', governsCase: 'loc' },
  on: { pos: 'preposition', governsCase: 'loc' },
  from: { pos: 'preposition', governsCase: 'gen' },
  without: { pos: 'preposition', governsCase: 'gen' },

  // Russian prefers the short form as a predicate: "я счастлив".
  happy: { pos: 'adjective', predicative: 'счастлив' },
  hungry: { pos: 'adjective', predicative: 'голоден' },
  tired: { pos: 'adjective', predicative: 'устал' },
  sick: { pos: 'adjective', predicative: 'болен' },
  sad: { pos: 'adjective', predicative: 'расстроен' },

  // "with" governs the instrumental — the case this file's tables generate.
  with: { pos: 'preposition', governsCase: 'ins' },
  'next-to': { pos: 'preposition', governsCase: 'gen' },
  under: { pos: 'preposition', governsCase: 'ins' },

  not: { pos: 'negation' },
}
