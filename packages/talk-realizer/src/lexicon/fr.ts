import type { Lexicon } from '../features'

/**
 * French overlay. Gender and plurals are induced from the word's ending (French
 * is regular enough), so this file carries what a rule cannot know: the
 * irregular conjugations, the adjectives that precede the noun, and the mass
 * nouns that take the partitive.
 */
export const frenchLexicon: Lexicon = {
  cold: { pos: 'adjective', sensation: 'froid' },
  hot: { pos: 'adjective', sensation: 'chaud' },
  scared: { pos: 'adjective', sensation: 'peur' },
  sick: { pos: 'adjective', sensation: 'mal' },
  // Pronouns — the object forms are the preverbal clitics.
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'me' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'te' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'nous' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'le' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'la' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'les' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'me' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss', feminine: 'ma' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss', feminine: 'ta' },

  // Determiners
  a: { pos: 'determiner', determinerKind: 'indefinite' },
  the: { pos: 'determiner', determinerKind: 'definite' },
  this: { pos: 'determiner', determinerKind: 'demonstrative' },
  that: { pos: 'determiner', determinerKind: 'demonstrative' },
  some: { pos: 'determiner', determinerKind: 'quantifier' },
  one: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'sg' },
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  many: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl' },
  little: { pos: 'determiner', determinerKind: 'quantifier' },
  big: { pos: 'adjective', adjectivePosition: 'before', feminine: 'grosse' },

  // Irregular verbs (the regular -er/-ir/-re ones are conjugated by rule)
  want: { pos: 'verb', forms: { '1sg': 'veux', '2sg': 'veux', '3sg': 'veut', '1pl': 'voulons', '3pl': 'veulent', past: 'voulais' } },
  have: { pos: 'verb', forms: { '1sg': 'ai', '2sg': 'as', '3sg': 'a', '1pl': 'avons', '3pl': 'ont', past: 'avais' } },
  need: { pos: 'verb', forms: { '1sg': 'ai besoin', '2sg': 'as besoin', '3sg': 'a besoin', '1pl': 'avons besoin', '3pl': 'ont besoin' } },
  see: { pos: 'verb', forms: { '1sg': 'vois', '2sg': 'vois', '3sg': 'voit', '1pl': 'voyons', '3pl': 'voient', past: 'voyais' } },
  hear: { pos: 'verb', forms: { '1sg': 'entends', '2sg': 'entends', '3sg': 'entend', '1pl': 'entendons', '3pl': 'entendent' } },
  go: { pos: 'verb', forms: { '1sg': 'vais', '2sg': 'vas', '3sg': 'va', '1pl': 'allons', '3pl': 'vont', past: 'allais' } },
  come: { pos: 'verb', forms: { '1sg': 'viens', '2sg': 'viens', '3sg': 'vient', '1pl': 'venons', '3pl': 'viennent' } },
  read: { pos: 'verb', forms: { '1sg': 'lis', '2sg': 'lis', '3sg': 'lit', '1pl': 'lisons', '3pl': 'lisent' } },
  drink: { pos: 'verb', forms: { '1sg': 'bois', '2sg': 'bois', '3sg': 'boit', '1pl': 'buvons', '3pl': 'boivent' } },
  run: { pos: 'verb', forms: { '1sg': 'cours', '2sg': 'cours', '3sg': 'court', '1pl': 'courons', '3pl': 'courent' } },
  sleep: { pos: 'verb', forms: { '1sg': 'dors', '2sg': 'dors', '3sg': 'dort', '1pl': 'dormons', '3pl': 'dorment' } },
  open: { pos: 'verb', forms: { '1sg': 'ouvre', '2sg': 'ouvres', '3sg': 'ouvre', '1pl': 'ouvrons', '3pl': 'ouvrent' } },
  feel: { pos: 'verb', forms: { '1sg': 'me sens', '2sg': 'te sens', '3sg': 'se sent', '1pl': 'nous sentons', '3pl': 'se sentent' } },
  sit: { pos: 'verb', forms: { '1sg': "m'assieds", '2sg': "t'assieds", '3sg': "s'assied", '1pl': 'nous asseyons', '3pl': "s'asseyent" } },
  stand: { pos: 'verb', forms: { '1sg': 'me lève', '2sg': 'te lèves', '3sg': 'se lève', '1pl': 'nous levons', '3pl': 'se lèvent' } },
  rest: { pos: 'verb', forms: { '1sg': 'me repose', '2sg': 'te reposes', '3sg': 'se repose', '1pl': 'nous reposons', '3pl': 'se reposent' } },
  try: { pos: 'verb', forms: { '1sg': 'essaie', '2sg': 'essaies', '3sg': 'essaie', '1pl': 'essayons', '3pl': 'essaient' } },
  wait: { pos: 'verb', forms: { '1sg': 'attends', '2sg': 'attends', '3sg': 'attend', '1pl': 'attendons', '3pl': 'attendent' } },
  choose: { pos: 'verb', forms: { '1sg': 'choisis', '2sg': 'choisis', '3sg': 'choisit', '1pl': 'choisissons', '3pl': 'choisissent' } },

  // Adjectives that precede the noun, with their feminine forms
  small: { pos: 'adjective', adjectivePosition: 'before', feminine: 'petite' },
  new: { pos: 'adjective', adjectivePosition: 'before', feminine: 'nouvelle' },
  old: { pos: 'adjective', adjectivePosition: 'before', feminine: 'vieille' },
  happy: { pos: 'adjective', feminine: 'contente' },
  sad: { pos: 'adjective', feminine: 'triste' },
  tired: { pos: 'adjective', feminine: 'fatiguée' },
  hungry: { pos: 'adjective', sensation: 'faim' },
  thirsty: { pos: 'adjective', sensation: 'soif' },

  // Mass nouns take the partitive ("du pain", "de l'eau")
  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },
  fruit: { pos: 'noun', gender: 'masculine', mass: true },
  // Gender exceptions the ending rule gets wrong
  apple: { pos: 'noun', gender: 'feminine', plural: 'pommes' },
  school: { pos: 'noun', gender: 'feminine', institutional: true },
  bed: { pos: 'noun', gender: 'masculine', institutional: true },
  home: { pos: 'noun', proper: true, institutional: true },
  book: { pos: 'noun', gender: 'masculine', plural: 'livres' },
  ball: { pos: 'noun', gender: 'masculine', plural: 'ballons' },
  cookie: { pos: 'noun', gender: 'masculine', plural: 'biscuits' },
  egg: { pos: 'noun', gender: 'masculine', plural: 'œufs' },
  park: { pos: 'noun', gender: 'masculine', plural: 'parcs' },
  bag: { pos: 'noun', gender: 'masculine', plural: 'sacs' },

  not: { pos: 'negation' },
}
