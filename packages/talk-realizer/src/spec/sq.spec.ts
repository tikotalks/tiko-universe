import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Albanian golden list. Three things carry it:
 *
 * - the definite article as a suffix, and its accusative in -n ("mollën");
 * - the linking article in front of an adjective, which agrees: "i madh", "e
 *   madhe", "të lumtur", and "të madhe" in the indefinite accusative;
 * - "pëlqej", which inverts the clause the way Spanish "gustar" does.
 */
const golden: Array<[string, string[], string]> = [
  ['the indefinite article', ['i', 'want', 'apple'], 'Unë dua një mollë.'],
  ['the definite accusative adds -n', ['i', 'want', 'the', 'apple'], 'Unë dua mollën.'],
  ['a mass noun takes no article', ['i', 'want', 'water'], 'Unë dua ujë.'],
  ['the linker is "të" in the indefinite accusative', ['i', 'want', 'big', 'apple'], 'Unë dua një mollë të madhe.'],
  ['the definite accusative keeps "e"', ['i', 'want', 'the', 'big', 'apple'], 'Unë dua mollën e madhe.'],
  ['a masculine in -ër loses it', ['i', 'want', 'the', 'book'], 'Unë dua librin.'],
  ['a stem in -k takes -u', ['we', 'go', 'to', 'the', 'park'], 'Ne shkojmë te parku.'],
  ['the copula', ['i', 'happy'], 'Unë jam i lumtur.'],
  ['the plural linker', ['we', 'happy'], 'Ne jemi të lumtur.'],
  ['a predicate agrees with a noun subject', ['the', 'apple', 'is', 'big'], 'Molla është e madhe.'],
  ['negation before the verb', ['i', 'not', 'want', 'apple'], 'Unë nuk dua një mollë.'],
  ['negation before the copula', ['i', 'not', 'happy'], 'Unë nuk jam i lumtur.'],
  ['an object pronoun is a preverbal clitic', ['you', 'help', 'me'], 'Ti më ndihmon.'],
  ['an animate definite object', ['i', 'see', 'the', 'friend'], 'Unë shoh shokun.'],
  ['the possessive follows the noun', ['i', 'want', 'my', 'ball'], 'Unë dua topin im.'],
  ['pëlqej inverts the clause', ['i', 'like', 'bread'], 'Më pëlqen buka.'],
  ['a question inverts', ['where', 'mum'], 'Ku është mami?'],
  ['a question word comes first', ['what', 'you', 'want'], 'Çfarë do ti?'],
  ['third person', ['he', 'want', 'apple'], 'Ai do një mollë.'],
  ['first person plural', ['we', 'want', 'apple'], 'Ne duam një mollë.'],
  ['a trailing social', ['i', 'want', 'apple', 'please'], 'Unë dua një mollë, të lutem.'],
]

describe('Albanian realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('sq', ids), { locale: 'sq' }).text).toBe(expected)
    })
  }

  it('explains the inversion', () => {
    const result = realize(select('sq', ['i', 'like', 'bread']), { locale: 'sq' })
    expect(result.notes.join(' ')).toContain('pëlqej inverts')
  })
})
