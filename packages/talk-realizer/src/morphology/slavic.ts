import type { Features, Gender } from '../features'

/**
 * Shared Slavic morphology: the case system, and the three rules that make Slavic
 * feel different from everything else in this package.
 *
 * **Case, not articles.** None of these languages has an article at all (except
 * Bulgarian and Macedonian, which lost their cases instead and live in
 * `balkan-slavic.ts`). What an article does elsewhere, case endings do here:
 * "я хочу яблоко" versus "я хочу яблока" carries information that "I want an
 * apple" spells with a word.
 *
 * **The genitive of negation.** Negate a transitive verb and its object changes
 * case: Polish "chcę jabłko" becomes "nie chcę jabłka". Nothing else here has a
 * rule where negation reaches inside a noun phrase and changes the noun itself.
 *
 * **Animacy.** A masculine accusative copies the nominative when the noun is a
 * thing and the genitive when it is a being: "widzę stół" but "widzę kota".
 *
 * The endings are **data**, not code: one table per language, keyed by declension
 * class. Adding a Slavic language is a table plus a vocabulary, which is why
 * seven of them share this file. Scope is deliberate — nominative, accusative,
 * genitive, dative and locative, the cases Talk's sentence shapes produce. The
 * instrumental and vocative are not generated.
 */

export type SlavicLanguage = 'ru' | 'pl' | 'uk' | 'sr' | 'hr' | 'cs' | 'sk'
export type SlavicCase = 'nom' | 'acc' | 'gen' | 'dat' | 'loc'

export interface DeclensionResult {
  text: string
  /** True when a rule produced this, rather than a curated form. */
  induced: boolean
}

/** The declension classes these languages share, named by gender and ending. */
type NounClass =
  | 'fem-a' | 'fem-ja' | 'fem-soft'
  | 'neut-o' | 'neut-e'
  | 'masc-hard' | 'masc-soft' | 'masc-j'

/**
 * How to build one case from the nominative: drop `strip` characters, add `add`.
 * `'nominative'` copies the nominative unchanged — which is what an inanimate
 * masculine accusative does — and `'genitive'` reuses the genitive form, which is
 * what an animate one does.
 */
type Ending = { strip?: number, add: string } | 'nominative' | 'genitive'

type ClassEndings = Partial<Record<Exclude<SlavicCase, 'nom'>, Ending>>

