import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Korean golden list, run against the real pack. */
const golden: Array<[string, string[], string]> = [
  ["particles by final sound: 나는, 사과를", ["i", "want", "apple"], "나는 사과를 원해."],
  ["a final consonant takes 을", ["i", "want", "bread"], "나는 빵을 원해."],
  ["object pronoun keeps its particle", ["you", "help", "me"], "너는 나를 도와줘."],
  ["counting form", ["i", "want", "two", "cookie"], "나는 두 쿠키를 원해."],
  ["no copula with an adjective", ["i", "happy"], "나는 기뻐."],
  ["안 before a predicate", ["i", "not", "happy"], "나는 안 기뻐."],
  ["안 before a verb", ["i", "not", "want", "apple"], "나는 사과를 안 원해."],
  ["postposition attaches to its phrase", ["we", "go", "to", "the", "park"], "우리는 그 공원에 가."],
]

describe('Korean realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('ko', ids), { locale: 'ko' }).text).toBe(expected)
    })
  }
})
