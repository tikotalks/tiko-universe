import type { Lexicon } from '../features'

/**
 * Georgian overlay. Deliberately thin: the verb forms are what this language needs
 * most and what a rule can least provide, so the few that are here are the common
 * ones, and everything else falls back to the pack's first-person form with a note.
 *
 * This is the file a Georgian speaker should fill in first.
 */
export const georgianLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg' },
  you: { pos: 'pronoun', person: 2, number: 'sg' },
  we: { pos: 'pronoun', person: 1, number: 'pl' },
  he: { pos: 'pronoun', person: 3, number: 'sg' },
  she: { pos: 'pronoun', person: 3, number: 'sg' },
  they: { pos: 'pronoun', person: 3, number: 'pl' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // The verbs whose other persons are known; the rest need a speaker.
  want: { pos: 'verb', forms: { '1sg': 'მინდა', '2sg': 'გინდა', '3sg': 'უნდა', '1pl': 'გვინდა', '2pl': 'გინდათ', '3pl': 'უნდათ' } },
  have: { pos: 'verb', forms: { '1sg': 'მაქვს', '2sg': 'გაქვს', '3sg': 'აქვს', '1pl': 'გვაქვს', '3pl': 'აქვთ' } },
  see: { pos: 'verb', forms: { '1sg': 'ვხედავ', '2sg': 'ხედავ', '3sg': 'ხედავს', '1pl': 'ვხედავთ', '3pl': 'ხედავენ' } },
  eat: { pos: 'verb', forms: { '1sg': 'ვჭამ', '2sg': 'ჭამ', '3sg': 'ჭამს', '1pl': 'ვჭამთ', '3pl': 'ჭამენ' } },
  drink: { pos: 'verb', forms: { '1sg': 'ვსვამ', '2sg': 'სვამ', '3sg': 'სვამს', '1pl': 'ვსვამთ', '3pl': 'სვამენ' } },
  play: { pos: 'verb', forms: { '1sg': 'ვთამაშობ', '2sg': 'თამაშობ', '3sg': 'თამაშობს', '1pl': 'ვთამაშობთ', '3pl': 'თამაშობენ' } },
  read: { pos: 'verb', forms: { '1sg': 'ვკითხულობ', '2sg': 'კითხულობ', '3sg': 'კითხულობს', '1pl': 'ვკითხულობთ', '3pl': 'კითხულობენ' } },
  go: { pos: 'verb', forms: { '1sg': 'მივდივარ', '2sg': 'მიდიხარ', '3sg': 'მიდის', '1pl': 'მივდივართ', '3pl': 'მიდიან' } },
  help: { pos: 'verb', forms: { '1sg': 'ვეხმარები', '2sg': 'ეხმარები', '3sg': 'ეხმარება', '1pl': 'ვეხმარებით', '3pl': 'ეხმარებიან' } },

  water: { pos: 'noun', mass: true },
  milk: { pos: 'noun', mass: true },
  bread: { pos: 'noun', mass: true },
  cheese: { pos: 'noun', mass: true },
  rice: { pos: 'noun', mass: true },
  juice: { pos: 'noun', mass: true },
  tea: { pos: 'noun', mass: true },
  music: { pos: 'noun', mass: true },
  home: { pos: 'noun', institutional: true, proper: true },
  school: { pos: 'noun', institutional: true },
  mum: { pos: 'noun', animate: true, proper: true },
  dad: { pos: 'noun', animate: true, proper: true },
  friend: { pos: 'noun', animate: true },

  not: { pos: 'negation' },
}
