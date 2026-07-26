import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Maltese golden list, run against the real pack. */
const golden: Array<[string, string[], string]> = [
  ["no indefinite article", ["i", "want", "apple"], "Jien irrid tuffieħa."],
  ["the article assimilates to t", ["i", "want", "the", "apple"], "Jien irrid it-tuffieħa."],
  ["the article stays il- before ħ", ["i", "want", "the", "bread"], "Jien irrid il-ħobż."],
  ["the article loses its vowel before a vowel", ["i", "want", "the", "water"], "Jien irrid l-ilma."],
  ["second person", ["you", "want", "apple"], "Int trid tuffieħa."],
  ["plural", ["we", "want", "apple"], "Aħna irridu tuffieħa."],
  ["adjective follows and agrees", ["i", "want", "big", "apple"], "Jien irrid tuffieħa kbira."],
  ["counting form before a noun", ["i", "want", "two", "cookie"], "Jien irrid żewġ gallettini."],
  ["no copula in the present", ["i", "happy"], "Jien ferħan."],
  ["ma…x wraps the verb", ["i", "not", "want", "apple"], "Jien ma rridx tuffieħa."],
  ["mhux negates a predicate", ["i", "not", "happy"], "Jien mhux ferħan."],
  ["the possessive follows the noun", ["i", "want", "my", "ball"], "Jien irrid il-ballun tiegħi."],
]

describe('Maltese realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('mt', ids), { locale: 'mt' }).text).toBe(expected)
    })
  }
})
