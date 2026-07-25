import type { Features, SelectedWord } from '../features'
import { agreeAdjective, applyExperiencer, conjugateRegular, elide, induceGender, pluralize, possessiveForm } from '../morphology/romance'
import { extractObjectClitic } from '../morphology/clitic'
import { agreesWith, formFor, isSensation, note, type LanguageRules } from '../profile'

/**
 * Spanish. The pack stores infinitives, so conjugation is the main job; the
 * interesting rule is **gustar**, which inverts the clause: the child's "yo" +
 * "gustar" + "pan" has to come out as "Me gusta el pan", where the bread is the
 * grammatical subject and the child is a dative clitic.
 *
 * The copula is `estar`, because everything a child says with an adjective here
 * is a state: "estoy feliz", "estoy cansado".
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

export const spanish: LanguageRules = {
  profile: {
    language: 'es',
    maturity: 'production',
    wordOrder: 'svo',
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?', questionPrefix: '¿' },
    functionWords: [
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'estoy', 'estás', 'está', 'estamos', 'están', 'estaba', 'estaban',
      'no', 'me', 'te', 'le', 'nos', 'les', 'al', 'del',
    ],
    notes: 'Subject pronouns are kept because the child chose them, though Spanish normally drops them. The copula is always estar.',
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
    const plural = determiner?.features.forcesNumber === 'pl'
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
      return { text: determiner.text, from: determiner.id }
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
    if (plural) return { text: feminine ? 'unas' : 'unos', from: null }
    return { text: feminine && !stressedA ? 'una' : 'un', from: null }
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    // The sensation noun replaces the adjective entirely.
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation && ctx.tense === 'present') return sensation
    const { gender, plural } = agreesWith(np, ctx)
    return agreeAdjective(adjective.features, adjective.text, 'es', gender, plural ? 'pl' : 'sg')
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
