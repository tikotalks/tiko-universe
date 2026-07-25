import type { Features, SelectedWord } from '../features'
import type { Word } from '../chunk'
import { applySuffix, FINNISH_HARMONY } from '../morphology/agglutinative'
import { formFor, note, type LanguageRules } from '../profile'

/**
 * Finnish. Agglutinative, with two-way harmony and two features that have no
 * counterpart anywhere else in this package:
 *
 * **The partitive.** "Haluan omenaa" is what a child says when they want an apple.
 * It is not the accusative and not the genitive: it marks an incomplete or
 * unbounded object, which is what wanting something is. Every other language here
 * makes "want" take a plain object; Finnish makes the *case* carry the meaning.
 *
 * **The negative verb.** Finnish does not have a negative word — it has a negative
 * *verb* that conjugates, followed by the main verb stripped back to its stem:
 * "haluan" (I want) becomes "en halua" (I not-want), "haluamme" becomes "emme
 * halua". The person moves off the main verb and onto the negation.
 *
 * The rest is familiar by now: no articles, no gender, relations as case suffixes
 * ("puistossa", "koululle"), and a copula that is a real verb ("olen iloinen").
 *
 * Marked `beta`: the partitive and the genitive are generated where the rule is
 * safe and curated where consonant gradation or a stem change makes it not
 * ("vesi" → "vettä"). Gradation itself is not modelled. The vocabulary was
 * generated against the shared concept ids. Both need review by a Finnish speaker.
 */

/** The negative verb, which carries the person the main verb has given up. */
const NEGATIVE: Record<string, string> = {
  '1sg': 'en', '2sg': 'et', '3sg': 'ei', '1pl': 'emme', '2pl': 'ette', '3pl': 'eivät',
}

const COPULA: Record<string, string> = {
  '1sg': 'olen', '2sg': 'olet', '3sg': 'on', '1pl': 'olemme', '2pl': 'olette', '3pl': 'ovat',
}

const COPULA_NEGATIVE: Record<string, string> = {
  '1sg': 'en ole', '2sg': 'et ole', '3sg': 'ei ole', '1pl': 'emme ole', '2pl': 'ette ole', '3pl': 'eivät ole',
}

/**
 * The partitive. A vowel-final stem doubles its vowel ("omena" → "omenaa"), and a
 * consonant-final one takes -ta/-tä. The irregular stems are curated, because
 * Finnish stem changes are not recoverable from the nominative: "vesi" → "vettä".
 */
function partitive(text: string, features: Features): string {
  const curated = features.cases?.par
  if (curated) return curated
  const words = text.split(' ')
  const word = words[words.length - 1]
  const final = word[word.length - 1]?.toLowerCase() ?? ''
  let form: string
  if (FINNISH_HARMONY.vowels.includes(final)) {
    // A long final vowel or a diphthong takes -ta instead of doubling.
    form = /([aeiouyäö])\1$/i.test(word) ? applySuffix(word, 'tA', FINNISH_HARMONY) : `${word}${final}`
  } else {
    form = applySuffix(word, 'tA', FINNISH_HARMONY)
  }
  words[words.length - 1] = form
  return words.join(' ')
}

/**
 * The **total object**, in the genitive form: Finnish distinguishes an action that
 * completes from one that does not, and the case carries it — "näen kaverin" (I
 * see the friend) against "haluan omenaa" (I want an apple). Which one a verb
 * takes is lexical, so it is curated.
 */
function totalObject(text: string, features: Features): string {
  const curated = features.cases?.gen
  if (curated) return curated
  const words = text.split(' ')
  words[words.length - 1] = `${words[words.length - 1]}n`
  return words.join(' ')
}

/** The case suffix a preposition tile stands for. */
function caseSuffix(preposition: Word | undefined): string | null {
  switch (preposition?.text) {
    case 'ssa': return 'ssA'   // inessive: "puistossa"
    case 'lla': return 'llA'   // adessive: "pöydällä"
    case 'lle': return 'lle'   // allative: "koululle" — no harmony here
    case 'sta': return 'stA'   // elative: "koulusta"
    default: return null
  }
}

