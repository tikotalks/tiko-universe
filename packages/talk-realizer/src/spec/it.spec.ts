import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Italian golden list, run against the real pack. */
const golden: Array<[string, string[], string]> = [
  ["indefinite article", ["i", "want", "apple"], "Io voglio una mela."],
  ["definite article", ["i", "want", "the", "apple"], "Io voglio la mela."],
  ["irregular volere", ["he", "want", "apple"], "Lui vuole una mela."],
  ["plural of volere", ["we", "want", "apple"], "Noi vogliamo una mela."],
  ["regular -are verb with c softening", ["i", "play"], "Io gioco."],
  ["adjective follows and agrees", ["i", "want", "big", "apple"], "Io voglio una mela grande."],
  ["plural changes the final vowel", ["i", "want", "two", "cookie"], "Io voglio due biscotti."],
  ["copula essere", ["i", "happy"], "Io sono felice."],
  ["negation before the verb", ["i", "not", "want", "apple"], "Io non voglio una mela."],
  ["object clitic is preverbal", ["you", "help", "me"], "Tu mi aiuti."],
  ["a + il contracts", ["we", "go", "to", "the", "park"], "Noi andiamo al parco."],
  ["piacere inverts the clause", ["i", "like", "bread"], "Mi piace il pane."],
  ["article keeps the possessive company", ["i", "want", "my", "ball"], "Io voglio la mia palla."],
  ["article agrees with the possessive, not the noun", ["i", "want", "my", "bag"], "Io voglio il mio zaino."],
]

describe('Italian realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('it', ids), { locale: 'it' }).text).toBe(expected)
    })
  }
})
