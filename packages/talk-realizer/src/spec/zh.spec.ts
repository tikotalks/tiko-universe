import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Chinese golden list, run against the real pack. */
const golden: Array<[string, string[], string]> = [
  ["no article at all", ["i", "want", "apple"], "我要苹果。"],
  ["demonstrative takes a measure word", ["i", "want", "the", "apple"], "我要这个苹果。"],
  ["nothing inflects", ["he", "want", "apple"], "他要苹果。"],
  ["counting needs a measure word", ["i", "want", "two", "cookie"], "我要两块饼干。"],
  ["no copula, but a degree word", ["i", "happy"], "我很开心。"],
  ["不 before the verb", ["i", "not", "want", "apple"], "我不要苹果。"],
  ["没 for 有", ["i", "not", "have", "apple"], "我没有苹果。"],
  ["object pronoun", ["you", "help", "me"], "你帮助我。"],
  ["question word stays in place", ["what", "you", "want"], "你要什么？"],
]

describe('Chinese realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('zh', ids), { locale: 'zh' }).text).toBe(expected)
    })
  }
})
