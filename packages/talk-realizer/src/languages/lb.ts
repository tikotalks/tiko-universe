import type { Features, SelectedWord } from '../features'
import { derivePerson, type Conjugation, type PersonKey } from '../morphology/persons'
import { formFor, isSensation, note, type LanguageRules } from '../profile'

/**
 * Luxembourgish. German's shape with most of German's difficulty removed: three
 * genders and an article that changes for them, but no case endings on the noun
 * itself, so a definite object is "den Apel" and nothing inside the noun moves.
 *
 * - **Verb-second**, so a question inverts: "Wat wëlls du?"
 * - **Negation is "net" after the verb**, like Dutch "niet".
 * - **A sensation is had**: "Ech hunn Hunger", the same frame as German and Dutch.
 * - The definite article has an accusative form in the masculine only ("den"),
 *   which is where German would have four.
 */
const COPULA: Record<string, string> = {
  '1sg': 'sinn', '2sg': 'bass', '3sg': 'ass', '1pl': 'sinn', '2pl': 'sidd', '3pl': 'sinn',
}

const HAVE: Record<string, string> = {
  '1sg': 'hunn', '2sg': 'hues', '3sg': 'huet', '1pl': 'hunn', '2pl': 'hutt', '3pl': 'hunn',
}

/**
 * Luxembourgish verbs: the first person looks like the infinitive ("ech spillen"),
 * and the second and third are built on the stem behind it.
 */
const CONJUGATION: Conjugation = {
  rules: [
    { when: 'en', forms: { '2sg': 's', '3sg': 't', '1pl': 'en', '2pl': 't', '3pl': 'en' } },
    { when: 'n', forms: { '2sg': 's', '3sg': 't', '1pl': 'n', '2pl': 't', '3pl': 'n' } },
  ],
}