/** One table per language. Everything else in this file is shared. */
const DECLENSIONS: Record<SlavicLanguage, Record<NounClass, ClassEndings>> = {
  ru: {
    'fem-a': { acc: { strip: 1, add: 'у' }, gen: { strip: 1, add: 'ы' }, dat: { strip: 1, add: 'е' }, loc: { strip: 1, add: 'е' } },
    'fem-ja': { acc: { strip: 1, add: 'ю' }, gen: { strip: 1, add: 'и' }, dat: { strip: 1, add: 'е' }, loc: { strip: 1, add: 'е' } },
    'fem-soft': { acc: 'nominative', gen: { strip: 1, add: 'и' }, dat: { strip: 1, add: 'и' }, loc: { strip: 1, add: 'и' } },
    'neut-o': { acc: 'nominative', gen: { strip: 1, add: 'а' }, dat: { strip: 1, add: 'у' }, loc: { strip: 1, add: 'е' } },
    'neut-e': { acc: 'nominative', gen: { strip: 1, add: 'я' }, dat: { strip: 1, add: 'ю' }, loc: { strip: 1, add: 'е' } },
    'masc-hard': { acc: 'nominative', gen: { add: 'а' }, dat: { add: 'у' }, loc: { add: 'е' } },
    'masc-soft': { acc: 'nominative', gen: { strip: 1, add: 'я' }, dat: { strip: 1, add: 'ю' }, loc: { strip: 1, add: 'е' } },
    'masc-j': { acc: 'nominative', gen: { strip: 1, add: 'я' }, dat: { strip: 1, add: 'ю' }, loc: { strip: 1, add: 'е' } },
  },
  pl: {
    'fem-a': { acc: { strip: 1, add: 'ę' }, gen: { strip: 1, add: 'y' }, dat: { strip: 1, add: 'ie' }, loc: { strip: 1, add: 'ie' } },
    'fem-ja': { acc: { strip: 1, add: 'ę' }, gen: { strip: 1, add: 'i' }, dat: { strip: 1, add: 'i' }, loc: { strip: 1, add: 'i' } },
    'fem-soft': { acc: 'nominative', gen: { strip: 1, add: 'y' }, dat: { strip: 1, add: 'y' }, loc: { strip: 1, add: 'y' } },
    'neut-o': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'u' }, loc: { strip: 1, add: 'u' } },
    'neut-e': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'u' }, loc: { strip: 1, add: 'u' } },
    'masc-hard': { acc: 'nominative', gen: { add: 'a' }, dat: { add: 'owi' }, loc: { add: 'u' } },
    'masc-soft': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'owi' }, loc: { strip: 1, add: 'u' } },
    'masc-j': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'owi' }, loc: { strip: 1, add: 'u' } },
  },
  uk: {
    'fem-a': { acc: { strip: 1, add: 'у' }, gen: { strip: 1, add: 'и' }, dat: { strip: 1, add: 'і' }, loc: { strip: 1, add: 'і' } },
    'fem-ja': { acc: { strip: 1, add: 'ю' }, gen: { strip: 1, add: 'і' }, dat: { strip: 1, add: 'і' }, loc: { strip: 1, add: 'і' } },
    'fem-soft': { acc: 'nominative', gen: { strip: 1, add: 'і' }, dat: { strip: 1, add: 'і' }, loc: { strip: 1, add: 'і' } },
    'neut-o': { acc: 'nominative', gen: { strip: 1, add: 'а' }, dat: { strip: 1, add: 'у' }, loc: { strip: 1, add: 'і' } },
    'neut-e': { acc: 'nominative', gen: { strip: 1, add: 'я' }, dat: { strip: 1, add: 'ю' }, loc: { strip: 1, add: 'і' } },
    'masc-hard': { acc: 'nominative', gen: { add: 'а' }, dat: { add: 'у' }, loc: { add: 'і' } },
    'masc-soft': { acc: 'nominative', gen: { strip: 1, add: 'я' }, dat: { strip: 1, add: 'ю' }, loc: { strip: 1, add: 'і' } },
    'masc-j': { acc: 'nominative', gen: { strip: 1, add: 'я' }, dat: { strip: 1, add: 'ю' }, loc: { strip: 1, add: 'ї' } },
  },
  sr: {
    'fem-a': { acc: { strip: 1, add: 'у' }, gen: { strip: 1, add: 'е' }, dat: { strip: 1, add: 'и' }, loc: { strip: 1, add: 'и' } },
    'fem-ja': { acc: { strip: 1, add: 'у' }, gen: { strip: 1, add: 'е' }, dat: { strip: 1, add: 'и' }, loc: { strip: 1, add: 'и' } },
    'fem-soft': { acc: 'nominative', gen: { add: 'и' }, dat: { add: 'и' }, loc: { add: 'и' } },
    'neut-o': { acc: 'nominative', gen: { strip: 1, add: 'а' }, dat: { strip: 1, add: 'у' }, loc: { strip: 1, add: 'у' } },
    'neut-e': { acc: 'nominative', gen: { strip: 1, add: 'а' }, dat: { strip: 1, add: 'у' }, loc: { strip: 1, add: 'у' } },
    'masc-hard': { acc: 'nominative', gen: { add: 'а' }, dat: { add: 'у' }, loc: { add: 'у' } },
    'masc-soft': { acc: 'nominative', gen: { add: 'а' }, dat: { add: 'у' }, loc: { add: 'у' } },
    'masc-j': { acc: 'nominative', gen: { strip: 1, add: 'а' }, dat: { strip: 1, add: 'у' }, loc: { strip: 1, add: 'у' } },
  },
  hr: {
    'fem-a': { acc: { strip: 1, add: 'u' }, gen: { strip: 1, add: 'e' }, dat: { strip: 1, add: 'i' }, loc: { strip: 1, add: 'i' } },
    'fem-ja': { acc: { strip: 1, add: 'u' }, gen: { strip: 1, add: 'e' }, dat: { strip: 1, add: 'i' }, loc: { strip: 1, add: 'i' } },
    'fem-soft': { acc: 'nominative', gen: { add: 'i' }, dat: { add: 'i' }, loc: { add: 'i' } },
    'neut-o': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'u' }, loc: { strip: 1, add: 'u' } },
    'neut-e': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'u' }, loc: { strip: 1, add: 'u' } },
    'masc-hard': { acc: 'nominative', gen: { add: 'a' }, dat: { add: 'u' }, loc: { add: 'u' } },
    'masc-soft': { acc: 'nominative', gen: { add: 'a' }, dat: { add: 'u' }, loc: { add: 'u' } },
    'masc-j': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'u' }, loc: { strip: 1, add: 'u' } },
  },
  cs: {
    'fem-a': { acc: { strip: 1, add: 'u' }, gen: { strip: 1, add: 'y' }, dat: { strip: 1, add: 'ě' }, loc: { strip: 1, add: 'ě' } },
    'fem-ja': { acc: { strip: 1, add: 'i' }, gen: { strip: 1, add: 'e' }, dat: { strip: 1, add: 'i' }, loc: { strip: 1, add: 'i' } },
    'fem-soft': { acc: 'nominative', gen: { add: 'i' }, dat: { add: 'i' }, loc: { add: 'i' } },
    'neut-o': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'u' }, loc: { strip: 1, add: 'u' } },
    'neut-e': { acc: 'nominative', gen: { strip: 1, add: 'e' }, dat: { strip: 1, add: 'i' }, loc: { strip: 1, add: 'i' } },
    'masc-hard': { acc: 'nominative', gen: { add: 'u' }, dat: { add: 'u' }, loc: { add: 'u' } },
    'masc-soft': { acc: 'nominative', gen: { add: 'e' }, dat: { add: 'i' }, loc: { add: 'i' } },
    'masc-j': { acc: 'nominative', gen: { strip: 1, add: 'e' }, dat: { strip: 1, add: 'i' }, loc: { strip: 1, add: 'i' } },
  },
  sk: {
    'fem-a': { acc: { strip: 1, add: 'u' }, gen: { strip: 1, add: 'y' }, dat: { strip: 1, add: 'e' }, loc: { strip: 1, add: 'e' } },
    'fem-ja': { acc: { strip: 1, add: 'u' }, gen: { strip: 1, add: 'e' }, dat: { strip: 1, add: 'i' }, loc: { strip: 1, add: 'i' } },
    'fem-soft': { acc: 'nominative', gen: { add: 'i' }, dat: { add: 'i' }, loc: { add: 'i' } },
    'neut-o': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'u' }, loc: { strip: 1, add: 'u' } },
    'neut-e': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'u' }, loc: { strip: 1, add: 'u' } },
    'masc-hard': { acc: 'nominative', gen: { add: 'u' }, dat: { add: 'u' }, loc: { add: 'u' } },
    'masc-soft': { acc: 'nominative', gen: { add: 'a' }, dat: { add: 'ovi' }, loc: { add: 'ovi' } },
    'masc-j': { acc: 'nominative', gen: { strip: 1, add: 'a' }, dat: { strip: 1, add: 'ovi' }, loc: { strip: 1, add: 'ovi' } },
  },
}

