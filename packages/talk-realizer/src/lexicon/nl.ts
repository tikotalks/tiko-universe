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