export const luxembourgish: LanguageRules = {
  profile: {
    language: 'lb',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: [
      'en', 'eng', 'den', 'déi', 'd’',
      'kee', 'keen', 'keng',
      'am', 'um',
      'net',
      'sinn', 'bass', 'ass', 'sidd', 'hunn', 'hues', 'huet', 'hutt',
    ],
    notes: 'The dative article is not generated, and neither is the past tense, which Luxembourgish forms with an auxiliary. Vocabulary was generated against the shared concept ids and needs review by a Luxembourgish speaker.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos !== 'noun') return {}
    // Nouns are capitalised as in German; gender is not derivable and is curated.
    return {}
  },

  verbForm(verb, ctx) {
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    const curated = formFor(verb.features.forms, ctx.person, ctx.number)
    if (curated) return curated
    if (ctx.person === 1 && ctx.number === 'sg') return verb.text
    const key = `${ctx.person}${ctx.number}` as PersonKey
    const derived = derivePerson(verb.text, key, CONJUGATION)
    if (derived) {
      note(ctx.builder, `"${derived.text}": conjugated from the first person`)
      return derived.text
    }
    note(ctx.builder, `no ${key} form for "${verb.text}" — needs curation`)
    return verb.text
  },

  copula(ctx) {
    const sensation = isSensation(ctx)
    if (sensation) {
      const form = HAVE[`${ctx.person}${ctx.number}`] ?? 'huet'
      note(ctx.builder, `"${form} ${sensation}": a sensation takes "hunn"`)
      return form
    }
    return COPULA[`${ctx.person}${ctx.number}`] ?? 'ass'
  },

  determiner(np, ctx) {
    const determiner = np.determiner
    const head = np.head
    const gender = head?.features.gender
    const plural = determiner?.features.forcesNumber === 'pl'

    // "keen Apel": an indefinite phrase carries the negation itself, as in German
    // and Dutch.
    if (ctx.negateHere) {
      const none = plural ? 'keng' : gender === 'feminine' ? 'keng' : gender === 'masculine' ? 'keen' : 'kee'
      note(ctx.builder, `"${none}": the negation is inside the noun phrase`)
      return { text: none, from: determiner?.id ?? null }
    }

    // "am Gaart", "um Dësch": a preposition and a definite article contract.
    if (ctx.afterPreposition && determiner?.features.determinerKind === 'definite') {
      const contraction = ctx.preposition?.text === 'an' ? 'am' : ctx.preposition?.text === 'op' ? 'um' : null
      if (contraction) {
        note(ctx.builder, `"${contraction}": the preposition and the article contract`)
        return { text: contraction, from: determiner.id, merged: ctx.preposition ? [ctx.preposition.id] : undefined }
      }
    }

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') {
        // Only the masculine marks the accusative, and it is the same word: "den".
        const article = plural
          ? 'd’'
          : gender === 'masculine' ? 'den' : gender === 'feminine' ? 'déi' : 'd’'
        note(ctx.builder, `"${article}": the definite article, ${plural ? 'plural' : gender ?? 'neuter'}`)
        return { text: article, from: determiner.id }
      }
      if (kind === 'indefinite') {
        return { text: gender === 'feminine' ? 'eng' : 'en', from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }
    if (!head || plural) return null
    if (head.features.mass || head.features.proper) {
      if (head.features.mass) note(ctx.builder, 'no article: mass noun')
      return null
    }
    return { text: gender === 'feminine' ? 'eng' : 'en', from: null }
  },

  adjective(adjective, np, ctx) {
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation) return sensation
    // A predicate adjective is uninflected; an attributive one takes -en in the
    // masculine and -e elsewhere.
    if (ctx.role === 'predicate') return adjective.text
    const gender = np.head?.features.gender
    const plural = np.determiner?.features.forcesNumber === 'pl'
    if (plural) return `${adjective.text}${adjective.text.endsWith('e') ? '' : 'e'}`
    return gender === 'masculine' ? `${adjective.text}en` : `${adjective.text}e`
  },

  noun(head, np, ctx) {
    const plural = np.determiner?.features.forcesNumber === 'pl'
    if (plural) {
      const text = head.features.plural ?? `${head.text}en`
      note(ctx.builder, `"${text}": the plural`)
      return text
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    if (ctx.verb?.features.objectCase === 'dative' && word.features.dative) {
      return word.features.dative
    }
    return word.features.accusative ?? word.text
  },

  preposition(word, ctx) {
    // Where the article swallowed it, the preposition is not a word of its own:
    // "am Gaart", not "an am Gaart". `transform` worked out which ones those are.
    const contracted = ctx.scratch.contracted
    if (contracted instanceof Set && contracted.has(word.id)) {
      note(ctx.builder, `"${word.text}" contracts with the article that follows it`)
      return null
    }
    return word.text
  },

  transform(chunks, ctx) {
    // A preposition contracts with a following definite article, so the two have
    // to be settled together before either is written.
    const contracted = new Set<string>()
    for (const phrase of chunks.complements) {
      if (phrase.kind !== 'pp') continue
      const preposition = phrase.preposition
      if (preposition.text !== 'an' && preposition.text !== 'op') continue
      if (phrase.object?.kind === 'np'
        && phrase.object.determiner?.features.determinerKind === 'definite') {
        contracted.add(preposition.id)
      }
    }
    ctx.scratch.contracted = contracted
  },

  negation() {
    return { kind: 'afterVerb', word: 'net', phraseNegation: 'replace' }
  },

  postprocess(tokens) {
    // "d’Buch": the elided article is written onto its noun.
    const out: typeof tokens = []
    for (const token of tokens) {
      const previous = out[out.length - 1]
      if (previous?.text === 'd’') {
        out[out.length - 1] = {
          text: `d’${token.text}`,
          from: token.from,
          merged: [...(previous.merged ?? []), ...(token.merged ?? []), ...(previous.from ? [previous.from] : [])],
        }
        continue
      }
      out.push(token)
    }
    return out
  },
}
