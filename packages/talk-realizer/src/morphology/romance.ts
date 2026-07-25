import type { Features, Gender } from '../features'

/**
 * Shared Romance morphology: what French, Spanish, Italian and Portuguese have
 * in common, so each language module only carries what makes it different.
 *
 * The packs store verbs as **infinitives** ("vouloir", "querer", "volere"), so
 * conjugation is not optional here — without it every Romance sentence reads
 * like a dictionary entry. Regular paradigms are computed; the irregulars each
 * language actually ships are curated in its own module.
 */

export type RomanceLanguage = 'fr' | 'es' | 'it' | 'pt' | 'ca' | 'gl'
export type Person = 1 | 2 | 3
export type Num = 'sg' | 'pl'

const ENDINGS: Record<RomanceLanguage, Record<string, Record<string, string>>> = {
  fr: {
    er: { '1sg': 'e', '2sg': 'es', '3sg': 'e', '1pl': 'ons', '2pl': 'ez', '3pl': 'ent' },
    ir: { '1sg': 'is', '2sg': 'is', '3sg': 'it', '1pl': 'issons', '2pl': 'issez', '3pl': 'issent' },
    re: { '1sg': 's', '2sg': 's', '3sg': '', '1pl': 'ons', '2pl': 'ez', '3pl': 'ent' },
  },
  es: {
    ar: { '1sg': 'o', '2sg': 'as', '3sg': 'a', '1pl': 'amos', '2pl': 'áis', '3pl': 'an' },
    er: { '1sg': 'o', '2sg': 'es', '3sg': 'e', '1pl': 'emos', '2pl': 'éis', '3pl': 'en' },
    ir: { '1sg': 'o', '2sg': 'es', '3sg': 'e', '1pl': 'imos', '2pl': 'ís', '3pl': 'en' },
  },
  it: {
    are: { '1sg': 'o', '2sg': 'i', '3sg': 'a', '1pl': 'iamo', '2pl': 'ate', '3pl': 'ano' },
    ere: { '1sg': 'o', '2sg': 'i', '3sg': 'e', '1pl': 'iamo', '2pl': 'ete', '3pl': 'ono' },
    ire: { '1sg': 'o', '2sg': 'i', '3sg': 'e', '1pl': 'iamo', '2pl': 'ite', '3pl': 'ono' },
  },
  pt: {
    ar: { '1sg': 'o', '2sg': 'as', '3sg': 'a', '1pl': 'amos', '2pl': 'ais', '3pl': 'am' },
    er: { '1sg': 'o', '2sg': 'es', '3sg': 'e', '1pl': 'emos', '2pl': 'eis', '3pl': 'em' },
    ir: { '1sg': 'o', '2sg': 'es', '3sg': 'e', '1pl': 'imos', '2pl': 'is', '3pl': 'em' },
  },
  // Catalan's plural endings are its own: "volem", not "volemos".
  ca: {
    ar: { '1sg': 'o', '2sg': 'es', '3sg': 'a', '1pl': 'em', '2pl': 'eu', '3pl': 'en' },
    er: { '1sg': 'o', '2sg': 's', '3sg': '', '1pl': 'em', '2pl': 'eu', '3pl': 'en' },
    ir: { '1sg': 'o', '2sg': 's', '3sg': '', '1pl': 'im', '2pl': 'iu', '3pl': 'en' },
  },
  gl: {
    ar: { '1sg': 'o', '2sg': 'as', '3sg': 'a', '1pl': 'amos', '2pl': 'ades', '3pl': 'an' },
    er: { '1sg': 'o', '2sg': 'es', '3sg': 'e', '1pl': 'emos', '2pl': 'edes', '3pl': 'en' },
    ir: { '1sg': 'o', '2sg': 'es', '3sg': 'e', '1pl': 'imos', '2pl': 'ides', '3pl': 'en' },
  },
}

/** The conjugation class of an infinitive, or null when it is not recognisable. */
export function verbClass(infinitive: string, language: RomanceLanguage): string | null {
  const classes = Object.keys(ENDINGS[language]).sort((a, b) => b.length - a.length)
  for (const suffix of classes) {
    if (infinitive.endsWith(suffix)) return suffix
  }
  return null
}

/**
 * Conjugates a regular verb in the present tense. Returns null when the verb is
 * not regular in this language, so the caller can fall back to a curated form
 * rather than inventing a wrong one.
 */
