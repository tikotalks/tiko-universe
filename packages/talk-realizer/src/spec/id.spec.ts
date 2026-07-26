import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Indonesian golden list. Nothing inflects, so every case here is about order:
 * possessives and demonstratives follow the noun, adjectives follow the noun, and
 * there is no article and no copula at all.
 */
const golden: Array<[string, string[], string]> = [
  ['no article', ['i', 'want', 'apple'], 'Saya mau apel.'],
  ['the demonstrative follows the noun', ['i', 'want', 'the', 'apple'], 'Saya mau apel itu.'],
  ['adjective follows the noun', ['i', 'want', 'big', 'apple'], 'Saya mau apel besar.'],
  ['a number needs no plural marking', ['i', 'want', 'two', 'cookie'], 'Saya mau dua kue.'],
  ['no copula', ['i', 'happy'], 'Saya senang.'],
  ['verbs do not inflect', ['he', 'want', 'apple'], 'Dia mau apel.'],
  ['tidak before the verb', ['i', 'not', 'want', 'apple'], 'Saya tidak mau apel.'],
  ['tidak before a predicate', ['i', 'not', 'happy'], 'Saya tidak senang.'],
  ['the possessor follows what is owned', ['i', 'want', 'my', 'ball'], 'Saya mau bola saya.'],
  ['the question word stays in place', ['what', 'you', 'want'], 'Kamu mau apa?'],
  ['prepositional phrase', ['we', 'go', 'to', 'the', 'park'], 'Kami pergi ke taman itu.'],
]

describe('Indonesian realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('id', ids), { locale: 'id' }).text).toBe(expected)
    })
  }
})
