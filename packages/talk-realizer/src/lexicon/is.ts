import type { Lexicon } from '../features'

/**
 * Icelandic overlay. Icelandic verbs are strong and their stems change vowel
 * ("vil" → "viljum"), and the genders that the ending does not give away have to
 * be told, so both are curated.
 */
export const icelandicLexicon: Lexicon = {
  // The strong verbs, whose stem vowel changes: no rule finds these.
  need: { pos: 'verb', forms: { '1sg': 'þarf', '2sg': 'þarft', '3sg': 'þarf', '1pl': 'þurfum', '2pl': 'þurfið', '3pl': 'þurfa' } },
  feel: { pos: 'verb', forms: { '1sg': 'finn', '2sg': 'finnur', '3sg': 'finnur', '1pl': 'finnum', '2pl': 'finnið', '3pl': 'finna' } },
  sit: { pos: 'verb', forms: { '1sg': 'sit', '2sg': 'situr', '3sg': 'situr', '1pl': 'sitjum', '2pl': 'sitjið', '3pl': 'sitja' } },
  stand: { pos: 'verb', forms: { '1sg': 'stend', '2sg': 'stendur', '3sg': 'stendur', '1pl': 'stöndum', '2pl': 'standið', '3pl': 'standa' } },
  walk: { pos: 'verb', forms: { '1sg': 'geng', '2sg': 'gengur', '3sg': 'gengur', '1pl': 'göngum', '2pl': 'gangið', '3pl': 'ganga' } },
  run: { pos: 'verb', forms: { '1sg': 'hleyp', '2sg': 'hleypur', '3sg': 'hleypur', '1pl': 'hlaupum', '2pl': 'hlaupið', '3pl': 'hlaupa' } },
  wait: { pos: 'verb', forms: { '1sg': 'bíð', '2sg': 'bíður', '3sg': 'bíður', '1pl': 'bíðum', '2pl': 'bíðið', '3pl': 'bíða' } },
  wash: { pos: 'verb', forms: { '1sg': 'þvæ', '2sg': 'þværð', '3sg': 'þvær', '1pl': 'þvoum', '2pl': 'þvoið', '3pl': 'þvo' } },
  can: { pos: 'verb', forms: { '1sg': 'get', '2sg': 'getur', '3sg': 'getur', '1pl': 'getum', '2pl': 'getið', '3pl': 'geta' } },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'mig', dative: 'mér' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'þig', dative: 'þér' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'okkur', dative: 'okkur' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'hann', dative: 'honum' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'hana', dative: 'henni' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'þá', dative: 'þeim' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'mig', dative: 'mér' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // "tveir" is masculine; the feminine and neuter differ.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'tvær', neuter: 'tvö' },
  three: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'þrjár', neuter: 'þrjú' },

  // "glaður" → "glatt": the ð assimilates, which no rule here predicts.
  happy: { pos: 'adjective', neuter: 'glatt' },
  sad: { pos: 'adjective', neuter: 'leitt' },
  tired: { pos: 'adjective', neuter: 'þreytt' },
  cold: { pos: 'adjective', neuter: 'kalt' },
  hot: { pos: 'adjective', neuter: 'heitt' },
  hungry: { pos: 'adjective', neuter: 'svangt' },
  big: { pos: 'adjective', inherent: true, neuter: 'stórt' },
  small: { pos: 'adjective', inherent: true, neuter: 'lítið' },

  want: { pos: 'verb', forms: { '1sg': 'vil', '2sg': 'vilt', '3sg': 'vill', '1pl': 'viljum', '2pl': 'viljið', '3pl': 'vilja' } },
  like: { pos: 'verb', forms: { '1sg': 'elska', '2sg': 'elskar', '3sg': 'elskar', '1pl': 'elskum', '3pl': 'elska' } },
  see: { pos: 'verb', forms: { '1sg': 'sé', '2sg': 'sérð', '3sg': 'sér', '1pl': 'sjáum', '3pl': 'sjá' } },
  hear: { pos: 'verb', forms: { '1sg': 'heyri', '2sg': 'heyrir', '3sg': 'heyrir', '1pl': 'heyrum', '3pl': 'heyra' } },
  have: { pos: 'verb', forms: { '1sg': 'hef', '2sg': 'hefur', '3sg': 'hefur', '1pl': 'höfum', '3pl': 'hafa' } },
  eat: { pos: 'verb', forms: { '1sg': 'borða', '2sg': 'borðar', '3sg': 'borðar', '1pl': 'borðum', '3pl': 'borða' } },
  drink: { pos: 'verb', forms: { '1sg': 'drekk', '2sg': 'drekkur', '3sg': 'drekkur', '1pl': 'drekkum', '3pl': 'drekka' } },
  go: { pos: 'verb', forms: { '1sg': 'fer', '2sg': 'ferð', '3sg': 'fer', '1pl': 'förum', '3pl': 'fara' } },
  come: { pos: 'verb', forms: { '1sg': 'kem', '2sg': 'kemur', '3sg': 'kemur', '1pl': 'komum', '3pl': 'koma' } },
  play: { pos: 'verb', forms: { '1sg': 'leik', '2sg': 'leikur', '3sg': 'leikur', '1pl': 'leikum', '3pl': 'leika' } },
  read: { pos: 'verb', forms: { '1sg': 'les', '2sg': 'lest', '3sg': 'les', '1pl': 'lesum', '3pl': 'lesa' } },
  sleep: { pos: 'verb', forms: { '1sg': 'sef', '2sg': 'sefur', '3sg': 'sefur', '1pl': 'sofum', '3pl': 'sofa' } },
  talk: { pos: 'verb', forms: { '1sg': 'tala', '2sg': 'talar', '3sg': 'talar', '1pl': 'tölum', '3pl': 'tala' } },
  // hjálpa governs the dative: "ég hjálpa þér".
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'hjálpa', '2sg': 'hjálpar', '3sg': 'hjálpar', '1pl': 'hjálpum', '3pl': 'hjálpa' } },

  // Genders and accusatives the endings do not give away.
  water: { pos: 'noun', gender: 'neuter', mass: true },
  milk: { pos: 'noun', gender: 'feminine', mass: true },
  bread: { pos: 'noun', gender: 'neuter', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true, cases: { acc: 'ost' } },
  rice: { pos: 'noun', gender: 'neuter', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true, cases: { acc: 'safa' } },
  tea: { pos: 'noun', gender: 'neuter', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'masculine', mass: true },
  apple: { pos: 'noun', gender: 'neuter', plural: 'epli' },
  book: { pos: 'noun', gender: 'feminine', plural: 'bækur' },
  ball: { pos: 'noun', gender: 'masculine', cases: { acc: 'bolta' }, plural: 'boltar' },
  cookie: { pos: 'noun', gender: 'feminine', cases: { acc: 'smáköku' }, plural: 'smákökur' },
  egg: { pos: 'noun', gender: 'neuter', plural: 'egg' },
  friend: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'vin' } },
  brother: { pos: 'noun', gender: 'masculine', animate: true, cases: { acc: 'bróður' } },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  school: { pos: 'noun', gender: 'masculine', institutional: true, cases: { acc: 'skóla' } },
  home: { pos: 'noun', gender: 'neuter', institutional: true, proper: true },
  bed: { pos: 'noun', gender: 'neuter', institutional: true },
  park: { pos: 'noun', gender: 'masculine', cases: { acc: 'garð' } },
  garden: { pos: 'noun', gender: 'masculine', cases: { acc: 'garð' } },
  table: { pos: 'noun', gender: 'neuter' },

  in: { pos: 'preposition', governsCase: 'dat' },
  on: { pos: 'preposition', governsCase: 'dat' },
  // "í" takes the accusative when it means motion into somewhere.
  to: { pos: 'preposition' },
  from: { pos: 'preposition', governsCase: 'dat' },

  not: { pos: 'negation' },
}
