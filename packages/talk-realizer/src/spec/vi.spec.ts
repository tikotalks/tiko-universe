import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Vietnamese golden list. The classifier does the work an article does elsewhere:
 * "quả táo" for the apple, "hai quả táo" for two of them.
 */
const golden: Array<[string, string[], string]> = [
  ['no article', ['i', 'want', 'apple'], 'Tôi muốn táo.'],
  ['the classifier marks the definite noun', ['i', 'want', 'the', 'apple'], 'Tôi muốn quả táo.'],
  ['a curated classifier for books', ['i', 'want', 'the', 'book'], 'Tôi muốn quyển sách.'],
  ['counting uses the classifier', ['i', 'want', 'two', 'apple'], 'Tôi muốn hai quả táo.'],
  ['the default classifier', ['i', 'want', 'two', 'cookie'], 'Tôi muốn hai cái bánh quy.'],
  ['adjective follows the noun', ['i', 'want', 'big', 'apple'], 'Tôi muốn táo to.'],
  ['no copula', ['i', 'happy'], 'Tôi vui.'],
  ['không before the verb', ['i', 'not', 'want', 'apple'], 'Tôi không muốn táo.'],
  ['không before a predicate', ['i', 'not', 'happy'], 'Tôi không vui.'],
  ['the possessive follows with của', ['i', 'want', 'my', 'ball'], 'Tôi muốn quả bóng của tôi.'],
  ['the question word stays in place', ['what', 'you', 'want'], 'Bạn muốn gì?'],
]

describe('Vietnamese realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('vi', ids), { locale: 'vi' }).text).toBe(expected)
    })
  }
})
