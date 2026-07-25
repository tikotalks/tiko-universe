import {
  chunk,
  firstNounComplement,
  subjectPerson,
  type Chunks,
  type NounPhrase,
  type Word,
} from '../chunk'
import type { RealizedToken, Realization } from '../features'

/**
 * Dutch realization. Three rules carry most of the weight, and each one is
 * something plain tile concatenation gets wrong every time:
 *
 * - **de/het.** The definite article follows the noun's gender: "de appel",
 *   "het brood". There is no way to guess it; it is a lexical fact per noun.
 * - **The attributive -e.** An adjective before a noun takes -e, *except*
 *   before a singular indefinite neuter noun: "de grote appel", "een grote
 *   appel", "het grote brood" — but "een groot brood".
 * - **niet vs geen.** Negating an indefinite object replaces its article:
 *   "Ik wil geen appel", not "Ik wil niet een appel". Everything else takes
 *   "niet" after the verb: "Ik ben niet blij".
 */
export const FUNCTION_WORDS = [
  'de', 'het', 'een',
  'ben', 'bent', 'is', 'zijn', 'was', 'waren',
  'niet', 'geen',
] as const

interface Builder {
  tokens: RealizedToken[]
  inserted: string[]
  notes: string[]
}

function push(builder: Builder, text: string, from: string | null): void {
  if (!text) return
  builder.tokens.push({ text, from })
  if (from === null) builder.inserted.push(text)
}

const COPULA: Record<string, string> = {
  '1sg': 'ben',
  '2sg': 'bent',
  '3sg': 'is',
  pl: 'zijn',
}

function verbForm(
  verb: Word,
  person: 1 | 2 | 3,
  number: 'sg' | 'pl',
  tense: 'present' | 'past',
  inverted: boolean,
): string {
  const forms = verb.features.forms ?? {}
  if (tense === 'past') return forms.past ?? verb.text
  if (verb.features.copula) return COPULA[number === 'pl' ? 'pl' : `${person}sg`] ?? verb.text

  const key = number === 'pl' ? 'pl' : (`${person}sg` as const)
  // Inversion drops the second-person -t: "jij wilt" but "wil jij?".
  if (inverted && person === 2 && number === 'sg') {
    return forms['1sg'] ?? verb.text
  }
  return forms[key] ?? verb.text
}

/** Dutch adjective inflection: base + e, except singular indefinite neuter. */
function attributiveForm(
  adjective: Word,
  head: Word | undefined,
  determinerKind: 'definite' | 'indefinite' | 'none' | 'other',
  plural: boolean,
  builder: Builder,
): string {
  const inflected = adjective.features.attributive ?? `${adjective.text}e`
  if (!head) return adjective.text
  const neuter = head.features.gender === 'neuter'
  const bareNeuter = neuter && !plural && determinerKind !== 'definite'
  if (bareNeuter) {
    builder.notes.push(`"${adjective.text}" stays uninflected: singular indefinite neuter noun`)
    return adjective.text
  }
  return inflected
}

function realizeNounPhrase(
  builder: Builder,
  np: NounPhrase,
  role: 'subject' | 'complement',
  options: { negate?: boolean, afterPreposition?: boolean } = {},
): void {
  if (np.pronoun) {
    const pronoun = np.pronoun
    const text = role === 'complement' && pronoun.features.accusative
      ? pronoun.features.accusative
      : pronoun.text
    push(builder, text, pronoun.id)
    return
  }

  const head = np.head
  const determiner = np.determiner
  const plural = determiner?.features.forcesNumber === 'pl'
  const kind = determiner?.features.determinerKind
  let determinerKind: 'definite' | 'indefinite' | 'none' | 'other' = 'none'

  if (determiner) {
    if (kind === 'definite') {
      // "de" or "het" by the noun's gender — the pack's tile says "de".
      const article = head?.features.gender === 'neuter' ? 'het' : 'de'
      if (article !== determiner.text) {
        builder.notes.push(`"${article}" not "${determiner.text}": ${head?.id} is ${head?.features.gender}`)
      }
      push(builder, article, determiner.id)
      determinerKind = 'definite'
    } else if (options.negate) {
      // Negation eats the indefinite article.
      push(builder, 'geen', null)
      builder.notes.push('"geen": negated indefinite object')
      determinerKind = 'indefinite'
    } else {
      push(builder, determiner.text, determiner.id)
      determinerKind = kind === 'indefinite' ? 'indefinite' : 'other'
    }
  } else if (head) {
    if (options.negate) {
      push(builder, 'geen', null)
      builder.notes.push('"geen": negated object with no article')
      determinerKind = 'indefinite'
    } else if (options.afterPreposition && head.features.institutional) {
      builder.notes.push(`no article: "${head.text}" is institutional after a preposition`)
    } else if (!head.features.mass && !head.features.proper && !plural) {
      push(builder, 'een', null)
      builder.notes.push('article "een": indefinite countable singular')
      determinerKind = 'indefinite'
    } else if (head.features.mass) {
      builder.notes.push('no article: mass noun')
    }
  }

  for (const adjective of np.adjectives) {
    push(builder, attributiveForm(adjective, head, determinerKind, plural, builder), adjective.id)
  }

  if (head) {
    const text = plural ? (head.features.plural ?? head.text) : head.text
    if (plural && !head.features.plural) {
      builder.notes.push(`no plural form for "${head.id}", using the singular`)
    }
    push(builder, text, head.id)
  }
}

