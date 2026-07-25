import type { Features, SelectedWord } from '../features'
import { agreeAdjective, applyExperiencer, conjugateRegular, elide, extractObjectClitic, induceGender, pluralize, possessiveForm } from '../morphology/romance'
import { formFor, note, type LanguageRules } from '../profile'

/**
 * Italian. Two things beyond the shared Romance machinery:
 *
 * - **Article allomorphy.** The definite article depends on the sound the noun
 *   starts with, not just its gender: "il pane", "lo zaino", "l'acqua",
 *   "i libri", "gli amici", "le mele".
 * - **piacere**, which inverts the clause exactly like Spanish gustar:
 *   "Mi piace il pane."
 */
const COPULA: Record<string, string> = {
  '1sg': 'sono', '2sg': 'sei', '3sg': 'è', '1pl': 'siamo', '2pl': 'siete', '3pl': 'sono',
}
const COPULA_PAST: Record<string, string> = {
  '1sg': 'ero', '2sg': 'eri', '3sg': 'era', '1pl': 'eravamo', '2pl': 'eravate', '3pl': 'erano',
}
const DATIVE_CLITICS: Record<string, string> = {
  '1sg': 'mi', '2sg': 'ti', '3sg': 'gli', '1pl': 'ci', '2pl': 'vi', '3pl': 'gli',
}

/** "lo"/"gli" before s+consonant, z, gn, ps, x, y; "l'" before a vowel. */
function needsLo(word: string): boolean {
  return /^(z|gn|ps|pn|x|y|s[^aeiou])/i.test(word)
}
function startsWithVowel(word: string): boolean {
  return /^[aeiouàèéìòù]/i.test(word)
}

function definiteArticle(word: string, feminine: boolean, plural: boolean): string {
  if (plural) {
    if (feminine) return 'le'
    return startsWithVowel(word) || needsLo(word) ? 'gli' : 'i'
  }
  if (startsWithVowel(word)) return "l'"
  if (feminine) return 'la'
  return needsLo(word) ? 'lo' : 'il'
}

function indefiniteArticle(word: string, feminine: boolean): string {
  if (feminine) return startsWithVowel(word) ? "un'" : 'una'
  return needsLo(word) ? 'uno' : 'un'
}

export const italian: LanguageRules = {
  profile: {
    language: 'it',
    maturity: 'production',
    wordOrder: 'svo',
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: [
      'il', 'lo', 'la', "l'", 'i', 'gli', 'le',
      'un', 'uno', 'una', "un'",
      'sono', 'sei', 'è', 'siamo', 'siete', 'ero', 'era', 'erano',
      'non', 'mi', 'ti', 'gli', 'ci', 'vi', 'al', 'del', 'alla', 'della',
    ],
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') {
      return { gender: induceGender(word.text, 'it'), plural: pluralize(word.text, 'it') }
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
    const regular = conjugateRegular(verb.text, 'it', ctx.person, ctx.number)
    if (regular) return regular
    note(ctx.builder, `no conjugation for "${verb.text}", left as the infinitive`)
    return verb.text
  },

  copula(ctx) {
    return (ctx.tense === 'past' ? COPULA_PAST : COPULA)[`${ctx.person}${ctx.number}`] ?? 'è'
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'
    const feminine = head?.features.gender === 'feminine'
    // The article agrees with whatever word comes next — adjective included.
    const next = (np.adjectives[0]?.text ?? head?.text ?? '')
    const definite = definiteArticle(next, feminine, plural)

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') {
        if (definite !== determiner.text) {
          note(ctx.builder, `"${definite}" not "${determiner.text}": Italian picks the article by sound`)
        }
        return { text: definite, from: determiner.id }
      }
      if (kind === 'indefinite') {
        return { text: plural ? definite : indefiniteArticle(next, feminine), from: determiner.id }
      }
      if (determiner.features.pronounCase === 'poss' && head) {
        // Italian keeps the article, and it agrees with the *possessive* that
        // follows it — "il mio zaino", not "lo mio zaino".
        const possessive = possessiveForm(determiner.features, determiner.text, feminine)
        const article = definiteArticle(possessive, feminine, plural)
        note(ctx.builder, `"${article} ${possessive}": Italian keeps the article before a possessive`)
        return { text: `${article} ${possessive}`, from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
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
    if (plural) return { text: definite, from: null }
    return { text: indefiniteArticle(next, feminine), from: null }
  },

  adjectivePosition: 'after',

  adjective(adjective, np) {
    const number = np.determiner?.features.forcesNumber === 'pl' ? 'pl' : 'sg'
    return agreeAdjective(adjective.features, adjective.text, 'it', np.head?.features.gender, number)
  },

  noun(head, np) {
    if (np.determiner?.features.forcesNumber === 'pl') {
      return head.features.plural ?? pluralize(head.text, 'it')
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
      [/^(a|da|di|in|su) il$/i, (_m: string, p: string) => `${p === 'di' ? 'de' : p}l`],
      [/^a la$/i, 'alla'],
      [/^di la$/i, 'della'],
      [/^(l|un)' /gi, "$1'"],
    ]).map((token) => ({ ...token, text: token.text.replace(/(l|un)' /gi, "$1'") }))
  },

  transform(chunks, ctx) {
    ctx.scratch.experiencerPlural = chunks.complements.some(
      (phrase) => phrase.kind === 'np' && phrase.determiner?.features.forcesNumber === 'pl',
    )
    if (applyExperiencer(chunks, ctx.scratch, DATIVE_CLITICS, ctx.person, ctx.number)) {
      note(ctx.builder, 'piacere inverts: the experiencer becomes a dative clitic')
      return
    }
    extractObjectClitic(chunks, ctx.scratch)
  },
}
