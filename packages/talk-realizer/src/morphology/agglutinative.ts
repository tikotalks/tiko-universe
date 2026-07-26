/**
 * Suffix stacking with vowel harmony — the one mechanism this package did not
 * have, and the reason Turkish, Hungarian and Finnish were out of reach.
 *
 * Every language here so far builds a word form by picking an ending from a
 * table. An agglutinative language builds it by *stacking* endings whose vowels
 * are decided by the stem: Turkish "ev" (house) takes "-de" and "okul" (school)
 * takes "-da", because the last vowel of the stem chooses. Written as tables that
 * would be one entry per word; written as harmony it is one rule.
 *
 * Suffixes are given as **templates**, in the notation Turkish grammars use:
 *
 * - `A` → a low vowel, two ways: a/e (Turkish), a/e (Hungarian), a/ä (Finnish)
 * - `I` → a high vowel, four ways: ı/i/u/ü — rounded where the stem is rounded
 * - `O` → a mid rounded vowel, three ways: o/e/ö (Hungarian "-hoz/-hez/-höz")
 * - `D` → d after a voiced sound, t after a voiceless one
 * - `C` → c or ç, the same rule
 * - `(y)`, `(n)` → a buffer consonant, written only after a vowel
 * - `(I)` → a linking vowel, written only after a consonant
 *
 * So the Turkish locative is `DA`, the accusative `(y)I`, the genitive `(n)In`,
 * and "elma" + `(y)I` is "elmayı" while "ev" + `(y)I` is "evi".
 */

export interface HarmonyConfig {
  /** Back vowels: a stem whose last vowel is one of these takes back suffixes. */
  back: string
  /** Front vowels. */
  front: string
  /** The rounded vowels, for four-way harmony. */
  rounded: string
  /** What `A` resolves to: [back, front]. */
  low: [string, string]
  /**
   * What `I` resolves to: [back unrounded, front unrounded, back rounded, front
   * rounded]. Two entries is enough for a language with no rounding harmony.
   */
  high: [string, string, string?, string?]
  /** What `O` resolves to: [back, front, front rounded]. */
  mid?: [string, string, string]
  /** Consonants after which `D` is voiceless. */
  voiceless: string
  /** Vowel-final stems need a buffer consonant; these letters are vowels. */
  vowels: string
}

export const TURKISH_HARMONY: HarmonyConfig = {
  back: 'aıou',
  front: 'eiöü',
  rounded: 'ouöü',
  low: ['a', 'e'],
  high: ['ı', 'i', 'u', 'ü'],
  voiceless: 'fstkçşhp',
  vowels: 'aeıioöuü',
}

export const HUNGARIAN_HARMONY: HarmonyConfig = {
  back: 'aáoóuú',
  front: 'eéiíöőüű',
  rounded: 'oóöőuúüű',
  low: ['a', 'e'],
  high: ['o', 'e', 'o', 'ö'],
  mid: ['o', 'e', 'ö'],
  voiceless: 'fstkcpszh',
  vowels: 'aáeéiíoóöőuúüű',
}

export const FINNISH_HARMONY: HarmonyConfig = {
  back: 'aou',
  front: 'äöy',
  rounded: 'ouöy',
  low: ['a', 'ä'],
  high: ['a', 'ä'],
  voiceless: 'ktps',
  vowels: 'aeiouyäö',
}

/** The last vowel of a word, which decides the harmony of everything after it. */
function lastVowel(stem: string, config: HarmonyConfig): string | undefined {
  for (let index = stem.length - 1; index >= 0; index -= 1) {
    const letter = stem[index].toLowerCase()
    if (config.vowels.includes(letter)) return letter
  }
  return undefined
}

/** True where the stem's harmony is front. A stem with no vowel counts as back. */
function isFront(stem: string, config: HarmonyConfig): boolean {
  const vowel = lastVowel(stem, config)
  return vowel !== undefined && config.front.includes(vowel)
}

function isRounded(stem: string, config: HarmonyConfig): boolean {
  const vowel = lastVowel(stem, config)
  return vowel !== undefined && config.rounded.includes(vowel)
}

