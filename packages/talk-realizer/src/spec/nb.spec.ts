import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Norwegian Bokmål golden list. Like Swedish it keeps double definiteness ("det
 * store eplet"); like Danish its definite plural is "-ene" and its definite
 * adjective ends in "-e".
 */
const golden: Array<[string, string[], string]> = [
  ['neuter takes et', ['i', 'want', 'apple'], 'Jeg vil ha et eple.'],
  ['common takes en', ['i', 'want', 'ball'], 'Jeg vil ha en ball.'],
  ['mass noun takes none', ['i', 'want', 'bread'], 'Jeg vil ha brød.'],
  ['definiteness is a suffix', ['i', 'want', 'the', 'apple'], 'Jeg vil ha eplet.'],
  ['verbs do not inflect', ['he', 'want', 'apple'], 'Han vil ha et eple.'],
  ['indefinite neuter adjective takes -t', ['i', 'want', 'big', 'apple'], 'Jeg vil ha et stort eple.'],
  ['double definiteness keeps both', ['i', 'want', 'the', 'big', 'apple'], 'Jeg vil ha det store eplet.'],
  ['plural', ['i', 'want', 'two', 'cookie'], 'Jeg vil ha to kaker.'],
  ['irregular plural', ['i', 'want', 'two', 'book'], 'Jeg vil ha to bøker.'],
  ['copula', ['i', 'happy'], 'Jeg er glad.'],
  ['negation splits the verb from its tail', ['i', 'not', 'want', 'apple'], 'Jeg vil ikke ha et eple.'],
  ['verb-second question keeps the tail last', ['what', 'you', 'want'], 'Hva vil du ha?'],
  ['object pronoun', ['you', 'help', 'me'], 'Du hjelper meg.'],
  ['definite suffix after a preposition', ['we', 'go', 'to', 'the', 'park'], 'Vi går til parken.'],
]

describe('Norwegian realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('nb', ids), { locale: 'nb' }).text).toBe(expected)
    })
  }
})
