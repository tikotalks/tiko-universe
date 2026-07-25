import type { Features, SelectedWord } from '../features'
import { extractObjectClitic } from '../morphology/clitic'
import { agreesWith, formFor, note, type LanguageRules, type PhraseContext } from '../profile'

/**
 * Bulgarian. Slavic vocabulary with almost none of the Slavic grammar: Bulgarian
 * lost its noun cases and grew an article instead, which makes it the mirror
 * image of Russian and Polish and the cheapest addition after them.
 *
 * - **The definite article is a suffix, on whichever word comes first.** "ябълка"
 *   → "ябълката", but with an adjective the article moves left: "голямата
 *   ябълка", never "голяма ябълката". Nothing else in this package attaches
 *   inflection to a position in the phrase rather than to a part of speech.
 * - **The masculine has two definite forms.** The full article "-ът" is written
 *   in subject position and the short "-а" everywhere else: "хлябът е топъл" but
 *   "искам хляба". This is a spelling rule of the written standard.
 * - **No cases on nouns**, so no genitive of negation and no animacy — the two
 *   rules Russian and Polish needed most.
 * - **Object pronouns are preverbal clitics**: "ти ме виждаш", and помагам takes
 *   the dative clitic "ми".
 * - **The copula is obligatory** (unlike Russian): "аз съм щастлив".
 *
 * Marked `beta`: the vocabulary was generated against the shared concept ids, the
 * soft masculine declension is not modelled, and yes/no questions would need the
 * particle "ли" — which Talk never generates, because every question it builds
 * starts with a question word. All of it needs review by a Bulgarian speaker.
 */
const COPULA: Record<string, string> = {
  '1sg': 'съм', '2sg': 'си', '3sg': 'е', '1pl': 'сме', '2pl': 'сте', '3pl': 'са',
}
const COPULA_PAST: Record<string, string> = {
  '1sg': 'бях', '2sg': 'беше', '3sg': 'беше', '1pl': 'бяхме', '2pl': 'бяхте', '3pl': 'бяха',
}

/** True where the written standard wants the full masculine article. */
function wantsFullArticle(role: PhraseContext['role']): boolean {
  return role === 'subject' || role === 'predicate'
}

/** Writes the definite article onto a noun. */
function definiteNoun(
  text: string,
  gender: Features['gender'],
  plural: boolean,
  full: boolean,
): string {
  if (plural) {
    // Plurals in -и/-е take -те; those in -а/-я take -та.
    if (/[ая]$/.test(text)) return `${text}та`
    return `${text}те`
  }
  if (gender === 'feminine') return `${text}та`
  if (gender === 'neuter') return `${text}то`
  // Masculine nouns that end in a vowel behave like feminines and neuters:
  // "дядо" → "дядото", "баща" → "бащата".
  if (/[оe]$/.test(text)) return `${text}то`
  if (/[ая]$/.test(text)) return `${text}та`
  if (text.endsWith('й')) return `${text.slice(0, -1)}${full ? 'ят' : 'я'}`
  return `${text}${full ? 'ът' : 'а'}`
}

/** Writes the definite article onto an adjective, which has its own endings. */
function definiteAdjective(
  text: string,
  gender: Features['gender'],
  plural: boolean,
  full: boolean,
): string {
  if (plural) return `${text}те`
  if (gender === 'feminine') return `${text}та`
  if (gender === 'neuter') return `${text}то`
  return `${text}${full ? 'ият' : 'ия'}`
}

