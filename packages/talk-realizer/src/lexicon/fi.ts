import type { Lexicon } from '../features'

/**
 * Finnish overlay. Two things a rule cannot get right:
 *
 * - the **partitive** of a stem that changes ("vesi" → "vettä", "käsi" → "kättä"),
 *   because Finnish nominatives hide their stems;
 * - the **connegative**, the bare form the negative verb governs: "haluan" →
 *   "en halua". It is the stem, and the packs ship the finished first person.
 */
export const finnishLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'minua', dative: 'minulle' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'sinua', dative: 'sinulle' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'meitä', dative: 'meille' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'häntä', dative: 'hänelle' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'häntä', dative: 'hänelle' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'heitä', dative: 'heille' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'minua', dative: 'minua' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  // `stem` is the connegative — what follows "en", "et", "ei".
  want: { pos: 'verb', stem: 'halua', forms: { '2sg': 'haluat', '3sg': 'haluaa', '1pl': 'haluamme', '2pl': 'haluatte', '3pl': 'haluavat' } },
  like: { pos: 'verb', stem: 'tykkää', forms: { '2sg': 'tykkäät', '3sg': 'tykkää', '1pl': 'tykkäämme', '3pl': 'tykkäävät' } },
  // Seeing completes, so its object is total: "näen kaverin".
  see: { pos: 'verb', objectCase: 'total', stem: 'näe', forms: { '2sg': 'näet', '3sg': 'näkee', '1pl': 'näemme', '3pl': 'näkevät' } },
  hear: { pos: 'verb', objectCase: 'total', stem: 'kuule', forms: { '2sg': 'kuulet', '3sg': 'kuulee', '1pl': 'kuulemme', '3pl': 'kuulevat' } },
  eat: { pos: 'verb', stem: 'syö', forms: { '2sg': 'syöt', '3sg': 'syö', '1pl': 'syömme', '3pl': 'syövät' } },
  drink: { pos: 'verb', stem: 'juo', forms: { '2sg': 'juot', '3sg': 'juo', '1pl': 'juomme', '3pl': 'juovat' } },
  go: { pos: 'verb', stem: 'mene', forms: { '2sg': 'menet', '3sg': 'menee', '1pl': 'menemme', '3pl': 'menevät' } },
  come: { pos: 'verb', stem: 'tule', forms: { '2sg': 'tulet', '3sg': 'tulee', '1pl': 'tulemme', '3pl': 'tulevat' } },
  play: { pos: 'verb', stem: 'leiki', forms: { '2sg': 'leikit', '3sg': 'leikkii', '1pl': 'leikimme', '3pl': 'leikkivät' } },
  read: { pos: 'verb', stem: 'lue', forms: { '2sg': 'luet', '3sg': 'lukee', '1pl': 'luemme', '3pl': 'lukevat' } },
  sleep: { pos: 'verb', stem: 'nuku', forms: { '2sg': 'nukut', '3sg': 'nukkuu', '1pl': 'nukumme', '3pl': 'nukkuvat' } },
  talk: { pos: 'verb', stem: 'puhu', forms: { '2sg': 'puhut', '3sg': 'puhuu', '1pl': 'puhumme', '3pl': 'puhuvat' } },
  wait: { pos: 'verb', stem: 'odota', forms: { '2sg': 'odotat', '3sg': 'odottaa', '1pl': 'odotamme', '3pl': 'odottavat' } },
  // auttaa governs the partitive object, which the pronoun forms already carry.
  help: { pos: 'verb', stem: 'auta', forms: { '1sg': 'autan', '2sg': 'autat', '3sg': 'auttaa', '1pl': 'autamme', '3pl': 'auttavat' } },

  // Partitives no rule can reach, because the nominative hides the stem.
  water: { pos: 'noun', mass: true, cases: { par: 'vettä' } },
  hand: { pos: 'noun', cases: { par: 'kättä' } },
  bread: { pos: 'noun', mass: true, cases: { par: 'leipää' } },
  milk: { pos: 'noun', mass: true, cases: { par: 'maitoa' } },
  juice: { pos: 'noun', mass: true, cases: { par: 'mehua' } },
  cheese: { pos: 'noun', mass: true, cases: { par: 'juustoa' } },
  rice: { pos: 'noun', mass: true, cases: { par: 'riisiä' } },
  music: { pos: 'noun', mass: true, cases: { par: 'musiikkia' } },
  tea: { pos: 'noun', mass: true, cases: { par: 'teetä' } },
  book: { pos: 'noun', cases: { par: 'kirjaa' } },
  cookie: { pos: 'noun', cases: { par: 'pikkuleipää' } },
  egg: { pos: 'noun', cases: { par: 'kananmunaa' } },
  ball: { pos: 'noun', cases: { par: 'palloa' } },
  friend: { pos: 'noun', animate: true, cases: { par: 'kaveria' } },
  big: { pos: 'adjective', inherent: true, cases: { par: 'isoa' }, pluralForm: 'isoja' },
  small: { pos: 'adjective', inherent: true, pluralForm: 'pieniä' },
  happy: { pos: 'adjective', pluralForm: 'iloisia' },
  sad: { pos: 'adjective', pluralForm: 'surullisia' },
  tired: { pos: 'adjective', pluralForm: 'väsyneitä' },
  hungry: { pos: 'adjective', pluralForm: 'nälkäisiä' },
  thirsty: { pos: 'adjective', pluralForm: 'janoisia' },
  angry: { pos: 'adjective', pluralForm: 'vihaisia' },
  sick: { pos: 'adjective', pluralForm: 'kipeitä' },
  ready: { pos: 'adjective', pluralForm: 'valmiita' },
  home: { pos: 'noun', institutional: true },
  school: { pos: 'noun', institutional: true },
  mum: { pos: 'noun', animate: true, proper: true },
  dad: { pos: 'noun', animate: true, proper: true },

  // These tiles are case suffixes, not words.
  in: { pos: 'preposition' },
  on: { pos: 'preposition' },
  to: { pos: 'preposition' },
  from: { pos: 'preposition' },

  not: { pos: 'negation' },
}