export function conjugateRegular(
  infinitive: string,
  language: RomanceLanguage,
  person: Person,
  number: Num,
): string | null {
  // Multi-word entries ("avoir besoin", "stare in piedi") carry their own tail.
  const [head, ...tail] = infinitive.split(' ')
  const suffix = verbClass(head, language)
  if (!suffix) return null
  const stem = head.slice(0, head.length - suffix.length)
  const ending = ENDINGS[language][suffix][`${person}${number}`]
  if (ending === undefined) return null

  let form = `${stem}${ending}`
  // Orthographic repairs that keep the stem's sound: French "mangeons",
  // "commençons"; Italian and Portuguese g/c softening.
  if (language === 'fr' && stem.endsWith('g') && ending.startsWith('o')) form = `${stem}e${ending}`
  if (language === 'fr' && stem.endsWith('c') && ending.startsWith('o')) form = `${stem.slice(0, -1)}ç${ending}`
  if (language === 'it' && stem.endsWith('c') && (ending.startsWith('i') || ending.startsWith('e'))) {
    form = `${stem}h${ending}`
  }
  // Italian -iare verbs keep one i: "mangi", not "mangii".
  if (language === 'it' && stem.endsWith('i') && ending.startsWith('i')) {
    form = `${stem}${ending.slice(1)}`
  }
  return [form, ...tail].join(' ')
}

/**
 * Gender induction from the word's own ending. Romance gender is mostly
 * predictable, which is why these languages do not need a curated entry for
 * every noun the way German does; the exceptions live in each language's module.
 */
export function induceGender(text: string, language: RomanceLanguage): Gender | undefined {
  const word = text.toLowerCase().split(' ').pop() ?? text
  switch (language) {
    case 'es':
    case 'it':
    case 'pt':
    case 'ca':
    case 'gl': {
      if (/(ción|ção|sión|dad|tà|tù|zione|gione|agem|ã)$/.test(word)) return 'feminine'
      // Greek-origin -ma masculines (problema, tema) are curated, not induced:
      // the rule would wrongly claim "poma", "goma" and "crema".
      if (word.endsWith('o')) return 'masculine'
      if (word.endsWith('a')) return 'feminine'
      if (/(or|ón|ém|im|um|el|il|ol|ul)$/.test(word)) return 'masculine'
      return undefined
    }
    case 'fr': {
      if (/(tion|sion|té|ette|elle|ille|ure|ence|ance|eur$)/.test(word)) return 'feminine'
      if (/(ment|age|eau|isme|ier|oir)$/.test(word)) return 'masculine'
      if (word.endsWith('e')) return 'feminine'
      return 'masculine'
    }
  }
}

/** Regular plural of a noun or adjective. */
export function pluralize(text: string, language: RomanceLanguage): string {
  const words = text.split(' ')
  const word = words[words.length - 1]
  let plural: string
  switch (language) {
    case 'it': {
      // Italian pluralises by changing the final vowel.
      if (word.endsWith('a')) plural = `${word.slice(0, -1)}e`
      else if (/[oe]$/.test(word)) plural = `${word.slice(0, -1)}i`
      else plural = word
      break
    }
    case 'pt': {
      if (word.endsWith('ão')) plural = `${word.slice(0, -2)}ões`
      else if (word.endsWith('l')) plural = `${word.slice(0, -1)}is`
      else if (/(r|z|s)$/.test(word)) plural = `${word}es`
      else if (word.endsWith('m')) plural = `${word.slice(0, -1)}ns`
      else plural = `${word}s`
      break
    }
    case 'ca':
    case 'gl':
    case 'es': {
      if (/[aeiou]$/.test(word)) plural = `${word}s`
      else if (word.endsWith('z')) plural = `${word.slice(0, -1)}ces`
      else plural = `${word}es`
      break
    }
    case 'fr': {
      if (/(s|x|z)$/.test(word)) plural = word
      else if (/(au|eu)$/.test(word)) plural = `${word}x`
      else if (word.endsWith('al')) plural = `${word.slice(0, -2)}aux`
      else plural = `${word}s`
      break
    }
  }
  words[words.length - 1] = plural
  return words.join(' ')
}

/**
 * Adjective agreement. Feminine and plural forms are regular enough to compute;
 * a curated `feminine` on the word wins when it is not.
 */
