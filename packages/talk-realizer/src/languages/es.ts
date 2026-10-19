import type { Features, Gender, SelectedWord } from '../features'
import { agreeAdjective, applyExperiencer, conjugateRegular, elide, induceGender, pluralize, possessiveForm, quantifierPhrase } from '../morphology/romance'
import { extractObjectClitic } from '../morphology/clitic'
import { agreesWith, formFor, isPlural, isSensation, note, type LanguageRules, type PhraseContext } from '../profile'

/**
 * Spanish. The pack stores infinitives, so conjugation is the main job; the
 * interesting rule is **gustar**, which inverts the clause: the child's "yo" +
 * "gustar" + "pan" has to come out as "Me gusta el pan", where the bread is the
 * grammatical subject and the child is a dative clitic.
 *
 * The copula is `estar`, because everything a child says with an adjective here
 * is a state: "estoy feliz", "estoy cansado".
 *
 * Determiners agree with the noun, each in its own way. The article has the "el
 * agua" rule — a feminine noun beginning with a stressed "a" takes the masculine
 * *article* — and that rule stops at the article: the demonstrative, the
 * adjective and everything else still treat the noun as feminine. A plural noun
 * takes no indefinite article at all, because Spanish leaves a bare plural bare.
 *
 * **A predicate adjective agrees with whoever it is said about**, and in the first
 * person that is the speaker: "estoy cansado" from a boy, "estoy cansada" from a
 * girl. Nothing in the selection carries that — the tile is "cansado" either way
 * and the subject is the bare pronoun "yo" — so it comes from `speakerGender`,
 * which Tiko does not record yet. Until it does, `speakerGender` is absent, the
 * masculine stands in, and every sentence where the ending would have moved says
 * so in its notes rather than passing silently.
 */
const COPULA: Record<string, string> = {
  '1sg': 'estoy', '2sg': 'estás', '3sg': 'está', '1pl': 'estamos', '2pl': 'estáis', '3pl': 'están',
}
const COPULA_PAST: Record<string, string> = {
  '1sg': 'estaba', '2sg': 'estabas', '3sg': 'estaba', '1pl': 'estábamos', '2pl': 'estabais', '3pl': 'estaban',
}
const SER: Record<string, string> = {
  '1sg': 'soy', '2sg': 'eres', '3sg': 'es', '1pl': 'somos', '2pl': 'sois', '3pl': 'son',
}

const DATIVE_CLITICS: Record<string, string> = {
  '1sg': 'me', '2sg': 'te', '3sg': 'le', '1pl': 'nos', '2pl': 'os', '3pl': 'les',
}

const HAVE: Record<string, string> = {
  '1sg': 'tengo', '2sg': 'tienes', '3sg': 'tiene', '1pl': 'tenemos', '2pl': 'tenéis', '3pl': 'tienen',
}

/**
 * Whose gender a predicate adjective agrees with. In the first person it is the
 * speaker; everywhere else it is the subject's own gender, which the noun already
 * carries ("la manzana está fría").
 *
 * Deliberately the first person **singular** only. "Nosotros" is a group, and a
 * group's gender is not the speaker's — a woman speaking for a mixed group still
 * says "estamos cansados" — and the pack's tile is the masculine "nosotros", so
 * agreeing the plural adjective with the speaker would only make it disagree with
 * the pronoun standing next to it. The masculine default is the less wrong answer
 * there until the selection itself says who "we" are.
 */
function predicateGender(ctx: PhraseContext, subjectGender: Gender | undefined): Gender | undefined {
  if (ctx.person === 1 && ctx.number === 'sg') return ctx.speakerGender
  return subjectGender
}

