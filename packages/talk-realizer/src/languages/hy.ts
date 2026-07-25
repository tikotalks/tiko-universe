import type { Features, SelectedWord } from '../features'
import { note, type LanguageRules, type SentenceContext } from '../profile'

/**
 * Armenian (Eastern). The pack stores infinitives, and the present tense is
 * beautifully regular: drop -ել/-ալ, add -ում, and follow it with the auxiliary.
 * "ուզել" → "ուզում եմ" (I want), "գնալ" → "գնում եմ" (I go).
 *
 * - **The definite article is a suffix**: -ը after a consonant, -ն after a
 *   vowel. "խնձոր" → "խնձորը" (the apple).
 * - **Negation goes on the auxiliary and moves it in front**: "ուզում եմ"
 *   becomes "չեմ ուզում".
 * - **Adjectives precede the noun and do not agree**: "մեծ խնձոր".
 *
 * Marked `beta`: the present tense, the article and the negation are systematic
 * and tested; case marking on objects (the accusative of a definite animate
 * noun) is not modelled, and the Armenian question mark is placed over a vowel,
 * which plain text cannot do — a Latin "?" stands in.
 */
const AUXILIARY: Record<string, string> = {
  '1sg': 'եմ', '2sg': 'ես', '3sg': 'է', '1pl': 'ենք', '2pl': 'եք', '3pl': 'են',
}
const NEGATIVE_AUXILIARY: Record<string, string> = {
  '1sg': 'չեմ', '2sg': 'չես', '3sg': 'չէ', '1pl': 'չենք', '2pl': 'չեք', '3pl': 'չեն',
}
const VOWELS = ['ա', 'ե', 'է', 'ի', 'ո', 'ու', 'օ', 'ը']

function key(ctx: SentenceContext): string {
  return `${ctx.person}${ctx.number}`
}

/** The present participle: ուզել → ուզում, խաղալ → խաղում. */
function participle(infinitive: string): string {
  const stem = infinitive.replace(/(ել|ալ)$/, '')
  return `${stem}ում`
}

export const armenian: LanguageRules = {
  profile: {
    language: 'hy',
    maturity: 'production',
    wordOrder: 'sov',
    questionStrategy: 'intonation',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '։', question: '' },
    functionWords: [
      'եմ', 'ես', 'է', 'ենք', 'եք', 'են',
      'չեմ', 'չես', 'չէ', 'չենք', 'չեք', 'չեն',
      'ը', 'ն',
    ],
    notes: 'The genitive and dative are not modelled; the accusative of definite animate nouns is. Vocabulary comes from the shipped pack.',
  },

  induce(_word: SelectedWord): Features {
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    const stem = forms['1sg'] ?? participle(verb.text)
    // Negation puts the auxiliary first: "չեմ ուզում".
    if (ctx.negated) {
      const auxiliary = NEGATIVE_AUXILIARY[key(ctx)] ?? 'չեմ'
      note(ctx.builder, `"${auxiliary} ${stem}": the negated auxiliary comes first`)
      return `${auxiliary} ${stem}`
    }
    return `${stem} ${AUXILIARY[key(ctx)] ?? 'է'}`
  },

  copula(ctx) {
    const table = ctx.negated ? NEGATIVE_AUXILIARY : AUXILIARY
    return table[key(ctx)] ?? 'է'
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) return null
    const kind = determiner.features.determinerKind
    if (kind === 'definite') {
      // Realized as a suffix on the noun, by the noun hook.
      note(ctx.builder, 'the definite article is a suffix on the noun')
      return null
    }
    if (kind === 'indefinite') {
      return { text: determiner.text, from: determiner.id }
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective) {
    // Armenian adjectives do not agree.
    return adjective.text
  },

  noun(head, np, ctx) {
    const definite = np.determiner?.features.determinerKind === 'definite'
    let text = head.text
    if (np.determiner?.features.forcesNumber === 'pl') {
      text = head.features.plural ?? `${text}ներ`
    }
    if (definite) {
      // A definite object is also accusative, which Armenian marks with -ին on
      // an animate noun and leaves unmarked otherwise.
      if (ctx.role === 'object' && head.features.animate) {
        note(ctx.builder, '"-ին": accusative of a definite animate noun')
        return { text: `${text}ին`, merged: np.determiner ? [np.determiner.id] : [] }
      }
      const suffix = VOWELS.includes(text.slice(-1)) ? 'ն' : 'ը'
      note(ctx.builder, `"-${suffix}": the definite suffix`)
      // The article tile lives inside this token now.
      return { text: `${text}${suffix}`, merged: np.determiner ? [np.determiner.id] : [] }
    }
    return text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    // Carried by the auxiliary, which verbForm and copula both handle.
    return { kind: 'none' }
  },

  /**
   * The Armenian question mark is a diacritic, not a final punctuation mark: it
   * sits over the last vowel of the word being questioned. So "ինչ" becomes
   * "ի՞նչ" rather than the sentence ending in "?".
   */
  postprocess(tokens, ctx) {
    if (!ctx.isQuestion) return tokens
    const index = tokens.findIndex((token) => QUESTION_WORDS.has(token.from ?? ''))
    if (index === -1) return tokens
    const token = tokens[index]
    const letters = [...token.text]
    for (let position = letters.length - 1; position >= 0; position -= 1) {
      if (VOWELS.includes(letters[position])) {
        letters.splice(position + 1, 0, '՞')
        break
      }
    }
    const marked = [...tokens]
    marked[index] = { ...token, text: letters.join('') }
    note(ctx.builder, 'the question mark is a diacritic over the questioned word')
    return marked
  },
}

const QUESTION_WORDS = new Set(['what', 'where', 'who', 'when', 'why', 'which', 'how'])
