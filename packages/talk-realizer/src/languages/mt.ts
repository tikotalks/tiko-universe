import type { Features, SelectedWord } from '../features'
import { formFor, note, type LanguageRules } from '../profile'

/**
 * Maltese — the language that settles the whole rules-versus-model argument,
 * because no small multilingual model handles it and no grammar framework ships
 * it. What it needs is exactly what a rule engine is good at:
 *
 * - **The definite article assimilates.** `il-` becomes `id-`, `ir-`, `is-`,
 *   `it-`, `ix-`, `iz-`, `iż-`, `iċ-`, `in-` before those consonants, `l-`
 *   before a vowel, and takes an epenthetic vowel before a cluster:
 *   "il-ħobż", "it-tuffieħa", "l-ilma", "l-iskola".
 * - **Negation is a circumfix on the verb**: "ma rridx", "ma narax". A
 *   non-verbal predicate uses "mhux" instead: "jien mhux ferħan".
 * - **There is no present-tense copula**: "jien ferħan" *is* "I am happy".
 * - **No indefinite article**: "irrid tuffieħa" is "I want an apple".
 *
 * Marked `beta`: the article, the negation and the adjective agreement are
 * systematic and tested. Verb persons are derived from the pack's first-person
 * form by prefix rule, and Maltese broken plurals are lexical — both want a
 * native speaker's eye before this reaches a child.
 */

/** Consonants the article assimilates to. */
const ASSIMILATING = ['ċ', 'd', 'n', 'r', 's', 't', 'x', 'z', 'ż']
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'è', 'ì', 'ò', 'à']

/** The definite article for a following word. */
export function definiteArticle(word: string): string {
  const lower = word.toLocaleLowerCase('mt')
  const first = lower.charAt(0)
  const twoChar = lower.slice(0, 2)

  // Before a vowel, and before għ/h, the article loses its own vowel.
  if (VOWELS.includes(first) || twoChar === 'għ' || first === 'h') return 'l-'
  if (ASSIMILATING.includes(first)) return `i${first}-`
  // A cluster of two consonants takes a helping vowel: skola → l-iskola.
  if (!VOWELS.includes(lower.charAt(1)) && lower.charAt(1) !== '') return 'l-i'
  return 'il-'
}

/** Feminine of an adjective: usually -a, with the stem's final vowel dropped. */
function feminineAdjective(features: Features, base: string): string {
  if (features.feminine) return features.feminine
  if (/[aeiou]$/.test(base)) return base
  if (/i$/.test(base)) return `${base.slice(0, -1)}ja`
  return `${base}a`
}

/**
 * Derives a person form from the pack's first-person verb ("irrid", "nara").
 * Maltese marks person with a prefix: n- for the first person, t- for the
 * second, j- for the third, with -u for the plural.
 */
function derivePerson(firstPerson: string, person: 1 | 2 | 3, number: 'sg' | 'pl'): string {
  const [head, ...tail] = firstPerson.split(' ')
  const stem = head.replace(/^(n|in|i)/, '')
  const plural = number === 'pl'
  let form: string
  if (person === 1) form = plural ? `${head}u` : head
  else if (person === 2) form = plural ? `t${stem}u` : `t${stem}`
  else form = plural ? `j${stem}u` : `j${stem}`
  return [form, ...tail].join(' ')
}

