import type { Lexicon } from '../features'

/**
 * Turkish overlay. Almost nothing about the *nouns* needs curating — there is no
 * gender and no declension class, so harmony covers all 295 tiles. What a rule
 * cannot know is the **verb stems**: the packs ship a finished word ("istiyorum"),
 * and every other person and the negative are built from the stem behind it.
 */
export const turkishLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'beni', dative: 'bana' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'seni', dative: 'sana' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'bizi', dative: 'bize' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'onu', dative: 'ona' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'onu', dative: 'ona' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'onları', dative: 'onlara' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'beni', dative: 'bana' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // The stem is what the suffixes attach to; the tile shows the first person.
  want: { pos: 'verb', stem: 'iste' },
  need: { pos: 'verb', stem: 'ihtiyaç duy' },
  like: { pos: 'verb', stem: 'sev' },
  feel: { pos: 'verb', stem: 'hisset' },
  see: { pos: 'verb', stem: 'gör' },
  hear: { pos: 'verb', stem: 'duy' },
  have: { pos: 'verb', stem: 'sahip ol' },
  go: { pos: 'verb', stem: 'git' },
  come: { pos: 'verb', stem: 'gel' },
  play: { pos: 'verb', stem: 'oyna' },
  read: { pos: 'verb', stem: 'oku' },
  draw: { pos: 'verb', stem: 'çiz' },
  eat: { pos: 'verb', stem: 'ye' },
  drink: { pos: 'verb', stem: 'iç' },
  sit: { pos: 'verb', stem: 'otur' },
  stand: { pos: 'verb', stem: 'kalk' },
  walk: { pos: 'verb', stem: 'yürü' },
  run: { pos: 'verb', stem: 'koş' },
  stop: { pos: 'verb', stem: 'dur' },
  start: { pos: 'verb', stem: 'başla' },
  wait: { pos: 'verb', stem: 'bekle' },
  // yardım etmek governs the dative: "sana yardım ediyorum".
  help: { pos: 'verb', stem: 'yardım et', objectCase: 'dative' },
  choose: { pos: 'verb', stem: 'seç' },
  open: { pos: 'verb', stem: 'aç' },
  close: { pos: 'verb', stem: 'kapat' },
  wash: { pos: 'verb', stem: 'yıka' },
  sleep: { pos: 'verb', stem: 'uyu' },
  rest: { pos: 'verb', stem: 'dinlen' },
  try: { pos: 'verb', stem: 'dene' },
  talk: { pos: 'verb', stem: 'konuş' },

  // Nouns whose plural or accusative a rule would get wrong.
  water: { pos: 'noun', mass: true, cases: { acc: 'suyu' } },
  milk: { pos: 'noun', mass: true },
  bread: { pos: 'noun', mass: true },
  rice: { pos: 'noun', mass: true },
  cheese: { pos: 'noun', mass: true },
  music: { pos: 'noun', mass: true },
  juice: { pos: 'noun', mass: true },
  tea: { pos: 'noun', mass: true },
  paper: { pos: 'noun', mass: true },
  home: { pos: 'noun', institutional: true },
  school: { pos: 'noun', institutional: true },
  bed: { pos: 'noun', institutional: true },
  mum: { pos: 'noun', animate: true, proper: true },
  dad: { pos: 'noun', animate: true, proper: true },

  // These are case endings in Turkish, written onto the noun.
  to: { pos: 'preposition', governsCase: 'dat' },
  in: { pos: 'preposition', governsCase: 'loc' },
  on: { pos: 'preposition', governsCase: 'loc' },
  from: { pos: 'preposition', governsCase: 'abl' },
  with: { pos: 'preposition', postposition: true },
  without: { pos: 'preposition', postposition: true },

  // A modal, which Turkish builds inside the verb rather than beside it.
  can: { pos: 'verb', stem: 'yapabil' },

  not: { pos: 'negation' },
}
