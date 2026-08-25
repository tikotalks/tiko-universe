import type { Lexicon } from '../features'

/**
 * Swedish overlay. The ett-words are the whole point: Swedish gender is lexical,
 * exactly like Dutch de/het, and it drives the article, the definite suffix and
 * the adjective ending.
 */
export const swedishLexicon: Lexicon = {
  // A subordinate clause moves its negation in front of the verb.
  because: { pos: 'conjunction', subordinating: true },

  // "vilja" needs an infinitive: "jag vill ha ett äpple", and negation splits
  // the pair: "jag vill inte ha".
  want: { pos: 'verb', verbTail: 'ha', forms: { past: 'ville' } },
  need: { pos: 'verb', verbTail: 'ha' },

  i: { pos: 'pronoun', accusative: 'mig' },
  you: { pos: 'pronoun', accusative: 'dig' },
  we: { pos: 'pronoun', accusative: 'oss' },
  he: { pos: 'pronoun', accusative: 'honom' },
  she: { pos: 'pronoun', accusative: 'henne' },
  they: { pos: 'pronoun', accusative: 'dem' },

  // ett-words (neuter)
  apple: { pos: 'noun', gender: 'neuter', plural: 'äpplen' },
  bread: { pos: 'noun', gender: 'neuter', mass: true },
  water: { pos: 'noun', gender: 'neuter', mass: true },
  egg: { pos: 'noun', gender: 'neuter', plural: 'ägg' },
  house: { pos: 'noun', gender: 'neuter' },
  bed: { pos: 'noun', gender: 'common', institutional: true },
  table: { pos: 'noun', gender: 'neuter', plural: 'bord' },
  paper: { pos: 'noun', gender: 'neuter', mass: true },
  game: { pos: 'noun', gender: 'neuter', plural: 'spel' },
  puzzle: { pos: 'noun', gender: 'neuter', plural: 'pussel' },
  train: { pos: 'noun', gender: 'neuter', plural: 'tåg' },
  lego: { pos: 'noun', gender: 'neuter', mass: true },
  eye: { pos: 'noun', gender: 'neuter', plural: 'ögon' },
  ear: { pos: 'noun', gender: 'neuter', plural: 'öron' },
  leg: { pos: 'noun', gender: 'neuter', plural: 'ben' },
  hair: { pos: 'noun', gender: 'neuter', mass: true },
  heart: { pos: 'noun', gender: 'neuter', plural: 'hjärtan' },
  classroom: { pos: 'noun', gender: 'neuter', plural: 'klassrum' },
  bathroom: { pos: 'noun', gender: 'neuter', plural: 'badrum' },
  bedroom: { pos: 'noun', gender: 'neuter', plural: 'sovrum' },
  kitchen: { pos: 'noun', gender: 'neuter', plural: 'kök' },
  window: { pos: 'noun', gender: 'neuter', plural: 'fönster' },
  candy: { pos: 'noun', gender: 'neuter' },
  light: { pos: 'noun', gender: 'neuter', mass: true },
  noise: { pos: 'noun', gender: 'neuter', mass: true },
  'quiet-time': { pos: 'noun', gender: 'common', mass: true },

  // en-words worth stating (irregular plurals or mass)
  ball: { pos: 'noun', gender: 'common', plural: 'bollar' },
  book: { pos: 'noun', gender: 'common', plural: 'böcker' },
  cookie: { pos: 'noun', gender: 'common', plural: 'kakor' },
  hand: { pos: 'noun', gender: 'common', plural: 'händer' },
  foot: { pos: 'noun', gender: 'common', plural: 'fötter' },
  tooth: { pos: 'noun', gender: 'common', plural: 'tänder' },
  milk: { pos: 'noun', gender: 'common', mass: true },
  music: { pos: 'noun', gender: 'common', mass: true },
  rice: { pos: 'noun', gender: 'common', mass: true },
  cheese: { pos: 'noun', gender: 'common', mass: true },
  school: { pos: 'noun', gender: 'common', plural: 'skolor', institutional: true },
  home: { pos: 'noun', proper: true, institutional: true },
  bag: { pos: 'noun', gender: 'common', plural: 'väskor' },
  car: { pos: 'noun', gender: 'common', plural: 'bilar' },

  // Adjectives whose neuter or definite form is irregular
  small: { pos: 'adjective', pluralForm: 'litet', attributive: 'lilla' },
  old: { pos: 'adjective', pluralForm: 'gammalt', attributive: 'gamla' },
  new: { pos: 'adjective', pluralForm: 'nytt', attributive: 'nya' },
  blue: { pos: 'adjective', pluralForm: 'blått', attributive: 'blåa' },
  grey: { pos: 'adjective', pluralForm: 'grått', attributive: 'gråa' },
  red: { pos: 'adjective', pluralForm: 'rött', attributive: 'röda' },
  hungry: { pos: 'adjective', pluralForm: 'hungrigt', attributive: 'hungriga' },

  not: { pos: 'negation' },
}
