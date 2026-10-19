import type { Features, SelectedWord } from '../features'
import { isPlural, note, type LanguageRules } from '../profile'

/**
 * Basque. Not related to anything else in this package — or to anything else in
 * Europe — and it does two things no other language here does:
 *
 * **It is ergative.** The subject of a transitive verb takes a case of its own:
 * "Ni pozik nago" (I am happy) but "Nik sagarra nahi dut" (I want the apple), where
 * "ni" has become "nik" because there is now an object. Every other language here
 * marks the *object*; Basque marks the subject for having one.
 *
 * **The auxiliary agrees with both.** "dut" is not "do" — it encodes a first-person
 * singular subject *and* a third-person singular object at once, and "dugu",
 * "duzu", "ditut" are the same slot filled differently. Intransitively the
 * auxiliary is a different verb entirely: "naiz", "zara", "da".
 *
 * The rest is friendlier: verb-final, no gender, and a definite article that is a
 * suffix on the last word of the phrase — "sagar" → "sagarra", "sagar handi" →
 * "sagar handia".
 *
 * Marked `beta`: the present of the two auxiliaries is generated for a third-person
 * object, which is what Talk's sentences produce; plural objects ("ditut") and the
 * dative series ("diot") are not. The vocabulary was generated against the shared
 * concept ids. Both need review by a Basque speaker.
 */

/** The transitive auxiliary, for a third-person singular object: "nahi dut". */
const TRANSITIVE: Record<string, string> = {
  '1sg': 'dut', '2sg': 'duzu', '3sg': 'du', '1pl': 'dugu', '2pl': 'duzue', '3pl': 'dute',
}

/** The intransitive auxiliary, which is a different verb: "pozik nago". */
const INTRANSITIVE: Record<string, string> = {
  '1sg': 'naiz', '2sg': 'zara', '3sg': 'da', '1pl': 'gara', '2pl': 'zarete', '3pl': 'dira',
}

/** "egon" is the copula of states, and it is the one a child needs. */
const STATE: Record<string, string> = {
  '1sg': 'nago', '2sg': 'zaude', '3sg': 'dago', '1pl': 'gaude', '2pl': 'zaudete', '3pl': 'daude',
}

/** The ergative suffix, which depends on whether the word ends in a vowel. */
function ergative(text: string): string {
  return /[aeiou]$/i.test(text) ? `${text}k` : `${text}ek`
}

/**
 * The definite article is a suffix, and a single r between vowels doubles before
 * it: "sagar" → "sagarra".
 */
function definite(text: string, features?: Features): string {
  // Curated first: whether a final r doubles is lexical, so "ur" becomes "ura"
  // where "sagar" becomes "sagarra".
  if (features?.definiteForm) return features.definiteForm
  if (/[aeiou]$/i.test(text)) return `${text}a`
  if (/[aeiou]r$/i.test(text)) return `${text}ra`
  return `${text}a`
}

/** The case suffixes that stand in for prepositions. */
function caseSuffix(preposition: { text: string } | undefined): string | null {
  switch (preposition?.text) {
    case 'ra': return 'ra'   // allative: "parkera"
    case 'n': return 'an'    // inessive: "lorategian"
    case 'tik': return 'tik' // ablative
    case 'rekin': return 'ekin'
    default: return null
  }
}

/**
 * The auxiliary for a first- or second-person *object*, which is a different
 * series entirely: "nauzu" is "you (do something to) me".
 */
const OBJECT_SERIES: Record<string, string> = {
  '1sg-2sg': 'nauzu', '1sg-3sg': 'nau', '1sg-3pl': 'naute',
  '2sg-1sg': 'zaitut', '2sg-3sg': 'zaitu', '2sg-1pl': 'zaitugu',
  '1pl-2sg': 'gaituzu', '1pl-3sg': 'gaitu',
}

