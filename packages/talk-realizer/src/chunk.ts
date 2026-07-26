import type { Features, Lexicon, Pos, SelectedWord } from './features'
import { sharedStructure } from './lexicon/shared'

/**
 * The shallow parse every language shares. A child's tile sequence is short and
 * already roughly ordered, so this is deliberately not a parser: it groups the
 * selection into noun phrases and finds the subject, the verb and whatever
 * follows. Language-specific rules then decide how those pieces come out.
 */

export interface Word extends SelectedWord {
  features: Features
  /** Effective part of speech: the overlay wins over the pack. */
  effectivePos: Pos
}

export interface NounPhrase {
  kind: 'np'
  determiner?: Word
  adjectives: Word[]
  head?: Word
  /** A pronoun standing alone as a phrase. */
  pronoun?: Word
}

export interface PrepositionalPhrase {
  kind: 'pp'
  preposition: Word
  object?: NounPhrase
}

export interface AdjectivePhrase {
  kind: 'adjp'
  adjectives: Word[]
}

/** A tile that passes straight through, e.g. a conjunction. */
export interface RawWord {
  kind: 'raw'
  word: Word
}

/**
 * A second verb, complementing the first: the "play" of "I want to play". Only the
 * first verb is finite; this one stays in the form the pack lists it in, which is
 * the infinitive in every one of them.
 */
export interface VerbPhrase {
  kind: 'vp'
  verb: Word
}

export type Phrase = NounPhrase | PrepositionalPhrase | AdjectivePhrase | RawWord | VerbPhrase

export interface Chunks {
  question?: Word
  /** Socials that lead the sentence ("hello", "yes"). */
  leadingSocials: Word[]
  subject?: NounPhrase
  verb?: Word
  /** Everything after the verb, in the order the child chose it. */
  complements: Phrase[]
  /** Socials that trail the sentence ("please", "thank you"). */
  trailingSocials: Word[]
  adverbs: Word[]
  negated: boolean
  /**
   * True where a copula tile came before its subject, which is how a child asks a
   * yes/no question on this board: "is the apple big".
   */
  invertedCopula?: boolean
}

/**
 * Resolves each tile's features. Three layers, later winning over earlier:
 * induced from the word's own form, the language's curated facts, then any
 * lexicon the caller passed (a pack can ship its own).
 */
export function annotate(
  words: SelectedWord[],
  lexicon: Lexicon,
  induce?: (word: SelectedWord) => Features,
  curated?: Record<string, Features>,
): Word[] {
  return words.map((word) => {
    const features: Features = {
      ...sharedStructure[word.id],
      ...induce?.(word),
      ...curated?.[word.id],
      ...lexicon[word.id],
    }
    return {
      ...word,
      features,
      effectivePos: (features.pos ?? word.pos) as Pos,
    }
  })
}

/**
 * Groups an annotated selection. Rules, in order of application:
 * - a leading question tile is the question word
 * - socials before any content lead; socials after it trail
 * - the first noun phrase before the verb is the subject
 * - a preposition opens a prepositional phrase and swallows the next noun phrase
 * - adjectives with no noun after them are a predicate ("I happy" → "I am happy")
 */
