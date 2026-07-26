import type { Lexicon } from '../features'

/**
 * Norwegian Bokmål overlay. The neuter nouns are the point: gender drives the article,
 * the definite suffix and the adjective ending, and it is not derivable.
 */
export const norwegianLexicon: Lexicon = {
  // A subordinate clause moves its negation in front of the verb.
  because: { pos: 'conjunction', subordinating: true },

  // "vil" needs an infinitive; negation splits the pair: "vil ikke ha".
  want: { pos: 'verb', verbTail: 'ha' },
  need: { pos: 'verb', verbTail: 'ha' },

  i: { pos: 'pronoun', accusative: 'meg' },
  you: { pos: 'pronoun', accusative: 'deg' },
  we: { pos: 'pronoun', accusative: 'oss' },
  he: { pos: 'pronoun', accusative: 'ham' },
  she: { pos: 'pronoun', accusative: 'henne' },
  they: { pos: 'pronoun', accusative: 'dem' },

  // Neuter nouns
  apple: { pos: 'noun', gender: 'neuter', plural: 'epler' },
  bread: { pos: 'noun', gender: 'neuter', mass: true },
  water: { pos: 'noun', gender: 'neuter', mass: true },
  egg: { pos: 'noun', gender: 'neuter', plural: 'egg' },
  table: { pos: 'noun', gender: 'neuter', plural: 'bord' },
  paper: { pos: 'noun', gender: 'neuter' },
  game: { pos: 'noun', gender: 'neuter', plural: 'spill' },
  puzzle: { pos: 'noun', gender: 'neuter', plural: 'puslespill' },
  train: { pos: 'noun', gender: 'neuter', plural: 'tog' },
  lego: { pos: 'noun', gender: 'neuter' },
  eye: { pos: 'noun', gender: 'neuter', plural: 'øyne' },
  ear: { pos: 'noun', gender: 'neuter', plural: 'ører' },
  leg: { pos: 'noun', gender: 'neuter', plural: 'bein' },
  hair: { pos: 'noun', gender: 'neuter' },
  heart: { pos: 'noun', gender: 'neuter', plural: 'hjerter' },
  classroom: { pos: 'noun', gender: 'neuter', plural: 'klasserom' },
  bathroom: { pos: 'noun', gender: 'neuter', plural: 'bad' },
  bedroom: { pos: 'noun', gender: 'neuter', plural: 'soverom' },
  kitchen: { pos: 'noun', gender: 'neuter', plural: 'kjøkken' },
  window: { pos: 'noun', gender: 'neuter', plural: 'vinduer' },
  light: { pos: 'noun', gender: 'neuter' },
  noise: { pos: 'noun', gender: 'neuter' },
  toilet: { pos: 'noun', gender: 'neuter', plural: 'toaletter' },
  card: { pos: 'noun', gender: 'neuter', plural: 'kort' },
  picture: { pos: 'noun', gender: 'neuter', plural: 'bilder' },

  // Common-gender nouns with an irregular plural
  book: { pos: 'noun', gender: 'common', plural: 'bøker' },
  hand: { pos: 'noun', gender: 'common', plural: 'hender' },
  foot: { pos: 'noun', gender: 'common', plural: 'føtter' },
  tooth: { pos: 'noun', gender: 'common', plural: 'tenner' },
  ball: { pos: 'noun', gender: 'common', plural: 'baller' },
  cookie: { pos: 'noun', gender: 'common', plural: 'kaker' },
  car: { pos: 'noun', gender: 'common', plural: 'biler' },
  bag: { pos: 'noun', gender: 'common', plural: 'vesker' },
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
  small: { pos: 'adjective', pluralForm: 'lite', attributive: 'lille' },
  old: { pos: 'adjective', pluralForm: 'gammelt', attributive: 'gamle' },
  new: { pos: 'adjective', pluralForm: 'nytt', attributive: 'nye' },
  blue: { pos: 'adjective', pluralForm: 'blått', attributive: 'blå' },
  grey: { pos: 'adjective', pluralForm: 'grått', attributive: 'grå' },
  red: { pos: 'adjective', pluralForm: 'rødt', attributive: 'røde' },

  not: { pos: 'negation' },
}