/**
 * Turkish softens a final k, t, p or ç before a vowel: "kitap" → "kitabı",
 * "ekmek" → "ekmeği". It is the mirror of the D rule and just as regular.
 */
const SOFTENING: Record<string, string> = { p: 'b', t: 'd', k: 'ğ', ç: 'c' }

export interface SuffixOptions {
  /**
   * Soften a final stop before a vowel-initial suffix (Turkish). `true` applies
   * the noun rule, which spares monosyllables — "top" → "topu" but "kitap" →
   * "kitabı". `'always'` is for verb stems, which soften whatever their length:
   * "git" → "gidiyorum".
   */
  soften?: boolean | 'always'
}

/**
 * Applies one suffix template to a stem.
 *
 * The template is consumed left to right. Anything that is not a placeholder is
 * written as it stands, so `lArIn` is three suffixes stacked in one string and
 * behaves identically to applying `lAr` and then `In`.
 */
export function applySuffix(
  stem: string,
  template: string,
  config: HarmonyConfig,
  options: SuffixOptions = {},
): string {
  const front = isFront(stem, config)
  const rounded = isRounded(stem, config)
  const endsWithVowel = config.vowels.includes(stem[stem.length - 1]?.toLowerCase() ?? '')
  const finalLetter = stem[stem.length - 1]?.toLowerCase() ?? ''

  let out = ''
  let index = 0
  /** True once the suffix has written a letter, so buffers know their place. */
  let first = true

  while (index < template.length) {
    const char = template[index]

    // A parenthesised element is conditional on what the stem ends with.
    if (char === '(') {
      const close = template.indexOf(')', index)
      const inner = template.slice(index + 1, close)
      index = close + 1
      const needsBuffer = first ? endsWithVowel : false
      if (inner === 'I') {
        // A linking vowel, written only after a consonant.
        if (!(first ? endsWithVowel : true)) {
          out += resolveHigh(front, rounded, config)
        }
      } else if (needsBuffer) {
        out += inner
      }
      first = false
      continue
    }

    if (char === 'A') out += front ? config.low[1] : config.low[0]
    else if (char === 'I') out += resolveHigh(front, rounded, config)
    else if (char === 'O') {
      const mid = config.mid ?? config.low as unknown as [string, string, string]
      out += front ? (rounded ? mid[2] : mid[1]) : mid[0]
    } else if (char === 'D') out += config.voiceless.includes(finalLetter) && first ? 't' : 'd'
    else if (char === 'C') out += config.voiceless.includes(finalLetter) && first ? 'ç' : 'c'
    else out += char

    first = false
    index += 1
  }

  // Soften the stem where the suffix begins with a vowel — but only in a
  // polysyllabic word. "kitap" becomes "kitabı" and "ekmek" becomes "ekmeği",
  // while the monosyllables keep their stop: "top" → "topu", "park" → "parka".
  let base = stem
  const polysyllabic = [...stem.toLowerCase()].filter((letter) => config.vowels.includes(letter)).length > 1
  if (
    options.soften
    && (polysyllabic || options.soften === 'always')
    && SOFTENING[finalLetter]
    && config.vowels.includes(out[0]?.toLowerCase() ?? '')
  ) {
    base = `${stem.slice(0, -1)}${SOFTENING[finalLetter]}`
  }
  return `${base}${out}`
}

function resolveHigh(front: boolean, rounded: boolean, config: HarmonyConfig): string {
  const [backUnrounded, frontUnrounded, backRounded, frontRounded] = config.high
  if (rounded && backRounded && frontRounded) return front ? frontRounded : backRounded
  return front ? frontUnrounded : backUnrounded
}

/**
 * Applies a stack of templates in order. `stack(stem, ['lAr', '(y)I'])` is the
 * plural accusative, and each step sees the output of the one before it — which
 * is what makes harmony spread the way it does in a real word.
 */
export function stack(
  stem: string,
  templates: readonly string[],
  config: HarmonyConfig,
  options: SuffixOptions = {},
): string {
  return templates.reduce((current, template) => applySuffix(current, template, config, options), stem)
}
