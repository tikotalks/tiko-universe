import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Danish golden list. The case that matters most is the last one: Danish has
 * **no double definiteness**, so the free article replaces the noun's suffix
 * rather than joining it — "det store æble", where Swedish and Norwegian say
 * "det stora äpplet" / "det store eplet".
 */
const golden: Array<[string, string[], string]> = [
  ['neuter takes et', ['i', 'want', 'apple'], 'Jeg vil have et æble.'],
  ['common takes en', ['i', 'want', 'ball'], 'Jeg vil have en bold.'],
  ['mass noun takes none', ['i', 'want', 'bread'], 'Jeg vil have brød.'],
  ['definiteness is a suffix', ['i', 'want', 'the', 'apple'], 'Jeg vil have æblet.'],
  ['common definite suffix', ['i', 'want', 'the', 'ball'], 'Jeg vil have bolden.'],
  ['verbs do not inflect', ['he', 'want', 'apple'], 'Han vil have et æble.'],
  ['indefinite neuter adjective takes -t', ['i', 'want', 'big', 'apple'], 'Jeg vil have et stort æble.'],
  ['indefinite common adjective is bare', ['i', 'want', 'big', 'ball'], 'Jeg vil have en stor bold.'],
  ['no double definiteness: the suffix drops', ['i', 'want', 'the', 'big', 'apple'], 'Jeg vil have det store æble.'],
  ['plural', ['i', 'want', 'two', 'cookie'], 'Jeg vil have to småkager.'],
  ['irregular plural', ['i', 'want', 'two', 'book'], 'Jeg vil have to bøger.'],
  ['copula', ['i', 'happy'], 'Jeg er glad.'],
  ['negation splits the verb from its tail', ['i', 'not', 'want', 'apple'], 'Jeg vil ikke have et æble.'],
  ['negated copula', ['i', 'not', 'happy'], 'Jeg er ikke glad.'],
  ['verb-second question keeps the tail last', ['what', 'you', 'want'], 'Hvad vil du have?'],
  ['object pronoun', ['you', 'help', 'me'], 'Du hjælper mig.'],
  ['definite suffix after a preposition', ['we', 'go', 'to', 'the', 'park'], 'Vi går til parken.'],
]

describe('Danish realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('da', ids), { locale: 'da' }).text).toBe(expected)
    })
  }
})
