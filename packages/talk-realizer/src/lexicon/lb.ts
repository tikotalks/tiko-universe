import type { Lexicon } from '../features'

/**
 * Luxembourgish overlay. Gender is not derivable from the word, exactly as in
 * German, so every noun a sentence needs an article for is curated — along with
 * the verb persons and the sensations that take "hunn".
 */
export const luxembourgishLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'mech', dative: 'mir' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'dech', dative: 'dir' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'eis', dative: 'eis' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'hien', dative: 'him' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'hatt', dative: 'hir' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'si', dative: 'hinnen' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'mech', dative: 'mir' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  want: { pos: 'verb', forms: { '1sg': 'wëll', '2sg': 'wëlls', '3sg': 'wëllt', '1pl': 'wëllen', '2pl': 'wëllt', '3pl': 'wëllen' } },
  like: { pos: 'verb', forms: { '1sg': 'hunn gär', '2sg': 'hues gär', '3sg': 'huet gär', '1pl': 'hunn gär', '3pl': 'hunn gär' } },
  see: { pos: 'verb', forms: { '1sg': 'gesinn', '2sg': 'gesäis', '3sg': 'gesäit', '1pl': 'gesinn', '3pl': 'gesinn' } },
  hear: { pos: 'verb', forms: { '1sg': 'héieren', '2sg': 'héiers', '3sg': 'héiert', '1pl': 'héieren', '3pl': 'héieren' } },
  have: { pos: 'verb', forms: { '1sg': 'hunn', '2sg': 'hues', '3sg': 'huet', '1pl': 'hunn', '3pl': 'hunn' } },
  eat: { pos: 'verb', forms: { '1sg': 'iessen', '2sg': 'ëss', '3sg': 'ësst', '1pl': 'iessen', '3pl': 'iessen' } },
  drink: { pos: 'verb', forms: { '1sg': 'drénken', '2sg': 'drénks', '3sg': 'drénkt', '1pl': 'drénken', '3pl': 'drénken' } },
  go: { pos: 'verb', forms: { '1sg': 'ginn', '2sg': 'gees', '3sg': 'geet', '1pl': 'ginn', '3pl': 'ginn' } },
  come: { pos: 'verb', forms: { '1sg': 'kommen', '2sg': 'kënns', '3sg': 'kënnt', '1pl': 'kommen', '3pl': 'kommen' } },
  play: { pos: 'verb', forms: { '1sg': 'spillen', '2sg': 'spills', '3sg': 'spillt', '1pl': 'spillen', '3pl': 'spillen' } },
  read: { pos: 'verb', forms: { '1sg': 'liesen', '2sg': 'lies', '3sg': 'liest', '1pl': 'liesen', '3pl': 'liesen' } },
  sleep: { pos: 'verb', forms: { '1sg': 'schlofen', '2sg': 'schléift', '3sg': 'schléift', '1pl': 'schlofen', '3pl': 'schlofen' } },
  talk: { pos: 'verb', forms: { '1sg': 'schwätzen', '2sg': 'schwätz', '3sg': 'schwätzt', '1pl': 'schwätzen', '3pl': 'schwätzen' } },
  // hëllefen governs the dative, as in German.
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'hëllefen', '2sg': 'hëllefs', '3sg': 'hëlleft', '1pl': 'hëllefen', '3pl': 'hëllefen' } },

  hungry: { pos: 'adjective', sensation: 'Hunger' },
  thirsty: { pos: 'adjective', sensation: 'Duuscht' },
  scared: { pos: 'adjective', sensation: 'Angscht' },

  // Genders, which no rule finds.
  water: { pos: 'noun', gender: 'neuter', mass: true },
  milk: { pos: 'noun', gender: 'feminine', mass: true },
  bread: { pos: 'noun', gender: 'neuter', mass: true },
  cheese: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  paper: { pos: 'noun', gender: 'neuter', mass: true },
  apple: { pos: 'noun', gender: 'masculine', plural: 'Äppel' },
  book: { pos: 'noun', gender: 'neuter', plural: 'Bicher' },
  ball: { pos: 'noun', gender: 'masculine', plural: 'Bäll' },
  cookie: { pos: 'noun', gender: 'neuter', plural: 'Kichelcher' },
  egg: { pos: 'noun', gender: 'neuter', plural: 'Eeër' },
  table: { pos: 'noun', gender: 'masculine', plural: 'Dëscher' },
  friend: { pos: 'noun', gender: 'masculine', animate: true, plural: 'Frënn' },
  mum: { pos: 'noun', gender: 'feminine', animate: true, proper: true },
  dad: { pos: 'noun', gender: 'masculine', animate: true, proper: true },
  school: { pos: 'noun', gender: 'feminine', institutional: true },
  home: { pos: 'noun', gender: 'neuter', institutional: true, proper: true },
  bed: { pos: 'noun', gender: 'neuter', institutional: true },
  park: { pos: 'noun', gender: 'masculine' },
  garden: { pos: 'noun', gender: 'masculine' },

  not: { pos: 'negation' },
}