/** The soft signs and semivowels that mark a soft stem, by script. */
const SOFT_ENDINGS = ['ь', 'й', 'ř', 'ě', 'ň', 'ť', 'ď', 'j']

/** Which declension pattern a nominative singular belongs to. */
function nounClass(text: string, gender: Gender | undefined): NounClass {
  const word = text.split(' ').pop() ?? text
  if (gender === 'feminine') {
    if (word.endsWith('я') || word.endsWith('ja') || word.endsWith('ě')) return 'fem-ja'
    if (word.endsWith('a') || word.endsWith('а')) return 'fem-a'
    if (SOFT_ENDINGS.some((suffix) => word.endsWith(suffix))) return 'fem-soft'
    // A feminine ending in a consonant declines like the soft class everywhere
    // except where a table says otherwise.
    return /[аяae]$/.test(word) ? 'fem-a' : 'fem-soft'
  }
  if (gender === 'neuter') {
    if (word.endsWith('е') || word.endsWith('e')) return 'neut-e'
    return 'neut-o'
  }
  if (word.endsWith('ь')) return 'masc-soft'
  if (word.endsWith('й') || word.endsWith('j')) return 'masc-j'
  return 'masc-hard'
}

/** Applies one ending rule to a word. */
function apply(word: string, ending: Ending, nominative: string, genitive: () => string): string {
  if (ending === 'nominative') return nominative
  if (ending === 'genitive') return genitive()
  return `${word.slice(0, word.length - (ending.strip ?? 0))}${ending.add}`
}

