import type { Features, SelectedWord } from '../features'
import { declineAdjective, declineNoun, declinePossessive, induceSlavicGender, type SlavicCase, type SlavicLanguage } from './slavic'
import { extractObjectClitic } from './clitic'
import { agreesWith, formFor, note, type LanguageRules, type PhraseContext } from '../profile'

/**
 * Seven Slavic languages share this grammar. What varies between them is small
 * and declarative:
 *
 * - whether the present tense has a **copula** at all (Polish "jestem", Russian
 *   and Ukrainian nothing);
 * - whether the negation is a **word** before the verb ("не chcę") or a **prefix**
 *   written onto it (Czech "nechci", Slovak "nechcem");
 * - whether negating a verb puts its object in the **genitive** — obligatory in
 *   Russian, Polish and Ukrainian, not standard in Serbian, Croatian, Czech or
 *   Slovak.
 *
 * Everything else — the case system, animacy, the clitics — is shared.
 */
export interface SlavicConfig {
  language: SlavicLanguage
  maturity: 'production' | 'beta' | 'draft'
  negation: string
  /** True where the negation is written onto the verb: "nechci", not "ne chci". */
  negationPrefix?: boolean
  /** Present-tense copula forms, or null where the language has none. */
  copula: Record<string, string> | null
  /**
   * The negated copula, where it is one form rather than the negation plus the
   * copula: Serbian "нисам", Czech "není", Slovak "nie som".
   */
  copulaNegated?: Record<string, string>
  /**
   * True where an object pronoun is a clitic in front of the verb — "Ti mi
   * pomažeš". Russian and Ukrainian have no clitics and leave it after the verb.
   */
  clitics?: boolean
  /**
   * True where two, three and four take the genitive singular rather than the
   * plural: Russian "два печенья", Serbian "два кекса". Czech, Slovak and Polish
   * use the nominative plural instead.
   */
  paucalGenitive?: boolean
  /** True where a negated object goes into the genitive. */
  genitiveOfNegation?: boolean
  notes: string
  functionWords: readonly string[]
}

/** The case a noun phrase takes in this role. */
function caseFor(ctx: PhraseContext, genitiveOfNegation: boolean): SlavicCase {
  if (ctx.role === 'subject' || ctx.role === 'predicate') return 'nom'
  // A preposition governs its own case, and each one demands a specific one —
  // Polish "do" the genitive, Russian "к" the dative.
  const governed = ctx.preposition?.features.governsCase
  if (governed && governed !== 'ins' && governed !== 'abl') return governed
  // The genitive of negation: a negated object changes case, where the language
  // has that rule.
  if (ctx.negateHere && genitiveOfNegation) return 'gen'
  // Verbs like помогать and pomagać govern the dative; Lithuanian "norėti" and
  // its relatives govern the genitive.
  if (ctx.verb?.features.objectCase === 'dative') return 'dat'
  if (ctx.verb?.features.objectCase === 'genitive') return 'gen'
  return 'acc'
}

export function createSlavic(config: SlavicConfig): LanguageRules {
  const { language } = config
  const genitiveOfNegation = config.genitiveOfNegation === true
  const caseIn = (ctx: PhraseContext): SlavicCase => caseFor(ctx, genitiveOfNegation)

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

    negatedCopula(ctx) {
      if (!config.copulaNegated) return null
      return config.copulaNegated[`${ctx.person}${ctx.number}`] ?? null
    },

    copula(ctx) {
      if (!config.copula) {
        note(ctx.builder, 'no copula: this language has none in the present tense')
        return null
      }
      return config.copula[`${ctx.person}${ctx.number}`] ?? null
    },

    preposition(word, ctx) {
      if (word.features.caseOnly) {
        note(ctx.builder, `"${word.text}" is a case ending on the noun, not a word`)
        return null
      }
      return word.text
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
        const grammaticalCase = caseIn(ctx)
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
      // A numeral agrees in gender where the language marks it: "два" but "две".
      const gender = np.head?.features.gender
      const agreed = gender === 'feminine'
        ? determiner.features.feminine
        : gender === 'neuter' ? determiner.features.neuter : undefined
      if (agreed) {
        note(ctx.builder, `"${agreed}": the numeral agrees with the noun`)
        return { text: agreed, from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    },

    adjective(adjective, np, ctx) {
      const grammaticalCase = caseIn(ctx)
      if (ctx.role === 'predicate') {
        // A plural subject takes a plural predicate: "Ми щасливі".
        if (ctx.number === 'pl' || ctx.subjectPlural === true) {
          const form = declineAdjective(
            adjective.text, adjective.features, ctx.subjectGender, 'nom', false, language, true,
          )
          note(ctx.builder, `"${form}": a plural predicate`)
          return form
        }
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
      const { gender, plural } = agreesWith(np, ctx)
      return declineAdjective(
        adjective.text, adjective.features, gender,
        grammaticalCase, np.head?.features.animate === true, language, plural,
      )
    },

    noun(head, np, ctx) {
      const grammaticalCase = caseIn(ctx)
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
        // After two or three these languages want the genitive singular, not the
        // plural: "два кекса".
        if (config.paucalGenitive && np.determiner?.features.smallNumber) {
          const paucal = declineNoun(head.text, head.features, 'gen', language)
          note(ctx.builder, `"${paucal.text}": the paucal after a small numeral`)
          return { text: paucal.text, merged: absorbed }
        }
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
      if (ctx.negateHere && genitiveOfNegation) {
        return word.features.cases?.gen ?? word.features.accusative ?? word.text
      }
      if (ctx.verb?.features.objectCase === 'dative' && word.features.dative) {
        note(ctx.builder, `"${word.features.dative}": dative, governed by the verb`)
        return word.features.dative
      }
      return word.features.accusative ?? word.text
    },

    transform(chunks, ctx) {
      if (!config.clitics) return
      // "Ti mi pomažeš": these languages put an object pronoun before the verb.
      extractObjectClitic(chunks, ctx.scratch, (pronoun) => (
        ctx.verb?.features.objectCase === 'dative'
          ? pronoun.features.dative ?? pronoun.features.accusative ?? pronoun.text
          : pronoun.features.accusative ?? pronoun.text
      ))
    },

    negation() {
      // The negation sits before the verb — as its own word in most of these
      // languages and written onto it in Czech and Slovak. Where the genitive of
      // negation applies it reaches the object too, whatever its definiteness,
      // because none of these languages has any.
      if (config.negationPrefix) {
        return {
          kind: 'prefixVerb',
          prefix: config.negation,
          phraseNegation: genitiveOfNegation ? 'also' : undefined,
          negatesAnyObject: genitiveOfNegation,
        }
      }
      return {
        kind: 'beforeVerb',
        word: config.negation,
        phraseNegation: genitiveOfNegation ? 'also' : undefined,
        negatesAnyObject: genitiveOfNegation,
      }
    },
  }
}
