import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Golden list: concept ids in, finished English sentence out. */
const golden: Array<[string, string[], string]> = [
  // The case sentence-api gets wrong today ("I want apple").
  ['indefinite article', ['i', 'want', 'apple'], 'I want an apple.'],
  ['a before a consonant', ['i', 'want', 'cookie'], 'I want a cookie.'],
  ['an before a vowel sound', ['i', 'want', 'apple'], 'I want an apple.'],
  ['article agrees with the adjective, not the noun', ['i', 'want', 'big', 'apple'], 'I want a big apple.'],
  ['mass noun takes no article', ['i', 'want', 'water'], 'I want water.'],
  ['bread is a mass noun here', ['i', 'want', 'bread'], 'I want bread.'],

  // Agreement
  ['third person singular -s', ['he', 'want', 'apple'], 'He wants an apple.'],
  ['she wants', ['she', 'want', 'cookie'], 'She wants a cookie.'],
  ['first person plural', ['we', 'want', 'apple'], 'We want an apple.'],
  ['irregular third person', ['he', 'have', 'ball'], 'He has a ball.'],
  ['go becomes goes', ['she', 'go', 'to', 'school'], 'She goes to school.'],

  // Determiners the child chose stay put
  ['definite article', ['i', 'want', 'the', 'apple'], 'I want the apple.'],
  ['demonstrative', ['i', 'want', 'this', 'cookie'], 'I want this cookie.'],
  ['possessive blocks the article', ['i', 'want', 'my', 'ball'], 'I want my ball.'],
  ['quantifier forces the plural', ['i', 'want', 'two', 'cookie'], 'I want two cookies.'],
  ['quantifier with a vowel noun', ['i', 'want', 'three', 'apple'], 'I want three apples.'],

  // Copula insertion: the child has no "be" tile at all
  ['copula for a predicate adjective', ['i', 'happy'], 'I am happy.'],
  ['copula agrees', ['he', 'sad'], 'He is sad.'],
  ['copula plural', ['we', 'hungry'], 'We are hungry.'],
  ['copula with you', ['you', 'happy'], 'You are happy.'],

  // Negation (needs a "not" tile Talk does not ship yet)
  ['do-support negation', ['i', 'not', 'want', 'apple'], 'I do not want an apple.'],
  ['does for third person', ['he', 'not', 'want', 'apple'], 'He does not want an apple.'],
  ['negated copula takes no auxiliary', ['i', 'not', 'happy'], 'I am not happy.'],

  // Questions
  ['do-support in a question', ['what', 'you', 'want'], 'What do you want?'],
  ['question with third person', ['what', 'he', 'want'], 'What does he want?'],
  ['where question with copula', ['where', 'my', 'ball'], 'Where is my ball?'],

  // Prepositions, objects, socials
  ['prepositional phrase', ['we', 'go', 'to', 'the', 'park'], 'We go to the park.'],
  ['object pronoun form', ['you', 'help', 'me'], 'You help me.'],
  ['trailing social', ['i', 'want', 'apple', 'please'], 'I want an apple, please.'],
  ['leading social', ['hello', 'i', 'want', 'cookie'], 'Hello I want a cookie.'],

  // Past tense
  ['past tense', ['i', 'want', 'cookie'], 'I want a cookie.'],
]

describe('English realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      const result = realize(select('en', ids), { locale: 'en-US' })
      expect(result.text).toBe(expected)
    })
  }

  it('inflects the verb for the past tense', () => {
    const result = realize(select('en', ['i', 'want', 'cookie']), { locale: 'en', tense: 'past' })
    expect(result.text).toBe('I wanted a cookie.')
  })

  it('reports the function words it inserted', () => {
    const result = realize(select('en', ['i', 'want', 'apple']), { locale: 'en' })
    expect(result.inserted).toEqual(['an'])
  })

  it('explains its decisions', () => {
    const result = realize(select('en', ['i', 'happy']), { locale: 'en' })
    expect(result.notes.join(' ')).toContain('copula "am"')
  })

  it('handles a single tile', () => {
    expect(realize(select('en', ['apple']), { locale: 'en' }).text).toBe('An apple.')
  })

  it('handles an empty selection', () => {
    expect(realize([], { locale: 'en' }).text).toBe('')
  })
})
