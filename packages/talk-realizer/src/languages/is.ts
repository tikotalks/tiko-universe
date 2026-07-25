import type { Features, SelectedWord } from '../features'
import { derivePerson, type Conjugation, type PersonKey } from '../morphology/persons'
import { formFor, note, type LanguageRules, type PhraseContext } from '../profile'

/**
 * Icelandic. It has what Swedish, Danish and Norwegian gave up: **four cases**, on
 * top of the suffixed definite article they kept. So a definite object carries two
 * pieces of information in one word — "hesturinn" is the horse as a subject,
 * "hestinn" as an object — and the article changes with the case, not just the
 * gender.
 *
 * - **The article is a suffix**: "epli" → "eplið", "bók" → "bókin", "hestur" →
 *   "hesturinn".
 * - **Adjectives agree** in gender, number and case, strongly when the noun is
 *   indefinite: "stórt epli", "stóran hest".
 * - **Negation is "ekki" after the verb**, and questions invert, as in the other
 *   Nordic languages.
 *
 * Marked `beta`: the nominative, accusative and dative are modelled and the
 * genitive is not; the weak (definite) adjective declension is not generated. The
 * vocabulary was generated against the shared concept ids. Both need review by an
 * Icelandic speaker.
 */
type Case = 'nom' | 'acc' | 'dat'

/** The definite suffix, by gender and case. */
const ARTICLE: Record<string, Record<Case, string>> = {
  masculine: { nom: 'inn', acc: 'inn', dat: 'inum' },
  feminine: { nom: 'in', acc: 'ina', dat: 'inni' },
  neuter: { nom: 'ið', acc: 'ið', dat: 'inu' },
}

/** Strong adjective endings, which is what an indefinite noun takes. */
const ADJECTIVE: Record<string, Record<Case, string>> = {
  masculine: { nom: '', acc: 'an', dat: 'um' },
  feminine: { nom: '', acc: 'a', dat: 'ri' },
  neuter: { nom: 't', acc: 't', dat: 'u' },
}

const COPULA: Record<string, string> = {
  '1sg': 'er', '2sg': 'ert', '3sg': 'er', '1pl': 'erum', '2pl': 'eruð', '3pl': 'eru',
}

function caseFor(ctx: PhraseContext): Case {
  if (ctx.role === 'subject' || ctx.role === 'predicate') return 'nom'
  if (ctx.preposition?.features.governsCase === 'dat') return 'dat'
  return 'acc'
}

/** The accusative of a noun: the -ur of a masculine drops, most others hold. */
function accusative(text: string, features: Features): string {
  const curated = features.cases?.acc
  if (curated) return curated
  if (features.gender === 'masculine' && text.endsWith('ur')) return text.slice(0, -2)
  return text
}

/**
 * Icelandic conjugation for the weak verbs, which is what a rule can reach. The
 * strong verbs change their stem vowel ("fer" → "förum") and are curated.
 */
const CONJUGATION: Conjugation = {
  rules: [
    { when: 'a', forms: { '2sg': 'ar', '3sg': 'ar', '1pl': 'um', '2pl': 'ið', '3pl': 'a' } },
    { when: 'i', forms: { '2sg': 'ir', '3sg': 'ir', '1pl': 'um', '2pl': 'ið', '3pl': 'a' } },
  ],
}