export const bulgarian: LanguageRules = {
  profile: {
    language: 'bg',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['съм', 'си', 'е', 'сме', 'сте', 'са', 'бях', 'беше', 'бяхме', 'бяха', 'не'],
    notes: 'The soft masculine declension is not modelled. Yes/no questions need the particle "ли", which Talk never generates, because every question it builds starts with a question word. Vocabulary needs review by a Bulgarian speaker.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos !== 'noun') return {}
    // Bulgarian gender is readable from the ending, as in Russian.
    if (/[ая]$/.test(word.text)) return { gender: 'feminine' }
    if (/[ое]$/.test(word.text)) return { gender: 'neuter' }
    return { gender: 'masculine' }
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    const curated = formFor(forms, ctx.person, ctx.number)
    if (curated) return curated
    if (ctx.person === 1 && ctx.number === 'sg') return verb.text
    note(ctx.builder, `no ${ctx.person}${ctx.number} form for "${verb.text}" — needs curation`)
    return verb.text
  },

  copula(ctx) {
    return (ctx.tense === 'past' ? COPULA_PAST : COPULA)[`${ctx.person}${ctx.number}`] ?? 'е'
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    if (!determiner) return null
    const kind = determiner.features.determinerKind
    if (kind === 'definite') {
      note(ctx.builder, 'the definite article is a suffix on the first word of the phrase')
      return null
    }
    if (kind === 'indefinite') {
      // Bulgarian leaves an indefinite noun bare; "един" is a numeral, not an
      // article, and reads as emphasis here.
      note(ctx.builder, 'no indefinite article: the bare noun is indefinite')
      return null
    }
    if (determiner.features.pronounCase === 'poss') {
      const gender = np.head?.features.gender
      const plural = determiner.features.forcesNumber === 'pl'
      const agreed = plural
        ? determiner.features.pluralForm
        : gender === 'feminine'
          ? determiner.features.feminine
          : gender === 'neuter'
            ? determiner.features.neuter
            : undefined
      const base = agreed ?? determiner.text
      // A possessive phrase is definite, and the possessive comes first, so the
      // article lands on it: "моята топка".
      const definite = base.endsWith('й')
        // The masculine base ends in -й, which the article replaces: "моят".
        ? `${base.slice(0, -1)}${wantsFullArticle(ctx.role) ? 'ят' : 'я'}`
        : definiteAdjective(base, gender, plural, wantsFullArticle(ctx.role))
      note(ctx.builder, `"${definite}": a possessive phrase is definite`)
      return { text: definite, from: determiner.id }
    }
    return { text: determiner.text, from: determiner.id }
  },

  adjective(adjective, np, ctx) {
    const { gender, plural } = agreesWith(np, ctx)
    const forms = adjective.features
    let form = adjective.text
    if (plural) form = forms.pluralForm ?? `${form}и`
    else if (gender === 'feminine') form = forms.feminine ?? `${form}а`
    else if (gender === 'neuter') form = forms.neuter ?? `${form}о`

    // The article lands on the adjective, because it comes first.
    if (np.determiner?.features.determinerKind === 'definite') {
      const definite = definiteAdjective(form, gender, plural, wantsFullArticle(ctx.role))
      note(ctx.builder, `"${definite}": the article moves onto the adjective`)
      return definite
    }
    return form
  },

  noun(head, np, ctx) {
    const plural = np.determiner?.features.forcesNumber === 'pl'
    const text = plural ? (head.features.plural ?? `${head.text}и`) : head.text
    const determiner = np.determiner
    // An article this language writes as a suffix, or leaves out entirely, still
    // belongs to the sentence: it rides along with the noun.
    const absorbed = determiner ? [determiner.id] : undefined

    if (determiner?.features.determinerKind === 'definite') {
      // Unless an adjective already took it.
      if (np.adjectives.length > 0) return { text, merged: absorbed }
      const definite = definiteNoun(text, head.features.gender, plural, wantsFullArticle(ctx.role))
      note(ctx.builder, `"${definite}": the definite article written onto the noun`)
      return { text: definite, merged: absorbed }
    }
    if (determiner?.features.determinerKind === 'indefinite') {
      return { text, merged: absorbed }
    }
    return text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    if (ctx.verb?.features.objectCase === 'dative' && word.features.dative) {
      note(ctx.builder, `"${word.features.dative}": dative clitic, governed by the verb`)
      return word.features.dative
    }
    return word.features.accusative ?? word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'не' }
  },

  transform(chunks, ctx) {
    // Object pronouns are clitics in front of the verb: "ти ме виждаш".
    extractObjectClitic(chunks, ctx.scratch, (pronoun) => (
      ctx.verb?.features.objectCase === 'dative'
        ? pronoun.features.dative ?? pronoun.features.accusative ?? pronoun.text
        : pronoun.features.accusative ?? pronoun.text
    ))
  },
}