/**
 * Declines a noun. Returns the nominative unchanged when no rule applies, so a
 * word this does not understand is left alone rather than mangled.
 */
export function declineNoun(
  text: string,
  features: Features,
  grammaticalCase: SlavicCase,
  language: SlavicLanguage,
): DeclensionResult {
  if (grammaticalCase === 'nom') return { text, induced: false }

  const curated = features.cases?.[grammaticalCase as 'acc' | 'gen']
  if (curated) return { text: curated, induced: false }

  const words = text.split(' ')
  const word = words[words.length - 1]
  const cls = nounClass(word, features.gender)
  const table = DECLENSIONS[language][cls]

  // An animate masculine borrows the genitive for its accusative: "widzę kota".
  const animate = features.animate === true
  const wanted: Exclude<SlavicCase, 'nom'> = grammaticalCase
  let ending = table[wanted]
  if (wanted === 'acc' && animate && cls.startsWith('masc')) ending = 'genitive'
  if (!ending) return { text, induced: false }

  const genitive = (): string => {
    const rule = table.gen
    return rule && rule !== 'nominative' && rule !== 'genitive' ? apply(word, rule, word, () => word) : word
  }
  words[words.length - 1] = apply(word, ending, word, genitive)
  return { text: words.join(' '), induced: true }
}

/**
 * Adjective endings, by language. Slavic adjectives agree in gender, number and
 * case, and the masculine nominative ending is a property of the word rather
 * than of the language — Russian "большой" is not "большый" — so the nominative
 * is restored from the form the pack shipped.
 */