export function chunk(words: Word[], forceNegated = false): Chunks {
  const chunks: Chunks = {
    leadingSocials: [],
    complements: [],
    trailingSocials: [],
    adverbs: [],
    negated: forceNegated,
  }

  let sawContent = false
  let index = 0

  const readNounPhrase = (): NounPhrase => {
    const np: NounPhrase = { kind: 'np', adjectives: [] }
    while (index < words.length) {
      const word = words[index]
      if (word.effectivePos === 'determiner') {
        if (np.determiner || np.head) break
        np.determiner = word
        index += 1
        continue
      }
      if (word.effectivePos === 'adjective') {
        if (np.head) break
        np.adjectives.push(word)
        index += 1
        continue
      }
      if (word.effectivePos === 'noun') {
        if (np.head) break
        np.head = word
        index += 1
        continue
      }
      if (word.effectivePos === 'pronoun') {
        if (np.determiner || np.head || np.adjectives.length) break
        // A possessive pronoun behaves like a determiner: "my ball".
        if (word.features.pronounCase === 'poss') {
          np.determiner = word
          index += 1
          continue
        }
        np.pronoun = word
        index += 1
        break
      }
      break
    }
    return np
  }

  while (index < words.length) {
    const word = words[index]

    switch (word.effectivePos) {
      case 'question': {
        if (!chunks.question) chunks.question = word
        index += 1
        continue
      }
      case 'negation': {
        chunks.negated = true
        index += 1
        continue
      }
      case 'social': {
        if (sawContent) chunks.trailingSocials.push(word)
        else chunks.leadingSocials.push(word)
        index += 1
        continue
      }
      case 'adverb': {
        chunks.adverbs.push(word)
        // An adverb is content, so a social after it trails: "more please", not
        // *"please more". Tapping "more" then "please" is one of the commonest
        // things a child does on this board.
        sawContent = true
        index += 1
        continue
      }
      case 'conjunction': {
        // Conjunctions pass through where the child put them — dropping a tile
        // the child chose is never acceptable.
        chunks.complements.push({ kind: 'raw', word })
        index += 1
        continue
      }
      case 'verb': {
        if (!chunks.verb) {
          chunks.verb = word
        } else if (word.features.nominal) {
          // A tile whose verb and noun are the same word, in the object's place:
          // English "help" after "need" is the noun, and "I need to help" says the
          // opposite of what the child means.
          chunks.complements.push({ kind: 'np', adjectives: [], head: word })
        } else {
          // A second verb complements the first. It used to be dropped here, which
          // is how "I want to play" came out as "I want."
          chunks.complements.push({ kind: 'vp', verb: word })
        }
        sawContent = true
        index += 1
        continue
      }
      case 'preposition': {
        const preposition = word
        index += 1
        const object = readNounPhrase()
        const pp: PrepositionalPhrase = { kind: 'pp', preposition }
        if (object.head || object.pronoun || object.determiner || object.adjectives.length) {
          pp.object = object
        }
        chunks.complements.push(pp)
        sawContent = true
        continue
      }
      default: {
        const before = index
        const np = readNounPhrase()
        if (index === before) {
          // Nothing consumed: skip the token rather than loop forever.
          index += 1
          continue
        }
        sawContent = true
        const isEmpty = !np.head && !np.pronoun && !np.determiner && np.adjectives.length === 0
        if (isEmpty) continue

        // A bare adjective group with no noun is a predicate, not a phrase.
        if (!np.head && !np.pronoun && !np.determiner && np.adjectives.length > 0) {
          chunks.complements.push({ kind: 'adjp', adjectives: np.adjectives })
          continue
        }

        if (!chunks.subject && !chunks.verb) {
          chunks.subject = np
        } else {
          chunks.complements.push(np)
        }
        continue
      }
    }
  }

  /**
   * A copula tile first is a yes/no question: "is the apple big". The subject comes
   * after it, so the noun phrase the loop filed as a complement is really the
   * subject — without this the sentence has none, and reads as the speaker's own
   * ("Am the apple big").
   */
  if (!chunks.subject && chunks.verb?.features.copula) {
    const at = chunks.complements.findIndex(
      (phrase) => phrase.kind === 'np' && (!!phrase.head || !!phrase.pronoun),
    )
    if (at !== -1) {
      chunks.subject = chunks.complements[at] as NounPhrase
      chunks.complements.splice(at, 1)
      chunks.invertedCopula = true
    }
  }

  return chunks
}

/** The noun phrase a language should attach negation to, if any. */
export function firstNounComplement(chunks: Chunks): NounPhrase | undefined {
  for (const phrase of chunks.complements) {
    if (phrase.kind === 'np' && phrase.head) return phrase
  }
  return undefined
}

export function subjectPerson(chunks: Chunks): { person: 1 | 2 | 3, number: 'sg' | 'pl' } {
  const subject = chunks.subject
  const word = subject?.pronoun ?? subject?.head
  // No subject at all: the child is the subject. A board with one verb tile on it
  // means "help" — the speaker asking — and third person made the app say *"helps"*,
  // as though someone else were doing it. First person singular is also a complete
  // sentence on its own in every pronoun-dropping language here (ru, pl, es, it, el,
  // tr, hu, fi…), where "Помогаю." needs no pronoun to be right.
  if (!subject) return { person: 1, number: 'sg' }
  // A subject that is only a determiner ("the ___") has no person of its own.
  if (!word) return { person: 3, number: 'sg' }
  const features = word.features
  if (word.effectivePos === 'noun') {
    return { person: 3, number: features.number ?? 'sg' }
  }
  return { person: features.person ?? 3, number: features.number ?? 'sg' }
}
