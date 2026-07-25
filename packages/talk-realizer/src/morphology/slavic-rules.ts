import type { Features, SelectedWord } from '../features'
import { declineAdjective, declineNoun, declinePossessive, induceSlavicGender, type SlavicCase, type SlavicLanguage } from './slavic'
import { formFor, note, type LanguageRules, type PhraseContext } from '../profile'

/**
 * Russian and Polish share one grammar with two sets of words and one real
 * difference — Polish has a present copula ("jestem") and Russian does not
 * ("я счастлив" is a complete sentence) — so they share this implementation.
 */
export interface SlavicConfig {
  language: SlavicLanguage
  maturity: 'production' | 'beta' | 'draft'
  negation: string
  /** Present-tense copula forms, or null where the language has none. */
  copula: Record<string, string> | null
  notes: string
  functionWords: readonly string[]
}

/** The case a noun phrase takes in this role. */
function caseFor(ctx: PhraseContext): SlavicCase {
  if (ctx.role === 'subject' || ctx.role === 'predicate') return 'nom'
  // A preposition governs its own case, and each one demands a specific one —
  // Polish "do" the genitive, Russian "к" the dative.
  const governed = ctx.preposition?.features.governsCase
  if (governed && governed !== 'ins') return governed
  // The genitive of negation: a negated object changes case.
  if (ctx.negateHere) return 'gen'
  // Verbs like помогать and pomagać govern the dative.
  if (ctx.verb?.features.objectCase === 'dative') return 'dat'
  return 'acc'
}

export function createSlavic(config: SlavicConfig): LanguageRules {
  const { language } = config

  return {
    profile: {
      language,
      maturity: config.maturity,
      wordOrder: 'svo',
      questionStrategy: 'intonation',
      spacing: 'space',
      capitalize: true,
      punctuation: { statement: '.', question: '?' },
      functionWords: config.functionWords,
      notes: config.notes,
    },

    induce(word: SelectedWord): Features {
      if (word.pos === 'noun') return { gender: induceSlavicGender(word.text, language) }
      return {}
    },

    verbForm(verb, ctx) {
      const forms = verb.features.forms ?? {}
      if (ctx.tense === 'past') return forms.past ?? verb.text
      if (verb.features.copula && config.copula) {
        return config.copula[`${ctx.person}${ctx.number}`] ?? verb.text
      }
      const curated = formFor(forms, ctx.person, ctx.number)
      if (curated) return curated
      // The pack stores a first-person form; other persons are curated, because
      // Slavic conjugation classes are not recoverable from one form.
      if (ctx.person === 1 && ctx.number === 'sg') return verb.text
      note(ctx.builder, `no ${ctx.person}${ctx.number} form for "${verb.text}" — needs curation`)
      return verb.text
    },

    copula(ctx) {
      if (!config.copula) {
        note(ctx.builder, 'no copula: this language has none in the present tense')
        return null
      }
      return config.copula[`${ctx.person}${ctx.number}`] ?? null
    },

    determiner(np, ctx) {
      const determiner = np.determiner
      if (!determiner) {
        note(ctx.builder, 'no article: Slavic languages have none')
        return null
      }
      const kind = determiner.features.determinerKind
      // An indefinite "one" adds nothing a case ending does not already say.
      if (kind === 'indefinite') {
        note(ctx.builder, 'no indefinite article; the case ending carries it')
        return null
      }
      if (kind === 'definite') {
        note(ctx.builder, 'no definite article; the bare noun is definite in context')
        return null
      }
      if (determiner.features.pronounCase === 'poss') {
        // Possessives have their own paradigm, close to the adjective one.
        const grammaticalCase = caseFor(ctx)
        const animate = np.head?.features.animate === true
        const possessive = declinePossessive(
          determiner.text, np.head?.features.gender, grammaticalCase, animate, language,
        )
        if (possessive) {
          note(ctx.builder, `"${possessive}": possessive agreeing in the ${grammaticalCase}`)
          return { text: possessive, from: determiner.id }
        }
        return { text: determiner.text, from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    },

    adjective(adjective, np, ctx) {
      const grammaticalCase = caseFor(ctx)
      if (ctx.role === 'predicate') {
        // With a noun subject the predicate agrees with it: "Яблоко большое".
        if (ctx.subjectGender) {
          const form = declineAdjective(
            adjective.text, adjective.features, ctx.subjectGender, 'nom', false, language,
          )
          note(ctx.builder, `"${form}": a predicate agreeing with the subject`)
          return form
        }
        // With a pronoun subject the tiles carry no gender, and Russian prefers
        // the short form there anyway: "я счастлив", not "я счастливый".
        if (adjective.features.predicative) {
          note(ctx.builder, `"${adjective.features.predicative}": predicative form`)
          return adjective.features.predicative
        }
      }
      return declineAdjective(
        adjective.text, adjective.features, np.head?.features.gender,
        grammaticalCase, np.head?.features.animate === true, language,
      )
    },

    noun(head, np, ctx) {
      const grammaticalCase = caseFor(ctx)
      if (ctx.afterPreposition && !ctx.preposition?.features.governsCase) {
        // Without knowing which case this preposition governs, leaving the noun
        // alone is more honest than guessing an ending.
        note(ctx.builder, `case after "${ctx.preposition?.text ?? 'the preposition'}" is not modelled`)
        return {
          text: head.text,
          merged: np.determiner ? [np.determiner.id] : undefined,
        }
      }
      const plural = np.determiner?.features.forcesNumber === 'pl'
      // An article tile these languages do not realize still belongs to the
      // sentence: it rides along with the noun rather than vanishing.
      const kind = np.determiner?.features.determinerKind
      const absorbed = np.determiner && (kind === 'definite' || kind === 'indefinite')
        ? [np.determiner.id]
        : undefined

      if (plural) {
        return { text: head.features.plural ?? head.text, merged: absorbed }
      }
      const declined = declineNoun(head.text, head.features, grammaticalCase, language)
      if (declined.text !== head.text) {
        const label = grammaticalCase === 'gen'
          ? `genitive${ctx.negateHere ? ' of negation' : ''}`
          : grammaticalCase === 'dat' ? 'dative' : grammaticalCase === 'loc' ? 'locative' : 'accusative'
        note(ctx.builder, `"${declined.text}": ${label}`)
      }
      return { text: declined.text, merged: absorbed }
    },

    pronoun(word, ctx) {
      if (ctx.role === 'subject') return word.text
      if (ctx.negateHere) return word.features.cases?.gen ?? word.features.accusative ?? word.text
      if (ctx.verb?.features.objectCase === 'dative' && word.features.dative) {
        note(ctx.builder, `"${word.features.dative}": dative, governed by the verb`)
        return word.features.dative
      }
      return word.features.accusative ?? word.text
    },

    negation() {
      // The particle goes before the verb, and the object goes genitive —
      // whatever its definiteness, because these languages have none.
      return {
        kind: 'beforeVerb',
        word: config.negation,
        phraseNegation: 'also',
        negatesAnyObject: true,
      }
    },
  }
}