const ADJECTIVES: Record<SlavicLanguage, {
  /** The endings to strip before adding a new one. */
  strip: RegExp
  feminine: Partial<Record<SlavicCase, string>>
  neuter: Partial<Record<SlavicCase, string>>
  masculine: Partial<Record<SlavicCase, string>>
  /**
   * The plural. One form per language, the one that agrees with people —
   * "щасливі", "šťastní" — because that is what a child's sentence is about.
   * Slavic plurals also split by gender and animacy; that is not modelled.
   */
  plural: Partial<Record<SlavicCase, string>>
  /** The default masculine nominative, when the pack form gives no clue. */
  masculineNominative: string
  /** A softer masculine nominative, for stems that need it. */
  softNominative?: string
  soft?: RegExp
  /**
   * True where the masculine nominative can end in a consonant — Serbian and
   * Croatian "срећан", "велик" — so a word with no vowel ending is not a word
   * this file failed to recognise.
   */
  bareMasculine?: boolean
}> = {
  ru: {
    strip: /(ый|ий|ой|ая|ое|ее)$/,
    feminine: { nom: 'ая', acc: 'ую', gen: 'ой', dat: 'ой', loc: 'ой' },
    neuter: { nom: 'ое', acc: 'ое', gen: 'ого', dat: 'ому', loc: 'ом' },
    masculine: { gen: 'ого', dat: 'ому', loc: 'ом' },
    masculineNominative: 'ый',
    softNominative: 'ий',
    soft: /(ний|кий|гий|хий|чий|щий|жий|ший)$/,
    plural: { nom: 'ые', acc: 'ые', gen: 'ых', dat: 'ым', loc: 'ых' },
  },
  pl: {
    strip: /(y|i|a|e)$/,
    feminine: { nom: 'a', acc: 'ą', gen: 'ej', dat: 'ej', loc: 'ej' },
    neuter: { nom: 'e', acc: 'e', gen: 'ego', dat: 'emu', loc: 'ym' },
    masculine: { gen: 'ego', dat: 'emu', loc: 'ym' },
    masculineNominative: 'y',
    softNominative: 'i',
    soft: /(ki|gi|ni)$/,
    plural: { nom: 'i', acc: 'ych', gen: 'ych', dat: 'ym', loc: 'ych' },
  },
  uk: {
    strip: /(ий|ій|а|е|я)$/,
    feminine: { nom: 'а', acc: 'у', gen: 'ої', dat: 'ій', loc: 'ій' },
    neuter: { nom: 'е', acc: 'е', gen: 'ого', dat: 'ому', loc: 'ому' },
    masculine: { gen: 'ого', dat: 'ому', loc: 'ому' },
    masculineNominative: 'ий',
    plural: { nom: 'і', acc: 'і', gen: 'их', dat: 'им', loc: 'их' },
  },
  sr: {
    // Serbian adjectives have a bare (indefinite) masculine: "велик".
    strip: /(и|а|о|е)$/,
    feminine: { nom: 'а', acc: 'у', gen: 'е', dat: 'ој', loc: 'ој' },
    neuter: { nom: 'о', acc: 'о', gen: 'ог', dat: 'ом', loc: 'ом' },
    masculine: { gen: 'ог', dat: 'ом', loc: 'ом' },
    masculineNominative: 'и',
    bareMasculine: true,
    plural: { nom: 'и', acc: 'е', gen: 'их', dat: 'им', loc: 'им' },
  },
  hr: {
    strip: /(i|a|o|e)$/,
    feminine: { nom: 'a', acc: 'u', gen: 'e', dat: 'oj', loc: 'oj' },
    neuter: { nom: 'o', acc: 'o', gen: 'og', dat: 'om', loc: 'om' },
    masculine: { gen: 'og', dat: 'om', loc: 'om' },
    masculineNominative: 'i',
    bareMasculine: true,
    plural: { nom: 'i', acc: 'e', gen: 'ih', dat: 'im', loc: 'im' },
  },
  cs: {
    strip: /(ý|í|á|é|ou)$/,
    feminine: { nom: 'á', acc: 'ou', gen: 'é', dat: 'é', loc: 'é' },
    neuter: { nom: 'é', acc: 'é', gen: 'ého', dat: 'ému', loc: 'ém' },
    masculine: { gen: 'ého', dat: 'ému', loc: 'ém' },
    masculineNominative: 'ý',
    softNominative: 'í',
    soft: /(ní|cí|ší|ží|čí)$/,
    plural: { nom: 'í', acc: 'é', gen: 'ých', dat: 'ým', loc: 'ých' },
  },
  sk: {
    strip: /(ý|í|á|é|ú)$/,
    feminine: { nom: 'á', acc: 'ú', gen: 'ej', dat: 'ej', loc: 'ej' },
    neuter: { nom: 'é', acc: 'é', gen: 'ého', dat: 'ému', loc: 'om' },
    masculine: { gen: 'ého', dat: 'ému', loc: 'om' },
    masculineNominative: 'ý',
    softNominative: 'í',
    soft: /(ní|cí|ší|ží|čí)$/,
    plural: { nom: 'í', acc: 'é', gen: 'ých', dat: 'ým', loc: 'ých' },
  },
}

