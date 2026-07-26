import type { Lexicon } from '../features'

/**
 * Hindi overlay. Two things a rule cannot know: which nouns are **feminine** — the
 * ending only hints — and the verbs whose stem the pack ships in a form the
 * participle rule cannot use.
 */
export const hindiLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'मुझे' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'तुम्हें' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'हमें' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'उसे' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'उसे' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'उन्हें' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'मुझे' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // "है" is the copula, not a stem to build a participle on.
  have: { pos: 'verb', copula: true, forms: { '1sg': 'है', '2sg': 'है', '3sg': 'है', pl: 'हैं' } },
  // Impersonal: "मुझे ज़रूरत है" has no participle.
  need: { pos: 'verb', forms: { '1sg': 'ज़रूरत है', '2sg': 'ज़रूरत है', '3sg': 'ज़रूरत है', pl: 'ज़रूरत है' } },
  like: { pos: 'verb', forms: { '1sg': 'पसंद है', '2sg': 'पसंद है', '3sg': 'पसंद है', pl: 'पसंद हैं' } },
  can: { pos: 'verb', forms: { '1sg': 'सकता हूँ', '2sg': 'सकते हो', '3sg': 'सकता है', pl: 'सकते हैं' } },

  // Feminine nouns, which the -ी hint does not cover.
  bread: { pos: 'noun', gender: 'feminine', mass: true },
  book: { pos: 'noun', gender: 'feminine' },
  table: { pos: 'noun', gender: 'feminine' },
  chair: { pos: 'noun', gender: 'feminine' },
  window: { pos: 'noun', gender: 'feminine' },
  car: { pos: 'noun', gender: 'feminine' },
  ball: { pos: 'noun', gender: 'feminine' },
  train: { pos: 'noun', gender: 'feminine' },
  bike: { pos: 'noun', gender: 'feminine' },
  eye: { pos: 'noun', gender: 'feminine' },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  sister: { pos: 'noun', gender: 'feminine', animate: true },
  grandma: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  story: { pos: 'noun', gender: 'feminine' },
  picture: { pos: 'noun', gender: 'feminine' },
  night: { pos: 'noun', gender: 'feminine' },
  shop: { pos: 'noun', gender: 'feminine' },
  hunger: { pos: 'noun', gender: 'feminine' },

  // Masculine nouns whose ending does not say so.
  water: { pos: 'noun', gender: 'masculine', mass: true },
  milk: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'masculine', mass: true },
  apple: { pos: 'noun', gender: 'masculine' },
  home: { pos: 'noun', gender: 'masculine', institutional: true, proper: true },
  school: { pos: 'noun', gender: 'masculine', institutional: true },
  bed: { pos: 'noun', gender: 'masculine', institutional: true },
  park: { pos: 'noun', gender: 'masculine' },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  friend: { pos: 'noun', gender: 'masculine', animate: true },
  brother: { pos: 'noun', gender: 'masculine', animate: true },
  teacher: { pos: 'noun', gender: 'masculine', animate: true },
  doctor: { pos: 'noun', gender: 'masculine', animate: true },
  grandpa: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  teddy: { pos: 'noun', gender: 'masculine', animate: true },

  not: { pos: 'negation' },
}
