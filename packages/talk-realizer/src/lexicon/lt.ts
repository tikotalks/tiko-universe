import type { Lexicon } from '../features'

/**
 * Lithuanian overlay. The masculine nominative ends in a syllable the other cases
 * replace (-as, -is, -us), and which one a noun takes is lexical, so the genders
 * and the irregular stems are curated along with the verb persons.
 */
export const lithuanianLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'mane', dative: 'man' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'tave', dative: 'tau' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'mus', dative: 'mums' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'jį', dative: 'jam' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'ją', dative: 'jai' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'juos', dative: 'jiems' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'mane', dative: 'man' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // norėti governs the genitive: "noriu obuolio".
  want: { pos: 'verb', objectCase: 'genitive', forms: { '1sg': 'noriu', '2sg': 'nori', '3sg': 'nori', '1pl': 'norime', '2pl': 'norite', '3pl': 'nori' } },
  like: { pos: 'verb', forms: { '1sg': 'myliu', '2sg': 'myli', '3sg': 'myli', '1pl': 'mylime', '3pl': 'myli' } },
  see: { pos: 'verb', forms: { '1sg': 'matau', '2sg': 'matai', '3sg': 'mato', '1pl': 'matome', '3pl': 'mato' } },
  hear: { pos: 'verb', forms: { '1sg': 'girdžiu', '2sg': 'girdi', '3sg': 'girdi', '1pl': 'girdime', '3pl': 'girdi' } },
  have: { pos: 'verb', forms: { '1sg': 'turiu', '2sg': 'turi', '3sg': 'turi', '1pl': 'turime', '3pl': 'turi' } },
  eat: { pos: 'verb', forms: { '1sg': 'valgau', '2sg': 'valgai', '3sg': 'valgo', '1pl': 'valgome', '3pl': 'valgo' } },
  drink: { pos: 'verb', forms: { '1sg': 'geriu', '2sg': 'geri', '3sg': 'geria', '1pl': 'geriame', '3pl': 'geria' } },
  go: { pos: 'verb', forms: { '1sg': 'einu', '2sg': 'eini', '3sg': 'eina', '1pl': 'einame', '3pl': 'eina' } },
  play: { pos: 'verb', forms: { '1sg': 'žaidžiu', '2sg': 'žaidi', '3sg': 'žaidžia', '1pl': 'žaidžiame', '3pl': 'žaidžia' } },
  read: { pos: 'verb', forms: { '1sg': 'skaitau', '2sg': 'skaitai', '3sg': 'skaito', '1pl': 'skaitome', '3pl': 'skaito' } },
  sleep: { pos: 'verb', forms: { '1sg': 'miegu', '2sg': 'miegi', '3sg': 'miega', '1pl': 'miegame', '3pl': 'miega' } },
  talk: { pos: 'verb', forms: { '1sg': 'kalbu', '2sg': 'kalbi', '3sg': 'kalba', '1pl': 'kalbame', '3pl': 'kalba' } },
  // padėti governs the dative: "padedu tau".
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'padedu', '2sg': 'padedi', '3sg': 'padeda', '1pl': 'padedame', '3pl': 'padeda' } },

  friend: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'draugą', gen: 'draugo' } },
  brother: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'brolį', gen: 'brolio' } },
  doctor: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'daktarą', gen: 'daktaro' } },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },

  water: { pos: 'noun', gender: 'masculine', mass: true, cases: { acc: 'vandenį', gen: 'vandens' } },
  milk: { pos: 'noun', gender: 'masculine', mass: true, cases: { acc: 'pieną', gen: 'pieno' } },
  bread: { pos: 'noun', gender: 'feminine', mass: true, cases: { acc: 'duoną', gen: 'duonos' } },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true, cases: { acc: 'sūrį', gen: 'sūrio' } },
  juice: { pos: 'noun', gender: 'feminine', mass: true },
  tea: { pos: 'noun', gender: 'feminine', mass: true, cases: { acc: 'arbatą', gen: 'arbatos' } },
  music: { pos: 'noun', gender: 'feminine', mass: true, cases: { acc: 'muziką', gen: 'muzikos' } },
  paper: { pos: 'noun', gender: 'masculine', mass: true },

  apple: { pos: 'noun', gender: 'masculine', cases: { acc: 'obuolį', gen: 'obuolio' }, plural: 'obuoliai' },
  book: { pos: 'noun', gender: 'feminine', cases: { acc: 'knygą', gen: 'knygos' }, plural: 'knygos' },
  ball: { pos: 'noun', gender: 'masculine', cases: { acc: 'kamuolį', gen: 'kamuolio' } },
  cookie: { pos: 'noun', gender: 'masculine', cases: { acc: 'sausainį', gen: 'sausainio' }, plural: 'sausainiai' },
  egg: { pos: 'noun', gender: 'masculine', cases: { acc: 'kiaušinį', gen: 'kiaušinio' }, plural: 'kiaušiniai' },
  school: { pos: 'noun', gender: 'feminine', cases: { acc: 'mokyklą', gen: 'mokyklos' }, institutional: true },
  home: { pos: 'noun', gender: 'masculine', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'feminine', institutional: true },
  park: { pos: 'noun', gender: 'masculine', cases: { acc: 'parką', gen: 'parko' } },
  garden: { pos: 'noun', gender: 'masculine', cases: { acc: 'sodą', gen: 'sodo' } },
  table: { pos: 'noun', gender: 'masculine', cases: { acc: 'stalą', gen: 'stalo' } },

  to: { pos: 'preposition', governsCase: 'acc' },
  // The locative needs no preposition at all: "sode".
  in: { pos: 'preposition', governsCase: 'loc', caseOnly: true },
  on: { pos: 'preposition', governsCase: 'loc' },
  from: { pos: 'preposition', governsCase: 'gen' },
  without: { pos: 'preposition', governsCase: 'gen' },

  not: { pos: 'negation' },
}