export function realizeDutch(
  words: Word[],
  options: { negated?: boolean, tense?: 'present' | 'past' } = {},
): Realization {
  const chunks: Chunks = chunk(words, options.negated ?? false)
  const tense = options.tense ?? 'present'
  const builder: Builder = { tokens: [], inserted: [], notes: [] }
  const { person, number } = subjectPerson(chunks)

  const predicate = chunks.complements.find((phrase) => phrase.kind === 'adjp')
  const isQuestion = !!chunks.question
  const needsCopula = !chunks.verb && !!chunks.subject && (!!predicate || isQuestion)

  for (const social of chunks.leadingSocials) {
    push(builder, social.text, social.id)
  }

  // Negation attaches to an indefinite object as "geen". Otherwise it is "niet",
  // whose position depends on what follows: it goes *before* a predicate
  // ("Ik ben niet blij") but *after* a definite object ("Ik wil de appel niet").
  const objectToNegate = chunks.negated ? negatableObject(chunks) : undefined
  const useNiet = chunks.negated && !objectToNegate
  const nietAfterComplements = useNiet && hasDefiniteObject(chunks)

  const emitVerb = (inverted: boolean): void => {
    if (needsCopula) {
      const copula = COPULA[number === 'pl' ? 'pl' : `${person}sg`] ?? 'is'
      push(builder, copula, null)
      builder.notes.push(`copula "${copula}": subject with a predicate and no verb`)
      return
    }
    if (chunks.verb) {
      push(builder, verbForm(chunks.verb, person, number, tense, inverted), chunks.verb.id)
    }
  }

  if (isQuestion) {
    // Verb-second: question word, verb, subject.
    const question = chunks.question!
    push(builder, question.text, question.id)
    emitVerb(true)
    builder.notes.push('verb-second: the verb precedes the subject in a question')
    if (chunks.subject) realizeNounPhrase(builder, chunks.subject, 'subject')
    if (useNiet && !nietAfterComplements) push(builder, 'niet', null)
  } else {
    if (chunks.subject) realizeNounPhrase(builder, chunks.subject, 'subject')
    emitVerb(false)
    if (useNiet && !nietAfterComplements) {
      push(builder, 'niet', null)
      builder.notes.push('"niet": negation before the predicate')
    }
  }

  for (const phrase of chunks.complements) {
    if (phrase.kind === 'raw') {
      push(builder, phrase.word.text, phrase.word.id)
      continue
    }
    if (phrase.kind === 'adjp') {
      for (const adjective of phrase.adjectives) {
        push(builder, adjective.text, adjective.id)
      }
      continue
    }
    if (phrase.kind === 'pp') {
      push(builder, phrase.preposition.text, phrase.preposition.id)
      if (phrase.object) {
        realizeNounPhrase(builder, phrase.object, 'complement', { afterPreposition: true })
      }
      continue
    }
    realizeNounPhrase(builder, phrase, 'complement', { negate: phrase === objectToNegate })
  }

  if (nietAfterComplements) {
    push(builder, 'niet', null)
    builder.notes.push('"niet": negation after a definite object')
  }

  for (const adverb of chunks.adverbs) {
    push(builder, adverb.text, adverb.id)
  }

  return finish(builder, chunks, isQuestion)
}

/** True when a complement is an object Dutch places "niet" after. */
function hasDefiniteObject(chunks: Chunks): boolean {
  for (const phrase of chunks.complements) {
    if (phrase.kind !== 'np') continue
    if (phrase.pronoun) return true
    if (!phrase.head) continue
    const kind = phrase.determiner?.features.determinerKind
    if (kind && kind !== 'indefinite') return true
  }
  return false
}

/** An object noun phrase that "geen" can attach to: indefinite or bare. */
function negatableObject(chunks: Chunks): NounPhrase | undefined {
  const np = firstNounComplement(chunks)
  if (!np) return undefined
  const kind = np.determiner?.features.determinerKind
  if (kind && kind !== 'indefinite') return undefined
  return np
}

function finish(builder: Builder, chunks: Chunks, isQuestion: boolean): Realization {
  const words = builder.tokens.map((token) => token.text).filter(Boolean)
  let text = words.join(' ').replace(/\s+/g, ' ').trim()

  const trailing = chunks.trailingSocials.map((social) => social.text)
  if (trailing.length) {
    text = `${text}, ${trailing.join(', ')}`
    for (const social of chunks.trailingSocials) {
      builder.tokens.push({ text: social.text, from: social.id })
    }
  }

  if (text) {
    text = text.charAt(0).toUpperCase() + text.slice(1)
    text += isQuestion ? '?' : '.'
  }

  return { text, tokens: builder.tokens, inserted: builder.inserted, notes: builder.notes }
}
