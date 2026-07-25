import type { Features, Gender } from '../features'

/**
 * Shared Slavic morphology: the case system Russian and Polish need, and the two
 * rules that make Slavic feel different from everything else in this package.
 *
 * **Case, not articles.** Neither language has an article at all. What an article
 * does elsewhere, case endings do here: "я хочу яблоко" versus "я хочу яблока"
 * carries information that "I want an apple" spells with a word.
 *
 * **The genitive of negation.** Negate a transitive verb and its object changes
 * case: Polish "chcę jabłko" becomes "nie chcę jabłka". Russian does the same
 * with a class of verbs. Nothing else here has a rule where negation reaches
 * inside a noun phrase and changes the noun itself.
 *
 * **Animacy.** A masculine accusative copies the nominative when the noun is a
 * thing and the genitive when it is a being: "widzę stół" but "widzę kota".
 *
 * Scope is deliberate: nominative, accusative and genitive — the three cases
 * Talk's sentence shapes produce. The instrumental, dative and locative are not
 * generated, and prepositional phrases are marked with a note rather than
 * declined.
 */

export type SlavicLanguage = 'ru' | 'pl'
export type SlavicCase = 'nom' | 'acc' | 'gen' | 'dat' | 'loc'

export interface DeclensionResult {
  text: string
  /** True when a rule produced this, rather than a curated form. */
  induced: boolean
}

/** Which declension pattern a nominative singular belongs to. */
function nounClass(text: string, gender: Gender | undefined): string {
  const word = text.split(' ').pop() ?? text
  if (gender === 'feminine') {
    if (word.endsWith('я')) return 'fem-ja'
    if (word.endsWith('a') || word.endsWith('а')) return 'fem-a'
    if (word.endsWith('ь')) return 'fem-soft'
    return 'fem-a'
  }
  if (gender === 'neuter') {
    if (word.endsWith('е') || word.endsWith('e')) return 'neut-e'
    return 'neut-o'
  }
  if (word.endsWith('ь')) return 'masc-soft'
  if (word.endsWith('й')) return 'masc-j'
  return 'masc-hard'
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
  const gender = features.gender
  const animate = features.animate === true
  const cls = nounClass(word, gender)
  const stem = word.slice(0, -1)

  let form = word
  // The dative and locative are generated only where a preposition or a verb
  // demands them; everything else stays out of scope.
  if (grammaticalCase === 'dat' || grammaticalCase === 'loc') {
    if (language === 'ru') {
      if (cls === 'fem-a' || cls === 'fem-ja') form = `${stem}е`
      else if (cls.startsWith('neut')) form = `${stem}${grammaticalCase === 'dat' ? 'у' : 'е'}`
      else form = `${word}${grammaticalCase === 'dat' ? 'у' : 'е'}`
    } else {
      if (cls === 'fem-a' || cls === 'fem-ja') form = `${stem}ie`
      else if (cls.startsWith('neut')) form = `${stem}u`
      else form = `${word}u`
    }
    words[words.length - 1] = form
    return { text: words.join(' '), induced: true }
  }
  if (language === 'ru') {
    switch (cls) {
      case 'fem-a': form = grammaticalCase === 'acc' ? `${stem}у` : `${stem}ы`; break
      case 'fem-ja': form = grammaticalCase === 'acc' ? `${stem}ю` : `${stem}и`; break
      case 'fem-soft': form = grammaticalCase === 'acc' ? word : `${stem}и`; break
      case 'neut-o': form = grammaticalCase === 'acc' ? word : `${stem}а`; break
      case 'neut-e': form = grammaticalCase === 'acc' ? word : `${stem}я`; break
      case 'masc-soft': form = grammaticalCase === 'gen' || animate ? `${stem}я` : word; break
      case 'masc-j': form = grammaticalCase === 'gen' || animate ? `${stem}я` : word; break
      default: form = grammaticalCase === 'gen' || animate ? `${word}а` : word
    }
  } else {
    switch (cls) {
      case 'fem-a': form = grammaticalCase === 'acc' ? `${stem}ę` : `${stem}y`; break
      case 'fem-ja': form = grammaticalCase === 'acc' ? `${stem}ę` : `${stem}i`; break
      case 'fem-soft': form = grammaticalCase === 'acc' ? word : `${stem}y`; break
      case 'neut-o': form = grammaticalCase === 'acc' ? word : `${stem}a`; break
      case 'neut-e': form = grammaticalCase === 'acc' ? word : `${stem}a`; break
      default: form = grammaticalCase === 'gen' || animate ? `${word}a` : word
    }
  }

  words[words.length - 1] = form
  return { text: words.join(' '), induced: true }
}