/** Declines an attributive adjective to agree with its noun. */
export function declineAdjective(
  text: string,
  features: Features,
  gender: Gender | undefined,
  grammaticalCase: SlavicCase,
  animate: boolean,
  language: SlavicLanguage,
  plural = false,
): string {
  const curated = features.cases?.[grammaticalCase as 'acc' | 'gen']
  if (curated) return curated

  const table = ADJECTIVES[language]
  const match = table.strip.exec(text)
  let stem: string
  let nominative = text
  if (match) {
    stem = text.slice(0, -match[1].length)
  } else if (table.bareMasculine) {
    // "срећан" is already the masculine nominative. Everything else is built on
    // the stem, which loses the fleeting -a-: "срећна", not "срећана".
    const bare = text.split(' ').pop() ?? text
    // The fleeting -a- appears in a small set of suffixes — "sretan" → "sretn",
    // "dobar" → "dobr", "kratak" → "kratk" — and not in a root vowel, so "mlad"
    // and "velik" keep theirs.
    stem = /(an|ar|ak|ан|ар|ак)$/.test(bare)
      ? `${bare.slice(0, -2)}${bare.slice(-1)}`
      : bare
    nominative = bare
  } else {
    // A word this does not recognise as an adjective is left exactly as it came.
    return text
  }

  if (plural) {
    const ending = table.plural[grammaticalCase]
    return ending ? `${stem}${ending}` : text
  }
  if (gender === 'feminine') {
    const ending = table.feminine[grammaticalCase]
    return ending ? `${stem}${ending}` : text
  }
  if (gender === 'neuter') {
    const ending = table.neuter[grammaticalCase]
    return ending ? `${stem}${ending}` : text
  }
  // The masculine accusative follows animacy, as the nouns do.
  if (grammaticalCase === 'acc' && animate) {
    const ending = table.masculine.gen
    return ending ? `${stem}${ending}` : text
  }
  const ending = table.masculine[grammaticalCase]
  if (ending) return `${stem}${ending}`
  // The nominative: keep whatever form the pack shipped, because which ending a
  // word takes is lexical.
  if (!match) return nominative
  const soft = table.soft?.test(text) === true
  return `${stem}${match[1] === table.masculineNominative || !table.soft
    ? match[1]
    : soft ? table.softNominative ?? match[1] : match[1]}`
}

/**
 * Possessive pronouns decline like adjectives but on their own stems, so they get
 * their own small table rather than the adjective rule.
 */
