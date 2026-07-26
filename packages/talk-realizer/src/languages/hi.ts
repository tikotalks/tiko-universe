import type { Features, SelectedWord } from '../features'
import { formFor, note, type LanguageRules, type SentenceContext } from '../profile'

/**
 * Hindi. The language that forced this package to admit it does not know who is
 * talking.
 *
 * **The verb agrees with the speaker's own gender.** A boy says "मैं सेब चाहता हूँ";
 * a girl says "मैं सेब चाहती हूँ". Not the subject's grammatical gender — the actual
 * gender of the person speaking, on every first-person sentence, which is most of
 * what an AAC app produces. Nothing else in this package needs that, because nothing
 * else here has it: French agrees with a noun, Russian with a subject, Hindi with
 * the child holding the tablet.
 *
 * Tiko does not record a child's gender. So `speakerGender` defaults to masculine
 * and **every sentence that depended on it says so in its notes**. That is a
 * placeholder for a product decision, not a solution: until the profile carries the
 * child's gender, Hindi is wrong for half the children who use it, and the notes are
 * how that stays visible instead of quietly shipping.
 *
 * The rest:
 *
 * - **Verb-final**, with postpositions: "बगीचे में", "पार्क को".
 * - **No articles**; "एक" is the numeral one doing an indefinite article's work.
 * - **Nouns have gender**, and adjectives in -ा agree: "बड़ा सेब" but "बड़ी किताब".
 *   Which gender a noun has is not derivable, so it is curated.
 * - **The oblique case before a postposition**: "बगीचा" becomes "बगीचे में".
 * - **Negation is "नहीं" before the verb.**
 * - **A person as an object takes "को"**: "दोस्त को देखता हूँ".
 *
 * Marked `beta`: the present tense is generated, the past is not (it would also need
 * the ergative "ने"), and the vocabulary was generated against the shared concept
 * ids. Both need review by a Hindi speaker. Urdu is the same grammar in a different
 * script and would reuse this file.
 */

/** The auxiliary "to be", which follows the participle. */
const AUXILIARY: Record<string, string> = {
  '1sg': 'हूँ', '2sg': 'हो', '3sg': 'है', '1pl': 'हैं', '2pl': 'हो', '3pl': 'हैं',
}

/** The participle ending, by the gender it agrees with and the number. */
function participle(stem: string, feminine: boolean, plural: boolean): string {
  if (feminine) return `${stem}ती`
  return plural ? `${stem}ते` : `${stem}ता`
}

/** Adjectives ending in -ा agree; everything else is invariable. */
function agree(text: string, feminine: boolean, oblique: boolean): string {
  if (!text.endsWith('ा')) return text
  const stem = text.slice(0, -1)
  if (feminine) return `${stem}ी`
  return oblique ? `${stem}े` : text
}

/** The oblique form a postposition demands: "बगीचा" → "बगीचे". */
function oblique(text: string, feminine: boolean): string {
  if (feminine) return text
  return text.endsWith('ा') ? `${text.slice(0, -1)}े` : text
}

