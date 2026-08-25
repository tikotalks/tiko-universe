import type { Features, SelectedWord } from '../features'
import type { Word } from '../chunk'
import { applySuffix, HUNGARIAN_HARMONY } from '../morphology/agglutinative'
import { formFor, note, type LanguageRules, type SentenceContext } from '../profile'

/**
 * Hungarian. Agglutinative like Turkish, with three-way rounding harmony instead
 * of four-way, and one feature no other language in this package has:
 *
 * **The verb agrees with its object's definiteness.** "Kérek egy almát" but
 * "Kérem az almát" — same subject, same tense, different ending, because the
 * second object is definite. Hungarian has two complete present paradigms and the
 * article the child chose picks between them. Nowhere else here does a determiner
 * reach across the sentence and change the verb.
 *
 * The rest:
 *
 * - **The definite article is a word** ("a", or "az" before a vowel), unlike
 *   Turkish where definiteness lives in the case ending;
 * - **the accusative is -t**, with a linking vowel after most consonants and a
 *   lengthened final vowel after others: "almát", "kenyeret", "asztalt";
 * - **the copula follows its predicate** and vanishes in the third person:
 *   "Boldog vagyok" but "Az alma nagy";
 * - **relations are case suffixes**: "kertben", "parkhoz", so the preposition tile
 *   is written onto the noun and not as a word.
 *
 * Marked `beta`: the present tense is generated in both paradigms from curated
 * stems; the past, the conditional and the possessive declension are not. The
 * vocabulary was generated against the shared concept ids. Both need review by a
 * Hungarian speaker.
 */

/** Present indefinite endings. `A` and `O` resolve by harmony. */
const INDEFINITE: Record<string, string> = {
  '1sg': 'Ok', '2sg': 'sz', '3sg': '', '1pl': 'Onk', '2pl': 'tOk', '3pl': 'AnAk',
}

/** Present definite endings — used when the object is definite. */
const DEFINITE: Record<string, string> = {
  '1sg': 'Om', '2sg': 'Od', '3sg': 'jA', '1pl': 'jOk', '2pl': 'jAtOk', '3pl': 'jAk',
}

/** The copula, which follows the predicate and is silent in the third person. */
const COPULA: Record<string, string> = {
  '1sg': 'vagyok', '2sg': 'vagy', '3sg': '', '1pl': 'vagyunk', '2pl': 'vagytok', '3pl': '',
}

/** Sibilant-final stems take -ol/-el/-öl in the second person, not -sz. */
const SIBILANT = /(s|sz|z|dz|zs|cs)$/

/**
 * Hungarian's harmony is two-way for `A` and three-way for `O`, and the endings
 * above are written with both, so one call covers "akarok", "kérek" and "ülök".
 */
function conjugate(stem: string, key: string, definite: boolean, ikVerb = false): string {
  const table = definite ? DEFINITE : INDEFINITE
  let template = table[key]
  if (template === undefined) return stem
  if (!definite && key === '1sg' && ikVerb) {
    // The -ik verbs take the definite-looking ending even with no object:
    // "alszom", "játszom", "eszem".
    template = 'Om'
  }
  if (!definite && key === '2sg' && SIBILANT.test(stem)) {
    // "olvasol", not "olvassz".
    template = 'Ol'
  } else if (!definite && key === '2sg' && /(ít|[bcdfghjklmnprstvz]{2})$/.test(stem)) {
    // A cluster or an -ít stem needs a linking vowel: "segítesz".
    template = 'Asz'
  }
  if (definite && template.startsWith('j') && SIBILANT.test(stem)) {
    // The j assimilates into a sibilant: "olvassa", "mossa".
    template = template.slice(1)
  }
  return template ? applySuffix(stem, template, HUNGARIAN_HARMONY) : stem
}

/** Consonants after which the accusative -t needs no linking vowel. */
const BARE_T = /(l|n|r|j|s|sz|z|ny|ly|gy|y)$/

/** The accusative: "almát", "kenyeret", "asztalt", "könyvet". */
function accusative(text: string, features: Features): string {
  const curated = features.cases?.acc
  if (curated) return curated
  const words = text.split(' ')
  const word = words[words.length - 1]
  let form: string
  if (/[aeiouáéíóöőúüű]$/i.test(word)) {
    // A final a or e lengthens before the ending: "alma" → "almát".
    const lengthened = word.endsWith('a') ? `${word.slice(0, -1)}á`
      : word.endsWith('e') ? `${word.slice(0, -1)}é`
        : word
    form = `${lengthened}t`
  } else if (BARE_T.test(word)) {
    form = `${word}t`
  } else {
    form = applySuffix(word, 'Ot', HUNGARIAN_HARMONY)
  }
  words[words.length - 1] = form
  return words.join(' ')
}

/** The case suffix a preposition tile stands for. */
function caseSuffix(preposition: Word | undefined): string | null {
  const text = preposition?.text
  if (!text) return null
  switch (text) {
    case 'ban': return 'bAn'   // inessive: "kertben"
    case 'on': return 'On'     // superessive: "asztalon"
    case 'hoz': return 'hOz'   // allative: "parkhoz"
    case 'tól': return 'tÓl'
    case 'val': return 'vAl'
    default: return null
  }
}

