import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Catalan golden list. Catalan matters beyond speaker numbers: Catalonia delivers special education in it. */
const golden: Array<[string, string[], string]> = [
  ["feminine indefinite", ["i", "want", "apple"], "Jo vull una poma."],
  ["mass noun takes none", ["i", "want", "bread"], "Jo vull pa."],
  ["definite feminine", ["i", "want", "the", "apple"], "Jo vull la poma."],
  ["irregular voler", ["he", "want", "apple"], "Ell vol una poma."],
  ["Catalan plural ending, not the Spanish one", ["we", "want", "apple"], "Nosaltres volem una poma."],
  ["adjective follows and agrees", ["i", "want", "big", "apple"], "Jo vull una poma gran."],
  ["the numeral agrees", ["i", "want", "two", "cookie"], "Jo vull dues galetes."],
  ["copula estar", ["i", "happy"], "Jo estic content."],
  ["no before the verb", ["i", "not", "want", "apple"], "Jo no vull una poma."],
  ["the weak pronoun elides onto the verb", ["you", "help", "me"], "Tu m'ajudes."],
  ["agradar inverts and elides", ["i", "like", "bread"], "M'agrada el pa."],
  ["the article stays before a possessive", ["i", "want", "my", "ball"], "Jo vull la meva pilota."],
  ["question inverts", ["what", "you", "want"], "Qu\u00e8 vols tu?"],
]

describe('Catalan realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('ca', ids), { locale: 'ca' }).text).toBe(expected)
    })
  }
})