/**
 * A demonstrative agrees with its noun in gender and number: "esta manzana",
 * "estos zapatos". The packs cite it in the masculine singular ("este", "ese"),
 * and both series build the rest by trading that final -e for -a, -os and -as.
 *
 * It agrees with the noun's **own** gender. "el agua" is an article-only rule —
 * a stressed initial "a" takes the masculine *article* so that two a-sounds do
 * not run together — and it reaches nothing else in the phrase: "esta agua", and
 * "el agua fría" with a feminine adjective.
 *
 * Deliberately only the two series the packs ship. "Aquel" is irregular
 * ("aquella", "aquellos") and the -e rule would spell it "aquela"; a curated
 * `feminine` or `pluralForm` wins here, which is where that belongs.
 */
function demonstrativeForm(features: Features, text: string, feminine: boolean, plural: boolean): string {
  if (feminine) {
    const singular = features.feminine ?? text.replace(/e$/, 'a')
    return plural ? pluralize(singular, 'es') : singular
  }
  return plural ? (features.pluralForm ?? text.replace(/e$/, 'os')) : text
}

export const spanish: LanguageRules = {
  profile: {
    language: 'es',
    maturity: 'production',
    wordOrder: 'svo',
    verbCitation: 'infinitive',
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?', questionPrefix: '¿' },
    functionWords: [
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'estoy', 'estás', 'está', 'estamos', 'están', 'estaba', 'estaban',
      'no', 'me', 'te', 'le', 'nos', 'les', 'al', 'del',
    ],
    notes: 'Subject pronouns are kept because the child chose them, though Spanish normally drops them. The copula is estar for a state and ser for an inherent quality. A predicate adjective in the first person singular agrees with the SPEAKER\'s gender, which Tiko does not record: without speakerGender the masculine stands in and the sentence says so in its notes. The first person plural is left masculine on purpose — a group\'s gender is not the speaker\'s.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') {
      return { gender: induceGender(word.text, 'es'), plural: pluralize(word.text, 'es') }
    }
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    // An inverted "gustar" agrees with the thing liked, not with the child.
    if (ctx.scratch.experiencer) {
      const plural = ctx.scratch.experiencerPlural === true
      return forms[plural ? '3pl' : '3sg'] ?? verb.text
    }
    const curated = formFor(forms, ctx.person, ctx.number)
    if (curated) return curated
    const regular = conjugateRegular(verb.text, 'es', ctx.person, ctx.number)
    if (regular) return regular
    note(ctx.builder, `no conjugation for "${verb.text}", left as the infinitive`)
    return verb.text
  },

  copula(ctx) {
    // A sensation is said with "have" and a noun in this language:
    // "j'ai faim", not "je suis faim".
    const sensation = isSensation(ctx)
    if (sensation && ctx.tense === 'present') {
      const form = HAVE[`${ctx.person}${ctx.number}`] ?? 'tiene'
      note(ctx.builder, `"${form} ${sensation}": a sensation takes "have" and a noun`)
      return form
    }
    // A quality takes "ser", a state takes "estar": "la manzana es grande"
    // but "yo estoy triste".
    if (ctx.predicate?.features.inherent && ctx.tense === 'present') {
      const form = SER[`${ctx.person}${ctx.number}`] ?? 'es'
      note(ctx.builder, `copula "${form}": an inherent quality, not a state`)
      return form
    }
    return (ctx.tense === 'past' ? COPULA_PAST : COPULA)[`${ctx.person}${ctx.number}`] ?? 'está'
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const plural = isPlural(np)
    const feminine = head?.features.gender === 'feminine'
    // "el agua", not "la agua": a stressed initial "a" takes the masculine
    // article in the singular, while the noun itself stays feminine.
    const stressedA = head?.features.stressedInitialA === true && !plural
    const definite = plural
      ? (feminine ? 'las' : 'los')
      : (feminine && !stressedA ? 'la' : 'el')

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') return { text: definite, from: determiner.id }
      if (kind === 'indefinite') {
        return { text: plural ? (feminine ? 'unas' : 'unos') : (feminine && !stressedA ? 'una' : 'un'), from: determiner.id }
      }
      if (determiner.features.pronounCase === 'poss') {
        return { text: possessiveForm(determiner.features, determiner.text, feminine), from: determiner.id }
      }
      if (kind === 'demonstrative') {
        const form = demonstrativeForm(determiner.features, determiner.text, feminine, plural)
        note(ctx.builder, `"${form}": the demonstrative agrees with ${head?.id ?? 'the noun'}`)
        return { text: form, from: determiner.id }
      }
      return {
        text: quantifierPhrase(determiner.features, determiner.text, 'es', feminine, plural),
        from: determiner.id,
      }
    }

    if (!head) return null
    // As the subject of an inverted gustar, the thing liked takes the article.
    if (ctx.scratch.experiencer && ctx.role === 'object') {
      note(ctx.builder, `"${definite}": the thing liked is the grammatical subject`)
      return { text: definite, from: null }
    }
    if (head.features.proper) return null
    if (ctx.afterPreposition && head.features.institutional) {
      note(ctx.builder, `no article: "${head.text}" is institutional after a preposition`)
      return null
    }
    if (head.features.mass) {
      note(ctx.builder, 'no article: mass noun')
      return null
    }
    if (plural) {
      // Spanish leaves a bare plural bare: "necesito gafas", not "necesito unas
      // gafas", which counts a pair rather than naming the thing.
      note(ctx.builder, `no article: "${head.text}" is plural`)
      return null
    }
    const article = feminine && !stressedA ? 'una' : 'un'
    note(ctx.builder, stressedA
      ? `article "${article}": "${head.text}" is feminine, but a stressed initial "a" takes the masculine article`
      : `article "${article}": indefinite ${feminine ? 'feminine' : 'masculine'} singular`)
    return { text: article, from: null }
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    // The sensation noun replaces the adjective entirely.
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation && ctx.tense === 'present') return sensation
    const { gender, plural } = agreesWith(np, ctx)
    const number = plural ? 'pl' : 'sg'
    if (ctx.role !== 'predicate') {
      return agreeAdjective(adjective.features, adjective.text, 'es', gender, number)
    }

    const agreed = agreeAdjective(
      adjective.features, adjective.text, 'es', predicateGender(ctx, gender), number,
    )
    // Only the first person has nothing in the selection to agree with, and only an
    // adjective whose ending actually moves is affected: "triste" and "feliz" are
    // the same word for everyone, and a note about them would be noise that trains
    // the reader to skip the ones that matter.
    if (ctx.person === 1 && ctx.number === 'sg') {
      const masculine = agreeAdjective(adjective.features, adjective.text, 'es', 'masculine', number)
      const feminine = agreeAdjective(adjective.features, adjective.text, 'es', 'feminine', number)
      if (masculine !== feminine) {
        note(ctx.builder, ctx.speakerGenderAssumed
          ? `"${agreed}" agrees with the speaker's gender, which is not recorded: `
            + 'masculine assumed, and this sentence is wrong for a girl'
          : `"${agreed}": the predicate adjective agrees with the speaker, who is ${ctx.speakerGender}`)
      }
    }
    return agreed
  },

  noun(head, np) {
    if (np.determiner?.features.forcesNumber === 'pl') {
      return head.features.plural ?? pluralize(head.text, 'es')
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'no' }
  },

  postprocess(tokens) {
    // The only two obligatory contractions in Spanish.
    return elide(tokens, [[/^a el$/i, 'al'], [/^de el$/i, 'del']])
  },

  transform(chunks, ctx) {
    const plural = chunks.complements.some(
      (phrase) => phrase.kind === 'np' && phrase.determiner?.features.forcesNumber === 'pl',
    )
    ctx.scratch.experiencerPlural = plural
    if (applyExperiencer(chunks, ctx.scratch, DATIVE_CLITICS, ctx.person, ctx.number)) {
      note(ctx.builder, 'gustar inverts: the experiencer becomes a dative clitic')
      return
    }
    extractObjectClitic(chunks, ctx.scratch)
  },
}
