import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Galician golden list. Galician reuses Portuguese morphology, with its own articles and an enclitic experiencer. */
const golden: Array<[string, string[], string]> = [
  ["feminine indefinite is \"unha\"", ["i", "want", "apple"], "Eu quero unha maz\u00e1."],
  ["mass noun takes none", ["i", "want", "bread"], "Eu quero pan."],
  ["definite feminine", ["i", "want", "the", "apple"], "Eu quero a maz\u00e1."],
  ["irregular querer", ["he", "want", "apple"], "El quere unha maz\u00e1."],
  ["Galician plural ending", ["we", "want", "apple"], "N\u00f3s queremos unha maz\u00e1."],
  ["the numeral agrees", ["i", "want", "two", "cookie"], "Eu quero d\u00faas galletas."],
  ["copula estar", ["i", "happy"], "Eu estou contento."],
  ["non before the verb", ["i", "not", "want", "apple"], "Eu non quero unha maz\u00e1."],
  ["the clitic is enclitic on the verb", ["i", "like", "bread"], "G\u00fastame o pan."],
  ["the article stays before a possessive", ["i", "want", "my", "ball"], "Eu quero a mi\u00f1a pelota."],
  ["question inverts", ["what", "you", "want"], "Que queres ti?"],
]

describe('Galician realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('gl', ids), { locale: 'gl' }).text).toBe(expected)
    })
  }
})
