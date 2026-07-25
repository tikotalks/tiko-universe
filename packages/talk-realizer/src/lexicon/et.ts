import type { Lexicon } from '../features'

/**
 * Estonian overlay. Estonian hides its stems even more thoroughly than Finnish —
 * "vesi" has the partitive "vett" and the genitive "vee" — so the case forms of
 * the common nouns are curated, and so are the verb persons and the bare stem the
 * negation governs.
 */
export const estonianLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'mind', dative: 'mulle' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'sind', dative: 'sulle' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'meid', dative: 'meile' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'teda', dative: 'talle' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'teda', dative: 'talle' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'neid', dative: 'neile' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'mind' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss' },

  want: { pos: 'verb', stem: 'taha', forms: { '2sg': 'tahad', '3sg': 'tahab', '1pl': 'tahame', '2pl': 'tahate', '3pl': 'tahavad' } },
  like: { pos: 'verb', stem: 'armasta', forms: { '2sg': 'armastad', '3sg': 'armastab', '1pl': 'armastame', '3pl': 'armastavad' } },
  see: { pos: 'verb', objectCase: 'total', stem: 'näe', forms: { '2sg': 'näed', '3sg': 'näeb', '1pl': 'näeme', '3pl': 'näevad' } },
  hear: { pos: 'verb', objectCase: 'total', stem: 'kuule', forms: { '2sg': 'kuuled', '3sg': 'kuuleb', '1pl': 'kuuleme', '3pl': 'kuulevad' } },
  eat: { pos: 'verb', stem: 'söö', forms: { '2sg': 'sööd', '3sg': 'sööb', '1pl': 'sööme', '3pl': 'söövad' } },
  drink: { pos: 'verb', stem: 'joo', forms: { '2sg': 'jood', '3sg': 'joob', '1pl': 'joome', '3pl': 'joovad' } },
  go: { pos: 'verb', stem: 'lähe', forms: { '2sg': 'lähed', '3sg': 'läheb', '1pl': 'läheme', '3pl': 'lähevad' } },
  come: { pos: 'verb', stem: 'tule', forms: { '2sg': 'tuled', '3sg': 'tuleb', '1pl': 'tuleme', '3pl': 'tulevad' } },
  play: { pos: 'verb', stem: 'mängi', forms: { '2sg': 'mängid', '3sg': 'mängib', '1pl': 'mängime', '3pl': 'mängivad' } },
  read: { pos: 'verb', stem: 'loe', forms: { '2sg': 'loed', '3sg': 'loeb', '1pl': 'loeme', '3pl': 'loevad' } },
  sleep: { pos: 'verb', stem: 'maga', forms: { '2sg': 'magad', '3sg': 'magab', '1pl': 'magame', '3pl': 'magavad' } },
  talk: { pos: 'verb', stem: 'räägi', forms: { '2sg': 'räägid', '3sg': 'räägib', '1pl': 'räägime', '3pl': 'räägivad' } },
  help: { pos: 'verb', stem: 'aita', forms: { '2sg': 'aitad', '3sg': 'aitab', '1pl': 'aitame', '3pl': 'aitavad' } },
  wait: { pos: 'verb', stem: 'oota', forms: { '2sg': 'ootad', '3sg': 'ootab', '1pl': 'ootame', '3pl': 'ootavad' } },

  // Case forms no rule reaches: the nominative hides the stem.
  water: { pos: 'noun', mass: true, cases: { par: 'vett', gen: 'vee' } },
  bread: { pos: 'noun', mass: true, cases: { par: 'leiba', gen: 'leiva' } },
  milk: { pos: 'noun', mass: true, cases: { par: 'piima', gen: 'piima' } },
  juice: { pos: 'noun', mass: true, cases: { par: 'mahla', gen: 'mahla' } },
  cheese: { pos: 'noun', mass: true, cases: { par: 'juustu', gen: 'juustu' } },
  rice: { pos: 'noun', mass: true, cases: { par: 'riisi', gen: 'riisi' } },
  music: { pos: 'noun', mass: true, cases: { par: 'muusikat', gen: 'muusika' } },
  tea: { pos: 'noun', mass: true, cases: { par: 'teed', gen: 'tee' } },
  apple: { pos: 'noun', cases: { par: 'õuna', gen: 'õuna' }, plural: 'õunad' },
  book: { pos: 'noun', cases: { par: 'raamatut', gen: 'raamatu' }, plural: 'raamatud' },
  ball: { pos: 'noun', cases: { par: 'palli', gen: 'palli' }, plural: 'pallid' },
  cookie: { pos: 'noun', cases: { par: 'küpsist', gen: 'küpsise' }, plural: 'küpsised' },
  egg: { pos: 'noun', cases: { par: 'muna', gen: 'muna' }, plural: 'munad' },
  hand: { pos: 'noun', cases: { par: 'kätt', gen: 'käe' } },
  friend: { pos: 'noun', animate: true, cases: { par: 'sõpra', gen: 'sõbra' } },
  garden: { pos: 'noun', cases: { gen: 'aia' } },
  park: { pos: 'noun', cases: { gen: 'pargi' } },
  school: { pos: 'noun', institutional: true, cases: { gen: 'kooli' } },
  home: { pos: 'noun', institutional: true, cases: { gen: 'kodu' } },
  table: { pos: 'noun', cases: { gen: 'laua', par: 'lauda' } },
  mum: { pos: 'noun', animate: true, proper: true },
  dad: { pos: 'noun', animate: true, proper: true },

  big: { pos: 'adjective', inherent: true, cases: { par: 'suurt', gen: 'suure' }, pluralForm: 'suured' },
  happy: { pos: 'adjective', pluralForm: 'rõõmsad' },
  tired: { pos: 'adjective', pluralForm: 'väsinud' },
  hungry: { pos: 'adjective', pluralForm: 'näljased' },
  thirsty: { pos: 'adjective', pluralForm: 'janused' },
  sad: { pos: 'adjective', pluralForm: 'kurvad' },

  // Case endings rather than words.
  in: { pos: 'preposition' },
  on: { pos: 'preposition' },
  to: { pos: 'preposition' },

  not: { pos: 'negation' },
}
