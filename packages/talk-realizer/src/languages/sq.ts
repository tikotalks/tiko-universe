import type { Features, SelectedWord } from '../features'
import { extractObjectClitic } from '../morphology/clitic'
import { applyExperiencer } from '../morphology/romance'
import { derivePerson, type Conjugation, type PersonKey } from '../morphology/persons'
import { agreesWith, formFor, note, type LanguageRules } from '../profile'

/**
 * Albanian. Its own branch of Indo-European, with two features this package
 * already has separately and nothing else combines quite this way:
 *
 * - **The definite article is a suffix**, as in Romanian and Swedish: "libër" →
 *   "libri", "mollë" → "molla", "park" → "parku".
 * - **Adjectives follow the noun behind a linking article** that agrees with it:
 *   "djalë i mirë" but "vajzë e mirë". The pack stores adjectives with their
 *   masculine linker ("i madh"), so the feminine swaps "i" for "e" and takes the
 *   feminine form: "e madhe".
 * - **"pëlqej" inverts like Spanish "gustar"**: the experiencer becomes a clitic
 *   and the thing liked becomes the subject — "mua më pëlqen buka".
 * - **Object pronouns are preverbal clitics**: "ti më ndihmon".
 * - **Negation is "nuk" before the verb**; the standalone answer is "jo".
 *
 * Marked `beta`: Albanian gender is only partly predictable from the ending, so
 * the nouns that break the pattern are curated and the rest are induced with a
 * note. The vocabulary was generated against the shared concept ids. Both need
 * review by an Albanian speaker.
 */
const COPULA: Record<string, string> = {
  '1sg': 'jam', '2sg': 'je', '3sg': 'është', '1pl': 'jemi', '2pl': 'jeni', '3pl': 'janë',
}
const COPULA_PAST: Record<string, string> = {
  '1sg': 'isha', '2sg': 'ishe', '3sg': 'ishte', '1pl': 'ishim', '2pl': 'ishit', '3pl': 'ishin',
}

/**
 * The definite accusative adds -n to the definite form: "molla" → "mollën",
 * "libri" → "librin". It is the one case Talk's sentences need beyond the
 * nominative.
 */
function accusative(definite: string): string {
  const words = definite.split(' ')
  const word = words[words.length - 1]
  words[words.length - 1] = word.endsWith('a') ? `${word.slice(0, -1)}ën` : `${word}n`
  return words.join(' ')
}

/** The definite suffix, which depends on the gender and the final sound. */
function definiteSuffix(text: string, feminine: boolean): string {
  const words = text.split(' ')
  const word = words[words.length - 1]
  let form: string
  if (feminine) {
    if (word.endsWith('ë')) form = `${word.slice(0, -1)}a`
    else if (word.endsWith('e')) form = `${word.slice(0, -1)}ja`
    else if (/[aiouy]$/.test(word)) form = `${word}ja`
    else form = `${word}a`
  } else {
    if (/ë[rl]$/.test(word)) form = `${word.slice(0, -2)}${word.slice(-1)}i`
    else if (word.endsWith('ë')) form = `${word.slice(0, -1)}i`
    // A stem in k, g or h takes -u rather than -i: "park" → "parku".
    else if (/[kgh]$/.test(word)) form = `${word}u`
    else if (/[aeiouy]$/.test(word)) form = `${word}i`
    else form = `${word}i`
  }
  words[words.length - 1] = form
  return words.join(' ')
}

/**
 * Agrees an adjective, including the linking article the pack stores with it. In
 * the indefinite accusative the linker is "të" whatever the gender — "një mollë
 * të madhe" — while the definite keeps its own: "mollën e madhe".
 */
function agree(
  text: string,
  features: Features,
  feminine: boolean,
  plural: boolean,
  indefiniteObject: boolean,
): string {
  const linked = text.startsWith('i ')
  const stem = linked ? text.slice(2) : text
  const base = plural
    ? features.pluralForm ?? stem
    : feminine
      ? features.feminine ?? stem
      : stem
  if (!linked) return base
  // The linker agrees: "i" masculine, "e" feminine, "të" in the plural and in
  // the indefinite accusative.
  const linker = plural || indefiniteObject ? 'të' : feminine ? 'e' : 'i'
  return `${linker} ${base}`
}

/**
 * Albanian conjugation, from the first person the packs ship: the -oj class is the
 * large regular one, and -em marks the middle voice.
 */
const CONJUGATION: Conjugation = {
  rules: [
    { when: 'oj', forms: { '2sg': 'on', '3sg': 'on', '1pl': 'ojmë', '2pl': 'oni', '3pl': 'ojnë' } },
    { when: 'aj', forms: { '2sg': 'an', '3sg': 'an', '1pl': 'ajmë', '2pl': 'ani', '3pl': 'ajnë' } },
    { when: 'ej', forms: { '2sg': 'en', '3sg': 'en', '1pl': 'ejmë', '2pl': 'eni', '3pl': 'ejnë' } },
    { when: 'em', forms: { '2sg': 'esh', '3sg': 'et', '1pl': 'emi', '2pl': 'eni', '3pl': 'en' } },
    { when: 'ë', forms: { '2sg': 'ësh', '3sg': 'ë', '1pl': 'ëmë', '2pl': 'ëni', '3pl': 'ën' } },
  ],
}