/** Declines an attributive adjective to agree with its noun. */
export function declineAdjective(
  text: string,
  features: Features,
  gender: Gender | undefined,
  grammaticalCase: SlavicCase,
  animate: boolean,
  language: SlavicLanguage,
): string {
  const curated = features.cases?.[grammaticalCase as 'acc' | 'gen']
  if (curated) return curated

  if (language === 'ru') {
    // Russian adjectives end in -ый/-ий/-ой in the masculine nominative.
    const stem = text.replace(/(ый|ий|ой|ая|ое|ее)$/, '')
    if (stem === text) return text
    const soft = /(ний|кий|гий|хий|чий|щий|жий|ший)$/.test(text)
    if (gender === 'feminine') {
      return grammaticalCase === 'nom' ? `${stem}ая` : grammaticalCase === 'acc' ? `${stem}ую` : `${stem}ой`
    }
    if (gender === 'neuter') {
      return grammaticalCase === 'gen' ? `${stem}ого` : `${stem}ое`
    }
    if (grammaticalCase === 'gen' || (grammaticalCase === 'acc' && animate)) return `${stem}ого`
    return `${stem}${soft ? 'ий' : 'ый'}`
  }

  // Polish adjectives end in -y/-i in the masculine nominative.
  const stem = text.replace(/(y|i|a|e)$/, '')
  if (stem === text) return text
  const soft = /(ki|gi|ni)$/.test(text)
  if (gender === 'feminine') {
    return grammaticalCase === 'acc' ? `${stem}ą` : grammaticalCase === 'gen' ? `${stem}ej` : `${stem}a`
  }
  if (gender === 'neuter') {
    return grammaticalCase === 'gen' ? `${stem}ego` : `${stem}e`
  }
  if (grammaticalCase === 'gen' || (grammaticalCase === 'acc' && animate)) return `${stem}ego`
  return `${stem}${soft ? 'i' : 'y'}`
}

/**
 * Possessive pronouns decline like adjectives but on their own stems, so they get
 * their own small table rather than the adjective rule.
 */
const POSSESSIVES: Record<SlavicLanguage, Record<string, Record<string, string>>> = {
  ru: {
    мой: { 'm-nom': 'мой', 'm-acc': 'мой', 'm-gen': 'моего', 'f-nom': 'моя', 'f-acc': 'мою', 'f-gen': 'моей', 'n-nom': 'моё', 'n-acc': 'моё', 'n-gen': 'моего' },
    твой: { 'm-nom': 'твой', 'm-acc': 'твой', 'm-gen': 'твоего', 'f-nom': 'твоя', 'f-acc': 'твою', 'f-gen': 'твоей', 'n-nom': 'твоё', 'n-acc': 'твоё', 'n-gen': 'твоего' },
  },
  pl: {
    mój: { 'm-nom': 'mój', 'm-acc': 'mój', 'm-gen': 'mojego', 'f-nom': 'moja', 'f-acc': 'moją', 'f-gen': 'mojej', 'n-nom': 'moje', 'n-acc': 'moje', 'n-gen': 'mojego' },
    twój: { 'm-nom': 'twój', 'm-acc': 'twój', 'm-gen': 'twojego', 'f-nom': 'twoja', 'f-acc': 'twoją', 'f-gen': 'twojej', 'n-nom': 'twoje', 'n-acc': 'twoje', 'n-gen': 'twojego' },
  },
}

export function declinePossessive(
  text: string,
  gender: Gender | undefined,
  grammaticalCase: SlavicCase,
  animate: boolean,
  language: SlavicLanguage,
): string | null {
  const table = POSSESSIVES[language][text]
  if (!table) return null
  const genderKey = gender === 'feminine' ? 'f' : gender === 'neuter' ? 'n' : 'm'
  // An animate masculine accusative borrows the genitive, exactly as nouns do.
  const caseKey = grammaticalCase === 'acc' && animate && genderKey === 'm'
    ? 'gen'
    : grammaticalCase === 'dat' || grammaticalCase === 'loc' ? 'gen' : grammaticalCase
  return table[`${genderKey}-${caseKey}`] ?? text
}

/** Gender induced from the nominative ending, which both languages make easy. */
export function induceSlavicGender(text: string, language: SlavicLanguage): Gender {
  const word = text.split(' ').pop() ?? text
  if (language === 'ru') {
    if (/[ая]$/.test(word)) return 'feminine'
    if (/[ое]$/.test(word)) return 'neuter'
    return 'masculine'
  }
  if (word.endsWith('a')) return 'feminine'
  if (/[oe]$/.test(word) || word.endsWith('um')) return 'neuter'
  return 'masculine'
}
