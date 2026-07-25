import type { Lexicon } from '../features'

/**
 * Indonesian overlay: structure only, because nothing inflects. The possessive
 * pronouns are the important part — they are postposed, which changes where the
 * engine puts them.
 */
export const indonesianLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg' },
  you: { pos: 'pronoun', person: 2, number: 'sg' },
  we: { pos: 'pronoun', person: 1, number: 'pl' },
  he: { pos: 'pronoun', person: 3, number: 'sg' },
  she: { pos: 'pronoun', person: 3, number: 'sg' },
  they: { pos: 'pronoun', person: 3, number: 'pl' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  water: { pos: 'noun', mass: true },
  milk: { pos: 'noun', mass: true },
  rice: { pos: 'noun', mass: true },
  bread: { pos: 'noun', mass: true },
  music: { pos: 'noun', mass: true },
  home: { pos: 'noun', proper: true, institutional: true },
  school: { pos: 'noun', institutional: true },

  not: { pos: 'negation' },
}