export const icelandic: LanguageRules = {
  profile: {
    language: 'is',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['er', 'ert', 'erum', 'eru', 'ekki', 'einn', 'ein', 'eitt'],
    notes: 'The nominative, accusative and dative are modelled; the genitive is not. The weak adjective declension, which a definite noun takes, is not generated. Vocabulary was generated against the shared concept ids and needs review by an Icelandic speaker.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos !== 'noun') return {}
    // Icelandic gender is largely readable from the ending.
    if (word.text.endsWith('ur')) return { gender: 'masculine' }
    if (/(ing|un|semd)$/.test(word.text)) return { gender: 'feminine' }
    if (word.text.endsWith('i')) return { gender: 'neuter' }
    if (/[aáeéiíoóuúyý]$/.test(word.text)) return { gender: 'feminine' }
    return { gender: 'neuter' }
  },

  verbForm(verb, ctx) {
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    const curated = formFor(verb.features.forms, ctx.person, ctx.number)
    if (curated) return curated
    if (ctx.person === 1 && ctx.number === 'sg') return verb.text
    const key = `${ctx.person}${ctx.number}` as PersonKey
    const derived = derivePerson(verb.text, key, CONJUGATION)
    if (derived) {
      note(ctx.builder, `"${derived.text}": a weak verb, conjugated from the first person`)
      return derived.text
    }
    note(ctx.builder, `no ${key} form for "${verb.text}" — a strong verb needs curation`)
    return verb.text
  },

  copula(ctx) {
    return COPULA[`${ctx.person}${ctx.number}`] ?? 'er'
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    const gender = np.head?.features.gender ?? 'neuter'
    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') {
        note(ctx.builder, 'the definite article is a suffix on the noun')
        return null
      }
      if (kind === 'indefinite') {
        const article = gender === 'masculine' ? 'einn' : gender === 'feminine' ? 'ein' : 'eitt'
        return { text: article, from: determiner.id }
      }
      const gender2 = np.head?.features.gender
      const agreed = gender2 === 'feminine'
        ? determiner.features.feminine
        : gender2 === 'neuter' ? determiner.features.neuter : undefined
      if (agreed) {
        note(ctx.builder, `"${agreed}": the numeral agrees with the noun`)
        return { text: agreed, from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }
    return null
  },

  adjective(adjective, np, ctx) {
    // With a pronoun subject the tiles carry no gender, and the bare masculine is
    // what Icelandic uses when it does not know: "ég er glaður".
    const gender = ctx.role === 'predicate'
      ? ctx.subjectGender ?? 'masculine'
      : np.head?.features.gender ?? 'neuter'
    const grammaticalCase = caseFor(ctx)
    // The masculine singular nominative *is* the form the pack ships ("glaður",
    // "stór"); every other form is built on the stem, which loses that -ur.
    const stem = adjective.text.replace(/ur$/, '')
    // A plural predicate has its own endings: "við erum glaðir".
    const plural = ctx.role === 'predicate'
      ? ctx.number === 'pl' || ctx.subjectPlural === true
      : np.determiner?.features.forcesNumber === 'pl'
    if (plural) {
      const suffix = gender === 'feminine' ? 'ar' : gender === 'neuter' ? '' : 'ir'
      const form = `${stem}${suffix}`
      note(ctx.builder, `"${form}": a plural predicate`)
      return form
    }
    // A predicate takes the strong nominative, which is the bare form for the
    // masculine and feminine and -t for the neuter.
    const ending = ADJECTIVE[gender][grammaticalCase]
    // No ending means the bare masculine nominative, exactly as the pack has it.
    if (!ending) return adjective.text
    const curated = gender === 'neuter' ? adjective.features.neuter : undefined
    if (curated && grammaticalCase !== 'dat') return curated
    const form = `${stem}${ending}`
    note(ctx.builder, `"${form}": strong ${gender} ${grammaticalCase}`)
    return form
  },

  noun(head, np, ctx) {
    const determiner = np.determiner
    const definite = determiner?.features.determinerKind === 'definite'
    const grammaticalCase = caseFor(ctx)
    const plural = determiner?.features.forcesNumber === 'pl'

    let text = plural ? head.features.plural ?? head.text : head.text
    if (!plural && grammaticalCase !== 'nom') text = accusative(text, head.features)

    if (definite) {
      const gender = head.features.gender ?? 'neuter'
      let stem = text
      // A noun ending in a vowel loses it before the article: "epli" → "eplið".
      if (gender === 'neuter' && stem.endsWith('i')) stem = stem.slice(0, -1)
      const suffix = ARTICLE[gender][grammaticalCase]
      const form = `${stem}${suffix}`
      note(ctx.builder, `"${form}": the article written onto the noun, ${grammaticalCase}`)
      return { text: form, merged: determiner ? [determiner.id] : [] }
    }
    return text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    if (ctx.verb?.features.objectCase === 'dative' && word.features.dative) {
      note(ctx.builder, `"${word.features.dative}": the dative, governed by the verb`)
      return word.features.dative
    }
    return word.features.accusative ?? word.text
  },

  negation() {
    return { kind: 'afterVerb', word: 'ekki' }
  },
}
