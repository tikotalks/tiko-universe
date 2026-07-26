import type { Features, SelectedWord } from '../features'
import { agreeAdjective, conjugateRegular, elide, induceGender, pluralize, possessiveForm } from '../morphology/romance'
import { extractObjectClitic } from '../morphology/clitic'
import { agreesWith, formFor, isSensation, note, type LanguageRules } from '../profile'

/**
 * Portuguese. Closest to Spanish here, with two differences that matter:
 * "gostar" needs its preposition ("gosto **de** pão", contracting to "do pão"
 * with an article), and the copula for states is "estar".
 */
const COPULA: Record<string, string> = {
  '1sg': 'estou', '2sg': 'estás', '3sg': 'está', '1pl': 'estamos', '2pl': 'estais', '3pl': 'estão',
}
const COPULA_PAST: Record<string, string> = {
  '1sg': 'estava', '2sg': 'estavas', '3sg': 'estava', '1pl': 'estávamos', '2pl': 'estáveis', '3pl': 'estavam',
}

const SER: Record<string, string> = {
  '1sg': 'sou', '2sg': 'és', '3sg': 'é', '1pl': 'somos', '2pl': 'sois', '3pl': 'são',
}

const HAVE: Record<string, string> = {
  '1sg': 'tenho', '2sg': 'tens', '3sg': 'tem', '1pl': 'temos', '2pl': 'tendes', '3pl': 'têm',
}

export const portuguese: LanguageRules = {
  profile: {
    language: 'pt',
    maturity: 'production',
    wordOrder: 'svo',
    verbCitation: 'infinitive',
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: [
      'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
      'estou', 'estás', 'está', 'estamos', 'estão', 'estava', 'estavam',
      'não', 'me', 'te', 'nos', 'de', 'do', 'da', 'dos', 'das', 'ao', 'à',
    ],
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') {
      return { gender: induceGender(word.text, 'pt'), plural: pluralize(word.text, 'pt') }
    }
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    const curated = formFor(forms, ctx.person, ctx.number)
    const form = curated ?? conjugateRegular(verb.text, 'pt', ctx.person, ctx.number)
    if (!form) {
      note(ctx.builder, `no conjugation for "${verb.text}", left as the infinitive`)
      return verb.text
    }
    // "gostar" needs its preposition before the object.
    const preposition = verb.features.objectPreposition
    return preposition ? `${form} ${preposition}` : form
  },

  copula(ctx) {
    // A sensation is said with "have" and a noun in this language:
    // "j'ai faim", not "je suis faim".
    const sensation = isSensation(ctx)
    if (sensation && ctx.tense === 'present') {
      const form = HAVE[`${ctx.person}${ctx.number}`] ?? 'tem'
      note(ctx.builder, `"${form} ${sensation}": a sensation takes "have" and a noun`)
      return form
    }
    // A quality takes "ser", a state takes "estar": "la manzana es grande"
    // but "yo estoy triste".
    if (ctx.predicate?.features.inherent && ctx.tense === 'present') {
      const form = SER[`${ctx.person}${ctx.number}`] ?? 'é'
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
    const definite = plural ? (feminine ? 'as' : 'os') : (feminine ? 'a' : 'o')

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') return { text: definite, from: determiner.id }
      if (kind === 'indefinite') {
        return { text: plural ? (feminine ? 'umas' : 'uns') : (feminine ? 'uma' : 'um'), from: determiner.id }
      }
      if (determiner.features.pronounCase === 'poss') {
        return { text: possessiveForm(determiner.features, determiner.text, feminine), from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
    if (head.features.proper) return null
    if (ctx.afterPreposition && head.features.institutional) {
      note(ctx.builder, `no article: "${head.text}" is institutional after a preposition`)
      return null
    }
    if (head.features.mass) {
      note(ctx.builder, 'no article: mass noun')
      return null
    }
    if (plural) return { text: feminine ? 'umas' : 'uns', from: null }
    return { text: feminine ? 'uma' : 'um', from: null }
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    // The sensation noun replaces the adjective entirely.
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation && ctx.tense === 'present') return sensation
    const { gender, plural } = agreesWith(np, ctx)
    return agreeAdjective(adjective.features, adjective.text, 'pt', gender, plural ? 'pl' : 'sg')
  },

  noun(head, np) {
    if (np.determiner?.features.forcesNumber === 'pl') {
      return head.features.plural ?? pluralize(head.text, 'pt')
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'não' }
  },

  postprocess(tokens) {
    return elide(tokens, [
      [/^de o$/i, 'do'], [/^de a$/i, 'da'], [/^de os$/i, 'dos'], [/^de as$/i, 'das'],
      [/^a o$/i, 'ao'], [/^a a$/i, 'à'],
    ])
  },

  transform(chunks, ctx) {
    extractObjectClitic(chunks, ctx.scratch)
  },
}