export const basque: LanguageRules = {
  profile: {
    language: 'eu',
    maturity: 'beta',
    wordOrder: 'sov',
    questionStrategy: 'intonation',
    questionWordPosition: 'preverbal',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: [
      'bat', 'ez',
      'dut', 'duzu', 'du', 'dugu', 'duzue', 'dute',
      'naiz', 'zara', 'da', 'gara', 'zarete', 'dira',
      'nago', 'zaude', 'dago', 'gaude', 'zaudete', 'daude',
    ],
    notes: 'The present of both auxiliaries is generated for a third-person singular object, which is what Talk\'s sentences produce; plural objects ("ditut") and the dative series ("diot") are not. Vocabulary was generated against the shared concept ids and needs review by a Basque speaker.',
  },

  induce(word: SelectedWord): Features {
    // No gender and no declension classes: the suffixes are the same for every
    // noun, which is what makes the rules cover all 295 tiles.
    if (word.pos === 'noun') return { plural: `${word.text}ak` }
    return {}
  },

  verbForm(verb, ctx) {
    // The verb itself is invariant; the auxiliary after it carries everything.
    const transitive = ctx.scratch.hasObject === true
    const objectKey = ctx.scratch.objectPerson
    if (transitive && typeof objectKey === 'string') {
      const form = OBJECT_SERIES[`${objectKey}-${ctx.person}${ctx.number}`]
      if (form) {
        note(ctx.builder, `"${form}": the auxiliary for a ${objectKey} object`)
        return `${verb.text} ${form}`
      }
      note(ctx.builder, `no auxiliary for a ${objectKey} object with a ${ctx.person}${ctx.number} subject — needs curation`)
    }
    const auxiliary = transitive
      ? TRANSITIVE[`${ctx.person}${ctx.number}`]
      : INTRANSITIVE[`${ctx.person}${ctx.number}`]
    note(ctx.builder, transitive
      ? `"${auxiliary}": the auxiliary agrees with subject and object at once`
      : `"${auxiliary}": the intransitive auxiliary`)
    return `${verb.text} ${auxiliary ?? 'du'}`
  },

  copula(ctx) {
    // Basque splits its copulas the way Spanish does: "izan" for what something
    // *is* ("sagarra handia da") and "egon" for how it *feels* ("pozik nago").
    if (ctx.predicate?.features.inherent) {
      const form = INTRANSITIVE[`${ctx.person}${ctx.number}`] ?? 'da'
      note(ctx.builder, `"${form}": "izan", for an inherent quality`)
      return form
    }
    const form = STATE[`${ctx.person}${ctx.number}`] ?? 'dago'
    note(ctx.builder, `"${form}": "egon", the copula of states`)
    return form
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) return null
    const kind = determiner.features.determinerKind
    if (kind === 'definite') {
      // Definiteness is a suffix on the last word of the phrase, so nothing is
      // written here.
      note(ctx.builder, 'the article is a suffix on the end of the phrase')
      return null
    }
    if (kind === 'indefinite') {
      // "bat" follows its noun: "sagar bat".
      note(ctx.builder, '"bat" follows the noun it counts')
      return null
    }
    if (determiner.features.pronounCase === 'poss') {
      return { text: determiner.text, from: determiner.id }
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjectivePosition: 'after',

  postposed(np, ctx) {
    // "bat" closes the phrase, after the adjective: "sagar handi bat".
    const kind = np.determiner?.features.determinerKind
    const head = np.head
    if (!head || ctx.role === 'subject') return null
    const countable = !head.features.mass && !head.features.proper
    if (kind === 'indefinite') return { text: 'bat', from: np.determiner?.id ?? null }
    // "bat" is the numeral "one", so a lexically plural noun never takes it.
    if (!kind && countable && !isPlural(np) && np.determiner === undefined) {
      note(ctx.builder, '"bat": a countable noun needs an article, and it comes last')
      return { text: 'bat', from: null }
    }
    return null
  },

  adjective(adjective, np, ctx) {
    // A quality predicate takes the article: "sagarra handia da".
    if (ctx.role === 'predicate' && adjective.features.inherent) {
      const form = definite(adjective.text)
      note(ctx.builder, `"${form}": a quality predicate takes the article`)
      return form
    }
    // The article attaches to the adjective when there is one, because it is the
    // last word of the phrase: "sagar handia".
    const definiteHere = np.determiner?.features.determinerKind === 'definite'
    if (definiteHere) {
      const form = definite(adjective.text)
      note(ctx.builder, `"${form}": the article lands on the adjective, last in the phrase`)
      return ctx.role === 'subject' && ctx.scratch.hasObject === true ? ergative(form) : form
    }
    return adjective.text
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const kind = determiner?.features.determinerKind
    // Basque counts with a singular noun: "bi gaileta", not "bi gailetak".
    const counted = kind === 'quantifier'
    const plural = determiner?.features.forcesNumber === 'pl' && !counted
    const hasAdjective = np.adjectives.length > 0

    let text = head.text
    if (plural) {
      text = head.features.plural ?? `${head.text}ak`
    } else if (kind === 'definite' && !hasAdjective) {
      text = definite(text, head.features)
      note(ctx.builder, `"${text}": the definite article, written on the noun`)
    }

    // The subject of a transitive clause is ergative: "Nik sagarra nahi dut".
    if (ctx.role === 'subject' && ctx.scratch.hasObject === true) {
      const form = ergative(text)
      note(ctx.builder, `"${form}": the ergative, because the clause has an object`)
      text = form
    }

    // A preposition tile is a case suffix here: "parkera", "lorategian".
    const suffix = caseSuffix(ctx.preposition)
    if (suffix) {
      // The suffix goes on the definite stem, which is where Basque puts it.
      const stem = kind === 'definite' || !head.features.mass
        ? definite(head.text, head.features)
        : head.text
      const withCase = suffix === 'an'
        ? `${stem.replace(/a$/, '')}an`
        : `${stem.replace(/a$/, '')}${suffix}`
      note(ctx.builder, `"${withCase}": a case suffix`)
      return { text: withCase, merged: [...(determiner ? [determiner.id] : []), ctx.preposition!.id] }
    }

    // A mass noun takes the article too: "ura nahi dut", not "ur nahi dut".
    if (!kind && !plural && head.features.mass && ctx.role !== 'subject') {
      text = definite(text, head.features)
      note(ctx.builder, `"${text}": a mass noun still takes the article`)
    }

    const absorbed = kind === 'definite' || kind === 'indefinite' ? [determiner!.id] : undefined
    return { text, merged: absorbed }
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') {
      if (ctx.scratch.hasObject === true) {
        const form = ergative(word.text)
        note(ctx.builder, `"${form}": the ergative subject`)
        return form
      }
      return word.text
    }
    return word.features.accusative ?? word.text
  },

  preposition(word, ctx) {
    if (caseSuffix(word)) {
      note(ctx.builder, `"${word.text}" is a case suffix on the noun, not a word`)
      return null
    }
    return word.text
  },

  negation() {
    // The negation moves the auxiliary: "ez dut sagarra nahi". `postprocess` does
    // the moving, because it has the finished tokens to move.
    return { kind: 'none' }
  },

  postprocess(tokens, ctx) {
    if (!ctx.negated) return tokens
    // "Nik ez dut sagarra nahi": "ez" and the auxiliary jump to the front of the
    // clause, leaving the verb at the end.
    const index = tokens.findIndex((token) => token.from === ctx.verb?.id)
    const verbToken = index === -1 ? undefined : tokens[index]
    if (!verbToken) {
      // "Ni ez nago pozik": the negation pulls the copula in front of the
      // predicate it was following.
      const copulaAt = tokens.findIndex((token) => token.from === null
        && Object.values(STATE).includes(token.text))
      const stateCopula = copulaAt === -1
        ? tokens.findIndex((token) => token.from === null && Object.values(INTRANSITIVE).includes(token.text))
        : copulaAt
      if (stateCopula === -1) {
        const first = tokens.length > 1 ? 1 : 0
        note(ctx.builder, '"ez": the negation precedes the predicate')
        return [...tokens.slice(0, first), { text: 'ez', from: null }, ...tokens.slice(first)]
      }
      const copula = tokens[stateCopula]
      const rest = tokens.filter((_, at) => at !== stateCopula)
      note(ctx.builder, `"ez ${copula.text}": the negation pulls the copula forward`)
      return [rest[0], { text: 'ez', from: null }, copula, ...rest.slice(1)]
    }
    const parts = verbToken.text.split(' ')
    const auxiliary = parts.pop() ?? ''
    const verb = parts.join(' ')
    const rest = tokens.filter((_, at) => at !== index)
    // The subject, then "ez" and the auxiliary, then everything else, then the verb.
    const after = ctx.scratch.hasObject === true || rest.length > 1 ? 1 : 0
    note(ctx.builder, `"ez ${auxiliary}": the negation pulls the auxiliary forward`)
    return [
      ...rest.slice(0, after),
      { text: 'ez', from: null },
      { text: auxiliary, from: null },
      ...rest.slice(after),
      { text: verb, from: verbToken.from, merged: verbToken.merged },
    ]
  },

  transform(chunks, ctx) {
    // Whether the clause has an object decides the case of the subject *and* which
    // auxiliary appears, so it is settled before anything is written.
    const objects = chunks.complements.filter(
      (phrase) => phrase.kind === 'np' && (!!phrase.head || !!phrase.pronoun),
    )
    // A question word is an object as much as a noun is: "Zuk zer nahi duzu?"
    const questionIsObject = chunks.question !== undefined
      && ['what', 'which', 'who'].includes(chunks.question.id)
    ctx.scratch.hasObject = objects.length > 0 || questionIsObject

    // A first- or second-person object needs its own auxiliary series.
    const pronounObject = objects.find((phrase) => phrase.kind === 'np' && phrase.pronoun)
    const pronoun = pronounObject?.kind === 'np' ? pronounObject.pronoun : undefined
    if (pronoun && pronoun.features.person !== 3) {
      ctx.scratch.objectPerson = `${pronoun.features.person ?? 1}${pronoun.features.number ?? 'sg'}`
    }
  },
}
