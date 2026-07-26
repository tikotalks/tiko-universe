import type { Lexicon } from '../features'

/**
 * Dutch feature overlay, keyed by the same pack concept ids as the English one.
 *
 * The interesting column is `gender`: de/het is a lexical fact per noun that no
 * rule can derive, and it drives both the definite article and the adjective
 * ending. This is precisely the sort of table a native speaker fills in once —
 * and precisely what a small multilingual model gets wrong.
 */
export const dutchLexicon: Lexicon = {
  thirsty: { pos: 'adjective', sensation: 'dorst' },
  cold: { pos: 'adjective', sensation: 'het koud' },
  hot: { pos: 'adjective', sensation: 'het warm' },
  // Pronouns
  i: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'nom', accusative: 'mij' },
  you: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'nom', accusative: 'jou' },
  we: { pos: 'pronoun', person: 1, number: 'pl', pronounCase: 'nom', accusative: 'ons' },
  he: { pos: 'pronoun', person: 3, number: 'sg', pronounCase: 'nom', accusative: 'hem' },
  she: { pos: 'pronoun', person: 3, number: 'sg', pronounCase: 'nom', accusative: 'haar' },
  it: { pos: 'pronoun', person: 3, number: 'sg', pronounCase: 'nom' },
  they: { pos: 'pronoun', person: 3, number: 'pl', pronounCase: 'nom', accusative: 'hen' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // Determiners
  a: { pos: 'determiner', determinerKind: 'indefinite' },
  the: { pos: 'determiner', determinerKind: 'definite' },
  this: { pos: 'determiner', determinerKind: 'demonstrative' },
  that: { pos: 'determiner', determinerKind: 'demonstrative' },
  some: { pos: 'determiner', determinerKind: 'quantifier' },
  one: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'sg' },
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  many: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },

  // Verbs. Dutch marks person in the present tense, so the forms matter:
  // ik wil / jij wilt / hij wil / wij willen.
  want: { pos: 'verb', forms: { '1sg': 'wil', '2sg': 'wilt', '3sg': 'wil', pl: 'willen', past: 'wilde' } },
  need: { pos: 'verb', forms: { '1sg': 'heb nodig', '2sg': 'hebt nodig', '3sg': 'heeft nodig', pl: 'hebben nodig' } },
  like: { pos: 'verb', forms: { '1sg': 'hou van', '2sg': 'houdt van', '3sg': 'houdt van', pl: 'houden van' } },
  feel: { pos: 'verb', forms: { '1sg': 'voel', '2sg': 'voelt', '3sg': 'voelt', pl: 'voelen' } },
  have: { pos: 'verb', forms: { '1sg': 'heb', '2sg': 'hebt', '3sg': 'heeft', pl: 'hebben', past: 'had' } },
  go: { pos: 'verb', forms: { '1sg': 'ga', '2sg': 'gaat', '3sg': 'gaat', pl: 'gaan', past: 'ging' } },
  eat: { pos: 'verb', forms: { '1sg': 'eet', '2sg': 'eet', '3sg': 'eet', pl: 'eten', past: 'at' } },
  drink: { pos: 'verb', forms: { '1sg': 'drink', '2sg': 'drinkt', '3sg': 'drinkt', pl: 'drinken' } },
  play: { pos: 'verb', forms: { '1sg': 'speel', '2sg': 'speelt', '3sg': 'speelt', pl: 'spelen' } },
  see: { pos: 'verb', forms: { '1sg': 'zie', '2sg': 'ziet', '3sg': 'ziet', pl: 'zien' } },
  help: { pos: 'verb', forms: { '1sg': 'help', '2sg': 'helpt', '3sg': 'helpt', pl: 'helpen' } },
  hear: { pos: 'verb', forms: { '1sg': 'hoor', '2sg': 'hoort', '3sg': 'hoort', pl: 'horen', past: 'hoorde' } },
  come: { pos: 'verb', forms: { '1sg': 'kom', '2sg': 'komt', '3sg': 'komt', pl: 'komen', past: 'kwam' } },
  read: { pos: 'verb', forms: { '1sg': 'lees', '2sg': 'leest', '3sg': 'leest', pl: 'lezen', past: 'las' } },
  draw: { pos: 'verb', forms: { '1sg': 'teken', '2sg': 'tekent', '3sg': 'tekent', pl: 'tekenen', past: 'tekende' } },
  sit: { pos: 'verb', forms: { '1sg': 'zit', '2sg': 'zit', '3sg': 'zit', pl: 'zitten', past: 'zat' } },
  stand: { pos: 'verb', forms: { '1sg': 'sta', '2sg': 'staat', '3sg': 'staat', pl: 'staan', past: 'stond' } },
  walk: { pos: 'verb', forms: { '1sg': 'loop', '2sg': 'loopt', '3sg': 'loopt', pl: 'lopen', past: 'liep' } },
  run: { pos: 'verb', forms: { '1sg': 'ren', '2sg': 'rent', '3sg': 'rent', pl: 'rennen', past: 'rende' } },
  stop: { pos: 'verb', forms: { '1sg': 'stop', '2sg': 'stopt', '3sg': 'stopt', pl: 'stoppen', past: 'stopte' } },
  start: { pos: 'verb', forms: { '1sg': 'begin', '2sg': 'begint', '3sg': 'begint', pl: 'beginnen', past: 'begon' } },
  wait: { pos: 'verb', forms: { '1sg': 'wacht', '2sg': 'wacht', '3sg': 'wacht', pl: 'wachten', past: 'wachtte' } },
  choose: { pos: 'verb', forms: { '1sg': 'kies', '2sg': 'kiest', '3sg': 'kiest', pl: 'kiezen', past: 'koos' } },
  open: { pos: 'verb', forms: { '1sg': 'doe open', '2sg': 'doet open', '3sg': 'doet open', pl: 'doen open', past: 'deed open' } },
  close: { pos: 'verb', forms: { '1sg': 'doe dicht', '2sg': 'doet dicht', '3sg': 'doet dicht', pl: 'doen dicht', past: 'deed dicht' } },
  wash: { pos: 'verb', forms: { '1sg': 'was', '2sg': 'wast', '3sg': 'wast', pl: 'wassen', past: 'waste' } },
  rest: { pos: 'verb', forms: { '1sg': 'rust', '2sg': 'rust', '3sg': 'rust', pl: 'rusten', past: 'rustte' } },
  try: { pos: 'verb', forms: { '1sg': 'probeer', '2sg': 'probeert', '3sg': 'probeert', pl: 'proberen', past: 'probeerde' } },
  talk: { pos: 'verb', forms: { '1sg': 'praat', '2sg': 'praat', '3sg': 'praat', pl: 'praten', past: 'praatte' } },
  sleep: { pos: 'verb', forms: { '1sg': 'slaap', '2sg': 'slaapt', '3sg': 'slaapt', pl: 'slapen' } },

  // Nouns — gender is the whole point of this table.
  apple: { pos: 'noun', gender: 'common', plural: 'appels' },
  banana: { pos: 'noun', gender: 'common', plural: 'bananen' },
  bread: { pos: 'noun', gender: 'neuter', plural: 'broden', mass: true },
  water: { pos: 'noun', gender: 'neuter', mass: true },
  milk: { pos: 'noun', gender: 'common', mass: true },
  music: { pos: 'noun', gender: 'common', mass: true },
  cookie: { pos: 'noun', gender: 'neuter', plural: 'koekjes' },
  ball: { pos: 'noun', gender: 'common', plural: 'ballen' },
  book: { pos: 'noun', gender: 'neuter', plural: 'boeken' },
  bed: { pos: 'noun', gender: 'neuter', plural: 'bedden', institutional: true },
  park: { pos: 'noun', gender: 'neuter', plural: 'parken' },
  school: { pos: 'noun', gender: 'common', plural: 'scholen', institutional: true },
  toilet: { pos: 'noun', gender: 'neuter', plural: "wc's" },
  home: { pos: 'noun', proper: true },

  // Adjectives. `attributive` is only needed where base + "e" is wrong.
  big: { pos: 'adjective', attributive: 'grote' },
  small: { pos: 'adjective', attributive: 'kleine' },
  happy: { pos: 'adjective', attributive: 'blije' },
  sad: { pos: 'adjective', attributive: 'verdrietige' },
  hungry: { pos: 'adjective', sensation: 'honger' },
  red: { pos: 'adjective', attributive: 'rode' },
  hurt: { pos: 'adjective' },

  to: { pos: 'preposition' },
  in: { pos: 'preposition' },
  with: { pos: 'preposition' },
  what: { pos: 'question' },
  where: { pos: 'question' },
  who: { pos: 'question' },

  please: { pos: 'social' },
  'thank-you': { pos: 'social' },
  hello: { pos: 'social' },

  /** Not in the packs yet — see the note in the English overlay. */
  not: { pos: 'negation' },
}
