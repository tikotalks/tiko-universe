import type { Features, SelectedWord } from '../features'
import type { Word } from '../chunk'
import { formFor, note, type LanguageRules } from '../profile'

/**
 * Estonian. Finnish's closest relative, and the comparison is the interesting
 * part: it kept the partitive and the case system, and lost the vowel harmony
 * that the whole Finnish implementation is built on. So Estonian needs no harmony
 * config at all — its suffixes are invariant — and what it does need is curated
 * stems, because Estonian nominatives hide even more than Finnish ones ("vesi" →
 * "vett", "käsi" → "kätt").
 *
 * The other difference is the negation. Finnish conjugates its negative verb;
 * Estonian has a single invariant "ei" for every person, followed by the same bare
 * stem: "ma ei taha", "me ei taha". One word does what six do next door.
 *
 * Marked `beta`: the partitive and the genitive are curated where the stem changes
 * and generated where it does not; the three-way length gradation Estonian is
 * famous for is not modelled at all, and it is not visible in writing for most
 * words. Vocabulary was generated against the shared concept ids. Both need review
 * by an Estonian speaker.
 */
const COPULA: Record<string, string> = {
  '1sg': 'olen', '2sg': 'oled', '3sg': 'on', '1pl': 'oleme', '2pl': 'olete', '3pl': 'on',
}

/**
 * The partitive, where a rule is safe: a vowel-final stem takes -t and everything
 * else is curated, because Estonian consonant stems are not predictable.
 */
function partitive(text: string, features: Features): string {
  const curated = features.cases?.par
  if (curated) return curated
  const words = text.split(' ')
  const word = words[words.length - 1]
  if (/[aeiouõäöü]$/i.test(word)) words[words.length - 1] = `${word}t`
  return words.join(' ')
}

/** The genitive, which is also the total object: "näen sõbra". */
function genitive(text: string, features: Features): string {
  const curated = features.cases?.gen
  if (curated) return curated
  const words = text.split(' ')
  const word = words[words.length - 1]
  // A consonant stem adds -i, a vowel stem is unchanged in the genitive.
  words[words.length - 1] = /[aeiouõäöü]$/i.test(word) ? word : `${word}i`
  return words.join(' ')
}

/** The case suffix a preposition tile stands for. */
function caseSuffix(preposition: Word | undefined): string | null {
  switch (preposition?.text) {
    case 'sees': return 's'      // inessive: "aias"
    case 'peal': return 'l'      // adessive: "laual"
    case 'juurde': return 'sse'  // illative: "pargisse", "koolisse"
    default: return null
  }
}

export const estonian: LanguageRules = {
  profile: {
    language: 'et',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['ei', 'olen', 'oled', 'on', 'oleme', 'olete', 'ole'],
    notes: 'The partitive and genitive are curated where the stem changes and generated where it does not; the three-way length gradation is not modelled. The past tense and the possessive forms are not generated. Vocabulary was generated against the shared concept ids and needs review by an Estonian speaker.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos !== 'noun') return {}
    // The plural is -d on the genitive stem, safe for the vowel stems.
    return /[aeiouõäöü]$/i.test(word.text) ? { plural: `${word.text}d` } : {}
  },

  verbForm(verb, ctx) {
    if (ctx.negated) {
      // The bare stem follows "ei", whatever the person.
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
    if (ctx.person === 1 && ctx.number === 'sg') return verb.text
    note(ctx.builder, `no ${ctx.person}${ctx.number} form for "${verb.text}" — needs curation`)
    return verb.text
  },

  copula(ctx) {
    if (ctx.negated) return null
    return COPULA[`${ctx.person}${ctx.number}`] ?? 'on'
  },

  negatedCopula(ctx) {
    // "ma ei ole", the same "ei" as every other verb.
    void ctx
    return 'ei ole'
  },

  preposition(word, ctx) {
    if (caseSuffix(word)) {
      note(ctx.builder, `"${word.text}" is a case ending on the noun, not a word`)
      return null
    }
    return word.text
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) return null
    const kind = determiner.features.determinerKind
    if (kind === 'definite' || kind === 'indefinite') {
      note(ctx.builder, 'no article: Estonian has none')
      return null
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective, np, ctx) {
    if (ctx.role === 'predicate' && (ctx.number === 'pl' || ctx.subjectPlural === true)) {
      const form = adjective.features.pluralForm
      if (form) return form
      note(ctx.builder, `no plural predicate form for "${adjective.text}" — needs curation`)
      return adjective.text
    }
    // An attributive adjective agrees in case with its noun.
    if (ctx.role === 'object' && np.head) {
      return ctx.verb?.features.objectCase === 'total'
        ? genitive(adjective.text, adjective.features)
        : partitive(adjective.text, adjective.features)
    }
    return adjective.text
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const absorbed = determiner
      && (determiner.features.determinerKind === 'definite'
        || determiner.features.determinerKind === 'indefinite')
      ? [determiner.id]
      : undefined

    const suffix = caseSuffix(ctx.preposition)
    if (suffix) {
      // The ending goes on the genitive stem: "aed" → "aias" is curated, "kooli"
      // is the stem plus nothing.
      const stem = genitive(head.text, head.features)
      const text = `${stem}${suffix}`
      note(ctx.builder, `"${text}": a case ending`)
      return { text, merged: absorbed }
    }

    if (determiner?.features.forcesNumber === 'pl') {
      if (determiner.features.smallNumber) {
        const counted = partitive(head.text, head.features)
        note(ctx.builder, `"${counted}": a numeral takes the partitive singular`)
        return { text: counted, merged: absorbed }
      }
      return { text: head.features.plural ?? head.text, merged: absorbed }
    }

    if (ctx.role === 'object') {
      const total = ctx.verb?.features.objectCase === 'total'
      const text = total ? genitive(head.text, head.features) : partitive(head.text, head.features)
      note(ctx.builder, total
        ? `"${text}": a total object, because the action completes`
        : `"${text}": the partitive`)
      return { text, merged: absorbed }
    }
    return { text: head.text, merged: absorbed }
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    // One invariant word, in front of the verb, for every person.
    return { kind: 'beforeVerb', word: 'ei' }
  },
}
