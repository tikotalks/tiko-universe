import type { Lexicon } from '../features'

/**
 * Frisian overlay. The same two things Dutch needs — which nouns are "it" rather
 * than "de", and the irregular verb persons — plus the plurals, which are -en or
 * -s by word.
 */
export const frisianLexicon: Lexicon = {
  // "omdat" sends the verb to the end of its clause; "en" does not.
  because: { pos: 'conjunction', subordinating: true },

  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'my' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'dy' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'ús' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'him' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'har' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'har' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'my' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  want: { pos: 'verb', forms: { '1sg': 'wol', '2sg': 'wolst', '3sg': 'wol', '1pl': 'wolle', '2pl': 'wolle', '3pl': 'wolle' } },
  have: { pos: 'verb', forms: { '1sg': 'haw', '2sg': 'hast', '3sg': 'hat', '1pl': 'hawwe', '3pl': 'hawwe' } },
  see: { pos: 'verb', forms: { '1sg': 'sjoch', '2sg': 'sjochst', '3sg': 'sjocht', '1pl': 'sjogge', '3pl': 'sjogge' } },
  eat: { pos: 'verb', forms: { '1sg': 'yt', '2sg': 'ytst', '3sg': 'yt', '1pl': 'ite', '3pl': 'ite' } },
  drink: { pos: 'verb', forms: { '1sg': 'drink', '2sg': 'drinkst', '3sg': 'drinkt', '1pl': 'drinke', '3pl': 'drinke' } },
  go: { pos: 'verb', forms: { '1sg': 'gean', '2sg': 'giest', '3sg': 'giet', '1pl': 'geane', '3pl': 'geane' } },
  read: { pos: 'verb', forms: { '1sg': 'lês', '2sg': 'lêst', '3sg': 'lêst', '1pl': 'lêze', '3pl': 'lêze' } },
  sleep: { pos: 'verb', forms: { '1sg': 'sliep', '2sg': 'sliepst', '3sg': 'sliept', '1pl': 'sliepe', '3pl': 'sliepe' } },
  play: { pos: 'verb', forms: { '1sg': 'boartsje', '2sg': 'boartest', '3sg': 'boartet', '1pl': 'boartsje', '3pl': 'boartsje' } },
  help: { pos: 'verb', forms: { '1sg': 'help', '2sg': 'helpst', '3sg': 'helpt', '1pl': 'helpe', '3pl': 'helpe' } },
  talk: { pos: 'verb', forms: { '1sg': 'praat', '2sg': 'praatst', '3sg': 'praat', '1pl': 'prate', '3pl': 'prate' } },

  // The attributive form doubles the consonant after a short vowel.
  big: { pos: 'adjective', inherent: true, attributive: 'grutte' },
  small: { pos: 'adjective', inherent: true, attributive: 'lytse' },
  hot: { pos: 'adjective', attributive: 'waarme' },
  cold: { pos: 'adjective', attributive: 'kâlde' },
  new: { pos: 'adjective', inherent: true, attributive: 'nije' },
  old: { pos: 'adjective', inherent: true, attributive: 'âlde' },
  red: { pos: 'adjective', inherent: true, attributive: 'reade' },

  hungry: { pos: 'adjective', sensation: 'honger' },
  thirsty: { pos: 'adjective', sensation: 'toarst' },

  // "it" nouns, which the article rule needs told.
  water: { pos: 'noun', gender: 'neuter', mass: true },
  bread: { pos: 'noun', gender: 'neuter', mass: true },
  milk: { pos: 'noun', gender: 'common', mass: true },
  cheese: { pos: 'noun', gender: 'common', mass: true },
  rice: { pos: 'noun', gender: 'common', mass: true },
  juice: { pos: 'noun', gender: 'common', mass: true },
  tea: { pos: 'noun', gender: 'common', mass: true },
  music: { pos: 'noun', gender: 'common', mass: true },
  paper: { pos: 'noun', gender: 'neuter', mass: true },
  apple: { pos: 'noun', gender: 'common', plural: 'apels' },
  book: { pos: 'noun', gender: 'neuter', plural: 'boeken' },
  ball: { pos: 'noun', gender: 'common', plural: 'ballen' },
  cookie: { pos: 'noun', gender: 'neuter', plural: 'koekjes' },
  egg: { pos: 'noun', gender: 'neuter', plural: 'aaien' },
  table: { pos: 'noun', gender: 'common', plural: 'tafels' },
  friend: { pos: 'noun', gender: 'common', animate: true, plural: 'freonen' },
  garden: { pos: 'noun', gender: 'common', plural: 'tunen' },
  park: { pos: 'noun', gender: 'neuter' },
  school: { pos: 'noun', gender: 'common', institutional: true },
  home: { pos: 'noun', gender: 'neuter', institutional: true, proper: true },
  bed: { pos: 'noun', gender: 'neuter', institutional: true },
  mum: { pos: 'noun', gender: 'common', animate: true, proper: true },
  dad: { pos: 'noun', gender: 'common', animate: true, proper: true },

  not: { pos: 'negation' },
}