export const hungarian: LanguageRules = {
  profile: {
    language: 'hu',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'intonation',
    questionWordPosition: 'preverbal',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['a', 'az', 'egy', 'nem', 'vagyok', 'vagy', 'vagyunk', 'vagytok'],
    notes: 'The present tense is generated in both the definite and indefinite paradigms from curated stems; the past, the conditional and the possessive declension are not. Vocabulary was generated against the shared concept ids and needs review by a Hungarian speaker.',
  },

  induce(word: SelectedWord): Features {
    // No gender, no declension classes. Hungarian plurals are -k with a linking
    // vowel, which harmony handles for every tile.
    if (word.pos === 'noun') {
      const plural = /[aeiouáéíóöőúüű]$/i.test(word.text)
        ? `${word.text}k`
        : applySuffix(word.text, 'Ok', HUNGARIAN_HARMONY)
      return { plural }
    }
    return {}
  },

  verbForm(verb, ctx) {
    const stem = verb.features.stem
    const key = `${ctx.person}${ctx.number}`
    if (!stem) {
      note(ctx.builder, `no stem for "${verb.text}" — needs curation`)
      return verb.text
    }
    if (ctx.tense === 'past') {
      const past = verb.features.forms?.past
      if (past) return past
      note(ctx.builder, 'the past tense is not generated')
    }
    // The paradigm is chosen by the object, not by the subject.
    const definite = ctx.scratch.definiteObject === true
    const curated = formFor(verb.features.forms, ctx.person, ctx.number)
    if (curated && !definite) return curated
    const form = conjugate(stem, key, definite, verb.features.ikVerb === true)
    note(ctx.builder, definite
      ? `"${form}": the definite paradigm, because the object is definite`
      : `"${form}": the indefinite paradigm`)
    return form
  },

  copula(ctx) {
    const form = COPULA[`${ctx.person}${ctx.number}`]
    if (!form) {
      note(ctx.builder, 'no copula in the third person: "Az alma nagy"')
      return null
    }
    // It follows the predicate, so `postprocess` places it.
    return null
  },

  preposition(word, ctx) {
    if (caseSuffix(word)) {
      note(ctx.builder, `"${word.text}" is a case suffix on the noun, not a word`)
      return null
    }
    return word.text
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) return null
    const kind = determiner.features.determinerKind
    if (kind === 'definite') {
      // "az" before a vowel, "a" before a consonant — the same rule as English
      // a/an, on the definite article instead.
      const next = np.adjectives[0]?.text ?? np.head?.text ?? ''
      const article = /^[aeiouáéíóöőúüű]/i.test(next) ? 'az' : 'a'
      note(ctx.builder, `"${article}": the definite article, by the next sound`)
      return { text: article, from: determiner.id }
    }
    if (kind === 'indefinite') return { text: 'egy', from: determiner.id }
    // "kettő" is the standalone two; before a noun it is "két".
    const attributive = determiner.features.attributive
    if (attributive && np.head) return { text: attributive, from: determiner.id }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective, np, ctx) {
    // Hungarian adjectives do not agree before a noun — but a *predicate* one
    // agrees in number: "Mi boldogok vagyunk".
    const plural = ctx.role === 'predicate'
      && (ctx.number === 'pl' || ctx.subjectPlural === true)
    if (plural) {
      const form = /[aeiouáéíóöőúüű]$/i.test(adjective.text)
        ? `${adjective.text}k`
        : applySuffix(adjective.text, 'Ok', HUNGARIAN_HARMONY)
      note(ctx.builder, `"${form}": a plural predicate takes -k`)
      return form
    }
    return adjective.text
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'
    // A numeral already counts, so the noun stays singular: "két alma".
    const counted = determiner?.features.determinerKind === 'quantifier'
    let text = plural && !counted ? head.features.plural ?? head.text : head.text

    const suffix = caseSuffix(ctx.preposition)
    if (suffix) {
      text = applySuffix(text, suffix, HUNGARIAN_HARMONY)
      note(ctx.builder, `"${text}": a case suffix`)
      return text
    }
    if (ctx.role === 'object') {
      text = accusative(text, head.features)
      note(ctx.builder, `"${text}": the accusative`)
    }
    return text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    if (ctx.verb?.features.objectCase === 'dative' && word.features.dative) {
      return word.features.dative
    }
    return word.features.accusative ?? word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'nem' }
  },

  transform(chunks, ctx) {
    // The verb's paradigm depends on its object, so this has to be settled before
    // the verb is realized.
    ctx.scratch.definiteObject = chunks.complements.some((phrase) => (
      phrase.kind === 'np'
      && (phrase.determiner?.features.determinerKind === 'definite'
        || phrase.determiner?.features.pronounCase === 'poss')
    ))
  },

  postprocess(tokens, ctx: SentenceContext) {
    if (!ctx.needsCopula) return tokens
    const form = COPULA[`${ctx.person}${ctx.number}`]
    if (!form) return tokens
    if (ctx.negated) {
      // "Nem vagyok boldog": negated, the copula comes before the predicate.
      const index = tokens.findIndex((token) => token.text === 'nem')
      if (index !== -1) {
        note(ctx.builder, `"${form}": negated, the copula precedes its predicate`)
        return [...tokens.slice(0, index + 1), { text: form, from: null }, ...tokens.slice(index + 1)]
      }
    }
    note(ctx.builder, `"${form}": the copula follows its predicate`)
    return [...tokens, { text: form, from: null }]
  },
}
