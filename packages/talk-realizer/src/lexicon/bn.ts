import type { Lexicon } from '../features'

/**
 * Bengali overlay. Short, because there is no gender and one declension: what is
 * here is the pronouns' object forms, the verbs whose stem changes, and which nouns
 * are people (which decides the -কে on an object).
 */
export const bengaliLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'আমাকে' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'তোমাকে' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'আমাদের' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'তাকে' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'তাকে' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'তাদের' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'আমাকে' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // Verbs whose other persons the vowel rule does not reach.
  want: { pos: 'verb', forms: { '1sg': 'চাই', '2sg': 'চাও', '3sg': 'চায়', '1pl': 'চাই', '2pl': 'চাও', '3pl': 'চায়' } },
  have: { pos: 'verb', forms: { '1sg': 'আছে', '2sg': 'আছে', '3sg': 'আছে', pl: 'আছে' } },
  eat: { pos: 'verb', forms: { '1sg': 'খাই', '2sg': 'খাও', '3sg': 'খায়', '1pl': 'খাই', '2pl': 'খাও', '3pl': 'খায়' } },
  go: { pos: 'verb', forms: { '1sg': 'যাই', '2sg': 'যাও', '3sg': 'যায়', '1pl': 'যাই', '2pl': 'যাও', '3pl': 'যায়' } },
  come: { pos: 'verb', forms: { '1sg': 'আসি', '2sg': 'আসো', '3sg': 'আসে', '1pl': 'আসি', '2pl': 'আসো', '3pl': 'আসে' } },
  give: { pos: 'verb', forms: { '1sg': 'দিই', '2sg': 'দাও', '3sg': 'দেয়', '1pl': 'দিই', '3pl': 'দেয়' } },
  can: { pos: 'verb', forms: { '1sg': 'পারি', '2sg': 'পারো', '3sg': 'পারে', '1pl': 'পারি', '2pl': 'পারো', '3pl': 'পারে' } },
  need: { pos: 'verb', forms: { '1sg': 'দরকার', '2sg': 'দরকার', '3sg': 'দরকার', pl: 'দরকার' } },

  // The people, whose object form takes -কে.
  mum: { pos: 'noun', animate: true, proper: true },
  dad: { pos: 'noun', animate: true, proper: true },
  friend: { pos: 'noun', animate: true },
  brother: { pos: 'noun', animate: true },
  sister: { pos: 'noun', animate: true },
  teacher: { pos: 'noun', animate: true },
  doctor: { pos: 'noun', animate: true },
  grandma: { pos: 'noun', animate: true, proper: true },
  grandpa: { pos: 'noun', animate: true, proper: true },
  teddy: { pos: 'noun', animate: true },

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

  not: { pos: 'negation' },
}
