import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Arabic golden list, run against the real pack. */
const golden: Array<[string, string[], string]> = [
  ["no indefinite article", ["i", "want", "apple"], "أنا أريد تفاحة."],
  ["the article is prefixed", ["i", "want", "the", "apple"], "أنا أريد التفاحة."],
  ["second person", ["you", "want", "apple"], "أنت تريد تفاحة."],
  ["plural", ["we", "want", "apple"], "نحن نريد تفاحة."],
  ["adjective follows and agrees", ["i", "want", "big", "apple"], "أنا أريد تفاحة كبيرة."],
  ["no copula", ["i", "happy"], "أنا سعيد."],
  ["لا negates a verb", ["i", "not", "want", "apple"], "أنا لا أريد تفاحة."],
  ["ليس agrees with its subject", ["i", "not", "happy"], "أنا لست سعيد."],
  ["the possessive follows the noun", ["i", "want", "my", "ball"], "أنا أريد الكرة ملكي."],
]

describe('Arabic realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('ar', ids), { locale: 'ar' }).text).toBe(expected)
    })
  }
})