export const finnish: LanguageRules = {
  profile: {
    language: 'fi',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['en', 'et', 'ei', 'emme', 'ette', 'eivät', 'olen', 'olet', 'on', 'olemme', 'olette', 'ovat', 'ole'],
    notes: 'The partitive and the genitive are generated where the rule is safe and curated where a stem change makes it not; consonant gradation is not modelled. The past tense and the possessive suffixes are not generated. Vocabulary was generated against the shared concept ids and needs review by a Finnish speaker.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos !== 'noun') return {}
    // Finnish plurals are -t on the stem, which is safe for the vowel stems.
    const plural = /[aeiouyäö]$/i.test(word.text) ? `${word.text}t` : undefined
    return plural ? { plural } : {}
  },

  verbForm(verb, ctx) {
    const key = `${ctx.person}${ctx.number}`
    if (ctx.negated) {
      // The main verb gives up its person entirely and appears as the
      // connegative — the stem the negative verb governs.
      const connegative = verb.features.stem
      if (connegative) return connegative
      note(ctx.builder, `no connegative stem for "${verb.text}" — needs curation`)
      return verb.text
    }
    if (ctx.tense === 'past') {
      const past = verb.features.forms?.past
      if (past) return past
      note(ctx.builder, 'the past tense is not generated')
    }
    const curated = formFor(verb.features.forms, ctx.person, ctx.number)
    if (curated) return curated
    if (key === '1sg') return verb.text
    note(ctx.builder, `no ${key} form for "${verb.text}" — needs curation`)
    return verb.text
  },

  copula(ctx) {
    const table = ctx.negated ? COPULA_NEGATIVE : COPULA
    return table[`${ctx.person}${ctx.number}`] ?? 'on'
  },

  negatedCopula(ctx) {
    // "en ole": the negative verb takes the person and "ole" is the connegative.
    return COPULA_NEGATIVE[`${ctx.person}${ctx.number}`] ?? null
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
    if (kind === 'definite' || kind === 'indefinite') {
      // Finnish has no articles at all; definiteness is word order and case.
      note(ctx.builder, 'no article: Finnish has none')
      return null
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective, np, ctx) {
    // A plural predicate takes the plural partitive: "Me olemme iloisia".
    if (ctx.role === 'predicate' && (ctx.number === 'pl' || ctx.subjectPlural === true)) {
      const form = adjective.features.pluralForm
      if (form) {
        note(ctx.builder, `"${form}": a plural predicate`)
        return form
      }
      note(ctx.builder, `no plural predicate form for "${adjective.text}" — needs curation`)
      return adjective.text
    }
    // An attributive adjective agrees in case with its noun.
    if (ctx.role === 'object' && np.head && !np.head.features.proper) {
      return ctx.verb?.features.objectCase === 'total'
        ? totalObject(adjective.text, adjective.features)
        : partitive(adjective.text, adjective.features)
    }
    return adjective.text
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'
    const absorbed = determiner
      && (determiner.features.determinerKind === 'definite'
        || determiner.features.determinerKind === 'indefinite')
      ? [determiner.id]
      : undefined

    const suffix = caseSuffix(ctx.preposition)
    if (suffix) {
      const text = applySuffix(head.text, suffix, FINNISH_HARMONY)
      note(ctx.builder, `"${text}": a case suffix`)
      return { text, merged: absorbed }
    }

    if (plural) {
      // A numeral takes the partitive singular: "kaksi keksiä".
      if (determiner?.features.smallNumber) {
        const counted = partitive(head.text, head.features)
        note(ctx.builder, `"${counted}": a numeral takes the partitive singular`)
        return { text: counted, merged: absorbed }
      }
      return { text: head.features.plural ?? head.text, merged: absorbed }
    }

    if (ctx.role === 'object') {
      if (ctx.verb?.features.objectCase === 'total') {
        const text = totalObject(head.text, head.features)
        note(ctx.builder, `"${text}": a total object, because the action completes`)
        return { text, merged: absorbed }
      }
      const text = partitive(head.text, head.features)
      note(ctx.builder, `"${text}": the partitive, for an object that is not wholly affected`)
      return { text, merged: absorbed }
    }
    return { text: head.text, merged: absorbed }
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    if (ctx.verb?.features.objectCase === 'dative' && word.features.dative) {
      note(ctx.builder, `"${word.features.dative}": the case this verb governs`)
      return word.features.dative
    }
    return word.features.accusative ?? word.text
  },

  negation() {
    // There is no negative particle: the negative verb takes the person, and it
    // stands where the verb does.
    return { kind: 'beforeVerb', word: '' }
  },

  transform(chunks, ctx) {
    // The negative verb is a verb, so it is emitted in the verb's place — as a
    // prefix on the connegative form, which `postprocess` cannot do because the
    // person has to be known here.
    if (ctx.negated && chunks.verb) {
      ctx.scratch.negativeVerb = NEGATIVE[`${ctx.person}${ctx.number}`] ?? 'ei'
    }
  },

  postprocess(tokens, ctx) {
    const negative = ctx.scratch.negativeVerb
    if (typeof negative !== 'string' || !ctx.verb) return tokens
    // Put the negative verb immediately before the main verb it governs.
    const index = tokens.findIndex((token) => token.from === ctx.verb?.id)
    if (index === -1) return tokens
    note(ctx.builder, `"${negative}": the negative verb carries the person`)
    return [...tokens.slice(0, index), { text: negative, from: null }, ...tokens.slice(index)]
  },
}
