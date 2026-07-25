import type { Lexicon } from '../features'

/**
 * English feature overlay, keyed by pack concept id.
 *
 * This is a prototype slice: the pronouns, determiners and verbs that the core
 * grammar needs, plus enough nouns and adjectives to exercise the rules. The
 * full pack is 295 words, so completing it is an afternoon of data entry, not a
 * modelling problem — which is exactly the argument for doing it this way.
 *
 * Anything absent degrades gracefully: an unknown noun is treated as a countable
 * common singular, an unknown verb as a regular one.
 */
export const englishLexicon: Lexicon = {
  // Pronouns
  i: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'nom', accusative: 'me' },
  you: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'nom' },
  we: { pos: 'pronoun', person: 1, number: 'pl', pronounCase: 'nom', accusative: 'us' },
  he: { pos: 'pronoun', person: 3, number: 'sg', pronounCase: 'nom', accusative: 'him' },
  she: { pos: 'pronoun', person: 3, number: 'sg', pronounCase: 'nom', accusative: 'her' },
  it: { pos: 'pronoun', person: 3, number: 'sg', pronounCase: 'nom' },
  they: { pos: 'pronoun', person: 3, number: 'pl', pronounCase: 'nom', accusative: 'them' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // Determiners. The pack files `big`, `two` and `three` as determiners; the
  // overlay corrects that.
  a: { pos: 'determiner', determinerKind: 'indefinite' },
  the: { pos: 'determiner', determinerKind: 'definite' },
  this: { pos: 'determiner', determinerKind: 'demonstrative' },
  that: { pos: 'determiner', determinerKind: 'demonstrative' },
  some: { pos: 'determiner', determinerKind: 'quantifier' },
  one: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'sg' },
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  many: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },

  // Verbs. English present tense only marks the third person singular, so most
  // verbs need no forms at all — the realizer adds -s.
  want: { pos: 'verb', forms: { past: 'wanted' } },
  need: { pos: 'verb', forms: { past: 'needed' } },
  like: { pos: 'verb', forms: { past: 'liked' } },
  feel: { pos: 'verb', forms: { past: 'felt' } },
  have: { pos: 'verb', forms: { '3sg': 'has', past: 'had' } },
  go: { pos: 'verb', forms: { '3sg': 'goes', past: 'went' } },
  eat: { pos: 'verb', forms: { past: 'ate' } },
  drink: { pos: 'verb', forms: { past: 'drank' } },
  play: { pos: 'verb', forms: { past: 'played' } },
  see: { pos: 'verb', forms: { past: 'saw' } },
  help: { pos: 'verb', forms: { past: 'helped' } },
  read: { pos: 'verb', forms: { past: 'read' } },
  sleep: { pos: 'verb', forms: { past: 'slept' } },

  // Nouns
  apple: { pos: 'noun', plural: 'apples', vowelSound: true },
  banana: { pos: 'noun', plural: 'bananas' },
  bread: { pos: 'noun', mass: true },
  water: { pos: 'noun', mass: true },
  milk: { pos: 'noun', mass: true },
  music: { pos: 'noun', mass: true },
  cookie: { pos: 'noun', plural: 'cookies' },
  ball: { pos: 'noun', plural: 'balls' },
  book: { pos: 'noun', plural: 'books' },
  bed: { pos: 'noun', plural: 'beds', institutional: true },
  park: { pos: 'noun', plural: 'parks' },
  school: { pos: 'noun', plural: 'schools', institutional: true },
  toilet: { pos: 'noun', plural: 'toilets' },
  home: { pos: 'noun', proper: true },

  // Adjectives
  big: { pos: 'adjective' },
  small: { pos: 'adjective' },
  happy: { pos: 'adjective' },
  sad: { pos: 'adjective' },
  hungry: { pos: 'adjective' },
  red: { pos: 'adjective' },
  hurt: { pos: 'adjective' },

  // Prepositions and questions need no features beyond their part of speech.
  to: { pos: 'preposition' },
  in: { pos: 'preposition' },
  with: { pos: 'preposition' },
  what: { pos: 'question' },
  where: { pos: 'question' },
  who: { pos: 'question' },

  // Socials
  please: { pos: 'social' },
  'thank-you': { pos: 'social' },
  hello: { pos: 'social' },
  more: { pos: 'social' },

  /**
   * Not in the packs yet. Talk has no negation tile — only the social "no" —
   * so a child cannot currently say "I don't want that". Adding this tile is a
   * product change, and the realizer is ready for it.
   */
  not: { pos: 'negation' },
}
