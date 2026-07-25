import type { Features, SelectedWord } from '../features'
import { agreeAdjective, applyExperiencer, conjugateRegular, elide, induceGender, pluralize } from '../morphology/romance'
import { extractObjectClitic } from '../morphology/clitic'
import { agreesWith, formFor, isSensation, note, type LanguageRules } from '../profile'

/**
 * Galician. Closest to Portuguese, which is what its morphology reuses, with its
 * own articles (o/a/os/as, and "unha" rather than "uma") and its own
 * contractions (do/da/ao/á).
 *
 * Marked `beta`: the vocabulary was generated against the shared concept ids and
 * needs review by a Galician speaker; the grammar is tested.
 */
const COPULA: Record<string, string> = {
  '1sg': 'estou', '2sg': 'estás', '3sg': 'está', '1pl': 'estamos', '2pl': 'estades', '3pl': 'están',
}

const SER: Record<string, string> = {
  '1sg': 'son', '2sg': 'es', '3sg': 'é', '1pl': 'somos', '2pl': 'sodes', '3pl': 'son',
}

const HAVE: Record<string, string> = {
  '1sg': 'teño', '2sg': 'tes', '3sg': 'ten', '1pl': 'temos', '2pl': 'tendes', '3pl': 'teñen',
}

export const galician: LanguageRules = {
  profile: {
    language: 'gl',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['o', 'a', 'os', 'as', 'un', 'unha', 'uns', 'unhas', 'estou', 'está', 'estamos', 'están', 'non', 'me', 'te', 'do', 'da', 'ao', 'á'],
    notes: 'Vocabulary was generated against the shared concept ids and needs review by a Galician speaker. The Galician preterite and the infinitivo conxugado are not generated.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') {
      return { gender: induceGender(word.text, 'gl'), plural: pluralize(word.text, 'gl') }
    }
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    // Galician attaches the experiencer clitic to the verb: "gústame o pan",
    // so the curated form is keyed by the experiencer's person.
    const curated = formFor(forms, ctx.person, ctx.number)
    if (curated) return curated
    const regular = conjugateRegular(verb.text, 'gl', ctx.person, ctx.number)
    if (regular) return regular
    note(ctx.builder, `no conjugation for "${verb.text}", left as the infinitive`)
    return verb.text
  },

  copula(ctx) {
    // A sensation is said with "have" and a noun in this language:
    // "j'ai faim", not "je suis faim".
    const sensation = isSensation(ctx)
    if (sensation && ctx.tense === 'present') {
      const form = HAVE[`${ctx.person}${ctx.number}`] ?? 'ten'
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
    return COPULA[`${ctx.person}${ctx.number}`] ?? 'está'
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
      if (determiner.features.forcesNumber === 'pl' && feminine && determiner.features.feminine) {
        return { text: determiner.features.feminine, from: determiner.id }
      }
      if (determiner.features.pronounCase === 'poss' && head) {
        // "a miña pelota": Galician keeps the article before a possessive.
        const possessive = feminine ? (determiner.features.feminine ?? determiner.text) : determiner.text
        note(ctx.builder, `"${definite} ${possessive}": the article stays before the possessive`)
        return { text: `${definite} ${possessive}`, from: determiner.id }
      }
      if (kind === 'indefinite') {
        return { text: plural ? (feminine ? 'unhas' : 'uns') : (feminine ? 'unha' : 'un'), from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
    if (ctx.scratch.experiencer && ctx.role === 'object') {
      note(ctx.builder, `"${definite}": the thing liked is the grammatical subject`)
      return { text: definite, from: null }
    }
    if (head.features.mass || head.features.proper) {
      if (head.features.mass) note(ctx.builder, 'no article: mass noun')
      return null
    }
    if (ctx.afterPreposition && head.features.institutional) return null
    if (plural) return { text: feminine ? 'unhas' : 'uns', from: null }
    return { text: feminine ? 'unha' : 'un', from: null }
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    // The sensation noun replaces the adjective entirely.
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation && ctx.tense === 'present') return sensation
    const { gender, plural } = agreesWith(np, ctx)
    return agreeAdjective(adjective.features, adjective.text, 'gl', gender, plural ? 'pl' : 'sg')
  },

  noun(head, np) {
    if (np.determiner?.features.forcesNumber === 'pl') {
      return head.features.plural ?? pluralize(head.text, 'gl')
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'non' }
  },

  postprocess(tokens) {
    return elide(tokens, [
      [/^de o$/i, 'do'], [/^de a$/i, 'da'], [/^de os$/i, 'dos'], [/^de as$/i, 'das'],
      [/^a o$/i, 'ao'], [/^a a$/i, 'á'],
    ])
  },

  transform(chunks, ctx) {
    ctx.scratch.experiencerPlural = chunks.complements.some(
      (phrase) => phrase.kind === 'np' && phrase.determiner?.features.forcesNumber === 'pl',
    )
    // "gustar" inverts, and its clitic is already inside the curated form.
    if (applyExperiencer(chunks, ctx.scratch, { '1sg': '', '2sg': '', '3sg': '', '1pl': '', '3pl': '' }, ctx.person, ctx.number)) {
      ctx.scratch.clitic = undefined
      note(ctx.builder, 'gustar inverts: the clitic is enclitic on the verb')
      return
    }
    extractObjectClitic(chunks, ctx.scratch)
  },
}
