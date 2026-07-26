import type { Features, SelectedWord } from '../features'
import { formFor, note, type LanguageRules } from '../profile'

/**
 * Bengali. The seventh-largest language in the world, and structurally the
 * friendliest of the South Asian ones to a package like this: **no grammatical
 * gender at all.** Nothing agrees with the speaker, so nothing here needs to know
 * who is talking — which is exactly what makes Hindi and Urdu harder.
 *
 * What it does have:
 *
 * - **A suffixed definite article.** "আপেল" is an apple, "আপেলটা" is *the* apple —
 *   the same shape as Armenian and Bulgarian, reached independently.
 * - **Verb-final order**, with postpositions rather than prepositions: "বাগানে"
 *   (in the garden) is the noun plus its ending.
 * - **Negation after the verb**: "আমি চাই না" is literally "I want not".
 * - **No copula in the present.** "আমি খুশি" is a complete sentence — "I happy" —
 *   and "আছে" is for existence, not for description.
 * - **Objects that are people take -কে**: "বন্ধুকে দেখি" but "আপেল দেখি". The
 *   distinction is animacy, which the shared lexicon already records.
 *
 * The one real decision is **register**. Bengali has three second persons — তুই,
 * তুমি and আপনি — and a child talking to family uses তুমি, which is what the pack
 * ships. It is not a guess in the way a gendered verb ending would be: তুমি is the
 * form a parent and child use with each other.
 *
 * Marked `beta`: the present tense is generated, the past is not, and the
 * vocabulary was generated against the shared concept ids. Both need review by a
 * Bengali speaker.
 */

/** Present-tense endings, from the first person the pack ships. */
const PERSON: Record<string, string> = {
  '1sg': 'ি', '2sg': 'ো', '3sg': 'ে', '1pl': 'ি', '2pl': 'ো', '3pl': 'ে',
}

/**
 * The locative is an ending, not a word: "বাগানে" is "in the garden". The other
 * relations are real postpositions and follow the noun, which is what
 * `prepositionPosition: 'after'` says.
 */
function isLocative(preposition: { text: string } | undefined): boolean {
  return preposition?.text === 'এ' || preposition?.text === 'তে'
}

/**
 * Which locative ending a noun takes is decided by its last sound, not by the tile:
 * a consonant takes -ে ("পার্কে") and a vowel takes -তে ("বাড়িতে").
 */
function locative(text: string): string {
  const vowelSigns = 'aeiouআইঈউঊএঐওঔািীুূেৈোৌ'
  const final = text[text.length - 1] ?? ''
  return vowelSigns.includes(final) ? `${text}তে` : `${text}ে`
}

/** The definite suffix, which depends on whether the noun is a person. */
function definite(text: string, animate: boolean): string {
  // -টা for things, -কে for people in the object role; the plural is -গুলো.
  return animate ? `${text}` : `${text}টা`
}

export const bengali: LanguageRules = {
  profile: {
    language: 'bn',
    maturity: 'beta',
    wordOrder: 'sov',
    questionStrategy: 'intonation',
    questionWordPosition: 'preverbal',
    spacing: 'space',
    prepositionPosition: 'after',
    capitalize: false,
    punctuation: { statement: '।', question: '?' },
    functionWords: ['না', 'একটা', 'আছে', 'হয়', 'কে', 'টা', 'গুলো'],
    notes: 'The present tense is generated from the first person; the past and the perfect are not. The second person is তুমি, the form a child and a parent use with each other. Vocabulary was generated against the shared concept ids and needs review by a Bengali speaker.',
  },

  induce(word: SelectedWord): Features {
    // No gender and no declension classes — the reason this language needs so
    // little curation.
    if (word.pos === 'noun') return { plural: `${word.text}গুলো` }
    return {}
  },

  verbForm(verb, ctx) {
    const key = `${ctx.person}${ctx.number}`
    const curated = formFor(verb.features.forms, ctx.person, ctx.number)
    if (curated) return curated
    if (key === '1sg') return verb.text
    // The first person ends in -ি; the others replace that vowel sign.
    const stem = verb.text.replace(/ি$/, '')
    if (stem === verb.text) {
      note(ctx.builder, `no ${key} form for "${verb.text}" — needs curation`)
      return verb.text
    }
    const form = `${stem}${PERSON[key] ?? 'ে'}`
    note(ctx.builder, `"${form}": conjugated from the first person`)
    return form
  },

  copula(ctx) {
    // There is none in the present: "আমি খুশি" is the whole sentence.
    note(ctx.builder, 'no copula: Bengali has none in the present')
    return null
  },

  preposition(word, ctx) {
    if (isLocative(word)) {
      note(ctx.builder, `"${word.text}" is an ending on the noun, not a word`)
      return null
    }
    return word.text
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) return null
    const kind = determiner.features.determinerKind
    if (kind === 'definite') {
      note(ctx.builder, 'the definite article is a suffix on the noun')
      return null
    }
    if (kind === 'indefinite') return { text: 'একটা', from: determiner.id }
    if (determiner.features.pronounCase === 'poss') {
      return { text: determiner.text, from: determiner.id }
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective) {
    // Adjectives never agree with anything, because there is nothing to agree with.
    return adjective.text
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const kind = determiner?.features.determinerKind
    const counted = kind === 'quantifier'
    const plural = determiner?.features.forcesNumber === 'pl' && !counted
    const animate = head.features.animate === true

    let text = plural ? head.features.plural ?? `${head.text}গুলো` : head.text

    // The locative replaces the article rather than joining it: "বাগানে", not
    // "বাগানটাে".
    if (isLocative(ctx.preposition)) {
      const located = locative(text)
      note(ctx.builder, `"${located}": the locative ending`)
      return {
        text: located,
        merged: [
          ...(determiner ? [determiner.id] : []),
          ...(ctx.preposition ? [ctx.preposition.id] : []),
        ],
      }
    }

    if (kind === 'definite' && !plural) {
      text = definite(text, animate)
      if (!animate) note(ctx.builder, `"${text}": the definite article, written on the noun`)
    }

    // A person as an object takes -কে, whether definite or not.
    if (animate && ctx.role === 'object') {
      text = `${text}কে`
      note(ctx.builder, `"${text}": an object that is a person takes -কে`)
    }

    const absorbed = kind === 'definite' || kind === 'indefinite'
      ? [determiner!.id]
      : undefined
    return { text, merged: absorbed }
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    // "না" follows the verb, which in a verb-final language means it closes the
    // sentence: "আমি আপেল চাই না।"
    return { kind: 'afterVerb', word: 'না' }
  },
}
