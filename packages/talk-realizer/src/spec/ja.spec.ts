import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Japanese golden list, run against the real pack. */
const golden: Array<[string, string[], string]> = [
  ["は marks the subject, が the wanted thing", ["i", "want", "apple"], "わたしはりんごがほしい。"],
  ["を marks a plain object", ["you", "help", "me"], "あなたはぼくをてつだう。"],
  ["no article", ["i", "want", "water"], "わたしはみずがほしい。"],
  ["の links a count to its noun", ["i", "want", "two", "cookie"], "わたしはふたつのクッキーがほしい。"],
  ["no copula with an adjective", ["i", "happy"], "わたしはうれしい。"],
  ["the adjective carries the negation", ["i", "not", "happy"], "わたしはうれしくない。"],
  ["the verb carries the negation", ["i", "not", "want", "apple"], "わたしはりんごがほしくない。"],
  ["postposition follows its phrase", ["we", "go", "to", "the", "park"], "わたしたちはそのこうえんへいく。"],
  ["the question word takes the object slot", ["what", "you", "want"], "あなたはなにがほしいか？"],
]

describe('Japanese realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('ja', ids), { locale: 'ja' }).text).toBe(expected)
    })
  }
})