const POSSESSIVES: Record<string, Record<string, Record<string, string>>> = {
  ru: {
    мой: { 'm-nom': 'мой', 'm-acc': 'мой', 'm-gen': 'моего', 'f-nom': 'моя', 'f-acc': 'мою', 'f-gen': 'моей', 'n-nom': 'моё', 'n-acc': 'моё', 'n-gen': 'моего' },
    твой: { 'm-nom': 'твой', 'm-acc': 'твой', 'm-gen': 'твоего', 'f-nom': 'твоя', 'f-acc': 'твою', 'f-gen': 'твоей', 'n-nom': 'твоё', 'n-acc': 'твоё', 'n-gen': 'твоего' },
  },
  pl: {
    mój: { 'm-nom': 'mój', 'm-acc': 'mój', 'm-gen': 'mojego', 'f-nom': 'moja', 'f-acc': 'moją', 'f-gen': 'mojej', 'n-nom': 'moje', 'n-acc': 'moje', 'n-gen': 'mojego' },
    twój: { 'm-nom': 'twój', 'm-acc': 'twój', 'm-gen': 'twojego', 'f-nom': 'twoja', 'f-acc': 'twoją', 'f-gen': 'twojej', 'n-nom': 'twoje', 'n-acc': 'twoje', 'n-gen': 'twojego' },
  },
  uk: {
    мій: { 'm-nom': 'мій', 'm-acc': 'мій', 'm-gen': 'мого', 'f-nom': 'моя', 'f-acc': 'мою', 'f-gen': 'моєї', 'n-nom': 'моє', 'n-acc': 'моє', 'n-gen': 'мого' },
    твій: { 'm-nom': 'твій', 'm-acc': 'твій', 'm-gen': 'твого', 'f-nom': 'твоя', 'f-acc': 'твою', 'f-gen': 'твоєї', 'n-nom': 'твоє', 'n-acc': 'твоє', 'n-gen': 'твого' },
  },
  sr: {
    мој: { 'm-nom': 'мој', 'm-acc': 'мој', 'm-gen': 'мог', 'f-nom': 'моја', 'f-acc': 'моју', 'f-gen': 'моје', 'n-nom': 'моје', 'n-acc': 'моје', 'n-gen': 'мог' },
    твој: { 'm-nom': 'твој', 'm-acc': 'твој', 'm-gen': 'твог', 'f-nom': 'твоја', 'f-acc': 'твоју', 'f-gen': 'твоје', 'n-nom': 'твоје', 'n-acc': 'твоје', 'n-gen': 'твог' },
  },
  hr: {
    moj: { 'm-nom': 'moj', 'm-acc': 'moj', 'm-gen': 'mog', 'f-nom': 'moja', 'f-acc': 'moju', 'f-gen': 'moje', 'n-nom': 'moje', 'n-acc': 'moje', 'n-gen': 'mog' },
    tvoj: { 'm-nom': 'tvoj', 'm-acc': 'tvoj', 'm-gen': 'tvog', 'f-nom': 'tvoja', 'f-acc': 'tvoju', 'f-gen': 'tvoje', 'n-nom': 'tvoje', 'n-acc': 'tvoje', 'n-gen': 'tvog' },
  },
  cs: {
    můj: { 'm-nom': 'můj', 'm-acc': 'můj', 'm-gen': 'mého', 'f-nom': 'moje', 'f-acc': 'moji', 'f-gen': 'mé', 'n-nom': 'moje', 'n-acc': 'moje', 'n-gen': 'mého' },
    tvůj: { 'm-nom': 'tvůj', 'm-acc': 'tvůj', 'm-gen': 'tvého', 'f-nom': 'tvoje', 'f-acc': 'tvoji', 'f-gen': 'tvé', 'n-nom': 'tvoje', 'n-acc': 'tvoje', 'n-gen': 'tvého' },
  },
  sk: {
    môj: { 'm-nom': 'môj', 'm-acc': 'môj', 'm-gen': 'môjho', 'f-nom': 'moja', 'f-acc': 'moju', 'f-gen': 'mojej', 'n-nom': 'moje', 'n-acc': 'moje', 'n-gen': 'môjho' },
    tvoj: { 'm-nom': 'tvoj', 'm-acc': 'tvoj', 'm-gen': 'tvojho', 'f-nom': 'tvoja', 'f-acc': 'tvoju', 'f-gen': 'tvojej', 'n-nom': 'tvoje', 'n-acc': 'tvoje', 'n-gen': 'tvojho' },
  },
}

export function declinePossessive(
  text: string,
  gender: Gender | undefined,
  grammaticalCase: SlavicCase,
  animate: boolean,
  language: SlavicLanguage,
): string | null {
  const table = POSSESSIVES[language]?.[text]
  if (!table) return null
  const genderKey = gender === 'feminine' ? 'f' : gender === 'neuter' ? 'n' : 'm'
  // An animate masculine accusative borrows the genitive, exactly as nouns do.
  const caseKey = grammaticalCase === 'acc' && animate && genderKey === 'm'
    ? 'gen'
    : grammaticalCase === 'dat' || grammaticalCase === 'loc' ? 'gen' : grammaticalCase
  return table[`${genderKey}-${caseKey}`] ?? text
}

/** Gender induced from the nominative ending, which these languages make easy. */
export function induceSlavicGender(text: string, language: SlavicLanguage): Gender {
  const word = text.split(' ').pop() ?? text
  const cyrillic = language === 'ru' || language === 'uk' || language === 'sr'
  if (cyrillic) {
    if (/[ая]$/.test(word)) return 'feminine'
    if (/[ое]$/.test(word)) return 'neuter'
    return 'masculine'
  }
  if (word.endsWith('a')) return 'feminine'
  if (/[oe]$/.test(word) || word.endsWith('um')) return 'neuter'
  return 'masculine'
}
