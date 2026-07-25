import type { Lexicon } from '../features'

/**
 * Danish overlay. The neuter nouns are the point: gender drives the article,
 * the definite suffix and the adjective ending, and it is not derivable.
 */
export const danishLexicon: Lexicon = {
  // "vil" needs an infinitive; negation splits the pair: "vil ikke have".
  want: { pos: 'verb', verbTail: 'have' },
  need: { pos: 'verb', verbTail: 'have' },

  i: { pos: 'pronoun', accusative: 'mig' },
  you: { pos: 'pronoun', accusative: 'dig' },
  we: { pos: 'pronoun', accusative: 'os' },
  he: { pos: 'pronoun', accusative: 'ham' },
  she: { pos: 'pronoun', accusative: 'hende' },
  they: { pos: 'pronoun', accusative: 'dem' },

  // Neuter nouns
  apple: { pos: 'noun', gender: 'neuter', plural: 'æbler' },
  bread: { pos: 'noun', gender: 'neuter', mass: true },
  water: { pos: 'noun', gender: 'neuter', mass: true },
  egg: { pos: 'noun', gender: 'neuter', plural: 'æg' },
  table: { pos: 'noun', gender: 'neuter', plural: 'borde' },
  paper: { pos: 'noun', gender: 'neuter' },
  game: { pos: 'noun', gender: 'neuter', plural: 'spil' },
  puzzle: { pos: 'noun', gender: 'neuter', plural: 'puslespil' },
  train: { pos: 'noun', gender: 'neuter', plural: 'tog' },
  lego: { pos: 'noun', gender: 'neuter' },
  eye: { pos: 'noun', gender: 'neuter', plural: 'øjne' },
  ear: { pos: 'noun', gender: 'neuter', plural: 'ører' },
  leg: { pos: 'noun', gender: 'neuter', plural: 'ben' },
  hair: { pos: 'noun', gender: 'neuter' },
  heart: { pos: 'noun', gender: 'neuter', plural: 'hjerter' },
  classroom: { pos: 'noun', gender: 'neuter', plural: 'klasseværelser' },
  bathroom: { pos: 'noun', gender: 'neuter', plural: 'badeværelser' },
  bedroom: { pos: 'noun', gender: 'neuter', plural: 'soveværelser' },
  kitchen: { pos: 'noun', gender: 'neuter', plural: 'køkkener' },
  window: { pos: 'noun', gender: 'neuter', plural: 'vinduer' },
  light: { pos: 'noun', gender: 'neuter' },
  noise: { pos: 'noun', gender: 'neuter' },
  toilet: { pos: 'noun', gender: 'neuter', plural: 'toiletter' },
  card: { pos: 'noun', gender: 'neuter', plural: 'kort' },
  picture: { pos: 'noun', gender: 'neuter', plural: 'billeder' },

  // Common-gender nouns with an irregular plural
  book: { pos: 'noun', gender: 'common', plural: 'bøger' },
  hand: { pos: 'noun', gender: 'common', plural: 'hænder' },
  foot: { pos: 'noun', gender: 'common', plural: 'fødder' },
  tooth: { pos: 'noun', gender: 'common', plural: 'tænder' },
  ball: { pos: 'noun', gender: 'common', plural: 'bolde' },
  cookie: { pos: 'noun', gender: 'common', plural: 'småkager' },
  car: { pos: 'noun', gender: 'common', plural: 'biler' },
  bag: { pos: 'noun', gender: 'common', plural: 'tasker' },
  school: { pos: 'noun', gender: 'common', plural: 'skoler' },

  // Mass nouns
  milk: { pos: 'noun', mass: true },
  music: { pos: 'noun', mass: true },
  rice: { pos: 'noun', mass: true },
  cheese: { pos: 'noun', mass: true },
  juice: { pos: 'noun', mass: true },
  tea: { pos: 'noun', mass: true },
  fruit: { pos: 'noun', mass: true },
  clay: { pos: 'noun', mass: true },
  paint: { pos: 'noun', mass: true },
  medicine: { pos: 'noun', mass: true },
  space: { pos: 'noun', mass: true },
  'dark-2': { pos: 'noun', mass: true },
  home: { pos: 'noun', proper: true, institutional: true },
  bed: { pos: 'noun', gender: 'common', institutional: true },

  // Adjectives whose neuter or definite form is irregular
  small: { pos: 'adjective', pluralForm: 'lille', attributive: 'lille' },
  old: { pos: 'adjective', pluralForm: 'gammelt', attributive: 'gamle' },
  new: { pos: 'adjective', pluralForm: 'nyt', attributive: 'nye' },
  blue: { pos: 'adjective', pluralForm: 'blåt', attributive: 'blå' },
  grey: { pos: 'adjective', pluralForm: 'gråt', attributive: 'grå' },
  red: { pos: 'adjective', pluralForm: 'rødt', attributive: 'røde' },

  not: { pos: 'negation' },
}