export const maltese: LanguageRules = {
  profile: {
    language: 'mt',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['il-', 'l-', 'l-i', 'id-', 'in-', 'ir-', 'is-', 'it-', 'ix-', 'iz-', 'iż-', 'iċ-', 'ma', 'x', 'mhux'],
    notes: 'Article assimilation, ma…x negation and adjective agreement are rule-based and tested. Verb persons are derived from the pack’s first-person form; broken plurals fall back to the singular. Both need native review.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') {
      // Maltese gender is largely predictable: -a is feminine.
      return { gender: /a$/i.test(word.text) ? 'feminine' : 'masculine' }
    }
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    const curated = formFor(forms, ctx.person, ctx.number)
    if (curated) return curated
    if (ctx.person === 1 && ctx.number === 'sg') return verb.text
    const derived = derivePerson(verb.text, ctx.person, ctx.number)
    note(ctx.builder, `"${derived}" derived from "${verb.text}" by prefix rule — needs native review`)
    return derived
  },

  copula(ctx) {
    // Maltese has no present-tense copula: "jien ferħan" is a full sentence.
    note(ctx.builder, 'no copula: Maltese has none in the present tense')
    return null
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    if (!determiner) return null

    const kind = determiner.features.determinerKind
    // A possessive is postposed, and the noun takes the definite article:
    // "il-ballun tiegħi".
    if (determiner.features.pronounCase === 'poss' && head) {
      const article = definiteArticle(head.text)
      note(ctx.builder, `"${article}${head.text} ${determiner.text}": the possessive follows the noun`)
      return { text: `${article}${head.text}`, from: head.id, merged: [] }
    }
    if (kind === 'definite' && head) {
      // The article agrees with the word it precedes, adjective included.
      const next = np.adjectives[0]?.text ?? head.text
      const article = definiteArticle(next)
      if (article !== determiner.text) {
        note(ctx.builder, `"${article}" not "${determiner.text}": the article assimilates to "${next}"`)
      }
      // Written solid: "il-ħobż", "l-ilma".
      const foldsNoun = next === head.text
      return {
        text: `${article}${foldsNoun ? head.text : ''}`,
        from: determiner.id,
        merged: foldsNoun ? [head.id] : [],
      }
    }
    if (determiner.features.forcesNumber && determiner.features.attributive) {
      // Maltese counts with a special form: "żewġ gallettini", not "tnejn".
      note(ctx.builder, `"${determiner.features.attributive}": the counting form before a noun`)
      return { text: determiner.features.attributive, from: determiner.id }
    }
    if (kind === 'indefinite') {
      // Maltese has no indefinite article; "xi" means "some".
      note(ctx.builder, 'no indefinite article in Maltese')
      return null
    }
    return { text: determiner.text, from: determiner.id }
  },

  postposed(np) {
    const determiner = np.determiner
    if (determiner?.features.pronounCase === 'poss' && np.head) {
      return { text: determiner.text, from: determiner.id }
    }
    return null
  },

  adjectivePosition: 'after',

  adjective(adjective, np, ctx) {
    const head = np.head
    const feminine = head?.features.gender === 'feminine'
    const base = feminine ? feminineAdjective(adjective.features, adjective.text) : adjective.text
    // A definite noun makes its adjective definite too: "it-tuffieħa l-kbira".
    if (np.determiner?.features.determinerKind === 'definite') {
      return `${definiteArticle(base)}${base}`
    }
    return base
  },

  noun(head, np, ctx) {
    if (np.determiner?.features.pronounCase === 'poss') return ''
    const definite = np.determiner?.features.determinerKind === 'definite'
    // With the definite article the noun was already written into the article
    // token, unless an adjective intervened.
    if (definite && !np.adjectives.length) return ''
    if (definite && np.adjectives.length) return head.text
    if (np.determiner?.features.forcesNumber === 'pl') {
      if (!head.features.plural) {
        note(ctx.builder, `no plural for "${head.id}" — Maltese plurals are lexical, using the singular`)
        return head.text
      }
      return head.features.plural
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    note(ctx.builder, 'object pronouns are written as independent words, not verb suffixes')
    return word.features.accusative ?? word.text
  },

  negation(ctx) {
    // A verb takes the circumfix; a bare predicate takes "mhux".
    if (ctx.needsCopula || !ctx.verb) return { kind: 'afterVerb', word: 'mhux' }
    return { kind: 'circumfix', before: 'ma', after: 'x' }
  },

  postprocess(tokens) {
    // The "x" of ma…x is a suffix on the verb, not a separate word, and a verb
    // beginning with i- loses it after "ma": "ma rridx", not "ma irridx".
    const output: typeof tokens = []
    for (const token of tokens) {
      const previousText = output[output.length - 1]?.text
      if (previousText === 'ma' && /^i[^aeiou]/i.test(token.text)) {
        output.push({ ...token, text: token.text.slice(1) })
        continue
      }
      if (token.text === 'x' && output.length) {
        const previous = output[output.length - 1]
        output[output.length - 1] = {
          text: `${previous.text}x`,
          from: previous.from,
          merged: previous.merged,
        }
        continue
      }
      output.push(token)
    }
    return output
  },
}