export const hindi: LanguageRules = {
  profile: {
    language: 'hi',
    maturity: 'beta',
    wordOrder: 'sov',
    questionStrategy: 'intonation',
    questionWordPosition: 'preverbal',
    spacing: 'space',
    prepositionPosition: 'after',
    capitalize: false,
    punctuation: { statement: '।', question: '?' },
    functionWords: ['एक', 'नहीं', 'हूँ', 'हो', 'है', 'हैं', 'को', 'में', 'पर', 'से'],
    notes: 'The verb agrees with the SPEAKER\'s gender, which Tiko does not record: speakerGender defaults to masculine and every sentence that used the default says so. Until the child profile carries gender, Hindi is wrong for half its users. The present tense is generated; the past would also need the ergative "ने". Vocabulary was generated against the shared concept ids and needs review by a Hindi speaker.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos !== 'noun') return {}
    // A noun in -ी is usually feminine and one in -ा usually masculine; the rest is
    // curated, because Hindi gender is not recoverable from the ending alone.
    if (word.text.endsWith('ी')) return { gender: 'feminine' }
    if (word.text.endsWith('ा')) return { gender: 'masculine' }
    return {}
  },

  verbForm(verb, ctx) {
    const key = `${ctx.person}${ctx.number}`
    const curated = formFor(verb.features.forms, ctx.person, ctx.number)
    if (curated) return curated

    // Whose gender the participle agrees with: the speaker, in the first person,
    // and the subject otherwise.
    const feminine = ctx.person === 1
      ? ctx.speakerGender === 'feminine'
      : ctx.subjectGender === 'feminine'
    if (ctx.person === 1 && ctx.speakerGenderAssumed) {
      note(
        ctx.builder,
        'the verb agrees with the speaker\'s gender, which is not recorded: '
        + 'masculine assumed, and this sentence is wrong for a girl',
      )
    }
    const auxiliary = AUXILIARY[key] ?? 'है'
    // "तुम" is grammatically plural even for one child, so it takes the plural
    // participle: "तुम चाहते हो", never "तुम चाहता हो".
    const grammaticallyPlural = ctx.number === 'pl' || (ctx.person === 2 && ctx.number === 'sg')
    const form = `${participle(verb.text, feminine, grammaticallyPlural && !feminine)} ${auxiliary}`
    note(ctx.builder, `"${form}": participle plus auxiliary, agreeing ${feminine ? 'feminine' : 'masculine'}`)
    return form
  },

  copula(ctx) {
    return AUXILIARY[`${ctx.person}${ctx.number}`] ?? 'है'
  },

  preposition(word, ctx) {
    // "को" marks a person or a definite object, not a destination: Hindi says
    // "पार्क जाता हूँ" with no postposition at all.
    if (word.text === 'को' && ctx.scratch.destination === true) {
      note(ctx.builder, '"को" is not used for a place: the bare noun is the destination')
      return null
    }
    return word.text
  },

  transform(chunks, ctx) {
    // Whether "को" is marking a destination rather than a person has to be settled
    // before the postposition is written.
    ctx.scratch.destination = chunks.complements.some((phrase) => (
      phrase.kind === 'pp'
      && phrase.preposition.text === 'को'
      && phrase.object?.kind === 'np'
      && phrase.object.head?.features.animate !== true
    ))
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) return null
    const kind = determiner.features.determinerKind
    if (kind === 'definite') {
      // Hindi has no definite article: word order and the object marker do it.
      note(ctx.builder, 'no definite article: Hindi has none')
      return null
    }
    if (kind === 'indefinite') return { text: 'एक', from: determiner.id }
    if (determiner.features.pronounCase === 'poss') {
      // "मेरा" agrees with what is owned: "मेरी किताब", "मेरे बगीचे में".
      const feminine = np.head?.features.gender === 'feminine'
      const obliqueHere = ctx.afterPreposition
      const form = agree(determiner.text, feminine, obliqueHere)
      return { text: form, from: determiner.id }
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective, np, ctx) {
    const feminine = ctx.role === 'predicate'
      ? (ctx.subjectGender === 'feminine'
        || (ctx.person === 1 && ctx.speakerGender === 'feminine'))
      : np.head?.features.gender === 'feminine'
    if (ctx.role === 'predicate' && ctx.person === 1 && ctx.speakerGenderAssumed
      && adjective.text.endsWith('ा')) {
      note(ctx.builder, 'the adjective agrees with the speaker\'s gender: masculine assumed')
    }
    return agree(adjective.text, feminine, ctx.afterPreposition)
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const kind = determiner?.features.determinerKind
    const counted = kind === 'quantifier'
    const plural = determiner?.features.forcesNumber === 'pl' && !counted
    const feminine = head.features.gender === 'feminine'
    const animate = head.features.animate === true

    let text = plural ? head.features.plural ?? head.text : head.text
    // A postposition puts its noun in the oblique: "बगीचे में".
    if (ctx.afterPreposition) {
      const obliqueForm = oblique(text, feminine)
      if (obliqueForm !== text) note(ctx.builder, `"${obliqueForm}": the oblique, before a postposition`)
      text = obliqueForm
    }

    const absorbed = kind === 'definite' || kind === 'indefinite'
      ? [determiner!.id]
      : undefined

    // A person as an object takes "को", which also marks a definite object.
    if (animate && ctx.role === 'object') {
      note(ctx.builder, `"${text} को": an object that is a person takes "को"`)
      return { text: `${text} को`, merged: absorbed }
    }
    return { text, merged: absorbed }
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation(ctx: SentenceContext) {
    void ctx
    return { kind: 'beforeVerb', word: 'नहीं' }
  },
}
