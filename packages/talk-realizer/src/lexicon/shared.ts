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
 * Three tiles are also **reclassified** here, because the packs file them wrong:
 * `is` and `are` are copulas, not question words, and `can` is a modal verb.
 * Left as questions they turn every sentence containing them into a question.
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
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  many: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  little: { pos: 'determiner', determinerKind: 'quantifier' },
  // Filed as a determiner in every pack; it is an adjective.
  big: { pos: 'adjective' },

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
