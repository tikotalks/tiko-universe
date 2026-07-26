import type { Lexicon } from '../features'

/** Arabic overlay: structure, the verbs the prefix rule needs help with, plurals. */
export const arabicLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'إياي' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'إياك' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'إيانا' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'إياه' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'إياها' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'إياهم' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  a: { pos: 'determiner', determinerKind: 'indefinite' },
  the: { pos: 'determiner', determinerKind: 'definite' },
  this: { pos: 'determiner', determinerKind: 'demonstrative' },
  that: { pos: 'determiner', determinerKind: 'demonstrative' },
  some: { pos: 'determiner', determinerKind: 'quantifier' },
  one: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'sg' },
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  many: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  little: { pos: 'determiner', determinerKind: 'quantifier' },
  big: { pos: 'adjective', feminine: 'كبيرة' },

  // "عندي" is a possessive construction, not a verb prefix pattern.
  have: { pos: 'verb', forms: { '1sg': 'عندي', '2sg': 'عندك', '3sg': 'عنده', '1pl': 'عندنا', '3pl': 'عندهم' } },
  want: { pos: 'verb', forms: { '1sg': 'أريد', '2sg': 'تريد', '3sg': 'يريد', '1pl': 'نريد', '3pl': 'يريدون' } },
  go: { pos: 'verb', forms: { '1sg': 'أذهب', '2sg': 'تذهب', '3sg': 'يذهب', '1pl': 'نذهب', '3pl': 'يذهبون' } },
  eat: { pos: 'verb', forms: { '1sg': 'آكل', '2sg': 'تأكل', '3sg': 'يأكل', '1pl': 'نأكل', '3pl': 'يأكلون' } },
  drink: { pos: 'verb', forms: { '1sg': 'أشرب', '2sg': 'تشرب', '3sg': 'يشرب', '1pl': 'نشرب', '3pl': 'يشربون' } },
  like: { pos: 'verb', forms: { '1sg': 'أحب', '2sg': 'تحب', '3sg': 'يحب', '1pl': 'نحب', '3pl': 'يحبون' } },
  help: { pos: 'verb', forms: { '1sg': 'أساعد', '2sg': 'تساعد', '3sg': 'يساعد', '1pl': 'نساعد', '3pl': 'يساعدون' } },

  happy: { pos: 'adjective', feminine: 'سعيدة' },
  sad: { pos: 'adjective', feminine: 'حزينة' },
  tired: { pos: 'adjective', feminine: 'متعبة' },

  water: { pos: 'noun', gender: 'masculine', mass: true },
  milk: { pos: 'noun', gender: 'masculine', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  apple: { pos: 'noun', gender: 'feminine', plural: 'تفاحات' },
  book: { pos: 'noun', gender: 'masculine', plural: 'كتب' },
  school: { pos: 'noun', gender: 'feminine', institutional: true },
  home: { pos: 'noun', proper: true, institutional: true },

  not: { pos: 'negation' },
}
