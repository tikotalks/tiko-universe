import type { Lexicon } from '../features'

/**
 * Papiamentu overlay. There is almost nothing to curate — no gender, no cases, no
 * conjugation — so this is the shortest lexicon in the package: which nouns are
 * mass, which words are sensations that take "tin", and the pronouns' person.
 */
export const papiamentuLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg' },
  you: { pos: 'pronoun', person: 2, number: 'sg' },
  we: { pos: 'pronoun', person: 1, number: 'pl' },
  he: { pos: 'pronoun', person: 3, number: 'sg' },
  she: { pos: 'pronoun', person: 3, number: 'sg' },
  they: { pos: 'pronoun', person: 3, number: 'pl' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // Sensations are had: "Mi tin hamber", "Mi tin set".
  hungry: { pos: 'adjective', sensation: 'hamber' },
  thirsty: { pos: 'adjective', sensation: 'set' },
  cold: { pos: 'adjective', sensation: 'friu' },
  hot: { pos: 'adjective', sensation: 'kalor' },
  scared: { pos: 'adjective', sensation: 'miedu' },

  water: { pos: 'noun', mass: true },
  milk: { pos: 'noun', mass: true },
  bread: { pos: 'noun', mass: true },
  rice: { pos: 'noun', mass: true },
  cheese: { pos: 'noun', mass: true },
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
