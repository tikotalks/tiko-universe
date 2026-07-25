import type { Lexicon } from '../features'

/**
 * The facts that are true in every language, because they follow from the
 * *concept* rather than from the words.
 *
 * `i` is first-person singular in all thirteen packs; `two` forces a plural
 * everywhere; `the` is definite everywhere. Authoring that once means a new
 * language starts with its whole closed class already described, and only has to
 * state what makes it different (its object pronoun forms, its counting words).
 *
 * Several tiles are also **reclassified** here, because the packs file them
 * wrong: `is` and `are` are copulas, not question words (left as questions they
 * turn every sentence containing them into a question), `can` is a modal verb,
 * `big` is an adjective rather than a determiner, and `more` is an adverb rather
 * than a social — "I want more.", not "I want, more.".
 */
export const sharedStructure: Lexicon = {
  // Pronouns
  i: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'nom' },
  you: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'nom' },
  we: { pos: 'pronoun', person: 1, number: 'pl', pronounCase: 'nom' },
  he: { pos: 'pronoun', person: 3, number: 'sg', pronounCase: 'nom' },
  she: { pos: 'pronoun', person: 3, number: 'sg', pronounCase: 'nom' },
  they: { pos: 'pronoun', person: 3, number: 'pl', pronounCase: 'nom' },
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
  // Two and three are the numerals Slavic treats specially (the paucal).
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', smallNumber: true },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', smallNumber: true },
  many: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  little: { pos: 'determiner', determinerKind: 'quantifier' },
  // Filed as a determiner in every pack; it is an adjective, and a quality.
  big: { pos: 'adjective', inherent: true },

  /**
   * Qualities rather than states. A child saying "the apple is big" is describing
   * what the apple is; saying "I am sad" is describing how they feel right now.
   * Spanish, Portuguese, Catalan and Galician spell that difference with two
   * different verbs, so the distinction has to be recorded somewhere.
   */
  small: { pos: 'adjective', inherent: true },
  tall: { pos: 'adjective', inherent: true },
  short: { pos: 'adjective', inherent: true },
  round: { pos: 'adjective', inherent: true },
  square: { pos: 'adjective', inherent: true },
  new: { pos: 'adjective', inherent: true },
  old: { pos: 'adjective', inherent: true },
  different: { pos: 'adjective', inherent: true },
  same: { pos: 'adjective', inherent: true },
  easy: { pos: 'adjective', inherent: true },
  soft: { pos: 'adjective', inherent: true },
  hard: { pos: 'adjective', inherent: true },
  loud: { pos: 'adjective', inherent: true },
  fast: { pos: 'adjective', inherent: true },
  slow: { pos: 'adjective', inherent: true },
  red: { pos: 'adjective', inherent: true },
  blue: { pos: 'adjective', inherent: true },
  green: { pos: 'adjective', inherent: true },
  yellow: { pos: 'adjective', inherent: true },
  orange: { pos: 'adjective', inherent: true },
  purple: { pos: 'adjective', inherent: true },
  pink: { pos: 'adjective', inherent: true },
  brown: { pos: 'adjective', inherent: true },
  black: { pos: 'adjective', inherent: true },
  white: { pos: 'adjective', inherent: true },
  grey: { pos: 'adjective', inherent: true },

  /**
   * Filed with the socials, but they modify the verb rather than closing the
   * sentence: a social gets a comma, and "I want, more." is not a sentence.
   */
  more: { pos: 'adverb' },
  again: { pos: 'adverb' },

  /**
   * A child uses these as names, not as descriptions: "Where is Mum?", never
   * "Where is a mum?". "teacher" and "doctor" are not names and keep an article.
   */
  mum: { pos: 'noun', proper: true, animate: true },
  dad: { pos: 'noun', proper: true, animate: true },
  grandma: { pos: 'noun', proper: true, animate: true },
  grandpa: { pos: 'noun', proper: true, animate: true },

  // The other people a child talks about. Animacy is not decoration: the Slavic
  // accusative depends on it, and so does whether a sensation can be felt.
  teacher: { pos: 'noun', animate: true },
  friend: { pos: 'noun', animate: true },
  brother: { pos: 'noun', animate: true },
  sister: { pos: 'noun', animate: true },
  helper: { pos: 'noun', animate: true },
  doctor: { pos: 'noun', animate: true },

  // Question words
  what: { pos: 'question' },
  where: { pos: 'question' },
  who: { pos: 'question' },
  when: { pos: 'question' },
  why: { pos: 'question' },
  which: { pos: 'question' },
  how: { pos: 'question' },

  // Reclassified: these are not question words.
  can: { pos: 'verb' },
  is: { pos: 'verb', copula: true },
  are: { pos: 'verb', copula: true },

  // Not in the packs yet: Talk has no negation tile, only the social "no".
  not: { pos: 'negation' },
}
