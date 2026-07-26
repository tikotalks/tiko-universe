import type { Lexicon } from '../features'

/**
 * Macedonian overlay. The same three things Bulgarian needs — verb paradigms,
 * clitic pronouns, and the adjectives whose feminine and neuter forms are not
 * base + а/о — in Macedonian forms.
 */
export const macedonianLexicon: Lexicon = {
  // "два" for a masculine, "две" for a feminine: Slavic numerals agree.
  two: { pos: 'determiner', determinerKind: 'quantifier', forcesNumber: 'pl', feminine: 'две', neuter: 'две' },
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'ме', dative: 'ми' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'те', dative: 'ти' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'ни', dative: 'ни' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'го', dative: 'му' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'ја', dative: 'ѝ' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'ги', dative: 'им' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'ме', dative: 'ми' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss', feminine: 'моја', neuter: 'мое', pluralForm: 'мои' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss', feminine: 'твоја', neuter: 'твое', pluralForm: 'твои' },

  want: { pos: 'verb', forms: { '1sg': 'сакам', '2sg': 'сакаш', '3sg': 'сака', '1pl': 'сакаме', '2pl': 'сакате', '3pl': 'сакаат' } },
  need: { pos: 'verb', forms: { '1sg': 'ми треба', '2sg': 'ти треба', '3sg': 'му треба', pl: 'ни треба' } },
  like: { pos: 'verb', forms: { '1sg': 'сакам', '2sg': 'сакаш', '3sg': 'сака', '1pl': 'сакаме', '2pl': 'сакате', '3pl': 'сакаат' } },
  see: { pos: 'verb', forms: { '1sg': 'гледам', '2sg': 'гледаш', '3sg': 'гледа', '1pl': 'гледаме', '2pl': 'гледате', '3pl': 'гледаат' } },
  hear: { pos: 'verb', forms: { '1sg': 'слушам', '2sg': 'слушаш', '3sg': 'слуша', '1pl': 'слушаме', '2pl': 'слушате', '3pl': 'слушаат' } },
  have: { pos: 'verb', forms: { '1sg': 'имам', '2sg': 'имаш', '3sg': 'има', '1pl': 'имаме', '2pl': 'имате', '3pl': 'имаат' } },
  eat: { pos: 'verb', forms: { '1sg': 'јадам', '2sg': 'јадеш', '3sg': 'јаде', '1pl': 'јадеме', '2pl': 'јадете', '3pl': 'јадат' } },
  drink: { pos: 'verb', forms: { '1sg': 'пијам', '2sg': 'пиеш', '3sg': 'пие', '1pl': 'пиеме', '2pl': 'пиете', '3pl': 'пијат' } },
  go: { pos: 'verb', forms: { '1sg': 'одам', '2sg': 'одиш', '3sg': 'оди', '1pl': 'одиме', '2pl': 'одите', '3pl': 'одат' } },
  come: { pos: 'verb', forms: { '1sg': 'доаѓам', '2sg': 'доаѓаш', '3sg': 'доаѓа', '1pl': 'доаѓаме', '2pl': 'доаѓате', '3pl': 'доаѓаат' } },
  play: { pos: 'verb', forms: { '1sg': 'играм', '2sg': 'играш', '3sg': 'игра', '1pl': 'играме', '2pl': 'играте', '3pl': 'играат' } },
  read: { pos: 'verb', forms: { '1sg': 'читам', '2sg': 'читаш', '3sg': 'чита', '1pl': 'читаме', '2pl': 'читате', '3pl': 'читаат' } },
  sleep: { pos: 'verb', forms: { '1sg': 'спијам', '2sg': 'спиеш', '3sg': 'спие', '1pl': 'спиеме', '2pl': 'спиете', '3pl': 'спијат' } },
  talk: { pos: 'verb', forms: { '1sg': 'зборувам', '2sg': 'зборуваш', '3sg': 'зборува', '1pl': 'зборуваме', '2pl': 'зборувате', '3pl': 'зборуваат' } },
  // помагам governs the dative: "помагаш ми", never "помагаш ме".
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'помагам', '2sg': 'помагаш', '3sg': 'помага', '1pl': 'помагаме', '2pl': 'помагате', '3pl': 'помагаат' } },

  // Adjectives whose feminine and neuter drop the vowel in the stem.
  big: { pos: 'adjective', feminine: 'голема', neuter: 'големо', pluralForm: 'големи' },
  small: { pos: 'adjective', feminine: 'мала', neuter: 'мало', pluralForm: 'мали' },
  hot: { pos: 'adjective', feminine: 'топла', neuter: 'топло', pluralForm: 'топли' },
  cold: { pos: 'adjective', feminine: 'ладна', neuter: 'ладно', pluralForm: 'ладни' },
  happy: { pos: 'adjective', feminine: 'среќна', neuter: 'среќно', pluralForm: 'среќни' },
  tired: { pos: 'adjective', feminine: 'изморена', neuter: 'изморено', pluralForm: 'изморени' },
  hungry: { pos: 'adjective', feminine: 'гладна', neuter: 'гладно', pluralForm: 'гладни' },
  thirsty: { pos: 'adjective', feminine: 'жедна', neuter: 'жедно', pluralForm: 'жедни' },

  // Masculine nouns ending in a vowel take the neuter or feminine article.
  dad: { pos: 'noun', gender: 'masculine', proper: true },
  grandpa: { pos: 'noun', gender: 'masculine', proper: true },
  mum: { pos: 'noun', gender: 'feminine', proper: true },
  grandma: { pos: 'noun', gender: 'feminine' },

  // Mass nouns take no article of their own.
  water: { pos: 'noun', gender: 'feminine', mass: true },
  milk: { pos: 'noun', gender: 'neuter', mass: true },
  bread: { pos: 'noun', gender: 'masculine', mass: true },
  rice: { pos: 'noun', gender: 'masculine', mass: true },
  cheese: { pos: 'noun', gender: 'neuter', mass: true },
  music: { pos: 'noun', gender: 'feminine', mass: true },
  juice: { pos: 'noun', gender: 'masculine', mass: true },
  tea: { pos: 'noun', gender: 'masculine', mass: true },
  paper: { pos: 'noun', gender: 'feminine', mass: true },

  // Plurals a rule would get wrong.
  apple: { pos: 'noun', gender: 'neuter', plural: 'јаболка' },
  book: { pos: 'noun', gender: 'feminine', plural: 'книги' },
  ball: { pos: 'noun', gender: 'feminine', plural: 'топки' },
  cookie: { pos: 'noun', gender: 'masculine', plural: 'бисквити' },
  egg: { pos: 'noun', gender: 'neuter', plural: 'јајца' },
  school: { pos: 'noun', gender: 'neuter', institutional: true },
  home: { pos: 'noun', gender: 'masculine', institutional: true, proper: true },
  bed: { pos: 'noun', gender: 'neuter', institutional: true },
  park: { pos: 'noun', gender: 'masculine' },
  table: { pos: 'noun', gender: 'feminine', plural: 'маси' },

  not: { pos: 'negation' },
}
