import type { Lexicon } from '../features'

/**
 * Bulgarian overlay. Without cases there is far less to curate than for Russian
 * or Polish — what remains is the verb paradigms, the clitic pronouns, and the
 * adjectives whose feminine and neuter forms lose a vowel ("голям" → "голяма",
 * but "голямата" as a definite).
 */
export const bulgarianLexicon: Lexicon = {
  i: { pos: 'pronoun', person: 1, number: 'sg', accusative: 'ме', dative: 'ми' },
  you: { pos: 'pronoun', person: 2, number: 'sg', accusative: 'те', dative: 'ти' },
  we: { pos: 'pronoun', person: 1, number: 'pl', accusative: 'ни', dative: 'ни' },
  he: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'го', dative: 'му' },
  she: { pos: 'pronoun', person: 3, number: 'sg', accusative: 'я', dative: 'ѝ' },
  they: { pos: 'pronoun', person: 3, number: 'pl', accusative: 'ги', dative: 'им' },
  me: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'acc', accusative: 'ме', dative: 'ми' },
  my: { pos: 'pronoun', person: 1, number: 'sg', pronounCase: 'poss', feminine: 'моя', neuter: 'мое', pluralForm: 'мои' },
  your: { pos: 'pronoun', person: 2, number: 'sg', pronounCase: 'poss', feminine: 'твоя', neuter: 'твое', pluralForm: 'твои' },

  want: { pos: 'verb', forms: { '1sg': 'искам', '2sg': 'искаш', '3sg': 'иска', '1pl': 'искаме', '2pl': 'искате', '3pl': 'искат' } },
  need: { pos: 'verb', forms: { '1sg': 'трябва', '2sg': 'трябва', '3sg': 'трябва', pl: 'трябва' } },
  like: { pos: 'verb', forms: { '1sg': 'обичам', '2sg': 'обичаш', '3sg': 'обича', '1pl': 'обичаме', '2pl': 'обичате', '3pl': 'обичат' } },
  see: { pos: 'verb', forms: { '1sg': 'виждам', '2sg': 'виждаш', '3sg': 'вижда', '1pl': 'виждаме', '2pl': 'виждате', '3pl': 'виждат' } },
  hear: { pos: 'verb', forms: { '1sg': 'чувам', '2sg': 'чуваш', '3sg': 'чува', '1pl': 'чуваме', '2pl': 'чувате', '3pl': 'чуват' } },
  have: { pos: 'verb', forms: { '1sg': 'имам', '2sg': 'имаш', '3sg': 'има', '1pl': 'имаме', '2pl': 'имате', '3pl': 'имат' } },
  eat: { pos: 'verb', forms: { '1sg': 'ям', '2sg': 'ядеш', '3sg': 'яде', '1pl': 'ядем', '2pl': 'ядете', '3pl': 'ядат' } },
  drink: { pos: 'verb', forms: { '1sg': 'пия', '2sg': 'пиеш', '3sg': 'пие', '1pl': 'пием', '2pl': 'пиете', '3pl': 'пият' } },
  go: { pos: 'verb', forms: { '1sg': 'отивам', '2sg': 'отиваш', '3sg': 'отива', '1pl': 'отиваме', '2pl': 'отивате', '3pl': 'отиват' } },
  come: { pos: 'verb', forms: { '1sg': 'идвам', '2sg': 'идваш', '3sg': 'идва', '1pl': 'идваме', '2pl': 'идвате', '3pl': 'идват' } },
  play: { pos: 'verb', forms: { '1sg': 'играя', '2sg': 'играеш', '3sg': 'играе', '1pl': 'играем', '2pl': 'играете', '3pl': 'играят' } },
  read: { pos: 'verb', forms: { '1sg': 'чета', '2sg': 'четеш', '3sg': 'чете', '1pl': 'четем', '2pl': 'четете', '3pl': 'четат' } },
  sleep: { pos: 'verb', forms: { '1sg': 'спя', '2sg': 'спиш', '3sg': 'спи', '1pl': 'спим', '2pl': 'спите', '3pl': 'спят' } },
  talk: { pos: 'verb', forms: { '1sg': 'говоря', '2sg': 'говориш', '3sg': 'говори', '1pl': 'говорим', '2pl': 'говорите', '3pl': 'говорят' } },
  // помагам governs the dative: "помагаш ми", never "помагаш ме".
  help: { pos: 'verb', objectCase: 'dative', forms: { '1sg': 'помагам', '2sg': 'помагаш', '3sg': 'помага', '1pl': 'помагаме', '2pl': 'помагате', '3pl': 'помагат' } },

  // Adjectives whose feminine and neuter drop the vowel in the stem.
  big: { pos: 'adjective', feminine: 'голяма', neuter: 'голямо', pluralForm: 'големи' },
  small: { pos: 'adjective', feminine: 'малка', neuter: 'малко', pluralForm: 'малки' },
  hot: { pos: 'adjective', feminine: 'гореща', neuter: 'горещо', pluralForm: 'горещи' },
  cold: { pos: 'adjective', feminine: 'студена', neuter: 'студено', pluralForm: 'студени' },
  happy: { pos: 'adjective', feminine: 'щастлива', neuter: 'щастливо', pluralForm: 'щастливи' },
  tired: { pos: 'adjective', feminine: 'уморена', neuter: 'уморено', pluralForm: 'уморени' },
  hungry: { pos: 'adjective', feminine: 'гладна', neuter: 'гладно', pluralForm: 'гладни' },
  thirsty: { pos: 'adjective', feminine: 'жадна', neuter: 'жадно', pluralForm: 'жадни' },

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
  apple: { pos: 'noun', gender: 'feminine', plural: 'ябълки' },
  book: { pos: 'noun', gender: 'feminine', plural: 'книги' },
  ball: { pos: 'noun', gender: 'feminine', plural: 'топки' },
  cookie: { pos: 'noun', gender: 'feminine', plural: 'бисквити' },
  egg: { pos: 'noun', gender: 'neuter', plural: 'яйца' },
  school: { pos: 'noun', gender: 'neuter', institutional: true },
  home: { pos: 'noun', gender: 'masculine', institutional: true, proper: true },
  bed: { pos: 'noun', gender: 'neuter', institutional: true },
  park: { pos: 'noun', gender: 'masculine' },
  table: { pos: 'noun', gender: 'feminine', plural: 'маси' },

  not: { pos: 'negation' },
}
