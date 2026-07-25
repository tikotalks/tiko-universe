import type { Features, SelectedWord } from '../features'
import { agreeAdjective, applyExperiencer, conjugateRegular, elide, extractObjectClitic, induceGender, pluralize } from '../morphology/romance'
import { formFor, note, type LanguageRules } from '../profile'

/**
 * Catalan. Structurally close to Spanish, with its own articles (el/la/els/les),
 * its own contractions, and "agradar" inverting the clause the way gustar does.
 *
 * Catalan matters beyond speaker numbers: special education in Catalonia is
 * delivered in it, so an app that only offers Spanish is not usable there.
 *
 * Marked `beta`: the vocabulary was generated against the shared concept ids and
 * needs review by a Catalan speaker; the grammar is tested.
 */
const COPULA: Record<string, string> = {
  '1sg': 'estic', '2sg': 'estàs', '3sg': 'està', '1pl': 'estem', '2pl': 'esteu', '3pl': 'estan',
}
const DATIVE_CLITICS: Record<string, string> = {
  '1sg': 'em', '2sg': 'et', '3sg': 'li', '1pl': 'ens', '2pl': 'us', '3pl': 'els',
}

export const catalan: LanguageRules = {
  profile: {
    language: 'ca',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['el', 'la', 'els', 'les', "l'", 'un', 'una', 'uns', 'unes', 'estic', 'està', 'estem', 'estan', 'no', 'em', 'et', 'li', 'ens', 'al', 'del'],
    notes: 'Vocabulary was generated against the shared concept ids and needs review by a Catalan speaker. Weak-pronoun combinations beyond a single object clitic are not generated.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') {
      // Catalan gender follows from the ending, with the exceptions curated.
      return { gender: induceGender(word.text, 'ca'), plural: pluralize(word.text, 'ca') }
    }
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    if (ctx.scratch.experiencer) {
      const plural = ctx.scratch.experiencerPlural === true
      return forms[plural ? '3pl' : '3sg'] ?? verb.text
    }
    const curated = formFor(forms, ctx.person, ctx.number)
    if (curated) return curated
    // Catalan conjugation classes are close to Spanish -ar/-er/-ir.
    const regular = conjugateRegular(verb.text, 'ca', ctx.person, ctx.number)
    if (regular) return regular
    note(ctx.builder, `no conjugation for "${verb.text}", left as the infinitive`)
    return verb.text
  },

  copula(ctx) {
    return COPULA[`${ctx.person}${ctx.number}`] ?? 'està'
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'
    const feminine = head?.features.gender === 'feminine'
    const definite = plural ? (feminine ? 'les' : 'els') : (feminine ? 'la' : 'el')

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') return { text: definite, from: determiner.id }
      if (determiner.features.forcesNumber === 'pl' && feminine && determiner.features.feminine) {
        // "dues galetes": the numeral agrees.
        return { text: determiner.features.feminine, from: determiner.id }
      }
      if (kind === 'indefinite') {
        return { text: plural ? (feminine ? 'unes' : 'uns') : (feminine ? 'una' : 'un'), from: determiner.id }
      }
      if (determiner.features.pronounCase === 'poss' && head) {
        // Catalan keeps the article before a possessive: "la meva pilota".
        const possessive = feminine ? (determiner.features.feminine ?? determiner.text) : determiner.text
        note(ctx.builder, `"${definite} ${possessive}": Catalan keeps the article before a possessive`)
        return { text: `${definite} ${possessive}`, from: determiner.id }
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
    if (plural) return { text: feminine ? 'unes' : 'uns', from: null }
    return { text: feminine ? 'una' : 'un', from: null }
  },

  adjectivePosition: 'after',

  adjective(adjective, np) {
    const number = np.determiner?.features.forcesNumber === 'pl' ? 'pl' : 'sg'
    return agreeAdjective(adjective.features, adjective.text, 'ca', np.head?.features.gender, number)
  },

  noun(head, np) {
    if (np.determiner?.features.forcesNumber === 'pl') {
      return head.features.plural ?? pluralize(head.text, 'ca')
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
    // Weak pronouns and articles elide before a vowel: "m'agrada", "l'aigua".
    return elide(tokens, [
      [/^a el$/i, 'al'], [/^de el$/i, 'del'],
      // el/la lose their vowel; em/et/es lose theirs the other way round.
      [/^(el|la) (?=[aeiouàèéíòóúh])/i, (_m: string, word: string) => `${word.slice(0, -1)}'`],
      [/^(em|et|es) (?=[aeiouàèéíòóúh])/i, (_m: string, word: string) => `${word.slice(1)}'`],
    ]).map((token) => ({ ...token, text: token.text.replace(/([mtsl])' /gi, "$1'") }))
  },

  transform(chunks, ctx) {
    ctx.scratch.experiencerPlural = chunks.complements.some(
      (phrase) => phrase.kind === 'np' && phrase.determiner?.features.forcesNumber === 'pl',
    )
    if (applyExperiencer(chunks, ctx.scratch, DATIVE_CLITICS, ctx.person, ctx.number)) {
      note(ctx.builder, 'agradar inverts: the experiencer becomes a weak pronoun')
      return
    }
    extractObjectClitic(chunks, ctx.scratch)
  },
}