export const albanian: LanguageRules = {
  profile: {
    language: 'sq',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['një', 'jam', 'je', 'është', 'jemi', 'jeni', 'janë', 'isha', 'ishte', 'ishin', 'nuk', 'i', 'e'],
    notes: 'Gender is induced from the ending where it is predictable and curated where it is not. The definite plural and the ablative are not modelled. Vocabulary needs review by an Albanian speaker.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos !== 'noun') return {}
    // Most nouns in -ë are feminine; the masculine ones are curated.
    if (word.text.endsWith('ë')) return { gender: 'feminine' }
    if (/[ie]$/.test(word.text)) return { gender: 'feminine' }
    return { gender: 'masculine' }
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    if (ctx.scratch.experiencer) {
      // "më pëlqen buka": the thing liked is the subject, so the verb agrees
      // with it rather than with the child.
      const plural = ctx.scratch.experiencerPlural === true
      return forms[plural ? '3pl' : '3sg'] ?? verb.text
    }
    const curated = formFor(forms, ctx.person, ctx.number)
    if (curated) return curated
    if (ctx.person === 1 && ctx.number === 'sg') return verb.text
    const key = `${ctx.person}${ctx.number}` as PersonKey
    const derived = derivePerson(verb.text, key, CONJUGATION)
    if (derived) {
      note(ctx.builder, `"${derived.text}": conjugated from the first person`)
      return derived.text
    }
    note(ctx.builder, `no ${key} form for "${verb.text}" — needs curation`)
    return verb.text
  },

  copula(ctx) {
    return (ctx.tense === 'past' ? COPULA_PAST : COPULA)[`${ctx.person}${ctx.number}`] ?? 'është'
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (determiner.features.pronounCase === 'poss') {
        // The possessive follows the noun, which takes the definite article.
        note(ctx.builder, 'the possessive follows the noun')
        return null
      }
      if (kind === 'definite') {
        note(ctx.builder, 'the definite article is a suffix on the noun')
        return null
      }
      if (kind === 'indefinite') {
        return plural ? null : { text: 'një', from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!np.head || plural) return null
    if (np.head.features.mass || np.head.features.proper) {
      if (np.head.features.mass) note(ctx.builder, 'no article: mass noun')
      return null
    }
    return { text: 'një', from: null }
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    const { gender, plural } = agreesWith(np, ctx)
    const indefiniteObject = ctx.role === 'object'
      && np.determiner?.features.determinerKind !== 'definite'
      && np.determiner?.features.pronounCase !== 'poss'
    return agree(
      adjective.text, adjective.features, gender === 'feminine', plural, indefiniteObject,
    )
  },

  postposed(np) {
    const determiner = np.determiner
    if (determiner?.features.pronounCase === 'poss' && np.head) {
      const feminine = np.head.features.gender === 'feminine'
      const form = feminine ? (determiner.features.feminine ?? determiner.text) : determiner.text
      return { text: form, from: determiner.id }
    }
    return null
  },

  noun(head, np, ctx) {
    const feminine = head.features.gender === 'feminine'
    const possessive = np.determiner?.features.pronounCase === 'poss'
    const experiencerSubject = ctx.scratch.experiencer === true && ctx.role === 'object'
    const plural = np.determiner?.features.forcesNumber === 'pl'
    const definite = np.determiner?.features.determinerKind === 'definite'
      || possessive
      || experiencerSubject

    const base = plural
      ? head.features.plural ?? (feminine ? `${head.text.replace(/ë$/, '')}a` : `${head.text}a`)
      : head.text

    if (definite && !plural) {
      const nominative = definiteSuffix(base, feminine)
      // An object is in the accusative, which the definite form marks with -n.
      const object = ctx.role === 'object' && !experiencerSubject && !ctx.afterPreposition
      const text = object ? accusative(nominative) : nominative
      note(ctx.builder, object
        ? `"${text}": the definite article, in the accusative`
        : 'the definite article is written onto the noun')
      return { text, merged: np.determiner ? [np.determiner.id] : [] }
    }
    if (np.determiner?.features.determinerKind === 'definite' && plural) {
      // The definite plural has its own endings, which are not modelled.
      note(ctx.builder, 'the definite plural is not modelled; the noun is left indefinite')
      return { text: base, merged: [np.determiner.id] }
    }
    return base
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'nuk' }
  },

  transform(chunks, ctx) {
    ctx.scratch.experiencerPlural = chunks.complements.some(
      (phrase) => phrase.kind === 'np' && phrase.determiner?.features.forcesNumber === 'pl',
    )
    const clitics = { '1sg': 'më', '2sg': 'të', '3sg': 'i', '1pl': 'na', '2pl': 'ju', '3pl': 'u' }
    if (applyExperiencer(chunks, ctx.scratch, clitics, ctx.person, ctx.number)) {
      note(ctx.builder, 'pëlqej inverts: the experiencer becomes a clitic')
      return
    }
    extractObjectClitic(chunks, ctx.scratch)
  },
}
