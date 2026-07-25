import type { Lexicon } from '../features'

/**
 * Polish overlay. As in Russian, the two things a rule cannot know are the verb
 * paradigms and which nouns are animate — animacy decides the masculine
 * accusative, and the genitive of negation is obligatory here.
 */
export const polishLexicon: Lexicon = {
  hear: { pos: 'verb', forms: { '1sg': 'słyszę', '2sg': 'słyszysz', '3sg': 'słyszy', '1pl': 'słyszymy', '2pl': 'słyszycie', '3pl': 'słyszą' } },
  come: { pos: 'verb', forms: { '1sg': 'przychodzę', '2sg': 'przychodzisz', '3sg': 'przychodzi', '1pl': 'przychodzimy', '2pl': 'przychodzicie', '3pl': 'przychodzą' } },
  sit: { pos: 'verb', forms: { '1sg': 'siedzę', '2sg': 'siedzisz', '3sg': 'siedzi', '1pl': 'siedzimy', '2pl': 'siedzicie', '3pl': 'siedzą' } },
  run: { pos: 'verb', forms: { '1sg': 'biegnę', '2sg': 'biegniesz', '3sg': 'biegnie', '1pl': 'biegniemy', '2pl': 'biegniecie', '3pl': 'biegną' } },
  can: { pos: 'verb', forms: { '1sg': 'mogę', '2sg': 'możesz', '3sg': 'może', '1pl': 'możemy', '2pl': 'możecie', '3pl': 'mogą' } },
  // "dwa" for a masculine, "dwie" for a feminine: Slavic numerals agree.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'dwie' },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'mnie', dative: 'mi', cases: { gen: 'mnie' } },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'cię', dative: 'ci', cases: { gen: 'ciebie' } },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'nas', dative: 'nam', cases: { gen: 'nas' } },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'go', cases: { gen: 'jego' } },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'ją', cases: { gen: 'jej' } },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'ich', cases: { gen: 'ich' } },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'mnie', dative: 'mi' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  want: { pos: 'verb', forms: { '1sg': 'chcę', '2sg': 'chcesz', '3sg': 'chce', '1pl': 'chcemy', '3pl': 'chcą' } },
  like: { pos: 'verb', forms: { '1sg': 'lubię', '2sg': 'lubisz', '3sg': 'lubi', '1pl': 'lubimy', '3pl': 'lubią' } },
  see: { pos: 'verb', forms: { '1sg': 'widzę', '2sg': 'widzisz', '3sg': 'widzi', '1pl': 'widzimy', '3pl': 'widzą' } },
  eat: { pos: 'verb', forms: { '1sg': 'jem', '2sg': 'jesz', '3sg': 'je', '1pl': 'jemy', '3pl': 'jedzą' } },
  drink: { pos: 'verb', forms: { '1sg': 'piję', '2sg': 'pijesz', '3sg': 'pije', '1pl': 'pijemy', '3pl': 'piją' } },
  go: { pos: 'verb', forms: { '1sg': 'idę', '2sg': 'idziesz', '3sg': 'idzie', '1pl': 'idziemy', '3pl': 'idą' } },
  play: { pos: 'verb', forms: { '1sg': 'gram', '2sg': 'grasz', '3sg': 'gra', '1pl': 'gramy', '3pl': 'grają' } },
  read: { pos: 'verb', forms: { '1sg': 'czytam', '2sg': 'czytasz', '3sg': 'czyta', '1pl': 'czytamy', '3pl': 'czytają' } },
  // pomagać governs the dative: "pomagam ci", never "cię".
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'pomagam', '2sg': 'pomagasz', '3sg': 'pomaga', '1pl': 'pomagamy', '3pl': 'pomagają' } },
  sleep: { pos: 'verb', forms: { '1sg': 'śpię', '2sg': 'śpisz', '3sg': 'śpi', '1pl': 'śpimy', '3pl': 'śpią' } },
  talk: { pos: 'verb', forms: { '1sg': 'mówię', '2sg': 'mówisz', '3sg': 'mówi', '1pl': 'mówimy', '3pl': 'mówią' } },
  have: { pos: 'verb', forms: { '1sg': 'mam', '2sg': 'masz', '3sg': 'ma', '1pl': 'mamy', '3pl': 'mają' } },

  // Animate nouns
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  teacher: { pos: 'noun', gender: 'feminine', animate: true },
  friend: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'kolegę', gen: 'kolegi' } },
  brother: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'brata', gen: 'brata' } },
  sister: { pos: 'noun', gender: 'feminine', animate: true },
  grandma: { pos: 'noun', gender: 'feminine', animate: true },
  grandpa: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'dziadka', gen: 'dziadka' } },
  doctor: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'lekarza', gen: 'lekarza' } },
  teddy: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'misia', gen: 'misia' } },

  // Mass nouns
  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'neuter', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true, cases: { gen: 'chleba' } },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'feminine', mass: true },

  // Case forms a rule would get wrong
  apple: { pos: 'noun', gender: 'neuter', cases: { gen: 'jabłka' }, plural: 'jabłka' },
  book: { pos: 'noun', gender: 'feminine', cases: { acc: 'książkę', gen: 'książki' }, plural: 'książki' },
  cookie: { pos: 'noun', gender: 'neuter', cases: { gen: 'ciastka' }, plural: 'ciastka' },
  ball: { pos: 'noun', gender: 'feminine', cases: { acc: 'piłkę', gen: 'piłki' }, plural: 'piłki' },
  school: { pos: 'noun', gender: 'feminine', cases: { acc: 'szkołę', gen: 'szkoły' }, institutional: true },
  home: { pos: 'noun', gender: 'masculine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'neuter', institutional: true },
  egg: { pos: 'noun', gender: 'neuter', cases: { gen: 'jajka' }, plural: 'jajka' },
  table: { pos: 'noun', gender: 'masculine', cases: { gen: 'stołu' } },
  // Masculine inanimate genitives take -a or -u by noun, not by rule.
  park: { pos: 'noun', gender: 'masculine', cases: { gen: 'parku' } },
  shop: { pos: 'noun', gender: 'masculine', cases: { gen: 'sklepu' } },
  garden: { pos: 'noun', gender: 'masculine', cases: { gen: 'ogrodu' } },

  // Each preposition governs a case: "do parku", "w domu".
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
