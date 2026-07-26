import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Malay golden list. Malay and Indonesian share one grammar, which is linguistically true — only the words differ. */
const golden: Array<[string, string[], string]> = [
  ["no article", ["i", "want", "apple"], "Saya nak apel."],
  ["the demonstrative follows the noun", ["i", "want", "the", "apple"], "Saya nak apel itu."],
  ["adjective follows the noun", ["i", "want", "big", "apple"], "Saya nak apel besar."],
  ["no plural marking after a number", ["i", "want", "two", "cookie"], "Saya nak dua biskut."],
  ["no copula", ["i", "happy"], "Saya gembira."],
  ["tidak before the verb", ["i", "not", "want", "apple"], "Saya tidak nak apel."],
  ["the possessor follows", ["i", "want", "my", "ball"], "Saya nak bola saya."],
  ["the question word stays in place", ["what", "you", "want"], "Awak nak apa?"],
]

describe('Malay realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('ms', ids), { locale: 'ms' }).text).toBe(expected)
    })
  }
})