export function agreeAdjective(
  features: Features,
  base: string,
  language: RomanceLanguage,
  gender: Gender | undefined,
  number: Num,
): string {
  const feminine = gender === 'feminine'
  let form = base

  if (feminine) {
    form = features.feminine ?? femininize(base, language)
  }
  if (number === 'pl') {
    form = features.pluralForm && !feminine
      ? features.pluralForm
      : pluralize(form, language)
  }
  return form
}

function femininize(base: string, language: RomanceLanguage): string {
  const words = base.split(' ')
  const word = words[words.length - 1]
  let form = word
  switch (language) {
    case 'fr': {
      if (word.endsWith('eux')) form = `${word.slice(0, -3)}euse`
      else if (word.endsWith('f')) form = `${word.slice(0, -1)}ve`
      else if (word.endsWith('er')) form = `${word.slice(0, -2)}ère`
      else if (/(en|on)$/.test(word)) form = `${word}ne`
      else if (word.endsWith('et')) form = `${word}te`
      else if (word.endsWith('os')) form = `${word}se`
      else if (word.endsWith('e')) form = word
      else form = `${word}e`
      break
    }
    case 'es':
    case 'pt':
    case 'ca':
    case 'gl': {
      if (word.endsWith('o')) form = `${word.slice(0, -1)}a`
      else if (/(or|ón)$/.test(word)) form = `${word}a`
      // Catalan adds -a to a consonant stem: "fred" → "freda". The invariable
      // adjectives ("gran", "feliç") are curated, because no rule finds them.
      else if (language === 'ca' && /[bcdfgjlmnprtvz]$/.test(word)) form = `${word}a`
      else form = word
      break
    }
    case 'it': {
      if (word.endsWith('o')) form = `${word.slice(0, -1)}a`
      else form = word
      break
    }
  }
  words[words.length - 1] = form
  return words.join(' ')
}

/** Applies contractions and elisions to a finished token list. */
export function elide(
  tokens: Array<{ text: string, from: string | null, merged?: string[] }>,
  pairs: Array<[RegExp, string | ((match: string, ...groups: string[]) => string)]>,
): Array<{ text: string, from: string | null, merged?: string[] }> {
  const output: Array<{ text: string, from: string | null, merged?: string[] }> = []
  for (const token of tokens) {
    const previous = output[output.length - 1]
    if (previous) {
      const joined = `${previous.text} ${token.text}`
      let replaced: string | null = null
      for (const [pattern, replacement] of pairs) {
        if (pattern.test(joined)) {
          replaced = typeof replacement === 'string'
            ? joined.replace(pattern, replacement)
            : joined.replace(pattern, replacement as (substring: string, ...args: unknown[]) => string)
          break
        }
      }
      if (replaced !== null) {
        const sources = [
          ...(previous.merged ?? []),
          ...(previous.from ? [previous.from] : []),
          ...(token.from ? [token.from] : []),
        ]
        const from = previous.from ?? token.from
        output[output.length - 1] = {
          text: replaced,
          from,
          merged: sources.filter((id) => id !== from),
        }
        continue
      }
    }
    output.push(token)
  }
  return output
}

export function startsWithVowel(text: string): boolean {
  return /^[aeiouâàéèêëîïôöûüh]/i.test(text)
}


/**
 * Spanish "gustar" and Italian "piacere" invert the clause: the experiencer
 * becomes a dative clitic and the thing liked becomes the grammatical subject —
 * "Me gusta el pan". Returns true when the rewrite applied.
 */
export function applyExperiencer(
  chunks: {
    subject?: { pronoun?: { id: string, text: string, features: Features } },
    verb?: { features: Features },
    complements: Array<{ kind: string, determiner?: unknown, head?: unknown }>,
  },
  scratch: Record<string, unknown>,
  clitics: Record<string, string>,
  person: Person,
  number: Num,
): boolean {
  if (!chunks.verb?.features.experiencerDative) return false
  const subject = chunks.subject?.pronoun
  if (!subject) return false
  const clitic = clitics[`${person}${number}`]
  if (clitic === undefined) return false
  // An empty clitic means the language spells it inside the verb form instead.
  if (clitic) scratch.clitic = { text: clitic, from: subject.id }
  scratch.experiencer = true
  chunks.subject = undefined
  return true
}

/**
 * Possessives agree with the thing owned, not the owner: "mia palla", "minha
 * bola". Italian also wants the definite article in front — "la mia palla".
 */
export function possessiveForm(
  features: Features,
  text: string,
  feminine: boolean,
): string {
  return feminine ? (features.feminine ?? text) : text
}
