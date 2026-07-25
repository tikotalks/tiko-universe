import type { Lexicon } from '../features'

/**
 * Greek overlay. Gender comes from the ending (Greek is unusually regular here),
 * so this carries the irregular verbs, the mass nouns, and the gender the rule
 * gets wrong.
 */
export const greekLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'με' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'σε' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'μας' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'τον' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'την' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'τους' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'με' },

  // Irregular and contracted verbs
  have: { pos: 'verb', forms: { '1sg': 'έχω', '2sg': 'έχεις', '3sg': 'έχει', '1pl': 'έχουμε', '3pl': 'έχουν' } },
  eat: { pos: 'verb', forms: { '1sg': 'τρώω', '2sg': 'τρως', '3sg': 'τρώει', '1pl': 'τρώμε', '3pl': 'τρώνε' } },
  drink: { pos: 'verb', forms: { '1sg': 'πίνω', '2sg': 'πίνεις', '3sg': 'πίνει', '1pl': 'πίνουμε', '3pl': 'πίνουν' } },
  go: { pos: 'verb', forms: { '1sg': 'πηγαίνω', '2sg': 'πηγαίνεις', '3sg': 'πηγαίνει', '1pl': 'πηγαίνουμε', '3pl': 'πηγαίνουν' } },
  come: { pos: 'verb', forms: { '1sg': 'έρχομαι', '2sg': 'έρχεσαι', '3sg': 'έρχεται', '1pl': 'ερχόμαστε', '3pl': 'έρχονται' } },
  sleep: { pos: 'verb', forms: { '1sg': 'κοιμάμαι', '2sg': 'κοιμάσαι', '3sg': 'κοιμάται', '1pl': 'κοιμόμαστε', '3pl': 'κοιμούνται' } },
  // "αρέσει" inverts like Spanish gustar: "μου αρέσει το ψωμί".
  like: { pos: 'verb', experiencerDative: true, forms: { '3sg': 'αρέσει', '3pl': 'αρέσουν' } },
  walk: { pos: 'verb', forms: { '1sg': 'περπατώ', '2sg': 'περπατάς', '3sg': 'περπατά', '1pl': 'περπατάμε', '3pl': 'περπατούν' } },
  talk: { pos: 'verb', forms: { '1sg': 'μιλώ', '2sg': 'μιλάς', '3sg': 'μιλά', '1pl': 'μιλάμε', '3pl': 'μιλούν' } },
  help: { pos: 'verb', forms: { '1sg': 'βοηθώ', '2sg': 'βοηθάς', '3sg': 'βοηθά', '1pl': 'βοηθάμε', '3pl': 'βοηθούν' } },

  // Mass nouns
  water: { pos: 'noun', gender: 'neuter', mass: true },
  milk: { pos: 'noun', gender: 'neuter', mass: true },
  bread: { pos: 'noun', gender: 'neuter', mass: true },
  rice: { pos: 'noun', gender: 'neuter', mass: true },
  cheese: { pos: 'noun', gender: 'neuter', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'neuter', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'neuter', mass: true },

  // Gender or plural the rule gets wrong
  apple: { pos: 'noun', gender: 'neuter', plural: 'μήλα' },
  egg: { pos: 'noun', gender: 'neuter', plural: 'αυγά' },
  book: { pos: 'noun', gender: 'neuter', plural: 'βιβλία' },
  cookie: { pos: 'noun', gender: 'neuter', plural: 'μπισκότα' },
  ball: { pos: 'noun', gender: 'feminine', plural: 'μπάλες' },
  bag: { pos: 'noun', gender: 'feminine', plural: 'τσάντες' },
  school: { pos: 'noun', gender: 'neuter', institutional: true },
  home: { pos: 'noun', gender: 'neuter', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'neuter', institutional: true },
  park: { pos: 'noun', gender: 'neuter', plural: 'πάρκα' },
  friend: { pos: 'noun', gender: 'masculine', plural: 'φίλοι' },
  hand: { pos: 'noun', gender: 'neuter', plural: 'χέρια' },

  not: { pos: 'negation' },
}
