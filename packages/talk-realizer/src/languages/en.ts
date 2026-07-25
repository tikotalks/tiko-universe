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
 * English realization: subject–verb agreement, article insertion, do-support for
 * negation and questions, and a copula when the child gives a subject and a
 * predicate with no verb ("I" + "happy" → "I am happy").
 *
 * Everything this module can insert is listed in `FUNCTION_WORDS`. Content words
 * only ever come from the child's tiles.
 */
export const FUNCTION_WORDS = [
  'a', 'an', 'the',
  'am', 'is', 'are', 'was', 'were',
  'do', 'does', 'did',
  'not',
  'to',
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
  '1sg': 'am',
  '2sg': 'are',
  '3sg': 'is',
  pl: 'are',
}

function verbForm(verb: Word, person: 1 | 2 | 3, number: 'sg' | 'pl', tense: 'present' | 'past'): string {
  const forms = verb.features.forms ?? {}
  if (tense === 'past') return forms.past ?? verb.text
  if (verb.features.copula) {
    if (tense === 'present') return COPULA[`${person}${number}`] ?? COPULA.pl ?? verb.text
  }
  const key = number === 'pl' ? 'pl' : (`${person}sg` as const)
  const direct = forms[key]
  if (direct) return direct
  // English marks only the third person singular.
  if (person === 3 && number === 'sg') return forms['3sg'] ?? `${verb.text}s`
  return verb.text
}

function startsWithVowelSound(word: Word): boolean {
  if (word.features.vowelSound !== undefined) return word.features.vowelSound
  return /^[aeiou]/i.test(word.text)
}

/** Realizes one noun phrase, inserting an article only when English needs one. */
function realizeNounPhrase(
  builder: Builder,
  np: NounPhrase,
  role: 'subject' | 'complement',
  options: { suppressArticle?: boolean, negated?: boolean, afterPreposition?: boolean } = {},
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
  const quantifierNumber = determiner?.features.forcesNumber
  const plural = quantifierNumber === 'pl'

  if (determiner) {
    push(builder, determiner.text, determiner.id)
  } else if (head && !options.suppressArticle) {
    const institutional = options.afterPreposition && head.features.institutional
    const needsArticle = !head.features.mass && !head.features.proper && !plural && !institutional
    if (institutional) {
      builder.notes.push(`no article: "${head.text}" is institutional after a preposition`)
    }
    if (needsArticle) {
      const next = np.adjectives[0] ?? head
      const article = startsWithVowelSound(next) ? 'an' : 'a'
      push(builder, article, null)
      builder.notes.push(`article "${article}": indefinite countable singular`)
    } else if (head.features.mass) {
      builder.notes.push('no article: mass noun')
    }
  }

  for (const adjective of np.adjectives) {
    push(builder, adjective.text, adjective.id)
  }

  if (head) {
    const text = plural ? (head.features.plural ?? head.text) : head.text
    if (plural && !head.features.plural) {
      builder.notes.push(`no plural form for "${head.id}", using the singular`)
    }
    push(builder, text, head.id)
  }
}

export function realizeEnglish(
  words: Word[],
  options: { negated?: boolean, tense?: 'present' | 'past' } = {},
): Realization {
  const chunks: Chunks = chunk(words, options.negated ?? false)
  const tense = options.tense ?? 'present'
  const builder: Builder = { tokens: [], inserted: [], notes: [] }
  const { person, number } = subjectPerson(chunks)

  const predicate = chunks.complements.find((phrase) => phrase.kind === 'adjp')
  const isQuestionSelection = !!chunks.question
  // "I" + "happy" needs a copula; so does "where" + "my ball".
  const needsCopula = !chunks.verb && !!chunks.subject && (!!predicate || isQuestionSelection)
  const isCopula = needsCopula || !!chunks.verb?.features.copula
  const isQuestion = !!chunks.question

  for (const social of chunks.leadingSocials) {
    push(builder, social.text, social.id)
  }

  // Negation on an object is done with an article in Dutch but with do-support
  // in English, so the object keeps its own article here.
  const negatedObject = chunks.negated ? firstNounComplement(chunks) : undefined

  if (isQuestion) {
    const question = chunks.question!
    push(builder, question.text, question.id)

    if (isCopula) {
      const copula = needsCopula
        ? (COPULA[number === 'pl' ? 'pl' : `${person}sg`] ?? 'is')
        : verbForm(chunks.verb!, person, number, tense)
      push(builder, copula, needsCopula ? null : chunks.verb!.id)
      if (chunks.negated) push(builder, 'not', null)
      if (chunks.subject) realizeNounPhrase(builder, chunks.subject, 'subject')
    } else if (chunks.verb) {
      // Do-support: "What do you want?"
      const auxiliary = tense === 'past' ? 'did' : (person === 3 && number === 'sg' ? 'does' : 'do')
      push(builder, auxiliary, null)
      builder.notes.push(`do-support: "${auxiliary}" for a question`)
      if (chunks.negated) push(builder, 'not', null)
      if (chunks.subject) realizeNounPhrase(builder, chunks.subject, 'subject')
      push(builder, chunks.verb.text, chunks.verb.id)
    } else if (chunks.subject) {
      realizeNounPhrase(builder, chunks.subject, 'subject')
    }
  } else {
    if (chunks.subject) realizeNounPhrase(builder, chunks.subject, 'subject')

    if (needsCopula) {
      const copula = COPULA[number === 'pl' ? 'pl' : `${person}sg`] ?? 'is'
      push(builder, copula, null)
      builder.notes.push(`copula "${copula}": subject with a predicate and no verb`)
      if (chunks.negated) push(builder, 'not', null)
    } else if (chunks.verb) {
      if (chunks.negated && !chunks.verb.features.copula) {
        const auxiliary = tense === 'past' ? 'did' : (person === 3 && number === 'sg' ? 'does' : 'do')
        push(builder, auxiliary, null)
        push(builder, 'not', null)
        builder.notes.push(`do-support: "${auxiliary} not" for negation`)
        // After do-support the verb reverts to its bare form.
        push(builder, chunks.verb.text, chunks.verb.id)
      } else {
        push(builder, verbForm(chunks.verb, person, number, tense), chunks.verb.id)
        if (chunks.negated) push(builder, 'not', null)
      }
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
    realizeNounPhrase(builder, phrase, 'complement', {
      negated: phrase === negatedObject,
    })
  }

  for (const adverb of chunks.adverbs) {
    push(builder, adverb.text, adverb.id)
  }

  return finish(builder, chunks, isQuestion)
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
