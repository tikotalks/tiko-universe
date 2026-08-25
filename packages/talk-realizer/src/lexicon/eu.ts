import type { Lexicon } from '../features'

/**
 * Basque overlay. There is very little to curate — no gender, one declension — so
 * this is mostly the mass nouns and the pronouns' person, which the auxiliary
 * needs in order to agree.
 */
export const basqueLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg' },
  you: { pos: 'pronoun', person: 2, number: 'sg' },
  we: { pos: 'pronoun', person: 1, number: 'pl' },
  he: { pos: 'pronoun', person: 3, number: 'sg' },
  she: { pos: 'pronoun', person: 3, number: 'sg' },
  they: { pos: 'pronoun', person: 3, number: 'pl' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // "ur" does not double its r: "ura", not "urra".
  water: { pos: 'noun', mass: true, definiteForm: 'ura' },
  milk: { pos: 'noun', mass: true },
  bread: { pos: 'noun', mass: true },
  cheese: { pos: 'noun', mass: true },
  rice: { pos: 'noun', mass: true },
  juice: { pos: 'noun', mass: true },
  tea: { pos: 'noun', mass: true },
  music: { pos: 'noun', mass: true },
  paper: { pos: 'noun', mass: true },
  home: { pos: 'noun', institutional: true, proper: true },
  school: { pos: 'noun', institutional: true },
  bed: { pos: 'noun', institutional: true },
  mum: { pos: 'noun', animate: true, proper: true },
  dad: { pos: 'noun', animate: true, proper: true },
  friend: { pos: 'noun', animate: true },

  not: { pos: 'negation' },
}
