import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Hungarian golden list. The pair that matters most is the first two: same
 * subject, same verb, same tense, and a different ending — because the second
 * object is definite. No other language here has a determiner that reaches across
 * the sentence and changes the verb.
 */
const golden: Array<[string, string[], string]> = [
  ['the indefinite paradigm', ['i', 'want', 'apple'], 'Én akarok almát.'],
  ['the definite paradigm, because "the" is there', ['i', 'want', 'the', 'apple'], 'Én akarom az almát.'],
  ['"egy" keeps it indefinite', ['i', 'want', 'a', 'apple'], 'Én akarok egy almát.'],
  ['an accusative that shortens the stem', ['i', 'want', 'water'], 'Én akarok vizet.'],
  ['"a" before a consonant', ['i', 'want', 'the', 'water'], 'Én akarom a vizet.'],
  ['a linking vowel in the accusative', ['i', 'want', 'bread'], 'Én akarok kenyeret.'],
  ['adjectives do not agree before a noun', ['i', 'want', 'big', 'apple'], 'Én akarok nagy almát.'],
  ['negation before the verb', ['i', 'not', 'want', 'apple'], 'Én nem akarok almát.'],
  ['the copula follows its predicate', ['i', 'happy'], 'Én boldog vagyok.'],
  ['a plural predicate takes -k', ['we', 'happy'], 'Mi boldogok vagyunk.'],
  ['no copula in the third person', ['he', 'tired'], 'Ő fáradt.'],
  ['"az" before a vowel', ['the', 'apple', 'is', 'big'], 'Az alma nagy.'],
  ['negated, the copula comes first', ['i', 'not', 'happy'], 'Én nem vagyok boldog.'],
  ['a linking vowel in the second person', ['you', 'help', 'me'], 'Te segítesz nekem.'],
  ['a definite object drives the paradigm', ['i', 'see', 'the', 'friend'], 'Én látom a barátot.'],
  ['an irregular verb is curated', ['we', 'go', 'to', 'the', 'park'], 'Mi megyünk a parkhoz.'],
  ['a case suffix, not a preposition', ['i', 'play', 'in', 'the', 'garden'], 'Én játszom a kertben.'],
  ['the question word stands in focus', ['what', 'you', 'want'], 'Te mit akarsz?'],
  ['"két" before a noun, not "kettő"', ['i', 'want', 'two', 'cookie'], 'Én akarok két sütit.'],
  ['a front-rounded stem taking -e-', ['i', 'read', 'the', 'book'], 'Én olvasom a könyvet.'],
  ['an -ik verb in the first person', ['i', 'eat', 'the', 'egg'], 'Én eszem a tojást.'],
  ['a trailing social', ['i', 'want', 'apple', 'please'], 'Én akarok almát, kérem.'],
]

describe('Hungarian realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('hu', ids), { locale: 'hu' }).text).toBe(expected)
    })
  }

  it('says which paradigm it chose, and why', () => {
    const definite = realize(select('hu', ['i', 'want', 'the', 'apple']), { locale: 'hu' })
    expect(definite.notes.join(' ')).toContain('the definite paradigm, because the object is definite')
    const indefinite = realize(select('hu', ['i', 'want', 'apple']), { locale: 'hu' })
    expect(indefinite.notes.join(' ')).toContain('the indefinite paradigm')
  })

  it('keeps a suppressed preposition in the audit trail', () => {
    const result = realize(select('hu', ['i', 'play', 'in', 'the', 'garden']), { locale: 'hu' })
    const accounted = result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])])
    expect(accounted).toContain('in')
  })
})
